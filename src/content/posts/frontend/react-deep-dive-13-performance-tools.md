## 수치 없이 최적화한다는 건 나침반 없이 항해하는 것

Core Web Vitals가 뭔지 알아도 실제로 어떻게 측정하는지 모르면 쓸모가 없다.  
어떤 도구로 지표를 수집하고, 어떻게 해석해야 하는지를 정리했다.  

---

## reportWebVitals — CRA에서 제공하는 측정 진입점

Create React App에는 `reportWebVitals.js`가 기본 포함된다.  

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
}
```

각 지표 함수는 내부적으로 `PerformanceObserver` API를 사용한다.  
측정 결과를 서버로 보낼 때는 `navigator.sendBeacon`을 쓰면 페이지 이탈 시점에도 데이터를 전송할 수 있다.  

```javascript
reportWebVitals((metric) => {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
});
```

---

## PerformanceObserver — 브라우저 성능 이벤트 관찰 API

`PerformanceObserver`는 특정 성능 항목이 기록될 때 콜백을 실행한다.  

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry);
  }
});

observer.observe({
  entryTypes: [
    'element',
    'first-input',
    'largest-contentful-paint',
    'layout-shift',
    'longtask',
  ],
});
```

`longtask`를 관찰하면 메인 스레드를 50ms 이상 블록한 작업을 감지할 수 있다.  
INP 분석에 특히 유용하다.  

---

## Next.js 맞춤 지표

Next.js는 자체 성능 지표를 추가로 제공한다.  

```javascript
export function reportWebVitals(metric) {
  switch (metric.name) {
    case 'Next.js-hydration':
      // 서버 렌더링 HTML에 hydration 완료까지 걸린 시간
      break;
    case 'Next.js-route-change-to-render':
      // 라우트 변경 후 렌더링 시작까지 걸린 시간
      break;
    case 'Next.js-render':
      // 라우트 변경 후 렌더링 완료까지 걸린 시간
      break;
  }
}
```

Hydration 시간이 비정상적으로 길다면 서버 렌더링 HTML과 클라이언트 렌더링 결과 사이에 불일치가 있거나, 초기 번들이 과도하게 큰 것이 원인일 수 있다.  

---

## Google Lighthouse

Lighthouse는 세 가지 모드를 제공한다.  

**탐색 모드 (Navigation)**  

페이지를 처음 로드하면서 측정한다.  
가장 일반적인 측정 방식이며, LCP·TBT·CLS·TTI·Speed Index를 측정한다.  

**기간 모드 (Timespan)**  

특정 기간 동안의 사용자 인터렉션을 측정한다.  
특정 플로우를 따라 움직이면서 INP 같은 지표를 확인할 때 유용하다.  

**스냅샷 모드 (Snapshot)**  

현재 페이지 상태를 기준으로 정적 분석을 수행한다.  
로드 성능보다 접근성, 모범 사례, SEO 점검에 적합하다.  

각 모드에서 성능·접근성·권장사항·SEO를 0~100 점수로 평가한다.  

**주요 진단 지표**  

- **TTI (Time to Interactive)**: 사용자가 완전히 상호작용 가능한 상태까지 걸리는 시간
- **Speed Index**: 페이지 내용이 시각적으로 채워지는 속도
- **TBT (Total Blocking Time)**: FCP와 TTI 사이에 메인 스레드가 블록된 총 시간

---

## Chrome DevTools Performance 탭

Lighthouse보다 더 세밀한 분석이 필요할 때 Performance 탭을 쓴다.  

**Throttling 기능**으로 CPU 속도와 네트워크를 의도적으로 느리게 만들어 저사양 기기와 느린 네트워크 환경을 시뮬레이션할 수 있다.  

**Insights 탭**에서는 핵심 웹 지표를 타임라인 위에서 시간 순으로 확인할 수 있다.  
어느 시점에 LCP가 발생했는지, 어떤 작업이 TBT를 늘렸는지 파악하기 좋다.  

---

## WebPageTest

실제 디바이스와 네트워크 환경에서 측정이 필요할 때 사용한다.  
다양한 지역, 브라우저, 네트워크 조건에서 테스트할 수 있다.  

Lighthouse는 시뮬레이션 환경이지만 WebPageTest는 실제 환경에 가깝다.  
두 도구의 결과가 다를 때는 WebPageTest의 결과를 더 신뢰할 수 있다.  

---

## 측정과 최적화의 사이클

측정 → 분석 → 최적화 → 재측정의 사이클이 중요하다.  
한 번 측정했다고 끝이 아니다.  
배포할 때마다 지표가 악화됐는지 모니터링하는 것이 장기적으로 더 가치 있다.  
