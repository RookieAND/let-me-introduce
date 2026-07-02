# [#JS] String Method

문자열 메서드는 원본을 변경하지 않는다. 항상 새 문자열을 반환한다.

## 검색

```javascript
const str = 'Hello, World!';

str.indexOf('o');       // 4 — 첫 번째 위치
str.indexOf('z');       // -1 — 없으면 -1
str.includes('World');  // true
str.startsWith('Hello'); // true
str.endsWith('!');       // true
```

## 추출

```javascript
str.slice(7, 12);      // "World"
str.slice(-6);         // "World!"
str.substring(7, 12);  // "World" — 음수 인덱스는 0으로 처리
```

## 변환

```javascript
str.toUpperCase();  // "HELLO, WORLD!"
str.toLowerCase();  // "hello, world!"
str.repeat(2);      // "Hello, World!Hello, World!"
```

## 공백 제거

```javascript
const padded = '  hello  ';
padded.trim();       // "hello"
padded.trimStart();  // "hello  "
padded.trimEnd();    // "  hello"
```

## 치환

```javascript
'aababc'.replace('a', 'x');    // "xababc" — 첫 번째만
'aababc'.replaceAll('a', 'x'); // "xxbxbc" — 전부
```

## 분리와 접근

```javascript
'a,b,c'.split(','); // ['a', 'b', 'c']
'hello'.charAt(1);  // 'e'
```

## 패딩

```javascript
'5'.padStart(3, '0'); // "005"
'5'.padEnd(3, '0');   // "500"
```
