> 처음에는 BullMQ가 Redis에 job을 저장하니까 재시작에도 안전할 거라고 생각했다. 그 전제가 틀렸다.

## 기존 구조

KDT(K-Digital Training)는 고용노동부가 지원하는 디지털 직업 훈련 과정이다.

훈련생의 출석 데이터는 HRDK(한국산업인력공단)에 정기 전송해야 하는 **법적 의무 사항**이라서, 데이터 오류가 생기면 훈련 기관 지정 취소나 훈련비 미지급 같은 심각한 패널티로 이어진다.

그중 하나인 **훈련 시간 종료 후 자동 퇴장 처리**를 BullMQ의 delayed job으로 구현하고 있었다.

```
훈련 생성 → BullMQ에 delayed job 등록 (종료 시각 - 현재 시각)
          → 시각이 되면 Queue Worker가 자동 퇴장 실행
```

```typescript
// AS-IS: 훈련 생성 시 Queue에 delayed job 등록
async createTraining(dto: CreateTrainingDto) {
  const training = await this.trainingRepo.create(dto);
  const delay = training.endAt.getTime() - Date.now();

  await this.evictionQueue.add(
    'auto-evict',
    { trainingId: training.id },
    { delay },
  );

  return training;
}
```

훈련이 생성되면 알아서 등록되고, 시간이 되면 알아서 퇴장된다. 단순하고 깔끔한 구조였다.

그러다 문제가 터졌다.

---

## 발생한 문제

어느 날 서버 재배포를 하고 나서 이상한 걸 발견했다.

> "퇴장 처리가 됐어야 할 훈련생들이 그대로 남아 있었다."

재시작 직전에 Queue에 대기 중이던 delayed job들이 재시작 후 전부 사라져 있었다. 당연히 발화되지 않았고, 자동 퇴장도 이루어지지 않았다.

법적 의무인 출석 데이터에 영향을 주는, 가볍게 볼 수 없는 버그였다.

시나리오를 정리하면 이렇다.

- 오전 9시 — 훈련 생성, 오후 6시 퇴장 처리 delayed job 등록
- 오후 3시 — 서버 재배포 진행
- 재배포 완료 — Queue Worker 재시작, 기존 delayed job은 복구 안 됨
- 오후 6시 경과 — 퇴장 처리 없음, 훈련생 그대로 잔류

---

## 원인 분석

BullMQ는 Redis를 백엔드로 쓸 수 있지만, 당시에는 **영속성 없이 인메모리 모드로 운영**되고 있었다.

인메모리 기반 큐는 서버 프로세스가 종료되는 순간 Queue에 대기 중이던 delayed job이 전부 사라진다. Worker가 재연결되어도 처리할 job 자체가 없는 것이다. 재연결 문제가 아니라, job 자체가 증발하는 문제였다.

BullMQ 사용 방식에 따라 동작이 완전히 다르다.

- **BullMQ 인메모리 모드** (영속성 없음): 프로세스 종료 = job 전부 유실
- **BullMQ + Redis 영속성 설정**: 서버 재시작 후에도 Redis에 job이 남아 복구 가능

문제는 BullMQ 자체가 아니라 **영속성 설정 없이 인메모리로 쓴 것**이었다.

---

## 설계 아이디어

> 신뢰할 수 있는 상태는 Queue가 아니라 DB다.

Queue에 뭐가 쌓여 있는지는 불확실하지만, DB에 어떤 훈련이 아직 퇴장 처리되지 않았는지는 항상 알 수 있다. DB를 믿으면 된다.

서버가 시작될 때 DB를 직접 조회해서 타이머를 다시 등록하면 된다.

두 가지를 조합했다.

1. `setTimeout` 기반 인메모리 타이머로 전환 (BullMQ 제거)
2. 서버 시작 시 DB 기준으로 미처리 작업 재등록

---

## 구현 과정

### 1. setTimeout 기반 타이머로 전환

Queue를 거치지 않고 훈련 생성 시점에 직접 `setTimeout`을 등록한다.

```typescript
// TO-BE: setTimeout으로 직접 등록
async createTraining(dto: CreateTrainingDto) {
  const training = await this.trainingRepo.create(dto);

  const delay = training.endAt.getTime() - Date.now();
  if (delay > 0) {
    setTimeout(() => this.processAutoEviction(training.id), delay);
  }

  return training;
}
```

Queue 인프라가 사라지니 설정도 단순해지고, 의존성도 줄었다. BullMQ 없이도 잘 돌아가는 구조였다.

### 2. 서버 시작 시 미처리 작업 재등록

`setTimeout`도 프로세스가 종료되면 타이머가 사라지는 건 마찬가지다.

여기서 핵심이 하나 더 필요하다. **서버가 시작될 때 DB를 기준으로 타이머를 재구성하는 로직**이다.

```typescript
// OnModuleInit — 서버 시작 시 실행
async onModuleInit() {
  const activeTrainings = await this.trainingRepo.findNotEvicted();

  for (const training of activeTrainings) {
    const delay = training.endAt.getTime() - Date.now();

    if (delay > 0) {
      // 아직 종료 시각이 지나지 않음 → 타이머 재등록
      setTimeout(() => this.processAutoEviction(training.id), delay);
    } else {
      // 이미 종료 시각이 지났음 → 즉시 처리
      await this.processAutoEviction(training.id);
    }
  }
}
```

서버가 재시작될 때마다 DB를 훑어서 타이머를 다시 세운다.

Queue가 유실되어도 DB가 살아있는 한 언제든 복구할 수 있는 구조다. Queue를 믿는 게 아니라 DB를 믿는 것이다.

### 3. Kafka 연동: 퇴장 이벤트를 Topic으로 발행

자동 퇴장은 Space 퇴장 외에도 출석 처리, 알림 등 하위 서비스와 연동이 필요했다.

기존에는 직접 호출하던 걸 Kafka Topic으로 발행하는 방식으로 바꿨다.

```typescript
async processAutoEviction(trainingId: string) {
  const training = await this.trainingRepo.findById(trainingId);
  if (!training || training.isEvicted) return; // 중복 처리 방지

  await this.trainingRepo.markAsEvicted(trainingId);

  await this.kafkaProducer.send({
    topic: 'training.eviction',
    messages: [{ value: JSON.stringify({ trainingId, evictedAt: new Date() }) }],
  });
}
```

`isEvicted` 체크로 재시작 시 중복 처리도 방지했다.

---

## 트레이드오프

물론 `setTimeout`도 완전하지는 않다.

**프로세스가 강제 종료(SIGKILL)되면 타이머가 유실**된다. 다음 서버 시작 시 `onModuleInit`이 재등록해주지만, 그 사이 공백이 생기는 건 피할 수 없다.

**서버가 여러 인스턴스로 스케일 아웃되면 타이머가 인스턴스별로 분리**된다. A 서버에 등록된 타이머는 B 서버에 없다. 이 방식은 **단일 서버 환경에서만 안정적**으로 동작한다.

더 강한 신뢰성이 필요하다면 다른 방식이 필요하다.

| 방식 | 특징 | 비용 |
|------|------|------|
| **DB 폴링** | 주기적으로 DB 스캔해 종료된 훈련 처리. 구현 단순하지만 지연 발생 | 낮음 |
| **Redis Keyspace Notification** | TTL 만료 이벤트 구독. Redis 가용성에 의존 | 중간 |
| **BullMQ + Redis 영속성** | Redis AOF 모드 설정 시 영속성 확보. 분산 환경에서도 신뢰할 수 있는 구조 | 높음 |

현재 서비스 규모에서는 "재시작 후 곧 복구된다"는 수준으로 충분하다고 판단했다. 과도한 인프라 투자보다 지금 상황에 맞는 선택을 한 것이다.

---

## 결과

전환 이후 서버 재시작 시 **퇴장 유실 버그 0건**을 유지했다.

---

## 인사이트

**"Queue = 신뢰할 수 있다"는 가정이 틀릴 수 있다.**

BullMQ가 Redis를 쓴다고 해서 자동으로 신뢰성이 보장되지 않는다.

영속성 설정 없이 인메모리로 쓰면 Queue처럼 보이지만 사실상 메모리에 뜬 데이터다. 서버가 꺼지면 같이 사라진다.

**상태의 진실은 항상 DB에 있다.**

Queue는 "언제 실행할 것인가"를 스케줄링하는 도구다. "무엇을 실행해야 하는가"의 진실은 DB에 있다.

복구 로직이 DB를 기준으로 동작한다면, DB가 살아있는 한 언제든 올바른 상태로 돌아올 수 있다.

**BullMQ가 나쁜 게 아니라, 영속성 설정 없이 쓴 게 문제였다.**

BullMQ를 Redis AOF 모드로 적절히 구성했다면 재시작에도 job이 유지됐을 것이다.

지금 선택은 단일 서버 환경에서 가장 단순한 해결책이다. 스케일 아웃이 필요해지는 시점이 오면, 그때 Redis 영속성을 붙인 BullMQ나 DB Cron 폴링 방식으로 전환하면 된다.
