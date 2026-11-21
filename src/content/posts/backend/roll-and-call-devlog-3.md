## 들어가며: 같은 일이 같은 순간에 두 번 일어난다면

[1편](/posts/roll-and-call-devlog-1)은 DB 연결, [2편](/posts/roll-and-call-devlog-2)은 이미지 이야기였다.
이번에는 사고가 터진 이야기가 아니라, 터지기 전에 막으려고 고민한 이야기다.

Roll & Call에는 "추첨"으로 참가자를 뽑는 구인이 있다.
신청자마다 1d100을 굴려 높은 순서대로 확정하고, 나머지는 대기 명단에 올린다.
처음에는 GM이 직접 [추첨하기] 버튼을 눌러야만 추첨이 돌았고, 버튼을 누르기 전까지는 모집이 끝나도 아무 일도 일어나지 않았다.
그래서 모집 마감 시각이 지나면 크론이 대신 추첨을 돌리게 하려고 했다.

그런데 이걸 붙이려고 보니 질문이 하나 생겼다.

> GM이 버튼을 누른 그 순간에 크론도 같은 구인을 추첨하면, 주사위는 몇 번 굴러가는 걸까?

이 글은 이 질문에서 시작해, 같은 사람이 서로 다른 구인에 동시에 신청하는 경우까지 잠금을 두 종류로 나눠 쓰게 된 기록이다.

---

## 기존 구조: 굴리는 것과 적용하는 것이 따로였다

처음 추첨은 두 단계였다.
GM이 버튼을 누르면 신청자마다 주사위만 굴려 저장하고, GM이 결과 화면에서 [결과 확정하기]를 눌러야 명단과 알림이 바뀌었다.

```ts
// apps/web/src/features/adjust-roster/api/draw-lottery.ts (10월 5일 이전, 일부)
// 추첨은 한 번만 돈다. 직접 확정한 사람은 빼고 신청자마다 1d100을 굴려 둔다.
// 명단과 알림은 GM이 결과 페이지에서 적용할 때(applyDrawResult) 바뀐다. 모집은 굴리는 순간 닫힌다.
export async function drawLottery(gameId: string): Promise<ActionResult> {
  const result = await adjustRoster({
    gameId,
    work: async (transaction, game) => {
      const alreadyRolled = await countRolledParticipants({ transaction, serverId, gameId });
      if (game.drawnAt || alreadyRolled > 0) throw new RosterError("이미 추첨을 마쳤습니다.");
      // ... 신청자마다 주사위를 굴려 저장
    },
  });
}
```

`adjustRoster`는 명단을 바꾸는 모든 액션이 거치는 길이고, 안에서 게임 행을 잠근다.
그래서 GM이 버튼을 연타해도 두 번째 요청은 첫 번째가 끝날 때까지 기다렸다가 "이미 추첨을 마쳤습니다"를 받는다.

여기까지는 괜찮았다.
문제는 크론을 붙이면 이 구조가 세 가지 이유로 버티지 못한다는 점이었다.

**첫째, 크론은 GM이 아니다.**
`adjustRoster`는 지금 로그인한 사람이 그 구인의 GM인지부터 확인하는데, 크론에는 로그인한 사람이 없다.

**둘째, 크론은 [결과 확정하기]를 누를 수 없다.**
굴리는 것과 적용하는 것이 나뉘어 있으면, 크론은 주사위만 굴려 두고 명단은 그대로 남겨 두게 된다.

**셋째, 크론은 다시 돈다.**
추첨 크론은 Supabase `pg_cron`이 10분마다 마감이 지난 추첨 구인을 모아 Next 라우트를 부르고, 실패한 회차는 다음 10분에 같은 구인을 다시 집는다.
그 10분 사이 아무 때나 GM이 버튼을 누를 수 있으니, 같은 구인을 두 경로가 동시에 집는 순간이 언젠가는 온다.

---

## 설계 아이디어: 한 명령, 한 트랜잭션, 잠근 뒤 다시 보기

> 추첨은 굴림·확정·대기·알림을 한 트랜잭션에서 끝내고, GM 버튼과 크론이 같은 명령을 부른다. 게임 행을 잠근 뒤 추첨 여부를 다시 확인해 먼저 끝난 쪽 하나만 적용한다.

핵심은 세 가지다.

- 굴리는 것과 적용하는 것을 나누지 않는다
- 누가 불렀는지(`actorId`)는 인자로 받고, `null`이면 크론으로 본다
- 잠금을 얻은 **뒤에** `drawn_at`을 다시 본다

---

## 그 전에: `FOR UPDATE`가 하는 일

잠금 이야기를 하려면 `lockGame`부터 짚고 넘어가자.

```ts
// packages/database/src/modules/games/queries/lock-game.ts
// 같은 게임을 건드리는 신청·명단 조정·출석이 이 행 잠금에서 줄을 선다.
export async function lockGame({ transaction, serverId, gameId }: { /* ... */ }) {
  const [game] = await transaction
    .select()
    .from(games)
    .where(and(eq(games.serverId, serverId), eq(games.id, gameId)))
    .for("update");
  return game;
}
```

`SELECT ... FOR UPDATE`는 읽은 행에 잠금을 건다.
다른 트랜잭션이 같은 행을 `FOR UPDATE`로 읽으려 하면, 앞 트랜잭션이 커밋하거나 롤백할 때까지 기다린다.
즉, **같은 게임을 건드리는 트랜잭션들이 이 줄에서 한 줄로 선다.**

중요한 건 기다린 쪽이 깨어났을 때 받는 행이 **앞 트랜잭션이 커밋한 뒤의 최신 값**이라는 점이다.
그래서 잠금 뒤에 다시 확인하면, 내가 기다리는 동안 누가 무엇을 바꿨는지 볼 수 있다.

---

## 구현: GM과 크론이 같은 길로 들어온다

```ts
// packages/database/src/modules/games/commands/draw-lottery.ts (일부)
// 추첨은 굴림·확정·대기·알림을 한 트랜잭션에서 끝낸다. GM 버튼과 마감 크론이 같은 명령을 부르고,
// 게임 행 잠금 뒤 drawn_at을 다시 보므로 먼저 끝난 쪽 하나만 적용된다. actorId가 null이면 크론이다.
export async function drawLottery({ transaction, serverId, gameId, actorId, now }: { /* ... */ }) {
  const game = await lockGame({ transaction, serverId, gameId });
  if (!game) return reject(DRAW_REJECTION.notFound);
  if (!isNull(actorId) && game.gmId !== actorId) return reject(DRAW_REJECTION.notGm);
  if (game.cancelledAt) return reject(DRAW_REJECTION.cancelled);

  const rolledCount = await countRolledParticipants({ transaction, serverId, gameId });
  if (game.drawnAt || rolledCount > 0) return reject(DRAW_REJECTION.alreadyDrawn);
  // ... 최소 인원 판정, 굴림, 확정·대기 저장, 알림까지 이 트랜잭션 안에서
  await markGameDrawn({ transaction, serverId, gameId, at: now });
}
```

GM 버튼과 크론이 같은 순간에 들어왔다고 해 보자.

1. 둘 다 `lockGame`을 부르고, 먼저 도착한 쪽(A)이 잠금을 얻는다. 늦은 쪽(B)은 기다린다.
2. A는 `drawn_at`이 비어 있는 걸 보고 추첨을 끝까지 돌린 뒤 `drawn_at`을 채우고 커밋한다.
3. 잠금이 풀리면 B가 깨어나 최신 행을 받는데, 이번에는 `drawn_at`이 채워져 있다.
4. B는 `alreadyDrawn`으로 거절되고 아무것도 바꾸지 않는다.

주사위는 한 번만 굴러간다.
그리고 결과가 "한 번 굴렸는데 명단은 아직" 같은 중간 상태로 남지 않는다.
굴림부터 알림까지 한 트랜잭션이라, 중간에 실패하면 전부 되돌아가기 때문이다.

예외를 던지던 기존 방식 대신 `reject(...)`로 거절 이유를 값으로 돌려주게 바꾼 것도 같은 맥락이다.
크론은 "이미 GM이 추첨함"을 실패로 볼 필요가 없고, GM 화면은 같은 이유를 안내 문구로 바꿔 보여 주면 된다.

크론과 GM이 다르게 동작해야 하는 지점도 있었다.
마감 시각에 최소 인원을 못 채웠으면 크론은 추첨 없이 구인을 취소하지만, GM이 마감 전에 [지금 추첨하기]를 눌렀을 때는 취소하지 않고 거절만 해야 한다.
이 분기를 `actorId`가 `null`인지로 나눴다.

---

## 두 번째 경합: 같은 사람이 다른 구인에 동시에 신청하면

추첨을 정리하고 하루 뒤에, 시간이 겹치는 구인에는 신청하지 못하게 막는 기능을 넣었다.
토요일 저녁 8시 세션에 확정된 사람이 같은 시간의 다른 세션에 또 신청하면 안 되기 때문이다.

처음 떠오른 구현은 단순했다.
신청할 때 내 확정·대기·추첨 신청 목록을 읽어 시간이 겹치는 게 있으면 거절한다.

그런데 이걸 기존 신청 트랜잭션 안에 넣으려고 보니 찜찜한 부분이 있었다.
신청은 `lockGame`으로 **신청하려는 게임**의 행을 잠근다.
같은 사람이 같은 시각의 구인 A와 B에 동시에 신청하면, 두 트랜잭션은 각각 A 행과 B 행을 잠그니 서로 기다리지 않는다.

그러면 이런 일이 생길 수 있다.

1. A 신청 트랜잭션이 내 세션 목록을 읽는다. 아직 아무것도 없다.
2. B 신청 트랜잭션도 내 세션 목록을 읽는다. 역시 아무것도 없다.
3. 둘 다 "겹치는 세션 없음"으로 통과하고, 같은 시각 세션 두 개에 모두 신청이 들어간다.

게임 행 잠금은 **같은 게임**을 건드리는 경합만 막는다.
지금 경합하는 대상은 게임이 아니라 **한 사람의 일정**이었다.

---

## 구현: 사용자 단위 advisory lock

사람마다 잠글 행이 있으면 좋겠지만, "이 사람의 신청들"을 대표하는 행은 따로 없었다.
이럴 때 쓸 수 있는 게 Postgres의 advisory lock이다.
테이블 행이 아니라 **숫자 키**에 거는 잠금이라, 키만 같으면 어떤 트랜잭션끼리든 줄을 세울 수 있다.

```ts
// packages/database/src/modules/games/commands/lock-user-applications.ts
// 같은 사람이 서로 다른 구인에 동시에 신청해도 시간 겹침 검사가 줄을 서도록 트랜잭션이 끝날 때까지 잠근다.
export async function lockUserApplications({ transaction, userId }: { transaction: Transaction; userId: string }) {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`participants.apply:${userId}`}))`,
  );
}
```

키는 `participants.apply:<사용자 ID>` 문자열을 `hashtext`로 숫자로 바꿔 만든다.
앞에 용도를 붙인 건 나중에 다른 기능이 같은 사용자 ID로 advisory lock을 걸어도 키가 겹치지 않게 하려는 것이다.
`_xact_` 버전을 고른 이유는 트랜잭션이 끝나면 알아서 풀리기 때문이다.
세션 단위 잠금은 직접 풀어야 하는데, 에러로 중간에 빠져나가면 풀리지 않은 채 연결이 풀에 돌아갈 수 있다. (생각만 해도 끔찍하다)

신청 트랜잭션에서는 게임 행을 잠근 뒤, 겹침을 검사하기 직전에 이 잠금을 건다.

```ts
// apps/web/src/features/join-game/api/apply-to-game.ts (일부)
// 일정 조율형은 신청 때 일시가 없어 겹침을 보지 않는다. 같은 사람의 신청끼리 줄을 세워 동시 신청도 막는다.
if (game.scheduleMode === SCHEDULE_MODE.fixed && game.confirmedAt) {
  await lockUserApplications({ transaction, userId });
  const [overlapping] = findOverlappingGame({
    target: { startsAt: game.confirmedAt, playMinutes: game.playMinutes },
    mine: await listUserSessionTimings({ transaction, userId, excludeGameId: gameId }),
  });
  if (overlapping) {
    return { error: OVERLAP_MESSAGE, reason: OVERLAP_REASON, overlapGameId: overlapping.id };
  }
}
```

이제 A와 B가 동시에 들어와도 두 번째 트랜잭션은 사용자 잠금에서 기다린다.
첫 번째가 커밋한 뒤 깨어나서 내 세션 목록을 다시 읽으면, 방금 들어간 A 신청이 보이고 B는 거절된다.

---

## 개발 중 만난 함정: 끝과 시작이 같으면 겹치는 걸까

겹침 판정 자체도 생각보다 애매했다.
8시~10시 세션이 끝나자마자 10시에 시작하는 세션에 들어가는 건 겹치는 걸까?

ORPG 세션은 연달아 잡는 경우가 많아서, 이걸 겹친다고 막으면 불편하다는 쪽으로 정했다.
그래서 구간을 **시작은 포함, 끝은 제외**로 다룬다.

```ts
// packages/database/src/modules/games/model/find-overlapping-game.ts (일부)
// 시작은 포함, 끝은 제외: 앞 세션의 끝과 뒤 세션의 시작이 같으면 겹치지 않는다.
function rangesOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}
```

부등호 하나 차이라 실수하기 쉬운 곳이라, 경계 사례를 테스트로 먼저 못 박았다.

```ts
// find-overlapping-game.test.ts (일부)
it("앞 세션의 끝과 뒤 세션의 시작이 같으면 겹치지 않는다", () => {
  expect(overlapIds([session("a", -120, 120), session("b", 120, 60)])).toEqual([]);
});

it("1분만 겹쳐도 겹친다", () => {
  expect(overlapIds([session("a", -120, 121), session("b", 119, 60)])).toEqual(["a", "b"]);
});
```

이미 끝난 세션은 예정 종료 시각이 아니라 **실제 종료 시각**으로 본다.
일찍 끝난 세션 때문에 다음 신청이 막히면 억울하기 때문이다.

그리고 한 달쯤 지나서야 빠진 경로가 하나 더 있다는 걸 알았다.
신청할 때만 막았지, GM이 확정된 세션의 **시간을 바꿀 때**는 검사하지 않았다.
GM이 시간을 옮기면 이미 확정된 참가자의 다른 세션과 겹칠 수 있다.
11월 중순에 세션 시간을 정하거나 바꾸는 경로에도 같은 검사를 붙였다.

---

## 달성한 것들

부하 테스트를 따로 돌리지는 않아서, "동시 요청 몇 건에서 정원 초과 0건" 같은 수치는 없다.
대신 구조로 보장되는 것들을 정리하면 이렇다.

- GM 버튼과 크론이 같은 순간에 들어와도, 크론이 같은 구인을 다시 집어도 추첨은 한 번만 적용된다
- 추첨이 굴림만 되고 명단은 그대로인 중간 상태가 생기지 않는다
- 같은 사람이 서로 다른 구인에 동시에 신청해도 시간 겹침 검사가 한 줄로 선다
- 끝과 시작이 맞닿은 세션은 연달아 신청할 수 있다
- 신청, 세션 확정, 시간 변경 모두 같은 겹침 검사를 거친다

---

## 인사이트: 잠금의 단위는 경합하는 대상과 같아야 한다

두 경합을 나란히 놓고 보니 공통점이 보였다.

추첨 경합에서 다투는 대상은 **하나의 게임**이었고, 그래서 게임 행 잠금으로 충분했다.
신청 겹침에서 다투는 대상은 **한 사람의 일정**이었고, 게임 행을 아무리 잠가도 막을 수 없었다.
잠금을 걸 때는 "어느 테이블을 건드리는가"보다 "무엇을 두고 다투는가"를 먼저 물어야 한다.

물론 advisory lock이 만능은 아니다.
`hashtext`는 32비트 해시라 아주 드물게 다른 사용자의 키가 겹칠 수 있다.
겹치더라도 두 사람의 신청이 잠깐 서로 기다릴 뿐 결과가 틀리지는 않아서 지금은 그대로 두었다.
그리고 이 잠금은 트랜잭션 안에서만 의미가 있으니, 겹침 검사를 트랜잭션 밖으로 빼는 순간 다시 경합이 생긴다는 점도 명심하자.

---

## 마치며

처음에는 "이미 추첨했는지 확인하는 `if` 하나면 되겠지"라고 생각했다.
들여다보니 그 `if`는 잠금을 얻은 **뒤에** 있을 때만 의미가 있었고, 잠금도 무엇을 잠그느냐에 따라 전혀 다른 경합을 막고 있었다.

세 편에 걸쳐 쓰고 보니 Roll & Call에서 고친 문제들은 대부분 "한 번에 하나씩 일어날 거라고 믿은 것들"이었다.
연결 하나에 쿼리가 줄을 섰고, 폭마다 변환이 쌓였고, 같은 추첨이 두 번 돌 수 있었다.
다음에 무언가를 동시에 처리하는 코드를 쓸 때는 "이게 같은 순간에 두 번 일어나면?"부터 묻고 시작하려 한다.
