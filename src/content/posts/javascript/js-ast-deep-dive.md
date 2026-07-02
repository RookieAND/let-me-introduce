## 들어가며

입사 후 Babel 플러그인을 처음 개발했던 날이 기억난다. 당시 레거시 코드에서 특정 패턴을 일괄 변환해야 하는 작업이 있었고, 누군가 "Babel 플러그인으로 만들면 되지 않아요?" 라고 제안했다. 

그래서 처음에는 `@babel/plugin-transform-arrow-functions` 같은 플러그인을 직접 참고하면서 Visitor 패턴으로 뭔가를 만들어봤는데, 코드가 동작하긴 했지만 그때 당시에는 정작 내부에서 무슨 일이 일어나는지는 전혀 몰랐다.

플러그인 안에서 `path.node.type`을 확인하고, `path.replaceWith()`를 호출하는 코드를 작성했지만, 그 `node`가 정확히 무엇인지, 왜 `path`와 `node`가 다른 개념인지 명확하지 않았다. 그냥 "동작하니까 넘어가자"는 식이었지..

하지만 얼마 지나지 않아 더 복잡한 변환을 구현해야 할 때 이 무지가 발목을 잡았다.
`BinaryExpression` 안에 중첩된 `CallExpression`을 찾아 수정하는 작업에서 어디서부터 손을 대야 할지 감이 오지 않았다.

그래서 이번 기회에 다시 원점으로 되돌아가서 AST 에 대해 다시 파고들기로 했다. 
코드가 어떤 과정을 거쳐 트리가 되는지, 그 트리의 각 노드가 어떤 구조를 갖는지, 그리고 Babel은 그 트리를 어떻게 순회하는지 등.. 이번 글에서 이를 기록하고자 한다!

---

## 소스 코드가 트리가 되기까지

우리가 한 가지 알아두어야 할 점은, 소스 코드는 결국 문자열이라는 것이다.

`const x = 1 + 2;`라는 텍스트는 컴퓨터 입장에서는 단순한 문자의 나열일 뿐이다. 
이 문자열을 프로그램으로 이해하려면 구조가 필요하다. 파서(parser)가 바로 그 구조를 만들어내는 도구다.

파싱은 크게 두 단계로 나뉜다. 

첫 번째는 **렉싱(lexing)** 또는 **토크나이징(tokenizing)**이다. 

소스 코드를 의미 있는 최소 단위인 **토큰**으로 쪼개는 단계인데, `const`, `x`, `=`, `1`, `+`, `2`, `;` 처럼 나뉘고 각 토큰에는 종류(keyword, identifier, operator 등)와 위치 정보가 붙는다.

두 번째는 **파싱** 단계다. 

파싱이란 앞선 작업에서 생성된 토큰들을 내부 문법 규칙에 따라 트리 구조로 조립하는 과정을 의미한다.
예를 들어 `1 + 2`는 단순히 세 토큰이 아니라 "left가 1이고 right가 2인 BinaryExpression"이라는 구조적 의미를 갖는다. 

이 과정의 결과물이 **추상 구문 트리(Abstract Syntax Tree, AST)**다.

여기서 굳이 "추상" 이라는 단어가 붙은 이유는 AST 가 소스 코드의 모든 세부사항을 담지 않기 때문이다. 
괄호나 세미콜론 같은 구두점은 문법적으로는 의미가 있지만, 이미 트리 구조 자체가 그 의미를 표현하므로 AST에서는 생략된다. 

결과적으로 `const x = 1 + 2;`를 파싱하면 아래와 같은 트리가 만들어진다.

```json
{
  "type": "Program",
  "body": [{
    "type": "VariableDeclaration",
    "kind": "const",
    "declarations": [{
      "type": "VariableDeclarator",
      "id": {
        "type": "Identifier",
        "name": "x"
      },
      "init": {
        "type": "BinaryExpression",
        "operator": "+",
        "left": {
          "type": "NumericLiteral",
          "value": 1
        },
        "right": {
          "type": "NumericLiteral",
          "value": 2
        }
      }
    }]
  }]
}
```

트리를 보면 가장 먼저 보이는 지점이 바로 `Program`이 루트 노드다. 
그 아래 `VariableDeclaration` 이 있고, 그 안에 `VariableDeclarator` 가 있다. 
선언된 변수 이름은 `Identifier`, 초기값은 `BinaryExpression`으로 표현된다. 

최종적으로 생성된 AST 를 보면 각 노드가 부모-자식 관계로 연결되어 전체 코드의 의미를 표현함을 알 수 있다.

> 파싱은 문자열을 의미 있는 트리 구조로 변환하는 과정이다. AST는 코드의 "무엇을 의미하는가"를 담은 구조적 표현이다.

---

## AST의 노드 구조

트리를 이루는 각 단위를 **노드(node)**라 부른다. 모든 AST 노드는 공통 인터페이스를 가진다.

```tsx
// estree 스펙 기반 (JavaScript AST 표준)
interface Node {
  type: string;
  loc?: SourceLocation;    // 소스에서의 위치 (줄/열)
  range?: [number, number]; // 소스 문자열에서의 오프셋
}

interface SourceLocation {
  start: { line: number; column: number };
  end:   { line: number; column: number };
}
```

여기서 가장 눈여겨 볼 점은 바로 `type` 필드다. 

이는 노드의 종류를 식별하는 유일한 방법이며, 파서나 변환 도구는 이 값을 기준으로 노드를 처리한다. 
`loc`는 원본 소스의 어느 줄, 어느 열에 해당하는지를 담는데 에러 메시지나 소스맵을 만들 때 이 정보가 쓰인다. 
`range`는 문자열 인덱스 기준의 오프셋으로 같은 위치를 다른 방식으로 표현하는데 쓰인다.

노드 타입은 **코드의 구조를 직접 반영한다는 점**을 잊지 말자!

가장 바깥에 위치한 타입이 `Program`이고 그 아래로 각 선언문과 표현식이 트리로 펼쳐진다. 
변수 선언 하나만 봐도 두 개의 노드 타입이 쓰임을 알 수 있는데, `VariableDeclaration`이 `const`/`let`/`var` 키워드와 선언 목록 전체를 감싸고, 실제 선언 항목 하나하나는 `VariableDeclarator`가 담당한다.

함수는 정의 방식에 따라 크게 세 타입으로 갈린다. (함수 선언식, 함수 표현식, 화살표 함수)

`function foo() {}` 형식은 `FunctionDeclaration`, `const foo = function() {}` 형식은 `FunctionExpression`, `const foo = () => {}` 형식은 `ArrowFunctionExpression`이다. 

이 때문에 런타임에서는 동작이 거의 같지만 AST 위에서는 완전히 다른 노드로 존재한다. 
그렇기에 Babel 플러그인이 화살표 함수를 일반 함수로 변환할 때 이 구분이 아주아주 중요해진다.

추가로 값과 이름을 다루는 노드도 각기 구분된다. 

변수명, 함수명처럼 이름을 가리키는 식별자는 `Identifier` 이고 `name` 필드에 실제 이름이 담긴다. 
이때 리터럴 값은 파서마다 표현 방식이 다른데, Babel은 `NumericLiteral`, `StringLiteral`처럼 세분화하고 estree 스펙은 `Literal` 하나로 통합한다.

연산과 호출은 각자 고유한 구조를 가진다. 

`+`, `-` 같은 이항 연산자는 `BinaryExpression`으로 표현되며 `operator`, `left`, `right` 필드를 갖는다. 
함수 호출은 `CallExpression`인데, `callee`(호출되는 함수)와 `arguments`(인자 목록)로 구성된다. 

`obj.prop` 같은 속성 접근은 `MemberExpression`이고, 접근한 `object` 와 `property` 필드가 있다.

마지막으로 번들러가 모듈 그래프를 분석할 때는 `ImportDeclaration`과 `ExportDeclaration`을 탐색한다.
이는 모듈의 Import 와 Export 키워드를 의미하며 해당 모듈에서 어떤 모듈을 참조하고 내보내는지를 알 수 있다.

> 노드의 `type` 필드는 그 노드가 코드에서 어떤 역할을 하는지를 나타낸다. 파서와 변환 도구는 이 값을 기준으로 노드를 분기 처리한다.

---

## 트리를 어떻게 탐색하는가

이렇게 생성된 AST를 변환하거나 분석하려면 결국 트리 전체를 순회해야 한다. 
우리가 떠올릴 수 있는 가장 기본적인 방식은 **깊이 우선 탐색(DFS, Depth-First Search)**이다.

루트 노드에서 시작해서 자식 노드로 내려가고 더 이상 자식이 없으면 형제 노드로 이동한다. 
이를 재귀 함수로 구현하면 아래와 같이 직관적인 코드를 하나 작성할 수 있다.

```jsx
function traverse(node) {
  if (!node || typeof node !== 'object') return;

  console.log(node.type); // 노드 방문

  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(traverse);
    } else if (child && child.type) {
      traverse(child);
    }
  }
}
```

이 함수는 노드를 방문할 때마다 `node.type`을 출력하는 단순한 기능을 한다.

하지만 단순 DFS만으로는 "특정 유형의 노드를 만났을 때 특정 작업을 한다"는 요구를 깔끔하게 처리하기 어렵다.
왜냐하면 노드의 유형마다 분기 로직이 함수 안에 뒤섞이기 때문이다.

그래서 Babel이 채택한 해법은 바로 **Visitor 패턴**이다. 
이는 탐색 로직과 처리 로직을 분리하여 탐색은 Babel 내부가 담당하고 외부에서는 어떤 노드 유형에 어떤 작업을 할지만 선언하는 방식이다.

탐색과 작업을 두 개의 관점으로 분리하여 사용자는 특정 노드에 대한 작업을 정의만 하면 되기 때문에 탐색 로직에 대한 부담이 감소한다는 장점이 있다.

```jsx
// Babel에서 AST를 순회하는 방식
const visitor = {
  // Identifier 노드를 만날 때마다 호출
  Identifier(path) {
    console.log(path.node.name);
  },

  // FunctionDeclaration 노드를 만날 때
  FunctionDeclaration: {
    enter(path) { /* 진입 시 */ },
    exit(path)  { /* 탈출 시 */ }
  }
};
```

객체를 구성하는 각각 키는 노드의 유형 이름이고 값은 그 노드를 방문했을 때 실행할 함수다. 
단순히 함수를 값으로 쓰면 `enter`와 동일하게 동작하지만 필요 시 `enter`와 `exit` 두 단계로 나눌 수도 있다. 

두 단계의 차이는 자식 노드 방문 여부인데, `enter` 시점에는 아직 자식을 방문하지 않은 상태라 현재 노드를 기준으로만 작업할 수 있다. 
반면 `exit` 시점에는 모든 자식 방문이 끝난 뒤라서 자식 처리 결과에 의존하는 변환이라면 반드시 `exit`를 써야 한다.

이때 내부적으로 `path`와 `node` 또한 구분이 필요하다. 
왜냐하면 node는 단순한 데이터 객체라서 자기 자신의 위치를 모르기 때지만 path 는 아니기 때문이다.

처음 Babel 코드를 봤을 때 왜 `node`를 직접 쓰지 않고 `path`를 통해 접근하는지 이해가 안 됐는데, `path`는 단순한 노드가 아니라 그 노드의 **위치 정보와 탐색 컨텍스트** 전체를 담은 객체였다.

그렇기 때문에 `path.node`가 실제 AST 노드고, `path.parent`는 부모 노드, `path.scope`는 현재 스코프 정보를 담는다. 

`path.replaceWith()`, `path.remove()` 같은 메서드로 트리를 수정할 수 있는 것도 `path`가 탐색 컨텍스트를 갖고 있기 때문이다.

> Visitor 패턴은 탐색(어떻게 순회할 것인가)과 처리(무엇을 할 것인가)를 분리한다. 이 분리 덕분에 각 변환 플러그인은 자신이 관심 있는 노드 유형만 선언하면 된다.

AST를 직접 탐구해보고 싶다면 **astexplorer.net**이 가장 좋다! 나도 여기서 직접 코드를 치며 테스트했다. 

사이트 좌측에 분석하려는 JS 소스 코드를 입력하면 우측에서 각각의 Parser 별로 AST 트리를 실시간으로 확인할 수 있다. 
Babel, acorn, TypeScript, swc 등 다양한 파서를 선택할 수 있고, 특정 노드를 클릭하면 소스에서 대응하는 위치가 하이라이트된다. 

---

## 실제 변환: 화살표 함수 플러그인이 하는 일

들어가며에서 참고했던 `@babel/plugin-transform-arrow-functions`가 AST 수준에서 정확히 무슨 일을 하는지 보면, 지금까지 설명한 내용이 하나로 연결된다.

`const add = (a, b) => a + b;`를 파싱하면, `init` 자리에 `ArrowFunctionExpression` 노드가 들어온다.

```json
{
  "type": "VariableDeclarator",
  "id": { "type": "Identifier", "name": "add" },
  "init": {
    "type": "ArrowFunctionExpression",
    "params": [
      { "type": "Identifier", "name": "a" },
      { "type": "Identifier", "name": "b" }
    ],
    "body": {
      "type": "BinaryExpression",
      "operator": "+",
      "left":  { "type": "Identifier", "name": "a" },
      "right": { "type": "Identifier", "name": "b" }
    },
    "expression": true
  }
}
```

이때 플러그인이 하는 일은 이 `ArrowFunctionExpression` 노드를 `FunctionExpression`으로 교체하는 것이다.

```js
// @babel/plugin-transform-arrow-functions 핵심 로직 (단순화)
const plugin = ({ types: t }) => ({
  visitor: {
    ArrowFunctionExpression(path) {
      const { params, body } = path.node;

      // 화살표 함수의 body가 표현식이면 return문으로 감싼다
      const blockBody = t.isBlockStatement(body)
        ? body
        : t.blockStatement([t.returnStatement(body)]);

      path.replaceWith(
        t.functionExpression(null, params, blockBody)
      );
    }
  }
});
```

`path.replaceWith()`가 현재 `ArrowFunctionExpression` 노드를 새로 만든 `FunctionExpression` 노드로 교체한다. 트리의 특정 지점을 수술하듯 바꾸는 것이다.

하지만 여기서 끝이 아니다. 변환된 AST는 메모리 안의 객체일 뿐이기에 실제 코드 파일로 내보내려면 AST를 다시 소스 코드 문자열로 직렬화해야 한다. 이 역할을 `@babel/generator`가 담당한다.

```js
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

const code = `const add = (a, b) => a + b;`;
const ast = parse(code);

traverse(ast, plugin({ types: t }).visitor);

const { code: output } = generate(ast);
// 출력: const add = function(a, b) { return a + b; };
```

결국 Babel의 전체 파이프라인은 세 단계로 요약할 수 있다.

1. `parse`가 소스를 AST로 만든다.
2. `traverse`가 Visitor 패턴으로 AST를 수정한다.
3. `generate`가 수정된 AST를 다시 소스 문자열로 직렬화한다.

> `traverse`만 알고 `generate`를 모른다면 파이프라인이 어디서 끝나는지 그림이 그려지지 않는다. 변환은 중간 단계일 뿐이고, 최종 출력은 항상 `generate`를 통해 나온다.

---

## 마치며

처음 Babel 플러그인을 만들 때는 `path.node.type`을 체크하고 `path.replaceWith()`를 호출하는 게 그냥 "Babel이 그렇게 쓰는 방식"이라고만 생각했다. `node`와 `path`가 왜 다른지, `enter`와 `exit`를 굳이 나누는 이유가 뭔지 생각해본 적이 없었다.

들여다보고 나니 이 구조들이 전부 이유 있는 설계였다. `path`가 단순한 노드 래퍼가 아니라 탐색 컨텍스트 전체를 담는 이유도, Visitor 패턴으로 탐색과 처리를 분리한 이유도, `exit`가 `enter`와 별도로 존재하는 이유도. 그냥 "동작하니까 넘어가자"고 흘려보냈던 것들이 사실 각자 해결하는 문제가 있었다.

2편에서는 번들러가 이 AST를 실제로 어떻게 활용하는지를 다룬다. 파싱 단계에서 어떤 파서를 쓰는지, 트리 셰이킹이 AST 수준에서 어떻게 동작하는지. AST의 구조를 이해하면 번들러의 동작 방식도 훨씬 명확하게 보인다.
