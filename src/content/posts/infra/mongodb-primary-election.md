## Replica Set 이 데이터를 동기화하는 방법

여러 서버가 Replication에 참여해 같은 데이터를 유지하는 그룹을 Replica Set이라 한다.  
Replica Set은 하나의 Primary와 나머지 Secondary로 구성된다.  

이때 Write 작업은 오직 Primary에서만 처리된다.  
Primary는 변경 사항을 OpLog에 기록하고, Secondary는 이를 가져와 동일하게 재실행하며 데이터를 맞춘다.  

**OpLog(Operation Log)**는 Primary가 수행한 모든 쓰기 작업을 시계열로 기록하는 로그다.  
Secondary는 OpLog를 주기적으로 폴링해서 가져온 뒤, 동일한 작업을 재실행하는 방식으로 동기화한다.  

---

## 컨센서스 알고리즘

MongoDB는 **확장된 Raft 컨센서스 알고리즘**을 기반으로 각 노드의 역할을 결정한다.  

컨센서스 알고리즘은 분산 시스템에서 모든 노드가 동일한 상태를 유지하고,  
일부 노드에 결함이 생겨도 전체 시스템이 멈추지 않도록 고안된 알고리즘이다.  
클러스터 전체 명령이 리더 → 팔로워 순의 단방향 흐름으로 전파된다.  

### 노드 상태

컨센서스 알고리즘이 적용된 분산 시스템에서 모든 노드는 세 가지 상태 중 하나를 가진다.  

- **Leader**: 클러스터를 대표한다. 명령 수신·전파·응답을 담당하고, 자신의 상태를 주기적으로 모든 Follower에게 전파한다. (Heartbeat)
- **Follower**: Leader를 제외한 모든 노드의 기본 상태다. Leader에게서 전파된 명령을 처리한다.
- **Candidate**: Leader로부터 일정 시간 동안 Heartbeat를 받지 못한 Follower가 전환하는 상태다. 새 리더를 뽑기 위한 Election을 시작한다.

### 리더 선출 과정

리더를 새로 선출해야 할 때 Leader Election이 시작된다.  

클러스터에 Leader가 없으면 모든 노드는 Follower 상태로 대기하며, 각자에게 주어진 Election Timeout을 기다린다.  
Election Timeout이 먼저 만료된 노드가 Candidate로 전환되고, 새로운 Election Term이 시작된다.  
Candidate는 자신에게 먼저 한 표를 준 뒤, 나머지 노드에게 투표 메시지를 보낸다.  

투표 메시지를 받은 노드가 해당 Term에 아직 투표하지 않았다면 후보자에게 투표하고, 자신의 Election Timeout을 초기화한다.  
초기화하는 이유는 불필요한 Candidate가 추가로 생기는 걸 막기 위해서다.  

전체 노드 수의 **과반 이상** 득표를 얻은 노드가 새 Leader로 선출된다.  
과반이 반드시 필요하기 때문에 클러스터 구성은 보통 홀수로 한다.  

---

## Primary Election — 언제 발동하는가

그렇다면 MongoDB에서 Primary가 어떻게 선출되는지로 넘어가보자.  

Primary가 동작 불능이 되면, Secondary 노드들이 새 Primary를 선출하는 과정을 밟는다.  
기존 Primary가 나중에 복구되더라도, 이미 새 Primary가 있기 때문에 복구된 노드는 Secondary로 복귀한다.  

Election 발동 조건은 Heartbeat에 달려 있다.  
Replica Set을 구성하는 모든 노드는 서로 Heartbeat를 주고받는다.  
N개의 노드가 있다면 Heartbeat 메시지 수는 N × (N - 1) / 2개가 된다.  

Primary가 지정된 시간 안에 응답하지 않으면 Secondary는 즉시 Primary Election을 발동한다.  

그런데 Primary 자체는 정상인데 네트워크만 끊어진 경우가 있다.  
이 경우 각 파티션이 자기들끼리 Election을 하면 클러스터에 Primary가 두 개 이상 생길 수 있다.  
MongoDB는 이 **스플릿 브레인(Split-Brain)** 문제를 막기 위해,  
과반수의 Secondary와 통신이 되지 않는 Primary는 자동으로 Secondary로 강등시킨다.  

### Self-Election 전략

각 Secondary는 자기 자신을 Primary 후보로 내세운다.  
MongoDB의 Primary Election에서는 절대로 다른 Secondary를 후보로 추천하지 않는다.  

후보가 된 노드는 나머지 Secondary에게 투표를 요청한다.  
투표 요청을 받은 노드는 아래 다섯 가지 기준을 체크한다.  

1. 투표 요청을 한 노드가 현재 자신과 같은 Replica Set 구성원인가?
2. 투표 요청을 한 노드의 Priority가 현재 Replica Set의 모든 멤버보다 같거나 큰가?  
   (Priority는 각 노드에 설정 가능한 선출 우선순위 값이다)  
3. 투표 요청을 한 노드의 Primary Term이 자신이 참여했던 투표의 Term보다 큰가?
4. 현재 Primary Term에서 아직 투표를 진행한 적이 없는가? (투표는 1회만 가능)
5. 투표 요청을 한 노드가 자신보다 최신 데이터를 가지고 있는가? (OpLog의 OpTime이 최신이거나 동등한지)

다섯 가지를 모두 통과하면 투표를 보낸다.  
과반수 이상의 득표를 얻은 노드가 새 Primary로 승급한다.  

---

## Replication Election Protocol — v0에서 v1으로

Primary 선출 방식인 Replication Election Protocol은 두 버전으로 나뉜다.  

### v0 (MongoDB 3.0 이전)

v0는 **시스템 시간을 기준**으로 투표를 시작했다.  
문제는 여러 노드의 시스템 시간이 완벽히 동기화되어 있다고 보장할 수 없다는 점이다.  

어떤 노드는 Primary가 죽었다고 판단하는데, 다른 노드는 아직 살아있다고 판단하는 상황이 발생한다.  
네트워크가 단절된 경우에는 Replica Set이 여러 파티션으로 쪼개지고,  
각 파티션 별로 Primary를 선출하는 스플릿 브레인이 발생한다.  

두 Primary가 독립적으로 Write를 받으면 데이터가 갈라진다.  
이 문제를 완화하기 위해 30초마다 Election을 강제 실행했다.  
그 말인즉슨, 최대 30초 동안 Primary 없이 DB를 운영해야 했다.  

### v1

v1은 시스템 시간 의존성을 없애기 위해 **Primary Term이라는 카운터**를 도입했다.  

Primary 선출이 시도될 때마다 Primary Term이 1씩 증가한다.  
각 노드는 자신의 Term과 비교해 투표 여부를 결정한다.  

투표 요청을 받은 노드는 **자신보다 높은 Primary Term을 가진 노드에게만 투표한다.**  
만약 자신보다 낮은 Term의 투표 요청이 오면, 해당 Term을 증가시켜 강제로 새 투표를 시작한다.  
v0에서는 이 상황에서 거부권을 행사했지만, v1에서는 새 투표를 시작하는 것으로 바뀌었다.  

선출된 Primary는 Primary Term을 가지기 때문에,  
OpLog를 통해 어떤 Primary에서 발생한 작업인지 추적할 수 있다.  

이로써 v0의 두 핵심 문제가 해결됐다.  
Primary Term 기반 투표 체계로 **스플릿 브레인을 방지**하고,  
시스템 시간에 의존하지 않아 30초의 공백 없이 신속하게 Primary를 선출할 수 있게 됐다.  

---

## Reference

- [Raft 컨센서스 알고리즘](https://seongjin.me/raft-consensus-algorithm/)
- [Replica Set Elections - MongoDB Docs](https://www.mongodb.com/ko-kr/docs/manual/core/replica-set-elections/)
