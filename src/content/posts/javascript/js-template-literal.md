# [#JS] Template Literal

## 백틱 문법

ES6에서 추가된 문자열 표현 방식이다.
백틱(`` ` ``)으로 감싸고 `${}` 안에 표현식을 넣는다.

```javascript
const name = 'Baik';
const greeting = `Hello, ${name}!`;
// ES5: 'Hello, ' + name + '!'
```

## 멀티라인 문자열

줄 바꿈을 백슬래시 없이 그대로 쓸 수 있다.

```javascript
const html = `
  <div>
    <p>Hello</p>
  </div>
`;
```

## 표현식 삽입

단순 변수뿐 아니라 모든 JS 표현식을 넣을 수 있다.

```javascript
const a = 10;
const b = 20;
console.log(`${a} + ${b} = ${a + b}`); // "10 + 20 = 30"
console.log(`최댓값: ${Math.max(a, b)}`);

const isAdmin = true;
console.log(`권한: ${isAdmin ? '관리자' : '일반 사용자'}`);
```

## Tagged Template

함수에 템플릿 리터럴을 전달하는 고급 패턴이다.
함수의 첫 인자는 문자열 배열, 나머지는 표현식 값이다.

```javascript
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return `${result}${str}${values[i] ? `<b>${values[i]}</b>` : ''}`;
  }, '');
}

const user = 'Baik';
const role = 'admin';
highlight`User ${user} has role ${role}.`;
// "User <b>Baik</b> has role <b>admin</b>."
```

`styled-components` 같은 라이브러리가 이 패턴을 활용한다.
