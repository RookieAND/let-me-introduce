## 들어가며
과거 처음으로 JS 생태계에 입문했을 당시, 나는 번들러 없이 브라우저에서 직접 ESM을 써본 적이 있다.
그때는 번들러에 대한 개념이 아예 없었기 때문에 여러 JS 파일을 만들고 import / export 로 이를 참조하도록 했다.
Vite나 webpack 없이, 그냥 `<script type="module">`만으로 의존성을 관리할 수 있으면 얼마나 단순해질까 하는 생각에서 시작된 실험이었다. 실제로 간단한 유틸 함수는 문제없이 동작했다. 그런데 npm 패키지를 하나 쓰려는 순간 브라우저 콘솔이 에러를 뱉었다.
```javascript
TypeError: Failed to resolve module specifier "react".
Relative references must start with either "/", "./", or "../".
```
Node.js에서는 당연하게 동작하던 `import React from 'react'`가 브라우저에서는 전혀 작동하지 않는다!
프론트엔드에 대해 아무것도 모르던 시절에 처음 문제를 마주했을 때는 단순한 설정 문제인 줄 알았다.
그런데 파고들수록 이게 브라우저의 모듈 해석 알고리즘 자체가 Node.js와 다르기 때문이라는 걸 알게 됐다.
그리고 그 문제를 해결하기 위해 등장한 것이 바로 `importmap` 이라는 것도 최근에 알게 되었다. (Toss Slash)
이 글은 native ESM이 bare specifier 를 만났을 때 어떤 일이 벌어지는지,
그리고 최근에 도입된 [importmap MDN Spec](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) 이 그 문제를 어떻게 해결하는지 탐구한 기록이다.

## 브라우저에서 ESM이 bare specifier를 만나면
Node.js에서 `import React from 'react'`가 동작하는 이유는 Node.js가 **모듈 해석 알고리즘**을 갖고 있기 때문이다.
 패키지 이름으로 된 specifier를 만나면 `node_modules` 디렉토리를 탐색하고,
`package.json`의 `main` 또는 `exports` 필드를 읽어 실제 파일 경로를 찾아낸다.
하지만 브라우저에는 이런 알고리즘이 없다! 브라우저의 모듈 해석 규칙은 매우 단순하다.
- `./`, `../`, `/`로 시작하면 상대경로 또는 절대경로로 해석한다.
- `http://`, `https://`로 시작하면 URL로 해석한다.
- 그 외의 모든 것은 **bare specifier**이며, 브라우저는 이를 해석할 방법이 없다. (참 단순하다)
```javascript
// Node.js에서는 동작
import React from 'react';  // node_modules에서 찾음

// 브라우저에서는 에러를 던진다. 찾을 방법이 없기 때문이다..
// TypeError: Failed to resolve module specifier "react".
// Relative references must start with either "/", "./", or "../".
```
예제 코드에서도 알 수 있듯이 `'react'`는 `/`로도 `./`로도 `../`로도 시작하지 않는다.
따라서 브라우저 입장에서는 이게 어디 있는 파일인지 **알 방법이 전혀 없다.**
왜냐하면 브라우저에는 `node_modules` 도 없고 별도의 패키지 레지스트리도 없기 때문이다.
> bare specifier 문제는 브라우저의 모듈 해석 알고리즘이 의도적으로 단순하게 설계된 결과다.
> 파일 시스템 접근 권한이 없는 브라우저가 node_modules를 탐색하는 건 처음부터 불가능한 일이었다.

## native ESM 의 동작 방식
`<script type="module">` 을 선언하면 브라우저는 해당 스크립트를 ES Module로 처리한다.
그렇기에 이는 우리가 아는 일반적인 스크립트와는 다른 로딩 흐름을 거친다.
```html
<script type="module">
  import { add } from './utils.js';  // 반드시 .js 확장자 필요
  console.log(add(1, 2));
</script>
```
모듈을 불러오고 평가하는 흐름은 다음과 같다.
1. 브라우저가 HTML 을 파싱하다 `type="module"` 스크립트를 발견한다.
2. 경로에 위치한 모듈 파일을 fetch 한다. (다른 origin 에서 데이터를 가져오기에 CORS 정책이 적용된다.)
3. fetch 한 파일을 파싱하여 `import` 선언을 추출한다.
4. 각 `import`에 대해 재귀적으로 fetch 를 진행한다.
5. 모든 의존성이 준비된 후 코드를 실행한다.
```javascript
// module 스크립트는 defer처럼 동작
// HTML 파싱 완료 후 실행, DOMContentLoaded 전에 실행
import './a.js';    // 브라우저가 a.js를 fetch
import './b.js';    // b.js도 병렬 fetch
// a.js가 ./c.js를 import하면 c.js도 fetch
```
여기서 중요한 점은 fetch가 재귀적으로 동작한다는 점, 그리고 코드를 실행하기 전 각 import 를 탐색한다는 것이다!
이 말인 즉슨 의존성 그래프 전체를 브라우저가 직접 탐색한다는 의미와 일맥상통한다.
한 가지 주의해야 할 점이 있다면 브라우저에서는 모듈의 확장자도 반드시 명시해야 한다는 부분이다.
Node.js는 `.js`를 생략해도 Loader 를 기반으로 알아서 찾아주지만,
브라우저는 URL 그대로 fetch 하므로 확장자가 없으면 파일을 찾을 수 없다.

## importmap 이란?
오늘 소개할 importmap은 **bare specifier와 실제 URL 사이의 매핑을 HTML에 선언하는 방식**이다.
브라우저는 `type="module"` 스크립트를 실행하기 전에 importmap을 먼저 읽어 해석 규칙을 세팅한다.
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "lodash/": "https://esm.sh/lodash@4.17.21/"
  }
}
</script>

<script type="module">
  import React from 'react';         // → https://esm.sh/react@18.3.1
  import { add } from 'lodash/add';  // → https://esm.sh/lodash@4.17.21/add
</script>
```
`"react"`는 정확한 문자열 매핑이다. 그리고 `"lodash/"`처럼 슬래시로 끝나면 **prefix 매핑**이 된다.
`'lodash/add'`를 import하면 `lodash/` prefix를 URL prefix로 대체하여 `https://esm.sh/lodash@4.17.21/add`로 해석한다. (오오 신기)
한 가지 주의할 점은 importmap은 반드시 `type="module"` 스크립트보다 먼저 선언해야 한다.
왜냐하면 브라우저가 모듈을 해석하기 전에 의존성 관련 매핑 테이블이 준비되어 있어야 하기 때문이다.
재밌는 요소가 추가로 더 있는데, 바로 importmap은 `scopes` 를 통해 경로별로 다른 매핑을 적용할 수도 있다!
```html
<script type="importmap">
{
  "imports": {
    "lodash": "https://esm.sh/lodash@4.17.21"
  },
  "scopes": {
    "/legacy/": {
      "lodash": "https://esm.sh/lodash@3.10.1"
    }
  }
}
</script>
```
`/legacy/` 경로 아래의 모듈에서 `import 'lodash'`를 사용하면 v3을 가져온다.
그 외의 경로에서는 전역 `imports`에 정의된 v4를 가져온다. (이건 좀 많이 신기한데..?)
이는 동일 패키지의 여러 버전을 경로 기반으로 격리할 수 있는 메커니즘이라고 이해했다. 버전 관리까지 고려하다니..
> scopes는 패키지 버전 충돌 문제를 브라우저 수준에서 해결한다.
> Node.js의 중첩 node_modules 구조가 하던 역할을 importmap이 선언적으로 대체하는 셈이다.

## native ESM과 importmap이 만나는 지점
importmap이 등장하기 전까지 브라우저에서 bare specifier를 쓰려면 번들러가 필수였다.
webpack이나 Rollup은 빌드 단계에서 `'react'`를 실제 파일 경로로 교체하고 브라우저는 이미 변환된 코드를 받아서 실행했을 뿐이다.
importmap은 이 변환 과정을 모두 브라우저로 가져온다.
이 덕에 우리는 별도의 빌드 과정 없이 브라우저가 직접 bare specifier를 URL로 해석할 수 있게 된다.
`<script type="module">`의 정적 import 선언이 importmap의 매핑 테이블과 만나며 번들러 없는 ESM 환경이 완성된다.
두 기능이 협력하는 방식을 정리하면 다음과 같다.
- native ESM은 모듈 파일을 재귀적으로 fetch하고 파싱하는 런타임 로더다.
- importmap은 그 로더가 specifier를 해석할 때 참조하는 매핑 테이블이다.
- 브라우저는 `import` 선언을 만나면 먼저 importmap에서 해당 specifier를 찾는다. 매핑이 있으면 그 URL로 fetch한다.
실제로 [WICG의 importmap 스펙](https://github.com/WICG/import-maps)에서 설명하는 해석 순서도 이와 같다.
Specifier를 URL로 파싱하기 전에 importmap lookup을 먼저 수행하고, 매핑 결과가 있으면 그것을 최종 URL로 사용한다.
```html
<!-- 동작하는 최소 예시 -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client"
  }
}
</script>

<script type="module">
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  
  const root = createRoot(document.getElementById('app'));
  root.render(React.createElement('h1', null, 'Hello, native ESM'));
</script>
```
위 코드를 보아라! 그 흔한 번들러도 없고, 별도의 빌드 스텝도 없다. 그저 HTML 파일 하나로 React 앱이 동작한다!
물론 프로덕션에서 쓰기에는 성능과 캐싱 전략을 신경 써야 하지만, 이 조합이 가능하다는 사실 자체가 매우 흥미롭다!

## 마치며
bare specifier 에러 하나에서 시작된 탐구가 브라우저의 모듈 해석 알고리즘과 importmap 스펙까지 오게 될 줄이야..
처음에는 단순한 설정 문제인 줄 알았는데, 알고 보니 브라우저와 Node.js가 처음부터 다른 전제를 가지고 설계된 환경이었다.
번들러는 이 두 세계 사이의 간극을 메워주는 도구이며, importmap은 그 간극 자체를 브라우저 스펙 레벨에서 좁히려는 시도다.
아직 프로덕션에서 importmap만으로 복잡한 앱을 운용하기에는 생태계가 충분히 성숙하지 않았지만, 번들러가 없는 개발 환경이라는 방향성 자체는 확실히 존재한다는 점을 알았으니 이득이다.
