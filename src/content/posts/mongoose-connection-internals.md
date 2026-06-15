## 배경: 개발 서버를 켜두다가

당시 인턴십에서 맡았던 Edu-Core 프로젝트는 Node.js + Mongoose로 MongoDB를 쓰고 있었다.  
어느 날 코드를 수정하고 Hot Reload가 트리거되는 걸 보다가 이상한 걸 발견했다.  

`mongoose.connections`를 콘솔에 찍어봤더니 배열 길이가 Reload마다 계속 늘어났다.  

처음엔 그러려니 했다. 개발 환경에서는 그럴 수도 있겠다고 생각했다.  
그런데 계속 쌓이는 걸 보다 보니 이건 메모리 누수 아닌가 싶었다.  

그게 Mongoose 내부를 파고드는 시작이었다.  

---

## Mongoose는 Singleton이다

`require('mongoose')`가 반환하는 건 매번 새로운 인스턴스가 아니다.  
Node.js 모듈 시스템은 처음 로드한 모듈을 `require.cache`에 저장하고, 이후 같은 경로를 요청하면 캐시된 결과를 반환한다.  
`require('mongoose')`는 앱 어디서 호출하든 항상 동일한 객체를 가리킨다.  

공식 문서는 이를 명확히 적어뒀다.  

> The `require('mongoose')` call above returns a Singleton object. It means that the first time you call `require('mongoose')`, it is creating an instance of the Mongoose class and returning it.

이를 기반으로 Mongoose는 생성된 Connection 목록을 싱글톤 객체 내부에서 관리한다.  

```javascript
mongoose.connections; // Connection 인스턴스 배열
mongoose.connection;  // connections[0] (Default Connection)
```

각 Connection은 단일 MongoDB와 매핑된다.  
여러 DB에 동시 연결이 필요할 때 `createConnection()`으로 Connection을 여러 개 만들 수 있는 것도 이 구조 덕분이다.  

---

## 왜 처음부터 빈 Connection이 하나 있는가

`require('mongoose')`를 하고 바로 `mongoose.connections`를 출력해봤다.  
`connect()`도 `createConnection()`도 아직 호출하지 않은 상태다.  
그런데 배열에 빈 Connection이 하나 이미 들어 있었다.  

이게 한동안 이해가 안 됐다.  

Mongoose 소스를 열어봤다. 답은 `Mongoose` 생성자 안에 있었다.  

```javascript
// lib/index.js
function Mongoose(options) {
  this.connections = [];
  this.models = {};
  this.modelSchemas = {};
  // ...

  const conn = this.createConnection(); // 인자 없이 빈 Connection 생성
  conn.models = this.models;
}
```

`require('mongoose')`는 `new Mongoose()` 결과를 반환한다.  
그 생성자 안에서 인자 없이 `createConnection()`을 이미 한 번 호출하기 때문에,  
모듈을 import하는 순간 `connections[0]`에는 빈 Connection이 들어간다.  

이것이 Default Connection이다.  

---

## connect()와 createConnection()은 다른 슬롯을 쓴다

두 메서드는 서로 다른 슬롯에 Connection을 넣는다.  

### mongoose.connect()

`connect()`는 `connections[0]`을 업데이트한다.  

```javascript
// lib/index.js
Mongoose.prototype.connect = function() {
  const _mongoose = this instanceof Mongoose ? this : mongoose;
  const conn = _mongoose.connection; // connections[0]
  return conn.openUri(arguments[0], arguments[1], arguments[2]).then(() => _mongoose);
};
```

`mongoose.connection`은 항상 `connections[0]`의 alias다.  
`connect()`로 연결하면 생성자가 만들어둔 Default Connection에 URI를 열어주는 셈이다.  

### mongoose.createConnection()

`createConnection()`은 새 Connection 인스턴스를 만들어 배열에 push한다.  

```javascript
// lib/index.js
Mongoose.prototype.createConnection = function(uri, options, callback) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  const conn = new Connection(_mongoose);
  _mongoose.connections.push(conn); // 새 슬롯에 추가

  if (arguments.length > 0) {
    return conn.openUri(uri, options, callback);
  }

  return conn;
};
```

정리하면 이렇다.  

| 메서드 | 대상 슬롯 | 쓰임 |
|---|---|---|
| `mongoose.connect(uri)` | `connections[0]` (Default) | 단일 DB 연결 |
| `mongoose.createConnection(uri)` | `connections[n]` (새 슬롯) | 복수 DB 연결 |

`connect()`는 0번 슬롯을 채우고, `createConnection()`은 1번부터 차례로 쌓인다.  

---

## 문제의 근원: Hot Reload와 createConnection()

Edu-Core에서는 `connect()`가 아닌 `createConnection()`으로 DB 연결을 하고 있었다.  

Hot Reload가 발생하면 앱 진입점인 `App.js`가 다시 실행된다.  
그때마다 `createConnection()`이 재호출되면서 `connections` 배열에 인스턴스가 하나씩 쌓인다.  

```
// 최초 기동
connections = [<default>, <conn-1>]

// Hot Reload 1회
connections = [<default>, <conn-1>, <conn-2>]

// Hot Reload 2회
connections = [<default>, <conn-1>, <conn-2>, <conn-3>]
```

가장 마지막에 생성된 Connection만 실제로 쓰이고, 앞의 것들은 끊기지 않은 채 메모리에 남는다.  

처음에는 이전 Connection을 먼저 끊고 새 것으로 교체하는 방법을 찾아봤다.  
근데 기존 Connection이 제대로 닫히질 않았다.  
이게 왜 그런지는 끝내 명확히 찾아내지 못했다. (이 부분에서 꽤 오래 막혔다)  

방향을 바꿨다.  

---

## 해결: 처음 생성된 Connection을 고정으로 참조한다

새 Connection이 매번 생성되는 걸 막는 건 어렵다.  
그러면 **항상 같은 Connection 인스턴스를 참조**하면 된다.  

`connections[1]`은 앱이 최초 기동될 때 처음으로 만들어진 실제 DB Connection이다.  
Hot Reload 이후에 새 Connection이 추가되더라도 `connections[1]`은 항상 처음 생성된 것을 가리킨다.  

```javascript
// AS-IS: global 객체에서 mongoose 참조
const Gmongoose = global.g_mongoose;
const GSchema = global.g_schema;
autoIncrement.initialize(Gmongoose);

// TO-BE: connections[1]을 직접 참조
const mongoose = require('mongoose');

// connections[0]은 Default Connection이므로, 앱에서 실제 생성한 1번 Connection을 참조한다
const Gmongoose = mongoose.connections[1];
const GSchema = mongoose.Schema;
autoIncrement.initialize(Gmongoose);
```

Hot Reload가 발생해도 이 참조는 변하지 않는다.  
배열에 새 인스턴스가 추가되더라도 `connections[1]`이 가리키는 객체 자체는 그대로이기 때문이다.  

완벽한 해법은 아니다.  
Hot Reload마다 Connection이 쌓이는 것 자체는 막지 못한다.  
다만 실제로 사용하는 Connection만큼은 일관되게 고정할 수 있다.  

---

## 정리

- `require('mongoose')`는 Singleton을 반환한다. Node.js 모듈 캐싱 덕분이다.  
- Mongoose 생성자 내부에서 `createConnection()`을 인자 없이 호출하기 때문에, import 시점부터 `connections[0]`에는 빈 Default Connection이 존재한다.  
- `connect()`는 `connections[0]`을 업데이트하고, `createConnection()`은 새 슬롯을 추가한다.  
- Hot Reload 환경에서 `createConnection()`을 쓰면 Connection이 매번 누적된다.  
- `connections[1]`을 고정 참조하는 방식으로 일관된 Connection을 유지할 수 있다.  

이 글에서 분석한 소스 코드는 2023년 6월 기준 Mongoose 버전이다.  
버전에 따라 내부 구현이 달라질 수 있으니 직접 확인하는 게 좋다.  
