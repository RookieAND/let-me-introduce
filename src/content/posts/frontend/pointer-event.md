## 탐구 계기: 태블릿에서 DnD 가 동작하지 않았다

사이드 프로젝트에서 팀원이 `onMouseOver`, `onMouseOut` 기반으로 DnD를 구현했다.  
로컬에서는 잘 됐다. QA 환경을 태블릿으로 접속하니 기능이 아예 동작하지 않았다.  

원인은 간단했다.  
마우스 이벤트는 마우스 커서가 없는 터치 환경에서는 발동하지 않는다.  

`onTouchStart`, `onTouchEnd`를 따로 붙이면 해결되긴 한다.  
하지만 마우스 핸들러와 터치 핸들러를 따로 관리하는 건 영 불편하다.  
입력 방식마다 분기가 생기고, 엣지 케이스도 두 배로 늘어난다.  

MDN에서는 이런 상황을 고려해 Pointer Event를 추가했다.  

---

## MouseEvent 의 한계: 마우스 외의 입력을 고려하지 않았다

과거에는 마우스로만 DOM을 조작했다.  
그래서 `MouseEvent`만으로 충분했다.  

시대가 바뀌었다.  
터치스크린, 펜 입력, 멀티터치까지 다양한 입력 방식이 생겼다.  

`TouchEvent`가 있긴 하지만 여러 케이스의 디바이스를 모두 지원하기엔 복잡하다.  
PC와 모바일을 각각 다른 이벤트 핸들러로 등록하는 건 관리가 불편하고, 놓치는 케이스가 반드시 나온다.  

그래서 등장한 게 **Pointer**라는 추상적인 입력 개념이다.  
마우스 커서, 펜, 터치(멀티터치 포함), 그 외 포인팅 디바이스 모두를 하나로 묶는다.  
화면과 맞닿는 모든 포인트를 단일 이벤트로 처리할 수 있다.  

`onTouch`나 `onMouse`가 아닌 모든 입력 케이스를 처리해야 할 때는 이제 Pointer Event를 쓰면 된다.  
PC와 Mobile 버전을 별도로 등록하는 것보다 하나로 통일하는 게 훨씬 낫다.  

---

## PointerEvent 의 새로운 인터페이스

`PointerEvent`는 `MouseEvent`에서 제공하던 위치, 타겟 등의 속성을 그대로 상속한다.  
그 위에 포인터 입력에 특화된 속성들이 추가됐다.  

**`pointerType`**  
이벤트를 유발한 입력 종류다. `mouse`, `pen`, `touch` 중 하나다.  
터치인지 마우스인지에 따라 다른 동작을 해야 할 때 분기 조건으로 쓸 수 있다.  

**`pointerId`**  
각 입력마다 부여되는 고유한 ID다.  
멀티터치처럼 여러 포인터를 동시에 추적해야 할 때 각각을 구분하는 용도다.  

**`isPrimary`**  
여러 포인터가 동시에 발동될 때, 가장 먼저 발동된 포인터만 `true`다.  
"첫 번째 터치"에만 반응하고 싶을 때 이걸 체크하면 된다.  

**`width / height`**  
포인터가 차지하는 영역의 픽셀 단위 크기다.  
손가락으로 눌렀을 때가 펜으로 눌렀을 때보다 영역이 넓으므로 픽셀 값도 커진다.  

**`pressure`**  
0 ~ 1 사이 값으로 제공되는 포인터에 가해진 압력이다.  
얼마나 세게 눌러서 터치했는지를 수치로 확인할 수 있다.  

**`tiltX`, `tiltY`, `twist`**  
펜과 같은 도구를 사용할 때 태블릿과 도구가 이루는 기울기를 계산할 때 쓰인다.  
일반 터치나 마우스에서는 거의 쓸 일이 없지만, 드로잉 앱이라면 유용하다.  

---

## pointercancel: 중단을 알리는 이벤트

`pointercancel`은 현재 작동하고 있는 포인터 상호작용이 중단될 때 발동한다.  

- 디바이스의 작동이 멈추는 경우
- 디바이스의 방향이 변경되는 경우 (세로 ↔ 가로)
- 브라우저가 의도적으로 해당 상호작용을 중단하는 경우

마지막 케이스가 실제로 자주 발생한다.  
터치 스크롤과 pan 제스처가 충돌하면 브라우저가 스크롤을 우선시하고 포인터 이벤트를 취소한다.  
DnD나 커스텀 제스처를 구현할 때 `pointercancel`이 예상치 못하게 발동해서 드래그가 끊기는 현상이 여기서 나온다.  

---

## 개선한 코드

DnD 문제가 있던 부분은 framer-motion의 `onPanStart`와 `touch-none` 조합으로 해결했다.  

```typescript
const handlePanEmojiSection = (event: PointerEvent, info: PanInfo) => {
  event.stopPropagation();
  const nextPage = info.delta.y < 0 ? 1 : -1;
  const updatedEmojiPage = currentEmojiPage + nextPage;

  if (updatedEmojiPage < 0 || updatedEmojiPage >= MAX_PAGE) return;
  setCurrentEmojiPage(updatedEmojiPage);
};

<motion.div
  animate={{
    transform: `translateY(${-currentEmojiPage * (EMOJI_SECTION_HEIGHT + 8)}px`,
  }}
  transition={{
    ease: 'easeInOut',
    type: 'spring',
    duration: 0.33,
  }}
  className="grid grid-cols-3 gap-x-2 gap-y-2 scroll-smooth touch-none"
  onPanStart={handlePanEmojiSection}
>
```

`touch-none`은 브라우저의 기본 터치 스크롤을 막아준다.  
이게 없으면 pan 제스처와 스크롤이 충돌해서 `pointercancel`이 발동하고 드래그가 중단된다.  
앞서 설명한 `pointercancel` 발생 케이스가 정확히 여기에 해당한다.  

`onPanStart`의 첫 번째 인자가 `PointerEvent`다.  
framer-motion이 내부적으로 마우스·터치를 모두 포인터 이벤트로 추상화해 전달해준다.  
덕분에 핸들러 하나로 PC와 태블릿을 모두 처리할 수 있었다.  

---

## Reference

- [Pointer events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
