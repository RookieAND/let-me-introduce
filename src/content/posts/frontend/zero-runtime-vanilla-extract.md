## Runtime CSS-in-JS의 문제

Emotion, styled-components 같은 라이브러리들은 **런타임 환경에서 CSS를 생성**한다. 스타일을 계산하는 비용이 클수록 성능 이슈가 발생한다. 컴포넌트 단에서 런타임 과정에 스타일이 수정된다면, 그때마다 새롭게 CSS를 생성해야 하고 여기서 발생한 딜레이만큼 렌더링이 차단된다.  

Production Mode에서는 DOM이 아닌 **CSSOM을 수정하는 방식**을 채택해 DOM 트리를 다시 파싱하는 과정을 생략한다. `CSSStyleSheet.insertRule()` 메서드로 현재 스타일시트에 새로운 스타일을 삽입한다.  

---

## Zero Runtime이란?

**Build 타임에 미리 CSS를 생성해두는 방식**이다. 런타임 이전에 필요한 CSS를 빌드 시점에 생성하여 `<link>` 태그를 통해 브라우저에 제공한다.  

동적인 스타일링은 사전에 정의한 스타일의 조합을 기반으로만 가능하다. CSS Variable을 빌드 타임에 미리 생성해두고 상황에 맞게 적용하는 방식이다.  

---

## Vanilla Extract

TypeScript로 작성된 스타일을 Build 타임에 CSS로 변환하는 Zero-Runtime CSS-in-JS 라이브러리다.  

- Type-Safe하게 CSS 스타일을 작성할 수 있다
- `sprinkles` 라이브러리로 Atomic CSS를 사용할 수 있다
- `recipe` 라이브러리로 Variant 기반의 스타일링을 구성할 수 있다
- Vite, esbuild, Rollup 등 다양한 번들러 플러그인을 지원한다

### 기본 스타일링

```typescript
import { style } from '@vanilla-extract/css';

export const myStyle = style({
  display: 'flex',
  paddingTop: '3px'
});
```

생성된 변수는 빌드 타임에 난수화된 `className`으로 변환된다. 별도의 Extension 없이도 각 스타일 속성에 대한 타입 추론이 된다.  

### 스타일 재사용

```typescript
const testStyle = style({
  display: 'flex',
  flexDirection: 'column'
});

// testStyle의 CSS Property도 병합됨
const mergeStyle = style([
  testStyle,
  {
    justifyContent: 'space-around',
    gap: '0px 8px'
  }
]);
```

### Atomic CSS — sprinkles

```typescript
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles';

const colors = {
  'blue-50': '#eff6ff',
  'gray-900': '#111827',
};

const colorProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { '@media': '(prefers-color-scheme: dark)' }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: colors,
    background: colors,
  },
});

export const sprinkles = createSprinkles(colorProperties);
```

사용할 때:  

```typescript
export const container = style([
  sprinkles({
    color: 'gray-900',
    background: 'blue-50'
  }),
  {
    ':hover': {
      outline: '2px solid currentColor'
    }
  }
]);
```

### Variant 기반 스타일링 — recipe

```typescript
import { recipe } from '@vanilla-extract/recipes';

export const button = recipe({
  base: {
    borderRadius: 6
  },
  variants: {
    color: {
      neutral: { background: 'whitesmoke' },
      brand: { background: 'blueviolet' },
    },
    size: {
      small: { padding: 12 },
      medium: { padding: 16 },
    },
  },
});
```

컴포넌트 단에서:  

```typescript
import type { RecipeVariants } from '@vanilla-extract/recipes';

type ButtonProps = RecipeVariants<typeof button> &
  ComponentPropsWithoutRef<'button'>;

const Button = ({ color, size, ...props }: ButtonProps) => (
  <button className={button({ color, size })} {...props} />
);
```

---

## Zero Runtime의 장단점

**장점:**  
- CSS와 JS Bundle 파일을 병렬로 가져올 수 있어 리소스 로딩 시간이 단축된다
- 런타임에서 스타일이 생성되지 않기 때문에 Bundle 크기가 작다
- 복잡한 인터랙션이 추가된 애플리케이션일수록 런타임 성능 비용이 낮다

**단점:**  
- 빌드 타임에 CSS 변환이 필요해 별도의 플러그인 설정이 필요하다
- 동적인 스타일링에 제한이 있다.  
  Vanilla Extract에서는 `dynamic` 모듈로 런타임 CSS Variable 생성이 가능하지만, 번들 크기가 아주 작다(1.3kb)  

개발 중인 프로젝트의 상황에 따라 적절한 것을 도입하는 것이 중요하다. 복잡한 인터랙션이 많고 성능이 중요한 프로젝트라면 Zero Runtime이 유리하고, 빠른 개발 속도와 동적 스타일링이 필요하다면 Runtime CSS-in-JS가 나을 수 있다.  
