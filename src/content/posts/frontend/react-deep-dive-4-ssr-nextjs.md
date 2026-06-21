## SPA가 다시 SSR을 돌아보게 된 이유

React 초기에는 CSR 기반의 SPA가 대세였다.  
페이지 이동이 자연스럽고, 서버 부담이 줄어드는 장점이 있었다.  

하지만 웹 앱이 복잡해질수록 JS 번들 크기가 커졌고,  
브라우저가 JS를 파싱하고 실행하는 시간이 늘어났다.  
초기 로딩이 느려지고, SEO도 불리해졌다.  

그래서 SSR이 다시 주목받기 시작했다.  

---

## SSR의 장점과 단점

### 장점

**FCP가 빠르다**  

CSR은 JS 번들을 받고 실행한 뒤 렌더링을 시작한다.  
SSR은 서버에서 이미 렌더링된 HTML을 내려주므로 FCP가 더 빠르다.  
단, 서버가 요청을 처리할 리소스가 충분한 경우에 한해서다.  

**CLS가 줄어든다**  

CSR에서는 비동기 데이터가 늦게 도착하면 레이아웃이 뒤늦게 변경된다.  
SSR은 데이터를 미리 서버에서 받아 렌더링하므로 이런 현상이 줄어든다.  

**SEO에 유리하다 (조건부)**  

검색 엔진이 JS를 실행하지 않고 HTML만 크롤링하는 경우 SSR이 유리하다.  
다만 최신 구글 SEO 엔진은 CSR도 충분히 크롤링할 수 있다.  

### 단점

- 코드 작성 시 서버 환경을 고려해야 한다 (window, Web API 사용 불가)
- 서버가 반드시 필요하다 (정적 배포만으로는 부족)
- 서버 응답이 느리면 SSR의 장점이 사라진다

> SSR이 항상 CSR보다 좋은 건 아니다. 서비스 특성에 맞게 선택해야 한다.  

---

## React SSR API

### renderToString

```javascript
const html = renderToString(<App />);
```

컴포넌트를 HTML 문자열로 반환한다.  
이벤트 핸들러는 포함되지 않으므로, 클라이언트에서 hydration이 필요하다.  
`data-reactroot` 속성이 루트 컴포넌트를 표시한다.  

### renderToPipeableStream

`renderToNodeStream`의 후속 API다. React에서 이 방식을 권장한다.  

```typescript
const renderMainPage = (req: Request, res: Response) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onShellError() {
      res.status(500).send('<p>에러가 발생했습니다.</p>');
    }
  });
};
```

데이터를 Chunk 단위로 스트리밍하여 큰 페이지도 즉각 응답이 가능하다.  
`onShellReady`는 Suspense 바운더리 외부(Shell)가 렌더링 완료된 시점에 호출된다.  
검색 엔진 대응이 필요하다면 `onAllReady`를 써야 한다.  

### hydrate와 hydrateRoot

```javascript
// React 18+
const rootNode = document.getElementById('root');
const root = hydrateRoot(rootNode, <App />);
```

서버에서 렌더링된 HTML에 이벤트 핸들러와 React 동작을 붙이는 과정이다.  
서버 렌더링 결과와 클라이언트 렌더링 결과가 다르면 Mismatch 경고가 발생한다.  

---

## Next.js Pages Router 핵심

### getServerSideProps

페이지 진입 시마다 서버에서 실행된다.  

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  const data = await fetchData(context.params.id);
  return { props: { data } };
};
```

반환 값은 `__NEXT_DATA__` script 태그에 JSON으로 저장된다.  
이후 hydration 시 같은 데이터를 다시 fetch하지 않아도 된다.  

props에는 반드시 직렬화 가능한 값만 넣어야 한다.  
함수나 클래스 인스턴스는 JSON 직렬화가 불가능하다.  

### getStaticPaths + getStaticProps

빌드 타임에 페이지를 미리 생성한다.  

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [{ params: { id: '1' } }, { params: { id: '2' } }],
    fallback: true, // true면 paths 외 경로도 런타임에 생성 가능
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await fetchPost(params.id);
  return {
    props: { post },
    revalidate: 60, // ISR: 60초마다 재생성
  };
};
```

`fallback: true`를 쓰면 미리 생성하지 않은 경로도 첫 요청 시 서버에서 생성한다.  
`revalidate` 옵션으로 ISR(Incremental Static Regeneration)을 구현할 수 있다.  

### next/link vs a 태그

`next/link`는 클라이언트 사이드 라우팅을 사용한다.  
페이지 이동 시 전체 HTML을 요청하지 않고 필요한 JS 청크만 가져온다.  

`a` 태그는 전체 페이지를 다시 요청하므로 깜빡임이 생긴다.  

`getServerSideProps`가 있으면 빌드 결과가 SSR 페이지로 분류된다.  
없으면 정적 페이지로 분류된다. Next.js 빌드 로그에서 이를 확인할 수 있다.  
