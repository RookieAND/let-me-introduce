## 들어가며

이전 글에서는 `require()` 를 이해하기 위한 개념들을 정리했다.
Module 클래스, module/exports 의 출처, Module Wrapper, 탐색 알고리즘, require.cache 까지 설명했다.

그런데 정작 핵심이 되는 한 부분은 설명 없이 넘어갔다. 사실 내가 가장 알고 싶은 부분이기도 하고 말이다.

> 파일 코드가 실행되며 module.exports 에 값이 채워진다.

지난 글에서는 파일이 어떻게 읽히는지, 어떻게 컴파일되는지, 어떻게 실행되는지,
그리고 실행 결과가 어떻게 `module.exports` 에 담기는지는 설명하지 않았다.

이번 글에서는 `require()` 호출부터 `module.exports` 반환까지 어떻게 흘러가는지를
실제 Node.js 소스를 분석하여 단계별로 따라가며 모듈 파이프라인 전체를 분석한다.

먼저 전체적인 평가 및 실행의 흐름을 정리하면 아래와 같다.

| 단계 | 담당 함수 | 핵심 동작 |
|---|---|---|
| 1 | `require('foo')` → `Module._load()` | 경로 탐색으로 절대경로 결정 |
| 2 | `Module._cache[filename]` 확인 | hit → `module.exports` 즉시 반환 / hit (순환 참조) → 부분적 exports 반환 / miss → 계속 |
| 3 | `new Module(filename)` | 인스턴스 생성 후 실행 전에 `_cache` 에 선등록 |
| 4 | `Module.prototype.load()` | 확장자 감지 → `Module._extensions['.js']()` 로 위임 |
| 5 | `loadSource()` | 파일 읽기 → `string` 반환 |
| 6 | `wrapSafe()` | Module Wrapper 감싸기 + V8 컴파일 → `compiledWrapper` (Function, 미실행) |
| 7 | `FunctionPrototypeCall()` | 5개 변수 주입 후 실행 → `module.exports` 채움 |
| 8 | `module.loaded = true` | 완전히 로드된 상태로 전환 → `module.exports` 반환 |

각 단계를 실제 Node.js 소스 발췌와 함께 분석한다.

---

## Step 1 — Module._load

`require('foo')` 를 호출하면 실제로는 `Module._load` 가 실행된다.
그런데 왜 `require()` 가 `Module._load` 로 이어지는지는 짚고 넘어갈 필요가 있다.

이전 글에서 설명했듯, 파일 코드는 Module Wrapper 의 매개변수로 `require` 를 주입받는다.
이 `require` 함수는 사실 내부적으로 `makeRequireFunction` 함수가 만든 클로저다.
해당 함수 내부에서는 `Module.prototype.require` 를 거쳐 `Module._load` 를 호출한다.

```javascript
// lib/internal/modules/helpers.js (183 Line)
function makeRequireFunction(mod) {
  // 중략... (Module 클래스 Lazy Loading)

  function require(id) {
    return mod.require(id); // mod = 현재 파일의 Module 인스턴스
  }

  // 중략... (require.resolve, require.extension 등을 바인딩)

  return require;
}

// 프로토타입 메서드 단에서 Module._load 클래스를 호출하는 구조다.
Module.prototype.require = function(id) {
  return Module._load(id, this, /* isMain */ false);
};
```

이러한 이유로 앞선 글에서도 말했듯이, `require('foo')` 는 전역 함수가 아니다.
실제로는 파일마다 해당 파일의 Module 인스턴스에 묶인 클로저고, 내부에서 `Module._load` 를 호출한다.
탐색 알고리즘이 **파일마다 호출한 위치를 기준으로 동작하는 이유**가 여기에 있다.

```javascript
// lib/internal/modules/cjs/loader.js
Module._load = function(request, parent, isMain) {
  // 1. 경로 탐색으로 절대경로 결정 (이전 글의 탐색 알고리즘)
  const filename = Module._resolveFilename(request, parent, isMain);

  // 2. 캐시 확인
  const cachedModule = Module._cache[filename];
  if (cachedModule !== undefined) {
    updateChildren(parent, cachedModule, true);
    if (cachedModule.loaded) {
      return cachedModule.exports; // 캐시 hit → 즉시 반환
    }
    // loaded 가 false = 순환 참조 상황 → 부분적 exports 반환
    return getExportsForCircularRequire(cachedModule);
  }

  // 3. Module 인스턴스 생성
  const module = new Module(filename, parent);

  // 4. 캐시에 미리 저장 ← 실행 전에 저장하는 게 핵심
  Module._cache[filename] = module;

  // 5. 파일 로드 및 실행 (try/finally 로 실패 시 캐시 정리)
  let threw = true;
  try {
    // 경로에 저장된 파일을 읽고 평가하는 단계를 거친다.
    module.load(filename);
    threw = false;
  } finally {
    if (threw) {
      // 로드 중 에러 발생 시 캐시에서 제거 → 다음 require 시 처음부터 재시도 가능
      delete Module._cache[filename];
    }
  }

  return module.exports;
};
```

`Module._load` 의 구현체를 분석하던 도중, 개인적으로 눈에 띄는 설계 방식을 두 가지 발견했다.

### 캐시를 실행 전에 미리 저장하는 이유

아래는 두 모듈이 서로를 참조하여 코드를 실행하는 과정을 보여주는 코드 예시다.

```javascript
// a.js
exports.x = 1;             // (1) 여기까지 실행됨
const b = require('./b');  // (2) b.js 로딩 시작 → a.js 실행 일시 중단
exports.y = 2;             // (4) b.js 완료 후 재개
```

```javascript
// b.js
const a = require('./a');  // (3) a.js 는 캐시에 있지만 (1)까지만 실행된 상태
console.log(a.x);          // 1         ← exports.x 는 이미 할당됨
console.log(a.y);          // undefined ← exports.y 는 아직 실행되지 않음
```

**실행 흐름**

1. `a.js` 가 먼저 실행된다. `exports.x = 1` 이 실행되어 exports 객체에 x 가 추가된다.
2. `require('./b')` 를 호출하는 순간 `a.js` 실행이 일시 중단되고 `b.js` 로딩이 시작된다.
3. `b.js` 내부에서 `require('./a')` 를 호출한다. 이 시점에 `a.js` 는 아직 완전히 실행되지 않았다.
4. `b.js` 실행이 완료되면 `a.js` 가 재개되어 `exports.y = 2` 가 실행된다.

**`a.x` 는 1 인데 `a.y` 는 undefined 인 이유**

(3) 시점에서 `a.js` 의 실행은 `require('./b')` 호출 직전까지만 진행된 상태다.
`exports.x = 1` 은 이미 실행되었지만, `exports.y = 2` 는 아직 실행되지 않았다.
`b.js` 가 받는 exports 객체는 그 시점까지 채워진 값만 담고 있으므로, `a.y` 는 `undefined` 다.

### `loaded = false` 인데도 `module.exports` 가 유효한 이유

여기서 한 가지 의문점이 생긴다.

`a.js` 는 아직 완전히 실행되지 않아 `loaded = false` 인데, 어떻게 `b.js` 는 `a.js` 의 exports 를 받을 수 있는 걸까?

이는 `Module._load` 가 캐시를 저장하는 타이밍 때문이다.

```javascript
// lib/internal/modules/cjs/loader.js
const module = new Module(filename, parent); // module.exports = {}

Module._cache[filename] = module; // ← 실행 전에 저장 (핵심)
module.load(filename);            // ← 실제 코드 실행은 여기서
```

전역 모듈 캐시는 Module 인스턴스를 참조한 형태다.
따라서 `a.js` 코드가 실행되면서 `exports.x = 1` 같은 값의 할당이 일어나면,
이 결과가 캐시 안의 Module 인스턴스가 가리키는 exports 객체에 그대로 반영된다.

`b.js` 가 `require('./a')` 를 호출했을 때 `loaded = false` 임을 감지하면,
Node.js 는 `getExportsForCircularRequire` 를 통해 그 시점까지 채워진 exports 를 반환한다.

```javascript
// lib/internal/modules/cjs/loader.js
const cachedModule = Module._cache[filename];
if (cachedModule !== undefined) {
  if (cachedModule.loaded) {
    return cachedModule.exports; // 완전히 로드됨 → 정상 반환
  }
  return getExportsForCircularRequire(cachedModule); // loaded=false → 부분적 exports 반환
}

function getExportsForCircularRequire(module) {
  return module.exports; // 호출 시점까지 채워진 exports 를 그대로 반환
}
```

즉 캐시를 실행 전에 미리 저장하는 이유는, 순환 참조 시 무한 루프 없이 "그 시점까지의 exports" 를 안전하게 반환하기 위해서다.

이 때문에 순환 참조가 생기면 어느 쪽을 먼저 require 하느냐에 따라 받는 값이 달라진다.
Node.js 공식 문서도 순환 의존이 생길 경우 늦게 참조 (Lazy) 하거나 구조를 재설계하길 권장하는 이유다.

### try / finally 로 로드 실패 시 캐시를 정리하는 이유

파일 파싱 에러, 런타임 에러 등으로 로드가 실패했을 때 캐시에 불완전한 항목이 남을 수 있다.
문제는 이렇게 되면 이후 `require()` 호출이 에러 없이 잘못된 값을 반환할 수 있다는 점이다.

따라서 `threw === true` 일 때 캐시를 지워 다음 `require()` 가 처음부터 다시 코드를 불러올 수 있게 한다.

---

## Step 2 — Module.prototype.load: 확장자 기반 로더 선택

Step 1 에서 `module.load(filename)` 을 호출하면 이 함수가 실행된다.
해당 메서드에서는 현재 파일의 확장자를 보고 적절한 로더를 선택하여 실행한다.

```javascript
// lib/internal/modules/cjs/loader.js
Module.prototype.load = function(filename) {
  assert(!this.loaded); // 이미 로드된 모듈을 다시 load() 하면 assertion 에러

  this.filename ??= filename;  // 파일 절대경로 저장
  this.paths ??= Module._nodeModulePaths(path.dirname(filename)); // node_modules 탐색 경로 목록

  const extension = findLongestRegisteredExtension(filename); // '.js', '.json', '.node' 등
  Module._extensions[extension](this, filename); // 확장자별 로더 실행

  this.loaded = true; // ← 로더 실행이 완전히 끝난 후에야 true 로 바뀐다
};
```

여기서 로더 (loader) 는 파일을 읽어서 그 내용을 `module.exports` 에 채우는 함수다.
그리고 `Module._extensions` 는 확장자를 키로, 로더를 값으로 갖는 Map 이라고 볼 수 있다.

```javascript
Module._extensions['.js']   = function(module, filename) { /* 포맷 감지 + loadSource + _compile */ };
Module._extensions['.json'] = function(module, filename) { /* loadSource + JSON.parse */ };
Module._extensions['.node'] = function(module, filename) { /* process.dlopen */ };
```

확장자 로더마다 `module.exports` 를 채우는 방식이 다르다.

- `.js` — 파일 코드 전체를 컴파일 후 실행, `module.exports` 값은 별도 할당.
- `.json` — 파일을 읽고 `JSON.parse` 한 뒤 `module.exports` 에 직접 할당
- `.node` — C++ 네이티브 바이너리를 `process.dlopen` 으로 로드

JS 파일의 경우 실행 중 발생한 Side Effect 는 모두 적용되지만, `require()` 가 반환하는 것은 `module.exports` 에 할당된 값만이라는 점을 명심하자.

**여기서 눈여겨 볼 점은 `this.loaded = true` 이다.**

로더가 모두 실행되고 결과가 반환된 뒤에야 비로소 `this.loaded = true` 가 된다.
즉, 파일 코드가 완전히 평가되고 실행되기 전까지 `module.loaded` 는 항상 `false` 다.

순환 참조 감지가 `loaded === false` 를 기준으로 동작하는 이유가 여기에 있다.

---

## Step 3 — Module._extensions['.js']: 포맷 결정, 파일 읽기, 평가

우리가 가장 중요하게 봐야 할 `.js` 로더는 세 가지 일을 순서대로 담당한다.

1. CommonJS / ECMAScript Module 포맷 결정
2. 인자로 받은 경로에 위치한 파일을 읽기
3. 코드를 Wrapping Function 으로 감싸고 컴파일 및 실행

```javascript
// lib/internal/modules/cjs/loader.js
Module._extensions['.js'] = function(module, filename) {
  let format;

  // 1. 확장자와 package.json "type" 필드로 포맷 결정
  if (StringPrototypeEndsWith(filename, '.cjs')) {
    format = 'commonjs';
  } else if (StringPrototypeEndsWith(filename, '.mjs')) {
    format = 'module';
  } else {
    // .js 파일은 가장 가까운 package.json 의 "type" 필드 확인
    const pkg = packageJsonReader.getNearestParentPackageJSON(filename);
    format = pkg?.data.type; // 'module' | 'commonjs' | undefined
  }

  // 2. 파일 내용 읽기 (Buffer → string, 컴파일 캐시 및 로드 훅 처리 포함)
  const { source } = loadSource(module, filename, format);

  // 3. 읽어온 소스를 컴파일 + 실행
  module._compile(source, filename, format);
};
```

구현 코드를 보면 내부에서 포맷을 결정하고, 이후 `loadSource` 와 `_compile` 메서드가 연달아 호출된다.

### CJS / ESM 포맷 결정

포맷 결정 과정 (commonjs, module) 의 경우 확장자에 따라 세 가지 경로로 나뉘었다.

- `.cjs` — 항상 CJS. 추가 확인 없이 `format = 'commonjs'` 로 결정된다.
- `.mjs` — 항상 ESM. `format = 'module'` 로 설정되며, 이후 `_compile` 에서 ESM 처리 경로로 분기된다.
- `.js` — 가장 가까운 `package.json` 의 `"type"` 필드를 확인해 포맷을 결정한다.

`.js` 파일은 별도 선언이 없으면 기본적으로 CJS 로 처리된다.
단 package.json 내 `"type"` 이 없거나 `"commonjs"` 이면 CJS, `"module"` 이면 ESM 으로 처리된다.

```javascript
// lib/internal/modules/cjs/loader.js
const pkg = packageJsonReader.getNearestParentPackageJSON(filename);
format = pkg?.data.type; // 'module' | 'commonjs' | undefined

// undefined  → CJS 폴백 (기본값)
// 'commonjs' → CJS
// 'module'   → ESM (_compile 에서 ERR_REQUIRE_ESM 또는 ESM 로드)
```

`format` 이 `'module'` 로 결정되면 `_compile` 내부에서 ESM 처리 경로로 분기된다.
Node.js 22 이전에는 `ERR_REQUIRE_ESM` 에러를 던지며, 22+ 부터는 `--experimental-require-module` 플래그로 ESM 파일을 `require()` 로 로드할 수 있다.

### 경로에 위치한 Javascript 파일 읽기

`loadSource` 함수는 인자로 받은 경로에 위치한 파일의 내용을 읽는 작업을 처리한다.
해당 함수가 처리하는 작업을 열거하면 총 세 단계로 구성된다.

1. 컴파일 캐시 확인 (`--compile-cache` 플래그를 켰을 때만)
2. 사전에 등록된 loader hook 실행 (`module.register()` 로 훅을 등록했을 때만)
3. `fs.readFileSync` 로 파일 내용을 읽고 반환

```javascript
// lib/internal/modules/cjs/loader.js (simplified)
function loadSource(mod, filename, format) {
  // 1. 컴파일 캐시 확인 (--compile-cache 플래그 활성화 시)
  //    이전 실행에서 V8 이 컴파일한 바이트코드를 디스크에 캐싱해두면
  //    이후 실행에서는 파싱 + 컴파일 단계를 건너뛸 수 있다
  const cached = getCompileCacheEntry(filename);
  if (cached) return { source: cached };

  // 2. load hook 실행 (module.register() 로 등록된 경우)
  //    ESM 스타일의 커스텀 로더가 CJS 로드 흐름을 가로챌 수 있는 지점
  if (hasRegisteredHooks) {
    return runLoadHooks(mod, filename, format);
  }

  // 3. 파일 읽기 + string 정규화
  const source = fs.readFileSync(filename, 'utf8');
  return { source };
}
```

이때 세 단계 중 실제로 항상 실행되는 건 3번뿐이다.
1번은 `--compile-cache` 플래그를 켰을 때만, 2번은 `module.register()` 로 훅을 등록했을 때만 동작한다.

이렇게 얻은 string 을 `_compile` 이 받아 이후 설명할 Step 4 ~ 6 의 과정으로 실행한다.

### 경로에 위치한 JSON 파일 읽기

`.json` 로더는 다르게 동작한다.
해당 로더는 `_compile` 을 거치지 않고 `module.exports` 를 직접 채운다.

```javascript
// lib/internal/modules/cjs/loader.js
Module._extensions['.json'] = function(module, filename) {
  const { source: content } = loadSource(module, filename, 'json');

  try {
    module.exports = JSON.parse(content); // _compile 없이 바로 module.exports 에 할당
  } catch (err) {
    err.message = filename + ': ' + err.message;
    throw err;
  }
};
```

---

## Step 4 — module._compile: string 을 compiledWrapper 로

```javascript
// lib/internal/modules/cjs/loader.js
Module.prototype._compile = function(content, filename, format) {
  // ESM 포맷 감지 시 별도 처리 (ERR_REQUIRE_ESM 또는 실험적 ESM 로드)
  if (format === 'module') { /* ... */ }

  // wrapSafe 호출 — patched 여부에 따라 내부에서 분기
  const { function: compiledWrapper } = wrapSafe(filename, content, this, format);

  // Wrapper Function 에 인자로 전달할 5개 변수 준비
  const dirname = path.dirname(filename);

  // require 함수를 클로저로 생성하여 전달
  const require = makeRequireFunction(this);
  const exports = this.exports;
  const module  = this;

  this[kIsExecuting] = true;
  FunctionPrototypeCall(compiledWrapper, exports, exports, require, module, filename, dirname);
  this[kIsExecuting] = false;
};
```

`loadSource` 가 반환한 코드 문자열은 `module._compile` 의 인자로 전달된다.
이 메서드가 코드를 Wrapper Function 으로 감싸는 `wrapSafe` 를 호출하는 진입점이다.

`wrapSafe` 가 반환하는 것은 `{ function: compiledWrapper }` 형태의 객체다.
`Module._compile` 은 여기서 래핑된 함수 (`compiledWrapper`) 를 실행하는 역할을 한다.

### wrapSafe 개요: 두 경로 분기

`wrapSafe` 함수는 인자로 받은 코드를 Wrapper Function 에 감싸 반환하는 역할을 한다.

```javascript
// lib/internal/modules/cjs/loader.js
function wrapSafe(filename, content, cjsModuleInstance, format) {
  if (patched) {
    // Module.wrap 이 교체된 경우 — string 결합 후 vm 으로 컴파일
    const wrapped = Module.wrap(content);
    const script = makeContextifyScript(wrapped, filename, ...);
    return { function: runScriptInThisContext(script, true, false) };
  }
  // 일반 경로 — V8 네이티브 바인딩으로 직접 컴파일
  return compileFunctionForCJSLoader(content, filename, false, shouldDetectModule);
}
```

`patched === false` 일 때는 `compileFunctionForCJSLoader` 를, `patched === true` 일 때는 `Module.wrap` 을 호출한다.
각 경로의 상세는 Step 5에서 살펴본다.

### 왜 코드를 굳이 Wrapper Function 으로 감싸는가?

코드를 함수로 한번 더 감싸는 데에는 크게 두 가지 이유가 있다.

- **전역 오염 방지** — `var x = 1` 같은 최상위 변수가 `global` 에 붙지 않도록 파일 스코프를 격리한다.
- **변수 주입** — `exports`, `require`, `module`, `__filename`, `__dirname` 을 각 파일 고유의 지역 변수로 주입하기 위해 매개변수로 선언한다.

Function Scope 를 활용하여 스코프를 격리함과 동시에 각 파일 별 고유 변수 (`require`, `module`) 를 주입하기 위함이라고 이해했다.

### patched 경로: Module.wrap 의 역할

`Module.wrap` 은 코드 문자열 앞뒤에 IIFE 래퍼를 붙이는 역할만 한다.

```javascript
// lib/internal/modules/cjs/loader.js
const wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});',
];

Module.wrap = function(script) {
  return wrapper[0] + script + wrapper[1];
};
```

---

## Step 5 — wrapSafe: 두 경로와 컴파일 시점

`patched` 플래그는 `Module.wrap` 이 교체됐는지를 감지하는 내부 sentinel 이다.

```javascript
// lib/internal/modules/cjs/loader.js
let patched = false;

const wrapOrig = Module.wrap;
Object.defineProperty(Module, 'wrap', {
  get() { return wrapOrig; },
  set(value) {
    patched = true;  // ← 교체 감지
    Module.wrap = value;
  }
});
```

`Module.wrap` 에 setter 가 걸려 있어, 사용자가 `Module.wrap = customFn` 으로 교체하는 순간 `patched = true` 가 된다.
`wrapSafe` 는 이 플래그를 보고 두 경로 중 하나를 탄다.

| 경로 | 조건 | 흐름 |
|---|---|---|
| patched | Module.wrap 교체됨 | Module.wrap → makeContextifyScript → runScriptInThisContext |
| 일반 | Module.wrap 미교체 | compileFunctionForCJSLoader (V8 native binding) |

### 일반 경로 — compileFunctionForCJSLoader

이 함수는 JS 파일이 아닌 `src/node_contextify.cc` 에 정의된 C++ 함수다.
Node.js 소스에서 JS 파일로 검색해도 찾을 수 없는 이유가 여기에 있다.

```cpp
// src/node_contextify.cc (simplified)
static void CompileFunctionForCJSLoader(
    const FunctionCallbackInfo<Value>& args) {

  Local<String> code     = args[0].As<String>();  // 소스 코드
  Local<String> filename = args[1].As<String>();  // 파일명

  ScriptOrigin origin(isolate, filename, ...);
  ScriptCompiler::Source source(code, origin);

  // Wrapper Function 의 5개 매개변수를 V8 에 직접 전달
  Local<String> params[] = {
    env->exports_string(),   // "exports"
    env->require_string(),   // "require"
    env->module_string(),    // "module"
    env->filename_string(),  // "__filename"
    env->dirname_string(),   // "__dirname"
  };

  // IIFE 없이 Function 객체를 직접 생성
  MaybeLocal<Function> maybe_fn = ScriptCompiler::CompileFunction(
      context,
      &source,
      5,        // params 개수
      params,   // 매개변수 이름 배열
      0, nullptr, options
  );

  args.GetReturnValue().Set(maybe_fn.ToLocalChecked());
}
```

핵심은 V8 의 `ScriptCompiler::CompileFunction` API 다.
소스 코드를 **함수 본문**으로 인식하고 매개변수 이름을 함께 전달받아, 처음부터 Function 객체로 컴파일한다.

### 두 경로의 내부 흐름 비교

```
[patched 경로]
Module.wrap(content)
  └─ "(function(exports, require, ...) { " + content + "\n});"  ← string 결합
     └─ makeContextifyScript(wrapped, filename)
        └─ new vm.Script(wrapped)
           └─ runScriptInThisContext(script)    ← IIFE 실행
              └─ 내부 Function 꺼냄            ← V8 파싱 2회

[일반 경로]
compileFunctionForCJSLoader(content, filename)
  └─ ScriptCompiler::CompileFunction(
         source = content,
         params = ["exports","require","module","__filename","__dirname"]
     )
     └─ V8 파서: 처음부터 Function Scope 로 파싱  ← V8 파싱 1회
        └─ Function 객체 즉시 반환
```

patched 경로는 IIFE 로 감싼 뒤 실행해 내부 함수를 꺼내는 **2단계** 구조다.
일반 경로는 V8 에 "처음부터 함수" 라고 알려주어 **1단계**로 끝낸다.

### 컴파일 완료 — 하지만 실행은 아직이다

두 경로 모두 최종적으로 호출 대기 상태의 Function 객체를 반환한다.
파일 코드의 실행은 이 시점에서 일어나지 않는다.

```javascript
typeof compiledWrapper // 'function'
// (function(exports, require, module, __filename, __dirname) { ... })
// 정의만 완료 — 호출은 Step 6 의 FunctionPrototypeCall 에서 일어난다
```

`vm.runInThisContext` 기반의 컴파일은 `eval` 과 달리 현재 스코프를 격리한다.

```javascript
const x = 1;
eval('console.log(x)');                // 1 — 현재 스코프 접근 가능
vm.runInThisContext('console.log(x)'); // ReferenceError — 격리됨
```

---

## Step 6 — FunctionPrototypeCall: 5개 변수 주입 후 실행

`wrapSafe` 가 컴파일한 `compiledWrapper` 는 아직 호출 대기 상태의 Function 객체다.
`Module.prototype._compile` 이 이를 실제로 실행한다.

실행 전에 5개 변수를 계산하고, `kIsExecuting` 플래그로 실행 상태를 추적한다.

```javascript
// lib/internal/modules/cjs/loader.js — _compile 내부
const dirname = path.dirname(filename);         // __dirname
const require = makeRequireFunction(this);      // require (이 파일 기준)
const exports = this.exports;                   // exports (= module.exports 초기값 {})
const module  = this;                           // module (현재 Module 인스턴스)
// filename 은 그대로 __filename 으로 주입

this[kIsExecuting] = true; // ← 이 모듈이 현재 실행 중임을 마킹

result = FunctionPrototypeCall(
  compiledWrapper, // compiledWrapper.call(exports, exports, require, module, filename, dirname)
  exports,         // this
  exports,         // exports 매개변수
  require,         // require 매개변수
  module,          // module 매개변수
  filename,        // __filename
  dirname,         // __dirname
);

this[kIsExecuting] = false; // ← 실행 완료
```

**`kIsExecuting` 플래그의 역할**

Node.js 내부에서 "이 모듈이 현재 실행 중인가"를 추적하는 심볼이다.
`true` 인 동안은 파일 코드가 평가되고 있는 상태이며, `false` 가 되면 실행이 완료된 것이다.

`module.loaded` 는 상위 `Module.prototype.load` 에서 설정되므로,
`kIsExecuting === false` 이지만 아직 `loaded === false` 인 순간이 존재한다.

**`FunctionPrototypeCall` 을 쓰는 이유**

`fn.call()` 과 동작은 같다.
다만 사용자 코드가 `Function.prototype.call` 을 덮어써도 영향받지 않는다.
Node.js 내부에서 primordials 패턴으로 표준 내장 메서드를 시작 시점에 저장해두고 사용하는 방식이다.

**실행 결과**

`FunctionPrototypeCall` 이 실행되는 순간 파일 코드가 평가된다.

```javascript
// foo.js 의 코드가 실행됨
module.exports = { value: 10 };
// module === this 이므로
// → this.exports = { value: 10 } 으로 변경됨
```

---

## module.exports vs exports

`FunctionPrototypeCall` 실행 시 `exports` 와 `module.exports` 가 동시에 래퍼에 주입된다.
이 두 변수의 관계를 짚어두지 않으면 실행 결과가 예상과 다를 수 있다.

래퍼가 실행되기 전 초기 상태를 이해해야 한다.

```javascript
const module  = new Module(filename); // module.exports = {}
const exports = module.exports;       // 같은 객체의 별칭
```

```
module.exports ──┐
                 ↓
              힙: {}
                 ↑
exports ─────────┘
```

두 변수가 동일한 객체를 가리킨 채로 시작한다.

**`exports.foo = 1` 이 동작하는 이유**

```javascript
exports.foo = 1;
// exports 와 module.exports 가 같은 객체 → 프로퍼티 추가 시 양쪽 반영
```

**`exports = { foo: 1 }` 이 동작하지 않는 이유**

```javascript
exports = { foo: 1 };
// exports 는 래퍼 함수의 지역 변수
// 재할당하면 module.exports 와의 참조가 끊김
// require 는 module.exports 를 반환 → {} 반환
```

```
module.exports ──→ 힙: {}           ← require 는 이걸 반환
exports ─────────→ 힙: { foo: 1 }  ← 연결 끊김, 버려짐
```

**`module.exports = { foo: 1 }` 이 동작하는 이유**

```javascript
module.exports = { foo: 1 };
// require 가 반환하는 module.exports 자체를 교체
```

> require 가 반환하는 것은 항상 module.exports 다.

---

## Step 7 — loaded 플래그와 module.exports 반환

`_compile` 이 반환되면 `Module.prototype.load` 에서 `this.loaded = true` 를 설정한다.

```javascript
// Module.prototype.load 마지막
Module._extensions[extension](this, filename); // _compile 내부 FunctionPrototypeCall 완료
this.loaded = true; // ← 이제 완전히 로드된 상태
```

그리고 `Module._load` 로 돌아와 `module.exports` 를 반환한다.

```javascript
// Module._load 마지막
module.load(filename); // 내부에서 this.loaded = true 까지 완료됨
return module.exports; // 최종 반환
```

**각 시점의 상태 정리**

```javascript
require('./foo') 호출
  module.loaded        === false
  module[kIsExecuting] === false

  _compile 진입
    module[kIsExecuting] === true   ← 실행 중 (파일 코드 평가)
    (module.exports 에 값이 채워짐)
  _compile 반환
    module[kIsExecuting] === false  ← 실행 완료
    module.loaded        === false  ← 아직 false

  Module.prototype.load 에서 loaded = true 설정
    module.loaded        === true   ← 완전히 로드됨

  Module._load 에서 module.exports 반환
```

`require.cache` 에서 캐시 항목을 확인하면 `Module` 인스턴스가 통째로 저장되어 있다.

```javascript
require('./foo');
const entry = require.cache[require.resolve('./foo')];
// Module {
//   id: '/path/to/foo.js',
//   filename: '/path/to/foo.js',
//   loaded: true,            ← true
//   exports: { value: 10 }, ← 파일 코드 실행 결과
//   children: [],
// }
```

`require` 의 반환값과 `cache.exports` 는 동일한 메모리 참조다.

```javascript
const foo = require('./foo');
foo === require.cache[require.resolve('./foo')].exports // true
```

---

## primordials — 내장 메서드를 시작 시점에 고정하는 패턴

Node.js 내부에서 `FunctionPrototypeCall`, `ArrayPrototypePush` 같은 이름의 함수를 자주 마주치게 된다.
이것이 primordials 패턴이다.

```javascript
// lib/internal/primordials.js
const {
  FunctionPrototypeCall,   // = Function.prototype.call
  ArrayPrototypePush,      // = Array.prototype.push
  ObjectCreate,            // = Object.create
  StringPrototypeEndsWith, // = String.prototype.endsWith
  // ...
} = primordials;
```

Node.js 프로세스가 시작될 때 표준 내장 메서드들의 참조를 `primordials` 객체에 저장한다.
이후 내부 코드는 `Function.prototype.call` 대신 `FunctionPrototypeCall` 을 사용한다.

### 왜 필요한가?

사용자 코드가 내장 프로토타입을 덮어쓸 수 있기 때문이다.

```javascript
// 사용자가 이렇게 하면?
Function.prototype.call = () => 'hacked';

// fn.call(...)                   → 'hacked' (망가짐)
// FunctionPrototypeCall(fn, ...) → 원본 동작 유지
```

primordials 에 저장된 참조는 프로세스 시작 시점의 원본 함수를 가리키므로,
이후 프로토타입이 어떻게 변경되든 영향을 받지 않는다.

### 네이밍 규칙

| primordial 이름 | 원본 |
|---|---|
| `FunctionPrototypeCall` | `Function.prototype.call` |
| `ArrayPrototypePush` | `Array.prototype.push` |
| `ObjectCreate` | `Object.create` |
| `StringPrototypeEndsWith` | `String.prototype.endsWith` |

`{Constructor}Prototype{Method}` 또는 `{Constructor}{StaticMethod}` 형태로 일관되게 명명된다.
