## 원형 프로그레시브 바, SVG로 풀어내다

MZ2MO 프로젝트에서 음악 플레이어를 만들 때였다.
디자이너가 넘겨준 시안에는 원형 프로그레시브 바가 있었다.

처음엔 `div` 태그를 겹쳐서 구현하려 했다.
CSS `polygon`으로 부채꼴을 그리는 방법을 먼저 찾아봤는데, 생각보다 복잡했다.
결국 SVG로 방향을 틀었고, 그게 훨씬 깔끔했다.

---

## SVG로 원형 바 그리기

`circle` 태그와 두 가지 속성을 쓰면 원형 프로그레시브 바를 구현할 수 있다.

**stroke-dasharray**: SVG 테두리에 대시(dash)를 생성한다.
값이 클수록 대시 사이 간격이 넓어진다.
이 값을 원의 둘레와 동일하게 설정하면, 대시 하나가 원 전체를 감싸는 연속된 선이 된다.

**stroke-dashoffset**: 스트로크 시작 위치를 뒤로 밀어낸다.
값이 클수록 시작점이 뒤로 물러나 보이는 영역이 줄어든다.

재생 진행률에 따라 `dashOffset` 값을 계산하는 로직은 다음과 같다.

```javascript
const circleProgressRef = useRef<SVGCircleElement | null>(null);
const [circleDashOffset, setCircleDashOffset] = useState(CIRCUMFERENCE);

useEffect(() => {
  if (!playerInstance || !circleProgressRef.current) return;

  const maxDuration = playerInstance.getDuration();
  const currentProgress = (1 - currentDuration) / maxDuration;
  setCircleDashOffset(currentProgress * CIRCUMFERENCE);
}, [playerInstance, currentDuration]);
```

전체 곡 길이에서 재생된 시간을 뺀 비율에 원의 둘레를 곱하면 된다.

SVG 마크업은 아래와 같이 작성했다.

```xml
<svg
  onClick={handleChangeDuration}
  className="absolute z-10 -rotate-90"
  width="360"
  height="360"
  viewBox="0 0 360 360"
  fill="transparent"
>
  <defs>
    <linearGradient id="mz02" gradientTransform="rotate(135deg)">
      <stop offset="0%" stopColor="#1853FF" />
      <stop offset="100%" stopColor="#18FF59" />
    </linearGradient>
  </defs>
  <circle
    ref={circleProgressRef}
    stroke="url(#mz02)"
    cx="180"
    cy="180"
    r="178"
    strokeWidth="4"
    strokeDasharray={1125}
    strokeDashoffset={circleDashOffset}
  />
</svg>
```

`-rotate-90`을 준 이유는 SVG의 기본 시작 위치가 3시 방향이기 때문이다.
12시 방향에서 시작하도록 90도 회전했다.

---

## 클릭 위치에서 재생 시간 계산하기

원형이다 보니 클릭 위치로 재생 시간을 바꾸는 게 일반 바보다 까다롭다.
좌표를 각도로 바꾸고, 각도를 비율로 환산하는 과정이 필요하다.

접근 방식은 다음과 같다.

1. 클릭 지점의 `offsetX`, `offsetY`를 구한다
2. 재생 0% 지점(A), 원의 중심(O), 클릭 지점(B)이 이루는 각도를 계산한다
3. 각도를 360으로 나눠 비율을 구하고, 전체 재생 시간과 곱한다

수학적으로는 이등변 삼각형의 성질을 이용한다.
선분 AB의 길이를 D, 반지름을 R이라 하면:

**θ = 2 × arcsin((D / 2) / R)**

이 공식으로 중심각을 구할 수 있다.

```javascript
const handleChangeDuration = (e: React.MouseEvent<SVGSVGElement>) => {
  if (!playerInstance || !circleProgressRef.current) return;

  const { offsetX: clickedX, offsetY: clickedY } = e.nativeEvent;
  if (clickedX === 360 && clickedY === 180) return 0;

  const radius = Math.sqrt(
    (clickedX - 180) ** 2 + (clickedY - 180) ** 2,
  );

  const distance = Math.sqrt(
    (clickedX - (radius + 180)) ** 2 + (clickedY - 180) ** 2,
  );

  let theta =
    2 *
    (Math.asin(Math.min(distance / 2 / radius, 1)) *
      (180 / Math.PI));

  // 클릭 지점이 상단 반원에 위치하면 360에서 빼야 정방향 각도가 된다.
  theta = clickedY <= 180 ? 360 - theta : theta;

  const maxDuration = playerInstance.getDuration();
  const changedDuration = Math.round((theta / 360) * maxDuration);
  setCurrentDuration(changedDuration);
  playerInstance.seekTo(changedDuration, true);
};
```

`clickedY <= 180` 조건은 180도를 넘는 각도를 처리하기 위함이다.
원의 상단 반원에서 클릭하면 asin만으로는 0~180 범위의 각도가 나오는데,
실제로는 270, 360 구간이므로 360에서 빼줘야 한다.

---

## 마무리

설계부터 구현까지 약 3시간이 걸렸다.
SVG를 처음 제대로 다뤄봤는데, 수학과 맞닿는 지점이 생각보다 재미있었다.

지금은 SVG의 크기가 360×360으로 고정되어 있다.
반응형으로 만들려면 Ref로 SVG의 너비·높이를 동적으로 읽고, 중심 좌표도 그에 맞춰 계산해야 한다.
그 부분은 아직 숙제로 남아 있다.
