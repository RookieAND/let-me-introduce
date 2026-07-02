# [#JS] Class

## 클래스 기본 문법

JS는 원래 프로토타입 기반 상속 방식을 써왔다.
ES6의 `class` 문법은 그 위에 올라간 문법적 설탕(syntactic sugar)이다.

```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    return `Hi, I'm ${this.name}`;
  }
}

const person = new Person('Baik', 27);
person.greet(); // "Hi, I'm Baik"
```

클래스는 호이스팅되지 않는다.
선언 전에 사용하면 `ReferenceError`가 발생한다.
생성자는 반드시 하나여야 한다.

## 정적 메서드

인스턴스 없이 클래스 이름으로 직접 호출한다.

```javascript
class MathHelper {
  static add(a, b) {
    return a + b;
  }
}

MathHelper.add(1, 2); // 3
```

## Getter / Setter

프로퍼티 접근을 제어한다.

```javascript
class Circle {
  constructor(radius) {
    this._radius = radius;
  }

  get radius() {
    return this._radius;
  }

  set radius(value) {
    if (value < 0) throw new Error('음수 불가');
    this._radius = value;
  }

  get area() {
    return Math.PI * this._radius ** 2;
  }
}
```

## 상속

`extends`로 부모 클래스를 상속한다.
자식 클래스에서 `this`를 쓰기 전에 반드시 `super()`를 호출해야 한다.

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a noise.`;
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name); // 반드시 this 사용 전에
  }

  speak() {
    return `${this.name} barks.`;
  }
}
```
