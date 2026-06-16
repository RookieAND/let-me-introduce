
> 내가 보기에 JS 에서 객체가 갖는 의미는 상당히 크다. 거의 **근본** 이라고 할 수 있다. 

JS는 객체에서 시작해서 객체로 끝난다고 생각할 정도로 그 영향력이 막강하다. 최근 JS Study를 통해 객체에 대한 여러 학습을 진행했으나, 여러 지식이 섞여 있어 이를 한번 명확히 정리해야 할 필요성을 느꼈다. 특히나 열거 가능한 속성에 대해 학습할때는 대체 열거 가능하다는 게 어떤 의미인지 이해하지 못해 학습에 시간이 꽤나 걸렸던 전적이 있어, 이번 기회에 한번 객체를 정리해보고자 한다.

## Object in JS

### JS에서 객체란 무엇인가?

-   객체는 원시형 (primitive) 과 달리 다양한 종류의 데이터를 여러개 넣을 수 있는 자료형이다.
-   객체는 중괄호 `{}` 를 이용해 만들거나, 객체 생성자 `new Object()` 를 활용해 만들 수 있다.

```javascript
let obj = new Object(); // 객체 생성자 문법
let obj2 = {}; // 객체 리터럴 문법
```

### Property

-   객체 내부에는 키와 값으로 구성된 한 쌍의 **프로퍼티 (property)** 가 다수 존재한다.
-   프로퍼티의 `key` 는 오직 문자열 혹은 심볼형만 가능하며, `value` 는 모든 자료형이 허용된다.
-   만약 문자열이나 심볼형에 속하지 않은 값이 `key` 로 오면 자동으로 문자열로 형 변환 된다.
-   그 외 프로퍼티의 `key` 에는 특별한 제약이 없다. JS에서 사용하는 예약어 또한 사용이 가능하다.

```javascript
let person = {
    firstName: 'Baik', // key: 'firstName', value: 'Baik'
    lastName: 'Gwangin', // key: 'lastName', value: 'Gwangin'
    0: 'Zero', // key: "0", value: "Zero" (number를 string으로 자동 변환)
    return: 'my future', // key: 'return', value: 'my future' (return 예약어를 key로 사용)
};
```

-   객체 내부의 프로퍼티 값을 읽는 방법은 프로퍼티 접근자 `.` 혹은 대괄호 연산을 사용한다.
-   단, 프로퍼티 접근자 `.` 의 경우에는 반드시 JS에서 유효한 식별자만 사용해야 한다.

```javascript
let person = {
    'first Name': 'Baik', // key: 'first Name', value: 'Baik'
    'last Name': 'Gwangin', // key: 'lastName', value: 'Gwangin'
};

person.first Name = 'Kim' // (X) 공백이 있어 유효한 식별자가 아니기에 에러 발생)
person['first Name'] = 'Kim' // (O) 정상적으로 프로퍼티 값이 Kim 으로 수정됨.
```

-   객체 리터럴 내부의 프로퍼티 `key` 가 대괄호로 감싸진 경우를 **계산된 (computed) 프로퍼티** 라 한다.
-   단순히 대괄호 안에 식별자만을 넣는 것이 아니라, 추가적인 연산을 통해 변형된 값을 넣어도 된다.

```javascript
const firstName = 'first Name';
const last = 'last';

// computed property 에 의해 각 변수의 값이 프로퍼티 key를 구성하게 됨.
let person = {
    [firstName]: 'Baik', // key: 'first Name', value: 'Baik'
    [last + 'Name']: 'Gwangin', // key: 'lastName', value: 'Gwangin'
};
```

-   객체에 존재하지 않는 프로퍼티 값에 접근하려 할 경우 JS는 `undefined` 를 반환한다.
-   이를 안전하게 확인하고 싶을 경우 `in` 키워드를 사용하여 프로퍼티의 존재 여부를 파악하자.

```javascript
let person = {
    firstName: 'Baik',
    lastName: 'Gwangin',
};

console.log('major' in person); // false
console.log('firstName' in person); // true
```

### Order of Property

- 객체의 프로퍼티를 반복문으로 나열할 경우, 정수 프로퍼티의 경우 작은 값 순으로 나열된다. 
- 그 외의 경우 정수 프로퍼티가 먼저 나열된 후에 객체에 추가한 순서대로 정렬된다.

```javascript
let test = {
  "4": "4",
  "2": "2",
  test: "test",
  "3": "3",
  "1": "1",
  test2: "test2",
};

for (let prop in test ) {
  console.log(prop); // 1, 2, 3, 4, test, test2
}
```


## How JS store Object in memory

### JS is Reference Type

-   객체는 다른 원시형 타입과는 다르게 언제든지 수정이 가능한 **(mutable 한)** 타입이다.
-	따라서 객체는 얼만큼의 메모리를 차지할지 알 수 없기 때문에, 원시형 타입과는 다른 방식으로 관리한다.

### Object instance is in Heap Memory

- JS는 객체를 생성할 경우 `Heap` 에 객체 인스턴스를 생성하고, 저장된 메모리 주소를 `Stack` 에 기록하여 사용한다.
- 따라서 최종적으로 객체의 식별자는 객체의 인스턴스 메모리 주소를 가진 `Stack` **메모리 주소를 가리킨다**.
- `Heap` 의 경우 동적으로 메모리가 할당되는 메모리 영역이기에, 수시로 변동될 수 있는 객체를 저장하기에는 적합하다.

```javascript
const obj1 = {
	name: 'Baik'
};
const obj2 = {
	name: 'Baik'
};

console.log(obj1 === obj2); // false
```
- 똑같은 내용의 객체를 선언하더라도, 두 객체의 인스턴스는 서로 다른 공간에 위치하기에 다르다고 판단한다.
- 엄격한 비교의 경우 참조형 타입은 `Heap` 에 저장된 객체 인스턴스의 **메모리 주소를 비교**하기 때문이다.


### When JS cannot access Object

```javascript
const obj1 = {
	name: 'Baik'
};
obj1 = null;
```

- 만약 객체 인스턴스에 더 이상 접근할 수가 없는 경우, 해당 인스턴스는 **GC에 의해 자동으로 제거** 된다.
- 상단의 코드에서 `obj1` 이 참조했던 객체 인스턴스는 `obj1` 이 null을 참조하는 순간 접근할 수 없게 된다.


### Shallow Copy, Deep Copy of Object

```javascript
let obj1 = {
	name: 'Baik'
};
let obj2 = {
	name: 'Baik'
};


obj2 = obj1
console.log(obj1 === obj2); // true

obj2.name = 'Kim'
console.log(obj1.name) // Kim
```

- 상단의 코드는 **얕은 복사** 를 통해 `obj2` 가 `obj1` 이 가리키는 메모리 주소를 참조하도록 코드를 작성했다.
- 따라서 `obj2` 식별자를 통해 객체를 수정할 경우, `obj1` 식별자로 객체에 접근하면 변경된 결과값을 얻게 된다.
- 객체의 **깊은 복사** 의 경우 `lodash` 라이브러리에서 제공하는 `cloneDeep()` 메서드를 사용하는 방법이 있다.

> 깊은 복사는 객체를 **JSON으로 변환했다가 다시 객체로 재변환하는 방식**으로 가능하지 않을까?

```javascript
const baseObj = {
	map: new Map(),
}

const copied = JSON.parse(JSON.stringify(baseObj));
// {map: {…}}, 겉으로는 잘 복사된 것처럼 보이나 map에 저장된 값은 일반 Object 이다.
console.log(copied);

```

- JSON 은 `Object`, `Array`, `Number`, `String`, `Boolean`, `Null` 타입만 가질 수 있다.
- 따라서 위 타입에 포함되지 않는 경우 JSON 객체를 사용하여 복사할 경우, 일반 객체 리터럴로 변환시킨다.
- 따라서 JSON을 활용한 깊은 복사도 상단의 코드와 같은 일부 케이스에서는 불가능하다.
 
## Property Flag

### What is Property Flag?

-   객체의 프로퍼티는 `value` 와 함께 `flag` 라고 불리는 속성 세 가지를 함께 가진다.
-   각 `flag` 의 값은 오직 `boolean` 만 올 수 있으며, 값에 따라 프로퍼티의 성질이 달라진다.

1. writable : `true` 라면 해당 프로퍼티의 값을 **수정할 수 있다**. 그렇지 않을 경우 해당 프로퍼티 값을 읽기만 가능하 도록 한다.
2. enumerable : `true` 라면 `for...in` 반복문을 사용하여 **속성을 나열하도록 한다**. 그렇지 않으면 반복에 포함되지 않는다.
3. configurable: `true` 라면 해당 프로퍼티의 **삭제나 플래그 값 수정을 허용한다**. 아니면 삭제나 플래그 수정을 허용하지 않는다.

> configurable 플래그를 **false** 로 지정할 경우, 다시 **true** 로 되돌릴 방법은 없다.

- 왜냐하면 `configurable` 플래그는 프로퍼티 플래그의 수정을 원천적으로 차단하기 때문이다.
- 따라서 사용자가 해당 플래그를 `false` 로 변환했다면, 다시 `true` 로 변환시키는 작업을 차단시킨다.
- `Object.defineProperty` 메서드를 사용하여 해당 프로퍼티를 재정의하는 작업도 차단된다.

> [!CAUTION]
> `configurable: false`는 되돌릴 수 없는 단방향 변경이다. 이후 `Object.defineProperty`로 플래그를 수정하거나 프로퍼티를 삭제하려 하면 TypeError가 발생한다.

```javascript
let user = { };

Object.defineProperty(user, "name", {
  value: "John",
  writable: true,
  enumerable: true,
  configurable: false,
});

Object.defineProperty(user, "name", {enumerable: false}); // TypeError: Cannot redefine property: name
user.name = 'Leon'; // writable flag 가 true 이므로 프로퍼티 값을 수정하는 것은 가능하다.
```

- 단, `writable` 속성의 값을 `true` 에서 `false` 로 변경하는 것은 된다. 반대의 경우는 불가능하다.
- 또한 `configurable` 플래그가 `false` 더라도 `writable` 이 `true` 라면 프로퍼티 값을 수정할 수 있다.
- writable은 프로퍼티의 값을 관할하고, configurable은 프로퍼티의 플래그 값을 관할하기 때문이다.


> 열거 가능한 속성은 프로퍼티의 **enumarable** flag 의 값이 **true** 임을 의미한다.

- `enumerable` flag의 값이 `true` 일 경우에만 해당 프로퍼티는 `for...in` 반복문에 포함된다.
- `Object.toString()` 메서드도 열거 가능한 속성만을 포함하므로 `enumerable` 플래그를 체크한다.

### How to get Property Flag?

-   `Object.getOwnPropertyDescriptor()` 메서드를 사용하여 특정 프로퍼티의 정보를 얻을 수 있다.
-   `Object.getOwnPropertyDescriptors()` 메서드를 사용하면 모든 프로퍼티 정보를 가져올 수 있다.

```javascript
let person = {
    firstName: 'Baik',
    lastName: 'Gwangin',
};

Object.defineProperty(person, 'firstName', {
    value: 'Baik',
    writable: false,
});
// {value: 'Baik', writable: false, enumerable: true, configurable: true}
Object.getOwnPropertyDescriptor(person, 'firstName');

// firstName : {value: 'Baik', writable: false, enumerable: true, configurable: true}
// lastName :  {value: 'Gwangin', writable: true, enumerable: true, configurable: true}
Object.getOwnPropertyDescriptors(person);
```

### How to modify Property Flag?

-   `Object.defineProperty()` 메서드를 사용하여 특정 프로퍼티의 플래그 값을 변경할 수 있다.
-   `Object.defineProperties()` 메서드를 사용하면 프로퍼티 여러 개를 한 번에 정의할 수 있다.
-	`for...in` 과 같은 반복문과 달리, 열거 불가능한 속성 (심볼형 포함) 들도 가져올 수 있다.

```javascript
let person = {
    firstName: 'Baik',
    lastName: 'Gwangin',
};

Object.defineProperty(person, 'firstName', { value: 'Kim', writable: 'false' });
Object.defineProperties(person, { firstName: { writable: 'false' }, lastName: { enumerable: 'true' } });
```

-   객체 리터럴 문법으로 프로퍼티를 생성할 경우, 모든 프로퍼티의 플래그 값은 `true` 를 가진다.
-   하지만 `Object.defineProperty` 메서드로 프로퍼티를 추가할 경우, 플래그 값은 `false` 를 가진다.

```javascript
let person = {
    firstName: 'Baik',
    lastName: 'Gwangin',
};

let human = {};
Object.defineProperty(human, 'firstName', { value: 'Kim', writable: 'true' });
Object.defineProperty(human, 'lastName', { value: 'Chulsu', enumerable: 'true' });

// firstName : {value: 'Baik', writable: true, enumerable: true, configurable: true}
// lastName :  {value: 'Gwangin', writable: true, enumerable: true, configurable: true}
Object.getOwnPropertyDescriptors(person);

// firstName : {value: 'Kim', writable: true, enumerable: false, configurable: false}
// lastName : {value: 'Chulsu', writable: false, enumerable: true, configurable: false}
Object.getOwnPropertyDescriptors(human);
```
