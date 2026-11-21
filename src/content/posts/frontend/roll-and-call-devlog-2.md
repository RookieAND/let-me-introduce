## 들어가며: 이미지 변환 한도를 넘겼다

[1편](/posts/roll-and-call-devlog-1)에서 마이페이지가 멈추던 일을 정리했는데, 그다음 주에는 이미지가 말썽이었다.
10월 8일 새벽, Vercel의 Image Transformations 한도를 넘겼다는 걸 알게 됐다.

Roll & Call의 구인글에는 썸네일이 붙고, 목록·상세 곳곳에서 같은 이미지를 다른 크기로 보여 준다.
Next.js의 `next/image`가 Vercel에서 그때그때 크기를 맞춰 주고 있었는데, 그 변환 횟수에 한도가 있다는 걸 이날 처음 실감했다.
그리고 이걸 수습하다가 30분 만에 상단 로고까지 `402 Payment Required`로 깨뜨렸다. (돈 내라는 코드를 진짜 받을 줄은)

> 이미지는 업로드할 때 한 번 줄이면 되는데, 왜 요청할 때마다 다시 변환하고 있었을까?

이 글은 그 질문에 답하기까지 설정을 네 번 바꾼 열흘의 기록이다.
중간에 한 번은 돈으로 해결하려고도 했다.

---

## 기존 구조: 폭마다 생기는 변환

`next/image`는 화면에 그릴 이미지를 요청할 때 `deviceSizes`와 `imageSizes` 중 하나로 폭을 골라 `/_next/image?url=...&w=...` 형태로 요청한다.
Vercel은 이 요청을 받아 원본을 그 폭으로 변환하고 캐시한다.

당시 설정은 Supabase Storage 원본 주소만 허용해 두고, 폭은 Next.js 기본값을 그대로 쓰고 있었다.

```ts
// apps/web/next.config.ts (10월 8일 이전)
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: supabaseHost,
      pathname: "/storage/v1/object/public/**",
    },
  ],
},
```

기본 `deviceSizes`만 해도 640부터 3840까지 여덟 가지다.
같은 썸네일이라도 휴대폰, 태블릿, 데스크톱, 그리고 DPR 1·2·3배마다 다른 폭을 요청하니, **원본 하나가 변환 여러 개로 불어나는 구조**였다.
구인글이 늘어날수록 변환 수는 원본 수에 폭 가짓수를 곱한 만큼 늘었고, 그게 한도를 넘었다.

---

## 첫 번째 시도: 썸네일만 변환에서 빼자

처음에는 가장 많이 쓰이는 썸네일만 변환에서 빼면 된다고 생각했다.
썸네일은 업로드할 때 이미 브라우저에서 줄여서 올리고 있었기 때문이다.

```ts
// apps/web/next.config.ts (889cb201)
images: {
  // 소스 하나당 변환이 기기 폭×DPR마다 생겨 한도를 먹는다. 카드 폭(412px)의 1~3배로만 묶는다.
  deviceSizes: [420, 840, 1260],
  imageSizes: [56, 112, 168],
  remotePatterns: [/* ... */],
},
```

```tsx
// apps/web/src/entities/game/ui/game-thumbnail.tsx
<Image src={src} alt={alt} unoptimized /* Supabase 원본을 그대로 쓴다 */ />
```

업로드 때 줄이는 긴 변도 1600px에서 1200px로 낮췄다.
남은 이미지들은 폭을 카드 폭의 1~3배로만 묶었다.

그런데 이 커밋을 배포하자마자 로고가 깨졌다.

---

## 개발 중 만난 버그: 폭을 바꾸자 로고가 깨졌다

**로고 402 버그.** 로고는 썸네일이 아니라서 여전히 변환을 거치고 있었다.
`deviceSizes`를 바꾸면서 로고가 요청하는 폭도 새 값으로 바뀌었고, 그 폭으로 변환된 결과는 캐시에 없었다.

원인은 Vercel이 한도를 넘긴 뒤에도 **이미 캐시된 변환은 계속 내주지만, 캐시에 없는 새 폭 요청은 402로 거절한다**는 점이었다.
즉, 한도를 넘긴 상태에서 폭 설정을 바꾸는 건 멀쩡하던 이미지까지 새로 변환을 요청하게 만드는 일이었다. (내 손으로 깨뜨렸다)

```ts
// ❌ 한도를 넘긴 상태에서 폭을 바꾸면, 캐시에 없는 새 폭 요청이 모두 402가 된다
deviceSizes: [420, 840, 1260],

// ✅ (451ef616) 일단 모든 변환을 끈다. 업로드 때 이미 줄인 사진과 정적 파일뿐이다
images: { unoptimized: true },
```

33분 뒤에 모든 변환을 껐다.
업로드할 때 이미 줄인 사진과 정적 파일만 쓰고 있으니, 변환을 꺼도 당장 문제 될 건 없다고 판단했다.

---

## 두 번째 시도: 돈으로 해결하기

다음 날, Vercel을 Pro 플랜으로 올렸다.
한도가 늘어나니 썸네일에만 변환을 다시 켜고, 폭은 꼭 필요한 세 가지로 묶었다.

```ts
// apps/web/next.config.ts (d4bff520, 10월 9일)
images: {
  // 변환은 썸네일에만 쓴다(서버·봇 아이콘은 개별 unoptimized).
  // 폭은 카드(412px) 1~2배와 목록 썸네일(56px) 2배, 총 3종으로 묶는다.
  deviceSizes: [420, 840],
  imageSizes: [112],
  remotePatterns: [/* ... */],
},
```

폭을 세 가지로 묶은 건 화면을 다시 뜯어보고 나서였다.
카드에 들어가는 썸네일은 최대 412px로 그려지고, 목록의 작은 썸네일은 56px이다.
레티나까지 생각해도 420·840·112 세 가지면 충분했다.

여기까지 오고 나서야 처음 질문으로 돌아갔다.
썸네일은 업로드할 때 이미 1200px WebP로 줄여서 올리고 있다.
그렇다면 Vercel이 다시 변환해서 얻는 이득은 840px과 1200px의 차이 정도인데, 이걸 위해 매달 돈을 내는 게 맞을까?

---

## 세 번째 결정: 변환은 업로드할 때 한 번만

엿새 뒤인 10월 15일에 Pro를 내리고 변환을 다시 껐다.
이번에는 급하게 끈 게 아니라, 변환을 할 시점을 "요청할 때"에서 "올릴 때"로 옮긴다는 결정이었다.

```ts
// apps/web/next.config.ts (1f31b0bf)
images: {
  // Pro를 내려 Vercel 이미지 변환을 쓰지 않는다. 썸네일은 올릴 때 이미 webp로 줄여 둔다.
  unoptimized: true,
},
```

그러면 업로드 단계가 제 역할을 해야 한다.
브라우저에서 올리기 직전에 줄이는 코드는 이렇게 생겼다.

```ts
// apps/web/src/shared/api/shrink-image.ts
// 올리기 전에 긴 변을 maxSide로 줄이고 WebP로 바꾼다. 더 커지거나 읽지 못하면 원본을 그대로 올린다.
// WebP로 굽지 못하는 브라우저(구형 Safari)는 흰 바탕을 깐 JPEG로 대신한다.
export async function shrinkImage({ file, maxSide }: { file: File; maxSide: number }): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvas.convertToBlob({ type: WEBP, quality: QUALITY });
  if (blob.type !== WEBP) {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    blob = await canvas.convertToBlob({ type: JPEG, quality: QUALITY });
  }
  if (blob.size >= file.size) return file;
  // ... 확장자를 바꿔 File로 감싸 반환
}
```

여기서 개인적으로 신경 쓴 지점이 두 군데 있다.

첫째, `convertToBlob`에 WebP를 요청해도 브라우저가 WebP를 만들지 못하면 조용히 PNG를 돌려준다.
그래서 결과의 `type`을 다시 확인하고, WebP가 아니면 JPEG로 다시 굽는다.
JPEG는 투명도를 담지 못해 투명한 부분이 검게 변하니까, `destination-over`로 흰 바탕을 그림 **뒤에** 깔고 굽는다.

둘째, 줄인 결과가 원본보다 크면 원본을 그대로 올린다.
이미 작게 압축된 이미지를 다시 굽다 보면 오히려 커지는 경우가 있었기 때문이다.

빈 상태 일러스트 16종과 로고도 같은 날 WebP로 바꿔 빌드 산출물에서 Supabase Storage로 옮겼다.
5.5MB였던 정적 자산이 0.4MB가 됐다.

> 변환을 요청할 때마다 하면 폭마다 비용이 쌓이고, 올릴 때 한 번 하면 그걸로 끝난다.

---

## 열하루 뒤의 버그: GIF를 받자 배포가 전부 깨졌다

이 결정에는 숙제가 하나 남아 있었다.
움직이는 GIF 썸네일도 받고 싶었는데, 위 코드로 GIF를 줄이면 첫 프레임만 남는다.

GIF는 애니메이션 WebP로 바꾸기로 했다.
브라우저의 `ImageDecoder`로 프레임을 하나씩 꺼내 줄이고, 프레임 묶음을 `wasm-webp`로 인코딩한다.

```ts
// apps/web/src/shared/api/shrink-animated-image.ts (일부)
const decoder = new ImageDecoder({ data: file.stream(), type: file.type });
await decoder.tracks.ready;
for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
  const { image } = await decoder.decode({ frameIndex });
  context.drawImage(image, 0, 0, width, height);
  frames.push({ data: new Uint8Array(context.getImageData(0, 0, width, height).data.buffer), /* ... */ });
  image.close();
}
const { encodeAnimation } = await import("wasm-webp");
const encoded = await encodeAnimation(width, height, true, frames);
```

모든 프레임을 메모리에 올리는 방식이라, 애니메이션은 긴 변을 800px로 더 작게 잡았다.
`ImageDecoder`가 없는 구형 브라우저에서는 변환을 건너뛰고 원본을 올린다.

그런데 이 기능을 넣은 날 오후에만 버그가 두 개 연달아 터졌다.

**모든 화면에 wasm이 실린 버그.** 처음에는 `wasm-webp`를 파일 맨 위에서 정적으로 import했다.
이 함수는 `shared/api` 배럴 파일로 내보내고 있었는데, 배럴을 통해 다른 함수를 가져오는 모든 화면이 wasm까지 같이 받게 됐다.
배럴은 tree-shaking이 잘 안 된다는 걸 알고 있었는데도 또 당했다.

```ts
// ❌ 배럴로 내보내는 파일에서 정적 import — 배럴을 쓰는 모든 화면 번들에 wasm이 실린다
import { encodeAnimation } from "wasm-webp";

// ✅ (2b61388b) GIF를 변환할 때만 불러온다
const { encodeAnimation } = await import("wasm-webp");
```

**웹 배포 전체 실패 버그.** 이건 더 심했다.
`wasm-webp` 안에 Node.js 환경에서만 타는 분기가 있었고, 그 분기가 `import("module")`을 가지고 있었다.
Turbopack이 브라우저 번들을 만들 때 이 `module`이라는 Node 내장 모듈을 해석하지 못해서, 그 뒤로 **웹 배포가 모두 실패했다.**

브라우저에서는 그 분기를 탈 일이 없으니, 브라우저 번들에서만 `module`을 빈 모듈로 연결했다.

```ts
// apps/web/next.config.ts (a371c2ae)
turbopack: {
  resolveAlias: {
    // wasm-webp의 Node 분기가 `import("module")`을 가지고 있어 브라우저 번들 해석이 실패한다.
    // 브라우저에서는 그 분기를 타지 않는다.
    module: { browser: "./empty-module.ts" },
  },
},
```

```ts
// apps/web/empty-module.ts
// 브라우저 번들에서 Node 내장 모듈 `module`을 대신하는 빈 모듈.
const emptyModule = {};
export default emptyModule;
```

라이브러리 하나를 들였을 뿐인데 번들러 설정까지 손을 대야 했다.
솔직히 이 방식이 깔끔하다고 보지는 않는다.
라이브러리가 브라우저 전용 진입점을 따로 내준다면 이 별칭은 지우는 게 맞다.

---

## 달성한 것들

- 이미지 변환 비용이 사라졌다 (Pro를 내리고도 썸네일이 깨지지 않는다)
- 업로드 때 긴 변 1200px WebP로 줄여, 원본을 그대로 내려보내도 크기가 크지 않다
- WebP를 못 만드는 브라우저는 흰 바탕 JPEG로, 줄인 게 더 크면 원본으로 자연스럽게 물러난다
- 정적 자산 5.5MB → 0.4MB (WebP 전환 후 Storage로 이동)
- GIF는 애니메이션 WebP로 바꿔 올리고, wasm은 GIF를 올릴 때만 받는다

---

## 인사이트: 변환은 어디서 할 것인가

이번 일을 겪고 나니 이미지 최적화를 "어떤 도구를 쓸까"가 아니라 "언제 변환할까"의 문제로 보게 됐다.

요청할 때 변환하는 방식은 화면마다 딱 맞는 크기를 줄 수 있다는 게 장점이다.
대신 원본 수에 폭 가짓수를 곱한 만큼 변환이 생기고, 그 비용은 트래픽이 늘수록 따라 늘어난다.
올릴 때 한 번 변환하는 방식은 화면마다 딱 맞는 크기는 포기하지만, 비용이 업로드 횟수에만 묶인다.

Roll & Call처럼 이미지가 썸네일 위주이고 표시 폭이 몇 가지로 정해진 서비스라면 후자가 맞았다.
반대로 사용자가 올린 사진을 여러 레이아웃에서 크게 보여 주는 서비스라면, 요청 시점 변환을 쓰되 폭 가짓수를 처음부터 좁게 묶는 쪽이 낫다고 본다.

---

## 마치며

처음에는 `next/image`를 쓰면 이미지 최적화는 알아서 된다고 생각했다.
들여다보니 "알아서"의 정체는 요청마다 일어나는 변환이었고, 그 변환에는 한도와 가격표가 붙어 있었다.

한 가지 아쉬운 건 처음 한도를 넘겼을 때 폭부터 바꿔 로고를 깨뜨린 일이다.
캐시에 무엇이 남아 있는지 먼저 생각했다면 하루를 덜 헤맸을 거다. 참.. 어렵다..
다음 일지에서는 같은 사람이 동시에 두 구인에 신청하거나, GM 버튼과 마감 크론이 동시에 추첨을 돌릴 때 생기는 경합을 어떻게 막았는지 써 보려 한다.
