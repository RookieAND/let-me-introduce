## 들어가며

`filter__submissionVersion` 쿼리 파라미터에 숫자를 넣었더니 400 에러가 터졌다.

```javascript
GET /api/units/{unitId}/submissions/.../submission-answers?filter__submissionVersion=4
→ 400: "filter__submissionVersion must be a number conforming to the specified constraints"
```

`src/domain/unit/dto/paginated-submission-answer.dto.ts`를 열어보니 아래가 문제였다.

```typescript
// src/domain/unit/dto/paginated-submission-answer.dto.ts
@ApiProperty({ required: false })
@IsOptional()
@IsNumber()
filter__submissionVersion?: Submission['version'] | 'latest'; // number | 'latest'
```

같은 DTO 안에 있는 `page`, `take`는 동일하게 쿼리 파라미터로 문자열이 전달됨에도 정상 작동한다.
다만 두 Property의 선언 방식을 비교하면 타입 선언 방식이 다르다는 것을 알 수 있다.

```typescript
// src/domain/unit/dto/paginated-submission-answer.dto.ts
@IsNumber()
page: number;         // ✅ 잘 됨

@IsNumber()
take: number;         // ✅ 잘 됨

@IsNumber()
filter__submissionVersion?: Submission['version'] | 'latest';  // ❌ 안 됨
```

하지만 `Submission.version`의 타입은 `number`다.
즉, `Submission['version']`도 결국 `number`인데 왜 이건 되고 저건 안 되는 걸까?

수정 자체는 간단했지만 이대로 그냥 넘어가자니 뭔가 찜찜한 기분이 들었다.
그래서 원인을 분석하기 위해 두 선언 방식의 차이가 무엇인지 들여다보고자 했다.
이번 글에서는 TypeScript 컴파일러가 데코레이터 메타데이터를 저장하는 방식부터,
class-transformer가 그 메타데이터를 읽어 타입을 변환하는 내부까지 훑게 됐다.

---

## 전체 흐름 요약

DTO를 컴파일하는 과정에서 에러가 발생했던 흐름을 먼저 정리하면 아래와 같다.

| 단계 | 관련 기술 | 핵심 동작 |
|---|---|---|
| 1 | TypeScript + `emitDecoratorMetadata` | 데코레이터 붙은 필드의 타입을 `design:type` 메타데이터로 저장 |
| 2 | Indexed Access Type | 컴파일러가 구체 타입 직렬화 불가 → `Object`로 저장 |
| 3 | Union Type | 단일 생성자로 표현 불가 → 마찬가지로 `Object` |
| 4 | `enableImplicitConversion` | `design:type`을 읽어 타입 변환 대상 결정 |
| 5 | 변환 실패 | `design:type = Object` → 변환 없음 → 문자열 그대로 잔존 → `@IsNumber()` 실패 |

---

## design:type 메타데이터 생성

TypeScript에는 `emitDecoratorMetadata`라는 컴파일러 옵션이 있다.

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

이 옵션을 켜면 TypeScript 컴파일러는 데코레이터가 붙은 프로퍼티나 메서드에 **자동으로 타입 메타데이터를 삽입**한다.
구체적으로는 `Reflect.metadata('design:type', ...)` 함수 호출부가 컴파일된 JS 코드에 자동으로 추가된다.

### design:type 이라는 Key

이때 사용되는 `design:type` 키 값은 임의로 붙인 이름이 아니라 약속된 예약어다.
TC39 데코레이터 제안과 TypeScript가 `reflect-metadata` 라이브러리와 함께 정의한 **표준 메타데이터 키**다.

TypeScript의 `emitDecoratorMetadata`가 자동으로 삽입하는 메타데이터 키는 세 가지다.

| 키 | 저장되는 값 | 삽입 시점 |
|---|---|---|
| `design:type` | 프로퍼티의 타입 | 프로퍼티 데코레이터 |
| `design:paramtypes` | 생성자/메서드의 파라미터 타입 배열 | 클래스/메서드 데코레이터 |
| `design:returntype` | 메서드의 반환 타입 | 메서드 데코레이터 |

이 중 class-transformer와 NestJS ValidationPipe가 타입 변환에 사용하는 것은 `design:type`이다.
`design:` 네임스페이스는 "TypeScript 컴파일러가 설계(design) 타임에 수집한 정보"라는 의미로 붙은 prefix다.

### 컴파일 전후 비교

아래는 테스트로 작성된 Dto Class 코드다.

```typescript
// 원본 TypeScript
class TestDto {
  @IsNumber()
  version: number;
}
```

이를 TSC로 컴파일하여 Javascript 코드로 변환하면 아래의 코드가 된다.

```javascript
// 컴파일된 JavaScript (SWC/tsc 기준)
_ts_decorate([
  (0, _classvalidator.IsNumber)(),
  _ts_metadata("design:type", Number)   // ← 컴파일러가 자동 삽입
], TestDto.prototype, "version", void 0);
```

컴파일된 코드에서 두 가지 헬퍼 함수가 등장한다.

- `_ts_decorate` — TypeScript가 `@Decorator` 문법을 런타임에서 구현하기 위해 생성하는 헬퍼 함수다. 등록된 데코레이터 배열을 받아 대상 프로퍼티에 순서대로 적용한다.
- `_ts_metadata` — `emitDecoratorMetadata` 옵션이 활성화됐을 때 TypeScript 컴파일러가 **자동으로 삽입**하는 함수다. 인자로 받은 메타데이터 키와 값을 `Reflect.metadata()`를 통해 해당 프로퍼티에 저장한다.

즉, 위 코드는 `@IsNumber()` 데코레이터를 `TestDto.prototype.version`에 적용하면서,
동시에 이 필드의 타입 정보(`Number`)를 `design:type` 키로 Reflect 메타데이터에 기록하는 과정이다.

### _ts_metadata 가 하는 일

`_ts_metadata`가 내부적으로 하는 일은 단순하다.

```javascript
function _ts_metadata(key, value) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") {
    return Reflect.metadata(key, value);
  }
}
```

`Reflect.metadata('design:type', Number)`를 호출하면 `reflect-metadata` 라이브러리가 해당 프로퍼티에 타입 정보를 저장한다.

```javascript
// reflect-metadata 가 내부적으로 하는 일
Reflect.defineMetadata('design:type', Number, TestDto.prototype, 'version');

// 이후 꺼내 쓸 때
Reflect.getMetadata('design:type', TestDto.prototype, 'version'); // → Number
```

이 메타데이터가 나중에 class-transformer가 타입 변환을 결정하는 핵심 근거가 된다.

### design:type 에 저장 가능한 타입

문제는 `design:type`에 저장할 수 있는 값이 **단일 생성자 함수 하나뿐**이라는 점이다.
TypeScript 컴파일러는 타입을 아래 규칙으로 직렬화한다.

| 타입 | design:type |
|---|---|
| `number` | `Number` |
| `string` | `String` |
| `boolean` | `Boolean` |
| `Array<T>` | `Array` |
| 클래스 인스턴스 | 해당 클래스 |
| **그 외 모든 복잡한 타입** | **`Object`** |

"그 외 모든 복잡한 타입"에는 유니온 타입, 인터섹션 타입, 조건부 타입,
**그리고 이번에 우리가 사용한 Indexed Access Type이 모두 포함된다.**

---

## Indexed Access Type 이 Object 가 되는 이유

Indexed Access Type은 다른 타입의 프로퍼티 타입을 참조하는 문법이다.

```typescript
type SubmissionVersion = Submission['version'];  // number 라고 가정
```

TypeScript 타입 시스템 안에서는 `Submission['version']`이 `number`로 해석된다.
하지만 한 가지 우리가 생각할 점이 있다면, 이 타입은 오직 TypeScript 컴파일 타임에만 존재한다는 것이다.

### Type Erasure — 런타임에서 타입이 사라진다

> TypeScript의 타입 정보는 컴파일 후 전부 지워진다. 이를 Type Erasure라고 한다.

그렇기에 `emitDecoratorMetadata`가 하는 일은 바로 타입 정보를 `Reflect.metadata`로 런타임에 심어두는 것이다.
컴파일 과정에서 타입 정보가 날아가므로, 그 전에 타입 정보를 런타임에 저장하여 문제를 해결하기 위함이다.

그런데 컴파일러가 `design:type`에 저장할 값을 결정하는 시점에서 문제가 생긴다.
직렬화 과정에서 복잡한 구조의 타입의 경우 이를 그대로 살리지 않고 **`Object` 타입이라고 평가해버리는 것**이다.

### TypeScript 컴파일러의 타입 직렬화 규칙

TypeScript의 데코레이터 메타데이터 직렬화 로직은 아래와 같이 동작한다.

```
타입이 정확히 number/string/boolean 키워드인가? → Number/String/Boolean 저장
타입이 void/null/undefined 인가?               → undefined 저장
타입이 Array<T> 인가?                          → Array 저장
타입이 클래스 직접 참조인가?                    → 해당 클래스 저장
그 외 (union, intersection, alias, indexed access ...) → Object 저장
```

`Submission['version']`은 TypeScript 컴파일러 내부에서 `IndexedAccessType` 노드로 분류된다.
이 분류에 해당하는 타입들은 직렬화 과정에서 모두 `Object`로 처리된다. (실제 타입이 Primitive임에도!)

즉, `Submission['version']`이 `number`로 해석된다는 사실을 컴파일러가 알고 있음에도, **직렬화 규칙 상 `Number`로 저장하지 않는다.**

### 실제 컴파일 결과 비교

```typescript
class TestDto1 {
  @IsNumber()
  version: number;               // 직접 primitive
}

class TestDto2 {
  @IsNumber()
  version: Submission['version'];  // Indexed Access Type
}
```

두 클래스를 컴파일하면 `_ts_metadata`에 저장되는 타입 값이 달라진다.

```javascript
// TestDto1 — 컴파일 결과
_ts_metadata("design:type", Number)  // ✅

// TestDto2 — 컴파일 결과
_ts_metadata("design:type", Object)  // ❌
```

TypeScript가 `Submission['version']`을 `number`로 해석한다는 걸 알면서도 `Object`를 내보내는 이유가
바로 직렬화 단계에서 `IndexedAccessType`이 `Object` 버킷으로 떨어지기 때문이다.

---

## Union Type 또한 마찬가지인 이유

`Submission['version'] | 'latest'`처럼 유니온 타입을 쓴 경우도 동일하게 `Object`가 된다.

```typescript
class TestDto3 {
  @IsNumber()
  version: Submission['version'] | 'latest';
}
```

실제로 위 코드를 컴파일하면 Indexed Access Type과 동일하게 `Object`가 저장된다.

```javascript
// 컴파일 결과
_ts_metadata("design:type", Object)  // ❌
```

이건 Indexed Access Type과는 별개의 이유로 발생한다.

`design:type`에는 단일 생성자 함수 하나만 저장할 수 있다.
하지만 `number | string` 같은 유니온 타입을 단일 생성자 하나로 표현하면 어떻게 해야 할까?

TypeScript는 이 문제를 `Object`로 처리하는 방식으로 해결(이라 말하고 회피라고 본다)했다.
이는 Reflect Metadata API의 구조적 한계이기도 하다.
`design:type`은 단 하나의 값만 저장할 수 있고,
유니온을 표현할 수 있는 별도 메타 키(예를 들어 `design:uniontypes` 같은 것)는 존재하지 않는다.

따라서 아래 세 경우 모두 `Object`가 된다.

```typescript
version: number | string;                    // Union Type → Object
version: Submission['version'];              // Indexed Access → Object
version: Submission['version'] | 'latest';  // 둘 다 → Object
```

---

## enableImplicitConversion 의 동작

NestJS `ValidationPipe`에서 `enableImplicitConversion: true`를 설정하면 class-transformer가 자동 타입 변환을 수행한다.

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

### class-transformer 의 내부 변환 로직

class-transformer는 각 프로퍼티를 변환할 때 `Reflect.getMetadata('design:type', ...)`로 저장된 타입을 읽는다.
실제 코드를 보면 두 단계로 나뉘어 있다.

**1단계 — enableImplicitConversion 이 design:type 을 읽어 type 으로 저장**

```javascript
// node_modules/class-transformer/cjs/TransformOperationExecutor.js
else if (this.options.enableImplicitConversion &&
    this.transformationType === TransformationType.PLAIN_TO_CLASS) {
    const reflectedType = Reflect.getMetadata('design:type', targetType.prototype, propertyName);
    if (reflectedType) {
        type = reflectedType; // ← 여기에 Object 가 담깁니다
    }
}
```

`@Type()` 데코레이터가 없는 케이스에서 `enableImplicitConversion`이 `true`이면 `Reflect.getMetadata`로 `design:type`을 읽어 `type` 변수에 담는다.
Indexed Access Type이 사용된 필드라면 이 시점에 `type = Object`가 설정된다.

**2단계 — 설정된 type 으로 transform 메서드에서 실제 변환 실행**

```javascript
// node_modules/class-transformer/cjs/TransformOperationExecutor.js
transform(source, value, targetType, arrayType, isMap, level = 0) {
    // 중략...
    else if (targetType === Number && !isMap) {
        if (value === null || value === undefined)
            return value;
        return Number(value);  // "4" → 4
    }
    // targetType === Object 인 경우 이 분기에 진입하지 못하여 변환이 일어나지 않는다
}
```

`transform` 메서드는 `targetType === Number`, `targetType === String` 등 각각에 대해 분기처리를 시행한다.
`targetType === Object`는 어떤 분기에도 해당하지 않아 변환이 일어나지 않고 원본 값(`"4"`)이 유지된다.

### 400 에러가 발생하는 전체 흐름

```
Client → "4" (string) 전달
→ class-transformer: Reflect.getMetadata('design:type') → Object
→ targetType === Object → 변환 없음
→ "4" (string) 그대로
→ @IsNumber() 실패 → 400
```

반면 `page: number`처럼 직접 primitive 타입을 선언한 필드는 아래처럼 정상 처리된다.

```
→ Reflect.getMetadata('design:type') → Number
→ targetType === Number → Number("0") = 0
→ @IsNumber() 통과 ✅
```

---

## 구현 수정

### 기존 코드

```typescript
// src/domain/unit/dto/paginated-submission-answer.dto.ts
@ApiProperty({ required: false })
@IsOptional()
@IsNumber()
filter__submissionVersion?: Submission['version'] | 'latest';
```

이 선언의 문제는 두 가지다.

1. `Submission['version']` — Indexed Access Type. `design:type`이 `Object`가 됨.
2. `| 'latest'` — Union Type. 마찬가지로 `design:type`이 `Object`가 됨.

### 해결 1 — 직접 primitive 타입 사용 (권장)

```typescript
@ApiProperty({ type: Number, required: false })
@IsNumber()
@IsOptional()
filter__submissionVersion?: number;
```

`'latest'` 처리는 컨트롤러로 옮긴다.

```typescript
// src/domain/unit/unit.controller.ts
async getSubmissionAnswers(
  @Query() { filter__submissionVersion, ...dto }: PaginatedSubmissionAnswerDto,
) {
  return this.unitService.getPaginatedSubmissionAnswers({
    version: filter__submissionVersion ?? 'latest',  // undefined → 'latest' 로 처리
    dto,
  });
}
```

DTO는 `number | undefined`만 받고, 기본값 처리는 컨트롤러가 담당하는 방식이다.
이렇게 처리할 경우 DTO가 단순해지고 메타데이터 문제도 사라진다.

나는 1번으로 DTO 타입을 수정하여 Validation Error 문제를 해결했다. 참.. 어렵다..

### 해결 2 — @Transform 데코레이터 사용

`'latest'`를 DTO 레벨에서 허용해야 한다면 `@Transform`으로 변환 로직을 직접 지정한다.
`enableImplicitConversion`이 **자동 변환**이라면, `@Transform`은 자동 변환을 우회하는 **수동 변환**이다.

```typescript
@ApiProperty({ required: false })
@IsOptional()
@Transform(({ value }) => {
  if (value === 'latest') return value;
  const num = Number(value);
  return isNaN(num) ? value : num;
})
@ValidateIf((o) => o.filter__submissionVersion !== 'latest')
@IsNumber()
filter__submissionVersion?: number | 'latest';
```

`@Transform`이 붙으면 class-transformer는 `design:type` 대신 `@Transform` 함수를 우선 실행한다.
즉 메타데이터에 정의된 타입 정보를 사용하지 않고 별도의 로직 변환 과정을 추가함으로써 자동 변환을 건너뛰는 방식이다.

---

## DTO 작성 시 주의사항

- `@IsNumber()`, `@IsString()` 같은 class-validator 데코레이터가 붙은 필드에는 **primitive 타입을 직접 선언한다.**
- `Entity['property']` 형태는 DTO에서 피한다. TypeScript 타입 체크는 통과하지만 런타임 변환이 망가진다.
- 복잡한 타입이 꼭 필요하다면 `@Transform`으로 변환 로직을 명시한다. (코드가 예쁘진 않지만 어쩔 수 없다)
