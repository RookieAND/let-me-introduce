# [#JS] New Feature in ES2020

## 객체에서도 쓸 수 있는 Spread / Rest

ES2020부터 객체에서도 스프레드와 레스트 연산자를 쓸 수 있다.

```javascript
const person = { name: 'Baik', age: 27, city: 'Seoul' };

// Rest — 나머지 프로퍼티 수집
const { name, ...rest } = person;
console.log(rest); // { age: 27, city: 'Seoul' }

// Spread — 객체 병합
const updated = { ...person, city: 'Busan' };
```

## 비동기 이터레이터와 제너레이터

`[Symbol.asyncIterator]`를 구현하면 비동기 데이터를 순차적으로 처리할 수 있다.

```javascript
async function* asyncRange(start, end) {
  for (let i = start; i <= end; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    yield i;
  }
}

for await (const num of asyncRange(1, 5)) {
  console.log(num); // 1, 2, 3, 4, 5 (100ms 간격)
}
```

## Promise.finally()

성공/실패와 무관하게 항상 실행된다.

```javascript
fetchData()
  .then(data => process(data))
  .catch(err => handleError(err))
  .finally(() => hideLoadingSpinner()); // 항상 실행
```

`finally`의 반환값은 무시된다.
이전 Promise의 값이 그대로 전달된다.

## 정규식 개선

### s 플래그 — dotAll

`.`이 줄바꿈 문자도 매칭한다.

```javascript
/foo.bar/s.test('foo\nbar'); // true
```

### 네임드 캡처 그룹

```javascript
const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const result = re.exec('2020-06-01');
result.groups; // { year: '2020', month: '06', day: '01' }
```

### 후방 탐색 (Lookbehind)

```javascript
/(?<=\$)\d+/.exec('$100'); // ['100'] — $ 뒤의 숫자
/(?<!\$)\d+/.exec('100');  // ['100'] — $ 앞에 없는 숫자
```

### 유니코드 프로퍼티 이스케이프

```javascript
/\p{Script=Hangul}/u.test('한글'); // true
```
