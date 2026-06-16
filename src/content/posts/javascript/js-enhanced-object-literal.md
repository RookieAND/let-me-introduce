# [#JS] Enhanced Object Literal

ES6에서 객체 리터럴 문법을 세 가지 방식으로 간결하게 만들었다.

## 1. 단축 프로퍼티

변수 이름과 프로퍼티 이름이 같으면 값을 생략할 수 있다.

```javascript
const name = 'Baik';
const age = 27;

// ES5
const person = { name: name, age: age };

// ES6
const person = { name, age };
```

## 2. 메서드 단축 표현

`function` 키워드 없이 메서드를 정의한다.

```javascript
// ES5
const obj = {
  greet: function() {
    return 'Hello';
  },
};

// ES6
const obj = {
  greet() {
    return 'Hello';
  },
};
```

단축 메서드는 `super` 키워드를 쓸 수 있고, 생성자로 쓸 수 없다.

## 3. 계산된 프로퍼티 이름

대괄호 `[]` 안에 표현식을 넣어 동적으로 키를 정의한다.

```javascript
const prefix = 'user';
const id = 1;

const obj = {
  [prefix + '_' + id]: 'Baik',
  [`${prefix}_name`]: 'Gwangin',
};

// { user_1: 'Baik', user_name: 'Gwangin' }
```

API 응답 키를 동적으로 매핑하거나, 상태 관리에서 키를 동적으로 설정할 때 유용하다.
