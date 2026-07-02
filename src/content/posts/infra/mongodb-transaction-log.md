## Transaction 이란 무엇인가

트랜잭션이란 **"하나의 단위로 묶어 수행되는 일련의 작업"** 을 의미한다.
여기서의 작업은 데이터를 Query하고 Modify하거나, 데이터의 정의를 변경하는 작업 또한 포함된다.
트랜잭션은 완전히 종료되어 Commit되거나 작업이 중단되어 Rollback되는 두 가지 결과만이 존재한다.

---

## ACID 속성에 대한 간단 정리

### Atomicity (원자성)

트랜잭션을 구성하는 각각의 Query를 하나의 단위로 취급한다.
트랜잭션을 구성하는 Query는 모두가 전부 성공하거나 전부 실패하는 것 뿐이다.
프로세스가 죽거나, 디스크에 문제가 발생하는 등 어떤 문제가 발생할 경우 Commit이 아닌 Abort를 처리하는 작업을 Atomic이라 정의한다. (모두가 통과하거나, 전부 실패하는 경우만 존재)

### Consistency (일관성)

여기서의 일관성은 DB가 Transaction으로 이를 조회하고 수정할 수 있게끔 제공되는 데이터의 상태를 의미한다. (Transaction을 위해 제공되는 데이터가 일관되어야 함)
DB 단에서도 FK, Unique 키와 같이 불변성을 검증하는 장치가 있다.
하지만 데이터가 유효한지, 불변하는지를 관리하는 곳은 주로 Application 단에서 이루어진다.
그래서 일각에서는 일관성이 DB의 속성이 아닌 이를 다루는 Application의 속성이 아니지 않냐고 이야기한다.

### Isolation (격리성)

동시에 실행되는 Transaction은 상호 격리된 상태로 진행되며, 하나의 Transaction이 다른 Transaction의 작업에 간섭할 수 없음을 의미한다.
격리 수준(Isolation Level)에 따라 다른 Transaction이 아직 Commit되지 않은 데이터를 읽을 수 있는지(Dirty Read), 이미 읽은 데이터가 다른 Transaction에 의해 변경될 수 있는지(Non-Repeatable Read) 등이 달라진다.
MongoDB는 기본적으로 **Snapshot Isolation**을 제공한다. Transaction 시작 시점의 데이터 스냅샷을 기준으로 읽기 연산을 수행하기 때문에 Dirty Read가 발생하지 않는다.

### Durability (영속성)

DB 내 변경 사항은 항상 Disk에 저장되기 전에 Transaction Log File에 기록된다.
MongoDB에서는 이 Transaction Log를 별도로 두지 않고 **OpLog를 재활용한다.** 아래 OpLog 섹션에서 자세히 다룬다.

---

## MongoDB 의 OpLog

**OpLog**(Replica Set OpLog)란, Replica Set의 데이터 동기화를 위해 내부에서 발생하는 모든 Action에 대한 로그를 기록하는 **Capped Collection**이다.
Capped Collection이 가지는 특징 중 삽입 순서에 따라 Document가 정렬되는 특징과 새로운 데이터가 삽입될 시 **가장 오래된 Document를 덮어씌우는 특징(aging-out)** 은 Logging 기능에 적합하다.
데이터 동기화를 위해 로그를 남기는 이유는 Primary에 발생한 변경 사항을 로그로 기록하고, 이를 나머지 멤버들이 참고하여 **비동기적으로 Primary와의 동기화를 진행하도록 하기 위함**이다.

### 굳이 비동기적으로 변경 사항을 팔로업 하는 이유가..?

굳이 이렇게 불편하게 Primary의 변경 사항을 Log로 남기고 Secondary가 이를 따라야 하는 생각이 잠깐 들었지만…
어디까지나 Secondary는 Primary의 대체제이기에 굳이 데이터의 변경 사항을 동기적으로 진행할 필요는 없다는 생각이 들었다. (말이 비동기지 동기화 속도도 빠를테고)

Transaction이 실패(Abort)하더라도 DB에는 변화가 발생해서는 안 되기에 변경된 데이터의 상태를 **모두 이전으로 복구해야 한다.** (이러한 작업을 Rollback이라 한다)
반대로 Commit된 Transaction 작업은 시스템에 온전히 변경 사항이 반영되었으므로 되돌릴 수 없다는 의미와 일맥상통한다.
Transaction을 진행하면 데이터의 변경 사항을 별도의 공간에 Logging하여 추후 Abort가 발생할 경우 이를 참고하여 데이터를 Rollback하는데, **MongoDB에서는 OpLog를 Transaction Log로 사용한다.**

---

## 그러면 MongoDB 의 Transaction 은 Replica Set 에서만 사용이 가능한가요?

놀랍게도 그렇다. (일단 OpLog를 기반으로 동작하니까)
하지만 Standalone한 Node를 Single Node Replica Set으로 변환할 수 있다.
([Convert a Standalone to a Replica Set - MongoDB Docs](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/))

그러면 Standalone Node에서는 왜 Transaction을 지원하지 않는 걸까?
MongoDB는 기본적으로 대부분의 Use Case에서 클러스터링 환경이 구축된 상태로 사용되는 DB이기 때문에 그렇다.
따라서 단일 클러스터 환경에서의 Transaction 구현이 크게 필요하지 않아 기존에 존재했던 OpLog를 Transaction Log로서 재활용했다.
단일 클러스터 환경을 위한 별도의 저장소 시스템을 구현하면, 분산 환경에 대한 트랜잭션 처리가 상당히 복잡해지기 때문에 이러한 전략을 채택한 것으로 알려져 있다.

---

## Capped Collection 이란

**고정 사이즈 컬렉션(Capped Collection)** 이란, 데이터를 삽입하고 처리하기 위해 고안된 컬렉션이다.

- 고정된 크기를 가지기에 용량이 다 찰 경우 가장 오래된 순으로 제거되는 특징을 가진다
- 전체 저장소 크기를 Collection 생성 시 미리 지정하기에 추가로 용량을 더 요구하지 않는다
- Document의 삽입이 순서대로 이루어지기 때문에 데이터를 불러올 때도 삽입 순서대로 가져온다

이 덕분에 Insert가 상당히 빠르다. 다른 조건 없이 가장 마지막 순서에 추가하면 되기 때문이다.

하지만 Capped Collection은 아래와 같은 한계를 가진다.

- 개별적으로 Document를 삭제할 수 없다
- Document가 삭제되는 순간은 오직 "aging-out" (가장 오래된 데이터가 제거됨) 뿐이다
- Document의 위치를 이동시키거나 크기를 증가시키는 update 연산 또한 불가능하다
