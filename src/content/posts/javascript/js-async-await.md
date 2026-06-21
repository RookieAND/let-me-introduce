# [#JS] Async/Await

## 기본 문법

`async` 함수는 항상 Promise를 반환한다.  
`await`는 Promise가 완료될 때까지 함수 실행을 일시 중단한다.  

```javascript
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  const user = await res.json();
  return user;
}
```

Promise 체이닝과 비교하면 읽기가 훨씬 쉽다.  

```javascript
// Promise 체이닝
function fetchUser(id) {
  return fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(user => user);
}

// async/await
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

## 에러 처리

rejected Promise는 `try/catch`로 잡는다.  

```javascript
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('요청 실패:', err);
    throw err;
  }
}
```

## async 함수의 중요한 특성

`async` 키워드가 붙은 함수는 항상 비동기로 실행된다.  
캐시된 값을 동기적으로 반환하려 해도 Promise로 감싸진다.  

```javascript
async function getValue() {
  return 42; // Promise.resolve(42)와 동일
}

getValue().then(v => console.log(v)); // 42
```

## 병렬 실행

순서가 없는 여러 비동기 작업은 `Promise.all`로 병렬 처리한다.  

```javascript
async function fetchAll() {
  // 순차 실행 — 느림
  const user = await fetchUser();
  const posts = await fetchPosts();

  // 병렬 실행 — 빠름
  const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
}
```

## Top-level await

ES2022부터 모듈의 최상위 레벨에서 `await`를 직접 쓸 수 있다.  

```javascript
// module.js
const data = await fetch('/api/config').then(r => r.json());
export { data };
```
