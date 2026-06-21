## Edge Runtime이란?

Next.js의 Edge Runtime은 Node.js 런타임과 다른 별도의 실행 환경이다. 미들웨어(middleware.ts)는 항상 Edge Runtime을 기반으로 동작한다. 이 동작 방식이 내부적으로 어떻게 구현되어 있는지 소스코드를 통해 파악한 내용을 정리했다.  

---

## Node.js vm 모듈

Edge Runtime의 핵심은 Node.js의 `vm` 모듈이다.  

> The `vm` module enables compiling and running code within V8 Virtual Machine contexts.  

`vm` 모듈은 V8 가상 머신 컨텍스트 내에서 스크립트를 컴파일하고 실행 가능하도록 한다.  

**샌드박스 환경**으로 코드를 실행해 보다 안전한 환경에서 검증되지 않은 코드를 실행할 수 있게 한다.  

이 모듈을 사용할 경우 다른 V8 엔진 구현체(Context) 내에서 코드를 실행할 수 있다.  

각 실행된 코드들이 고유한 스코프를 가지며, 전역 변수를 서로 공유하지 않는다.  

Next.js에서는 middleware 파일이 저장된 경로를 기반으로 소스 코드를 가져오고, edge runtime context를 기반으로 코드를 실행한다.  

---

## @edge-runtime/vm 구현

`@edge-runtime/vm` 내부에서는 VM 클래스를 정의해 독립적인 Context를 생성한다.  

```typescript
export class VM<T extends Record<string | number, any>> {
  public readonly context: VMContext & T;

  constructor(options: VMOptions<T> = {}) {
    const context = createContext({}, {
      name: 'Edge Runtime',
      codeGeneration: options.codeGeneration ?? {
        strings: false,
        wasm: true,
      },
    }) as VMContext;

    this.context = options.extend?.(context) ?? (context as VMContext & T);
  }

  evaluate<T = any>(code: string): T {
    return runInContext(code, this.context);
  }
}
```

- `createContext`: 빈 객체를 기반으로 새로운 V8 Context를 생성한다
- `runInContext`: 생성된 Context 내에서 코드를 실행한다
- `codeGeneration.strings: false`: `eval` 또는 함수 생성자를 사용하면 `EvalError`를 발생시킨다

---

## EdgeVM — Web API 주입

`EdgeVM`은 VM 클래스를 상속하며, `addPrimitives`로 Web API를 Context에 추가한다.  

```typescript
export class EdgeVM<T extends EdgeContext = EdgeContext> extends VM<T> {
  constructor(options?: EdgeVMOptions<T>) {
    super({
      ...options,
      extend: (context) => {
        return options?.extend
          ? options.extend(addPrimitives(context))
          : (addPrimitives(context) as EdgeContext & T);
      },
    });
  }
}
```

```typescript
function addPrimitives(context: VMContext) {
  defineProperty(context, 'self', { enumerable: true, value: context });
  defineProperty(context, 'globalThis', { value: context });
  defineProperty(context, 'clearTimeout', { value: clearTimeout });
  defineProperty(context, 'setTimeout', { value: setTimeout });
  defineProperty(context, 'queueMicrotask', { value: queueMicrotask });
  defineProperty(context, 'EdgeRuntime', { value: 'edge-runtime' });

  // TextDecoder, TextEncoder, fetch, crypto 등을 context에 추가
  defineProperties(context, {
    exports: loadPrimitives({ ...transferables }),
    enumerable: ['crypto'],
    nonenumerable: ['Crypto', 'CryptoKey', 'SubtleCrypto', /* ... */],
  });

  return context as EdgeContext;
}
```

이렇게 만들어진 Context는 Node.js 기본 모듈 대신 **Web Standard API만을 제공**하는 독립적인 실행 환경이 된다.  

---

## Next.js에서 Edge Runtime 사용

Next.js에서는 `createModuleContext` 함수를 통해 EdgeRuntime 인스턴스를 생성하고, 미들웨어 파일을 이 Context에서 실행한다.  

```typescript
async function createModuleContext(options: ModuleContextOptions) {
  const runtime = new EdgeRuntime({
    codeGeneration: process.env.NODE_ENV !== 'production'
      ? { strings: true, wasm: true }
      : undefined,
    extend: (context) => {
      context.process = createProcessPolyfill();

      Object.defineProperty(context, 'require', {
        enumerable: false,
        value: (id: string) => {
          const value = NativeModuleMap.get(id);
          if (!value) throw TypeError('Native module not found: ' + id);
          return value;
        },
      });

      return context;
    },
  });

  return { runtime, paths: new Map(), warnedEvals: new Set() };
}
```

이후 `evaluateInContext`를 통해 미들웨어 파일의 내용을 Edge Runtime Context 내에서 실행한다.  

```typescript
const evaluateInContext = (filepath: string) => {
  if (!moduleContext.paths.has(filepath)) {
    const content = readFileSync(filepath, 'utf-8');
    runInContext(content, moduleContext.runtime.context, {
      filename: filepath,
    });
    moduleContext.paths.set(filepath, content);
  }
};
```

---

## 왜 Edge Runtime이 Node Runtime보다 빠른가

Edge Runtime에서는 Node.js에서 기본으로 제공하는 라이브러리 및 모듈을 사용할 수 없다. 자체적으로 새로운 Context를 생성하기 때문에 당연한 결과다.  

대신 Node.js Runtime보다 **압도적으로 경량화된 Context**를 기반으로 코드를 실행한다. Web Standard API만 제공하는 최소한의 환경이기 때문에 초기화 속도가 빠르고, 엣지 로케이션에서 실행하기에도 적합하다.  

사용자가 원한다면 Edge Runtime의 `extend` 메서드로 Context에 필요한 내용을 추가할 수 있다.  
