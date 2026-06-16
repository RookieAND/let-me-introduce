import type { Post } from "#/data/Posts";

export const JAVASCRIPT_POSTS: Post[] = [
  {
    slug: "cjs-module-evaluation-pipeline",
    date: "2026-06-13",
    cat: "JavaScript",
    title: "CJS : string 에서 exports 까지, 모듈 평가 파이프라인",
    excerpt: [
      "require() 가 파일을 불러온 뒤 실제로 무슨 일이 벌어지는가. loadSource 로 파일을 읽고, Module.wrap 으로 감싸고, wrapSafe 가 V8 에 컴파일하고, FunctionPrototypeCall 로 실행되기까지 — module.exports 에 값이 채워지는 전 과정을 Node.js 소스로 따라간다.",
    ],
    tags: ["Node.js", "CJS", "JavaScript", "Module"],
    read: "13 min",
    href: "/posts/cjs-module-evaluation-pipeline",
  },
  {
    slug: "cjs-require-module-resolution",
    date: "2026-06-12",
    cat: "JavaScript",
    title: "CJS : require 의 모듈 탐색 알고리즘",
    excerpt: [
      "require('./foo') 한 줄 뒤에서 Node.js 가 하는 일. Module 클래스, Module Wrapper, exports/module.exports 참조 관계, 캐싱 구조, 그리고 Core → 상대경로 → node_modules 순서로 진행되는 탐색 알고리즘까지.",
    ],
    tags: ["Node.js", "CJS", "JavaScript", "Module"],
    read: "12 min",
    href: "/posts/cjs-require-module-resolution",
  },
  {
    slug: "javascript-event-loop",
    date: "2023-02-01",
    cat: "JavaScript",
    title: "이벤트 루프란 무엇이며, 어떻게 진행되는 건가?",
    excerpt:
      ["JS 엔진은 단일 스레드지만 브라우저는 그렇지 않다. Task Queue와 Microtask Queue의 처리 순서, requestAnimationFrame과의 관계까지 이벤트 루프를 정확하게 정리했다."],
    tags: ["JavaScript", "이벤트 루프", "비동기"],
    read: "10 min",
    href: "/posts/javascript-event-loop",
  },
  {
    slug: "javascript-execution-context",
    date: "2023-02-01",
    cat: "JavaScript",
    title: "실행 컨텍스트란 무엇인가?",
    excerpt:
      ["JS 코드가 실행되기 전 엔진이 수집하는 환경 정보 객체, 실행 컨텍스트. VariableEnvironment·LexicalEnvironment·ThisBinding의 구조와 호이스팅이 일어나는 원리를 Call Stack 흐름으로 정리했다."],
    tags: ["JavaScript", "실행 컨텍스트", "호이스팅", "스코프"],
    read: "9 min",
    href: "/posts/javascript-execution-context",
  },
  {
    slug: "javascript-object-deep-dive",
    date: "2023-02-01",
    cat: "JavaScript",
    title: "JS의 Object를 조금 더 깊게 파헤쳐보자",
    excerpt:
      ["JS 객체의 프로퍼티 플래그(writable, enumerable, configurable), 참조 타입과 힙 메모리 구조, 얕은/깊은 복사의 함정까지 객체를 깊게 파헤쳤다."],
    tags: ["JavaScript", "Object", "메모리"],
    read: "9 min",
    href: "/posts/javascript-object-deep-dive",
  },
  {
    slug: "event-bubbling-capturing-delegation",
    date: "2023-04-01",
    cat: "JavaScript",
    title: "이벤트 버블링, 캡처링, 위임을 알아보자",
    excerpt:
      ["이벤트 흐름의 세 단계(캡처링 → 타깃 → 버블링)와 stopPropagation·stopImmediatePropagation의 차이, 그리고 이벤트 위임 패턴을 정리했다."],
    tags: ["JavaScript", "이벤트", "DOM"],
    read: "7 min",
    href: "/posts/event-bubbling-capturing-delegation",
  },
  {
    slug: "for-loop-let-var",
    date: "2023-02-01",
    cat: "JavaScript",
    title: "for 문 안에 let 과 var를 넣으면 뭐가 달라지나?",
    excerpt:
      ["for 루프 안에 var를 쓰면 클로저가 예상대로 작동하지 않는 이유, let이 블록 스코프로 이 문제를 해결하는 방식을 코드와 함께 설명했다."],
    tags: ["JavaScript", "let", "var", "클로저"],
    read: "5 min",
    href: "/posts/for-loop-let-var",
  },
  {
    slug: "javascript-equality-comparison",
    date: "2023-01-01",
    cat: "JavaScript",
    title: "JS에서는 동등 비교 연산을 어떻게 수행할까?",
    excerpt:
      ["JS의 ===·==·Object.is 세 가지 동등 비교 방식의 차이와 NaN·+0/-0 처리 방식, Map과 Set에 쓰이는 SameValueZero 알고리즘을 정리했다."],
    tags: ["JavaScript", "동등 비교", "NaN"],
    read: "7 min",
    href: "/posts/javascript-equality-comparison",
  },
  {
    slug: "javascript-iterable",
    date: "2023-01-01",
    cat: "JavaScript",
    title: "Iterable한 객체, 너가 대체 뭔지 알고 싶다",
    excerpt:
      ["ES6 Iteration Protocol을 정리하고, Python의 range 함수를 JS로 구현하는 과정에서 Iterable·Iterator·Well-formed Iterable·Generator의 관계를 명확히 했다."],
    tags: ["JavaScript", "Iterable", "Iterator", "Generator"],
    read: "8 min",
    href: "/posts/javascript-iterable",
  },
  {
    slug: "mongoose-connection-internals",
    date: "2023-06-01",
    cat: "JavaScript",
    title: "Mongoose Connection 내부 동작 — 싱글톤, Default Connection, Hot Reload 메모리 누수",
    excerpt: [
      "require('mongoose') 한 줄이 실행되는 순간 이미 connections 배열에는 빈 Connection이 하나 들어간다. 생성자 내부에서 createConnection()을 호출하기 때문이다. connect()와 createConnection()의 슬롯 차이, 그리고 Hot Reload마다 Connection이 쌓이는 메모리 누수까지.",
    ],
    tags: ["Node.js", "Mongoose", "MongoDB", "메모리 누수"],
    read: "8 min",
    href: "/posts/mongoose-connection-internals",
  },
];
