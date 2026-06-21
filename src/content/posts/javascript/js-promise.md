# [#JS] Promise

## 왜 Promise가 필요한가

JS는 단일 스레드다.  
비동기 작업(네트워크, 타이머)을 처리하려면 콜백을 써야 했다.  
콜백은 중첩이 깊어질수록 읽기 어렵고 에러 처리가 분산된다.  

```javascript
// 콜백 지옥
getUser(id, (user) => {
  getProfile(user, (profile) => {
    getAvatar(profile, (avatar) => {
      // 더 깊어진다...
    });
  });
});
```

## Promise 기본

미래에 값을 제공하겠다는 약속이다.  
세 가지 상태가 있다.  

- `pending` — 아직 완료되지 않음
- `fulfilled` — 성공적으로 완료
- `rejected` — 실패

```javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('완료'), 1000);
});

promise
  .then(value => console.log(value)) // "완료"
  .catch(err => console.error(err));
```

## 체이닝

`then()`은 새 Promise를 반환해서 연결할 수 있다.  

```javascript
fetch('/api/user')
  .then(res => res.json())
  .then(user => fetch(`/api/profile/${user.id}`))
  .then(res => res.json())
  .catch(err => console.error(err));
```

## 유틸리티 메서드

```javascript
// 모두 완료될 때까지 대기 — 하나라도 실패하면 reject
Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => {});

// 모두 완료될 때까지 대기 — 성공/실패 무관
Promise.allSettled([p1, p2]).then(results => {
  results.forEach(r => console.log(r.status)); // "fulfilled" | "rejected"
});

// 가장 먼저 완료된 것만
Promise.race([p1, p2]).then(first => {});

// 이미 완료된 Promise 생성
Promise.resolve('즉시 완료');
Promise.reject(new Error('즉시 실패'));
```
