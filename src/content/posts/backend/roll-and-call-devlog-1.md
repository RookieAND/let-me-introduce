## 들어가며: 마이페이지가 가끔 멈춘다

Roll & Call은 ORPG 세션 구인을 웹과 디스코드에서 같이 관리하려고 만든 서비스다.
디스코드 커뮤니티에서 손으로 하던 구인·신청·출석 관리를 옮기려고 시작했는데, 지금은 하루 1,500명 정도가 들어온다.
Next.js 16 App Router 위에 Supabase(Postgres·Auth·Storage)를 얹었고, DB는 Drizzle과 `postgres.js`로 붙였다.

9월 중순쯤 마이페이지가 유독 느리다는 게 눈에 들어왔고, 가끔은 아예 열리지 않았다.
매번 그런 것도 아니라서 새로고침하면 멀쩡히 열릴 때도 있었다. (이런 게 제일 무섭다)

> 쿼리 네 개를 `Promise.all`로 동시에 날렸을 뿐인데, 왜 페이지가 멈추는 걸까?

이 글은 그 질문을 따라가다가 커넥션 풀 설정을 두 번 고친 기록이다.
첫 번째 수정은 절반만 맞았고, 그 과정에서 인증 쪽에서도 실수를 하나 했다.

---

## 기존 구조: 네 개를 동시에 읽는 마이페이지

마이페이지는 프로필, 내 세션 목록, 룰북 인증 기록, 후기 개수를 한 번에 보여 준다.
처음 구현은 이랬다.

```tsx
// apps/web/src/views/my-page/ui/my-page-view.tsx (당시 코드, 일부 생략)
export async function MyPageView() {
  const user = await getCurrentSessionUser();
  if (!user) return <LoginRequired />;

  const [profile, mySessions, rulebookRecords, reviewCounts] = await Promise.all([
    getProfile(user.id),
    loadMySessions(user.id),
    getRulebookRecords(user.id),
    getReviewCounts(user.id, { own: true }),
  ]);
  // ... 이후 네 결과를 조합해 한 번에 렌더
}
```

서로 의존하지 않는 조회니까 `Promise.all`로 묶는 게 당연해 보였다.
그리고 DB 클라이언트는 이렇게 만들어 두었다.

```ts
// packages/database/src/client.ts (당시 코드)
// prepare: false — required for Supabase's transaction-mode pooler.
// max: 1 — each serverless instance keeps one pooled connection (Supabase's serverless guidance).
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
```

Vercel 함수는 요청이 몰리면 인스턴스가 여러 개 뜨니까, 인스턴스마다 연결을 하나만 들고 있으라는 가이드를 그대로 따른 설정이었다.
그때는 이 `max: 1`이 `Promise.all`과 어떤 관계인지 생각해 보지 않았다.

---

## 첫 번째 발견: `Promise.all`이 병렬이 아니었다

`postgres.js`는 연결이 모두 사용 중이면 새 쿼리를 큐에 넣고, 연결이 비면 하나씩 꺼내 실행한다.
그런데 연결이 하나뿐이면 어떻게 될까?

네 개의 쿼리를 동시에 보내도 연결은 하나라서, 실제로는 하나가 끝나야 다음 것이 실행된다.
즉, 코드는 `Promise.all`인데 DB 입장에서는 완전히 직렬이었다!
여기에 `loadMySessions` 안에서도 세션마다 응답 수를 따로 세는 조회가 이어져 있어서, 줄이 생각보다 길었다.

그래서 9월 20일에 세 가지를 같이 고쳤다.

```ts
// packages/database/src/client.ts
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 6 });
```

- 연결 수를 6으로 올려 `Promise.all`이 실제로 병렬로 돌게 했다
- 세션마다 응답 수를 세던 조회를 GM 기준 한 번의 쿼리로 묶었다
- 읽기 전용 페이지에서는 `getUser()` 대신 `getSession()`을 써서 Auth 서버 왕복을 뺐다

체감상 마이페이지가 확실히 빨라졌다.
그런데 문제는 여기서 끝나지 않았다. 세 번째 항목이 잘못된 선택이었고, 첫 번째 항목은 다른 문제를 깨웠다.

---

## 개발 중 만난 실수: 검증하지 않은 JWT를 믿었다

`getSession()`으로 바꾼 근거는 이랬다.
proxy(구 middleware)에서 이미 토큰을 검증하고 갱신했으니, 페이지에서는 쿠키에 든 세션을 읽기만 하면 된다고 생각했다.

```ts
// apps/web/src/shared/server/get-current-session-user.ts (9월 20일 버전)
// proxy(middleware)가 이미 getUser()로 토큰을 검증·갱신했으므로,
// 읽기 전용 페이지에서는 로컬 JWT 파싱만으로 충분하다.
export async function getCurrentSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}
```

그런데 서버 로그에 Supabase의 경고가 찍히고 있었다.
`getSession()`이 돌려주는 `user`는 쿠키에서 꺼낸 값을 그대로 보여 줄 뿐 서명을 검증하지 않으니, 서버에서 신뢰하지 말라는 내용이었다.
proxy가 검증했다는 건 "그 요청이 proxy를 거쳤다"는 가정 위에서만 성립하는데, 페이지 코드가 그 가정을 스스로 확인할 방법은 없었다. ~~(가정 위에 가정을 쌓았다)~~

나흘 뒤에 `getClaims()`로 바꿨다.

```ts
// apps/web/src/shared/server/auth/get-current-session-user.ts (9월 24일 이후)
// 읽기 전용 화면용. getSession()의 user는 쿠키 값 그대로라 믿을 수 없어(Supabase 경고),
// getClaims()로 JWT 서명을 검증한 클레임만 쓴다. 비대칭 키면 Auth 서버를 부르지 않는다.
export const getCurrentSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };
});
```

`getClaims()`는 비대칭 키로 서명된 JWT를 로컬에서 검증한다.
Auth 서버를 부르지 않으면서도 서명은 확인하니, 처음에 원했던 "왕복 없이 읽기"를 안전하게 얻은 셈이다.
요청 안에서 여러 컴포넌트가 사용자를 읽어도 검증은 한 번만 하도록 React `cache()`로 감쌌다.

> 빠르게 하려고 검증을 빼는 게 아니라, 검증을 싸게 만드는 쪽을 골라야 했다.

---

## 두 번째 발견: 연결을 늘리자 다시 멈췄다

연결 수를 6으로 올리고 일주일쯤 지나자, 이번에는 마이페이지가 아예 응답하지 않는 경우가 다시 생겼다.
처음 제보와 증상이 비슷해서 당황스러웠다.
이번에는 운영에서 직접 재현될 때까지 계속 열어 봤다.

재현되는 조건을 좁혀 보니, 동시에 나가는 쿼리가 연결 수보다 많아 큐에 줄을 서는 순간과 겹쳤다.
그리고 그때 연결은 Supabase의 **트랜잭션 풀러(:6543)**를 거치고 있었다.

트랜잭션 풀러는 트랜잭션 하나가 끝날 때마다 실제 DB 연결을 다른 클라이언트에게 넘겨준다.
서버리스처럼 짧게 붙었다 떨어지는 클라이언트가 많을 때 연결을 아끼려고 쓰는 방식이고, 그래서 준비된 문장(prepared statement)을 못 써 `prepare: false`가 필요했다.
문제는 인스턴스 안에서 이미 큐에 쌓인 쿼리와 풀러 쪽 대기가 겹치면 응답이 가끔 오지 않는다는 점이었다.

솔직히 말하면 풀러 내부에서 정확히 어느 지점이 막히는지까지는 확인하지 못했다.
확인한 건 "트랜잭션 풀러 + 줄 선 동시 쿼리"에서 멈추고, **세션 풀러(:5432)**로 바꾸면 같은 조건에서 멈추지 않는다는 사실까지다.

9월 28일에 운영 `DATABASE_URL`을 세션 풀러로 옮겼다.

```ts
// packages/database/src/client.ts
// 두 앱 모두 세션 풀러(:5432)를 쓴다. 트랜잭션 풀러(:6543)는 동시 쿼리가 max를 넘어 줄을 서면
// 가끔 응답을 멈춘다(2026-09-28 재현, /me가 멈췄다).
// max — 세션 풀러는 모든 인스턴스를 합쳐 15개까지 받으므로 DATABASE_POOL_MAX로 web 4, admin 3을 준다.
// idle_timeout — 쉬는 연결을 닫아 풀러 자리를 오래 붙잡지 않는다.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: Number(process.env.DATABASE_POOL_MAX ?? 6),
  // ...
});
```

세션 풀러는 클라이언트가 붙어 있는 동안 실제 연결 하나를 계속 쥐여 준다.
대신 모든 인스턴스를 합쳐 받을 수 있는 수(pool_size 15)가 정해져 있어서, 인스턴스당 연결을 마음대로 늘릴 수 없다.
그래서 web은 4, 어드민은 3으로 나눴고, 쉬는 연결은 `idle_timeout`으로 빨리 돌려주게 했다.

여기서 한 가지 의문이 생겼다.
연결을 4개로 줄였는데, 마이페이지가 한 번에 읽는 양은 그대로다.
그러면 결국 또 줄을 서지 않을까?

---

## 구역별로 나눠 읽기: Suspense와 `cache()`

줄을 없앨 수 없다면, 줄을 서는 동안 화면 전체가 기다리지 않게 만들면 된다.
마이페이지를 네 구역으로 나눠 각자 데이터를 읽게 바꿨다.

```tsx
// apps/web/src/views/my-page/ui/my-page-view.tsx
// 구역마다 따로 읽어 먼저 끝난 구역부터 보인다. 구역이 늘어도 느린 구역만 늦게 뜬다.
export async function MyPageView() {
  const user = await getCurrentSessionUser();
  return (
    <>
      <AppBar title="마이페이지" action={<HelpButton />} />
      <Container size="sm">
        {user ? (
          <VStack gap="250" className="py-225">
            <Suspense fallback={<MyPageSummarySkeleton />}>
              <MyPageSummary />{/* 프로필·할 일 */}
            </Suspense>
            <Suspense fallback={<MyPageBlockSkeleton titleWidth={64} height={120} />}>
              <MyPageRulebooksSection />
            </Suspense>
            <Suspense fallback={<MyPageBlockSkeleton titleWidth={40} height={96} />}>
              <MyPageReviewsSection />
            </Suspense>
            <Suspense fallback={<MyPageAccountSkeleton />}>
              <MyPageAccount />{/* 링크·설정 */}
            </Suspense>
          </VStack>
        ) : (
          <LoginRequired />
        )}
      </Container>
    </>
  );
}
```

이렇게 나누면 새 문제가 하나 생긴다.
프로필이나 룰북 조회는 여러 구역이 같이 쓰는데, 구역마다 따로 읽으면 같은 쿼리가 여러 번 나간다.
연결을 아끼려고 나눈 건데 쿼리가 늘어나면 본말전도다. (으악)

그래서 공용 조회는 React `cache()`로 감쌌다.

```ts
// apps/web/src/views/my-page/api/load-my-profile.ts
// 프로필·링크·설정 구역이 함께 읽어도 요청마다 한 번만 조회한다.
export const loadMyProfile = cache(getProfile);
```

`cache()`는 한 번의 서버 요청 안에서 같은 인자로 부른 결과를 재사용한다.
프로필·링크·설정 구역이 각자 `loadMyProfile`을 불러도 실제 조회는 한 번이다.
요청이 끝나면 버려지는 캐시라서, 다른 사용자의 데이터가 섞일 걱정도 없다.

> 네 개를 한 번에 기다리던 페이지가, 끝난 구역부터 먼저 그리는 페이지가 됐다.

---

## 달성한 것들

측정 도구를 붙이기 전에 고친 거라 전후 수치는 남아 있지 않다. ~~(이게 제일 아쉽다)~~
대신 달라진 것들을 정리하면 이렇다.

- `Promise.all`이 실제로 병렬로 돈다 (연결 1개 → 여러 개)
- 세션 풀러로 옮긴 뒤로는 같은 조건에서 마이페이지가 멈추지 않았다
- 느린 구역이 있어도 나머지 구역은 먼저 보인다
- 여러 구역이 같이 쓰는 조회는 요청당 한 번만 나간다
- 서버에서 읽는 사용자 정보는 서명을 검증한 JWT 클레임에서만 온다

---

## 인사이트: 서버리스에서 연결은 코드 밖의 자원이다

이번 일을 겪고 나서 연결 설정을 대하는 태도가 달라졌다.

`max: 1`은 "서버리스에서는 연결을 아껴라"라는 가이드 자체로는 맞는 말이었다.
그런데 같은 코드베이스에서 `Promise.all`을 쓰는 순간 그 가이드와 정면으로 부딪힌다.
병렬로 쓰겠다는 코드와 직렬로 쓰라는 설정이 서로 다른 파일에 살고 있어서, 둘을 같이 보기 전까지는 모순인 줄 몰랐다.

풀러 선택도 마찬가지다.
트랜잭션 풀러가 서버리스에 권장되는 건 맞지만, 한 요청 안에서 동시 쿼리를 많이 내는 페이지라면 이야기가 달라진다.
세션 풀러는 대신 전체 연결 수 상한을 인스턴스 사이에 나눠 써야 해서, 트래픽이 더 늘면 이 선택도 다시 봐야 한다.
지금 규모에서는 이게 가장 단순한 해결책이라고 판단했을 뿐이다.

---

## 마치며

처음에는 마이페이지가 멈추는 게 "쿼리가 느려서"라고 생각했다.
들여다보니 쿼리는 그대로였고, 문제는 쿼리가 줄을 서는 방식과 그 줄을 관리하는 풀러였다.

`Promise.all` 한 줄이 병렬이라고 믿었던 게 이 모든 일의 시작이었다는 점을 오늘 다시 정리하면서 깨달았다.
다음 일지에서는 이미지 변환 한도를 넘겨 썸네일이 깨졌던 일과, 같은 사람이 동시에 두 구인에 신청할 때 시간 겹침을 막은 이야기를 써 보려 한다.
