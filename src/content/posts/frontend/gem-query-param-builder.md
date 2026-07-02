## 기존 구조의 문제: 상태가 URL과 무관하게 떠돌았다

GEM 서비스에는 스페이스, 기수, 코스, 권한 등 도메인별로 각각 독립적인 관리 테이블이 존재한다.
각 테이블은 페이지네이션, 정렬, 필터라는 세 가지 상태를 가지고 있으며, 처음에는 모두 `useState`로 관리했다.

```typescript
// UnitTable.context.tsx — QueryParamBuilder 도입 이전

// 상태와 액션을 두 개의 Context로 분리해 관리했다
const UnitTableStateContext    = React.createContext({ page: 0, size: 10, sort: '-updatedAt', type: UNIT_TYPE.recruitment });
const UnitTableDispatchContext = React.createContext({ setPagination: () => {}, setSort: () => {}, setSize: () => {}, setType: () => {} });

export const UnitTableContextProvider = ({ children }) => {
  const [page, setPagination] = React.useState(0);
  const [size, setSize]       = React.useState(10);
  const [sort, setSort]       = React.useState('-updatedAt'); // - prefix가 내림차순
  const [type, setType]       = React.useState(UNIT_TYPE.recruitment);

  return (
    <UnitTableStateContext.Provider value={{ page, size, sort, type }}>
      <UnitTableDispatchContext.Provider value={{ setPagination, setSize, setSort, setType }}>
        {children}
      </UnitTableDispatchContext.Provider>
    </UnitTableStateContext.Provider>
  );
};
```

초기 개발 당시에는 딱히 문제가 생길 거라 생각하지 않았다.
메모리에만 상태를 두니 새로고침하면 초기화되는 건 당연한 일이었는데, 그게 사용자 입장에서 얼마나 불편한지는 막상 CS가 쌓이기 전까지 제대로 인식하지 못했다.

하지만 운영이 시작되면서 "필터를 걸어놓은 상태로 링크를 공유하고 싶어요"라는 요청이 하나씩 들어오기 시작했다.
공유된 URL에는 필터나 정렬 정보가 아무것도 없으니 당연히 공유가 안 됐고, 그때서야 이 구조의 한계가 명확해졌다.

거기에 더해서, 필터·정렬 필드를 하나 추가하려면 `useState` 선언부터 Context 등록까지 전부 순서대로 고쳐야 했다.
서비스 내 테이블이 8개를 넘어가는 시점에서 이대로는 안 되겠다 싶었다.

---

## 백엔드 규약 설계: filter__field__operator

우선 정렬 및 필터 상태를 URL로 옮기기로 했다. 그런데 그 전에 먼저 해결해야 할 게 있었다.

URL에 상태를 올리면 그 파라미터 형식이 곧 프론트-백 간의 계약이 된다.
당시 API마다 파라미터 이름이 달랐으니, 이 상태로 URL 동기화를 시작하면 테이블마다 다른 계약이 생기는 셈이었다.
형식 없이 쿼리 파라미터를 쓰기 시작하면 DTO가 테이블 수만큼 파편화될 게 뻔했다.

```typescript
// entities/unit/api/get.ts — 규약 도입 이전
export type GetUnitListParams = {
  courseId: string;
  page: number;
  size: number;
  sort?: 'updatedAt' | '-updatedAt' | 'createdAt' | '-createdAt' | 'title' | '-title';
  type?: 'survey' | 'recruitment';
};
```

정렬은 `sort` 하나에 `-` 접두사로 내림차순 여부를 표기했고, 필터는 `type`처럼 필드명을 그대로 파라미터로 노출했다.
정렬 기준을 하나 추가하면 유니온 타입에 직접 추가해야 하고, 새 필터 조건이 생기면 API마다 파라미터를 별도로 설계해야 했다.

지원서 테이블의 경우 사용자 응답 상태처럼 정렬이 필요한 필드가 20개를 넘기는 경우도 많았는데, 이 방식으로는 감당이 안 됐다.
그래서 먼저 백엔드 단에서 **필드명과 연산자를 파라미터 이름 자체에 인코딩하는 규약**을 도입했다.

정렬 양식은 앞에 `sort__` 접두사를 붙이고 이후에 정렬할 필드명을 붙인다.
필터 양식은 앞에 `filter__` 접두사를 붙이고 이후에 필터링할 필드명을 붙인다.
범위 체크나 정규식 판별처럼 추가 연산자가 필요하면 후미에 붙인다.

```
filter__field             → eq 연산    (filter__type)
filter__field__operator   → 그 외      (filter__level__in, filter__name__i_like)
sort__field: 'ASC'|'DESC' → 정렬       (sort__createdAt: 'DESC')
```

이 규약의 가장 큰 이점은 서버가 도메인을 몰라도 파싱할 수 있다는 점이다.
`filter__level__in`을 보면 "level 필드에 in 연산자"임을 파라미터 이름만으로 바로 읽힌다.
어떤 필드든 이 형식을 따르면 백엔드는 별도 DTO 추가 없이 일관되게 파싱할 수 있으며, 서버 DTO는 이 규약을 필드명으로 직접 선언한다.

```typescript
// apps/operation — PaginateUnitDto
export class PaginateUnitDto extends BasePaginationDto {
  @IsOptional()
  filter__type__eq?: UnitType;

  @IsOptional()
  sort__title?: 'ASC' | 'DESC';

  @IsOptional()
  sort__createdAt?: 'ASC' | 'DESC';
}
```

### PaginationService 구현

새롭게 지정된 규약을 기반으로 백엔드에서 `PaginationService`를 자체 구현했다.

모든 도메인이 공유하는 `BasePaginationDto`를 상속해 도메인별 필드를 추가하면, `PaginationService`가 DTO 키를 순회하며 Mongoose 쿼리로 자동 변환한다.

```tsx
// apps/operation/src/shared/dto/base-pagination.dto.ts
export class BasePaginationDto {
  page?: number;
  take?: number;
  filter__id__more_than?: string;
  filter__id__less_than?: string;
  sort__createdAt?: 'ASC' | 'DESC';
  // ...
}
```

도메인 DTO는 `BasePaginationDto`를 상속하고 자기 필드만 선언하면 된다.

```tsx
// apps/operation/src/domain/unit/dto/get-unit-permission.dto.ts
export class RequestGetUnitPermissionQueryDto extends BasePaginationDto {
  filter__level__in?: string;   // level 필드에 in 연산자
  sort__level?: 'ASC' | 'DESC';
}
```

`PaginationService`의 `composeFindOptions`는 DTO 키를 순회하면서 `filter__` / `sort__`로 시작하는 키를 파싱해 Mongoose 쿼리로 변환한다.

```tsx
// apps/operation/src/lib/pagination/service/pagination.service.ts
private composeFindOptions<T>(dto: BasePaginationDto) {
  for (const [key, value] of Object.entries(dto)) {
    if (key.startsWith('filter')) {
      // "filter__level__in=basic,advanced"
      // → field: 'level', operator: 'in', value: 'basic,advanced'
      const parsed = this.parseFilterQuery<T>(key, value);
      filter = this.mergeFilterQueries(filter, parsed);

    } else if (key.startsWith('sort')) {
      // "sort__createdAt=DESC" → sort: { createdAt: -1 }
      const [_, field] = key.split('__');
      sort[field] = value === 'ASC' ? 1 : -1;
    }
  }
}
```

연산자와 MongoDB 쿼리 연산자는 `FILTER_MAPPER`로 매핑된다.

```tsx
// apps/operation/src/lib/pagination/constant/filter-mapper.constant.ts
export const FILTER_MAPPER = {
  eq:        (val) => ({ $eq: val }),
  in:        (val) => ({ $in: Array.isArray(val) ? val : [val] }),
  nin:       (val) => ({ $nin: Array.isArray(val) ? val : [val] }),
  i_like:    (val) => ({ $regex: parseRegex(val), $options: 'i' }), // SQL 명칭, Regex 구현
  like:      (val) => ({ $regex: parseRegex(val) }),
  more_than: (val) => ({ $gt: val }),
  less_than: (val) => ({ $lt: val }),
  // ...
};
```

새 테이블이 추가되어도 `BasePaginationDto`를 기반으로 필드만 선언하면 됐다.
파싱 로직은 `PaginationService`에서 전담하니 도메인별 중복 코드가 없어졌다.

---

## 규약이 생겨도 하드코딩 문제는 남았다

규약을 도입한 뒤에도 프론트엔드 코드를 들여다보면 뭔가 찜찜한 부분이 있었다.

규약은 형식만 통일했을 뿐이어서 그 규약을 올바르게 지키고 있는지 확인하는 건 여전히 개발자 몫이었다.

```typescript
// entities/application/api/get.ts — 규약 도입 이후
type GetApplicationListQuery = {
  page?: number;
  take?: number;
  filter__status__in?: Schema.Application['status'][];  // __in → 배열? 눈으로 판단
  sort__userName?: 'ASC' | 'DESC';
  sort__submittedAt?: 'ASC' | 'DESC';
};
```

`filter__status__in`에 어떤 타입을 붙여야 하는지 모르면 백엔드 DTO를 직접 열어서 확인해야 했다.
키 이름에 `__in`이 붙어 있으니 값이 배열이어야 한다는 것도 눈으로 읽어서 판단해야 했다.

이걸 반복하다 보면 어느 순간 `[]`를 빠뜨리거나 타입을 엉뚱하게 연결한 채로 넘어가게 된다.
컴파일러는 이를 잡아줄 근거가 없기 때문이다.

이러한 문제는 호출 지점에서도 마찬가지로 발생했다.

```typescript
searchParams: {
  page,
  take,
  ...(filterStatusIn  && { filter__status__in: filterStatusIn }),
  ...(sortUserName    && { sort__userName: sortUserName }),
  ...(sortSubmittedAt && { sort__submittedAt: sortSubmittedAt }),
}
```

규약을 아는 사람이라면 쓸 수 있는 코드지만, 규약이 올바른지 확인하는 건 여전히 개발자 몫이었다.
`filter__stutus__in`으로 오타를 내도, 숫자 필드에 `like`를 써도 런타임에 API가 실패하기 전까지 아무것도 알려주지 않았다.

규약은 있는데 그 규약을 강제하는 장치가 없어서 오로지 개발자가 기억하고 책임져야 하는 구조였다.

---

## 필드 하나 추가가 네 곳의 연쇄 수정을 불렀다

이쯤 되니 테이블에 정렬 기준 하나 추가하는 작업이 두렵기 시작했다.

예를 들어 Course 권한 테이블에 새로운 정렬 필드를 추가해야 한다는 요구사항이 왔다고 가정해보자.
그러면 개발자는 아래의 순서를 거쳐야 한다.

1. `GetCoursePermissionQuery` 타입에 새 필드를 추가하고 백엔드 DTO 이름과 일치하는지 확인.
2. `getCoursePermissionList`에 파라미터를 전달하도록 고치고, optional이면 조건부 spread도 붙이기.
3. `useCoursePermissionTableConfig` 안에 `useState` 하나 더 추가하고 onChange 핸들러 만들기.
4. 테이블 상태를 Context로 감싸던 구조라 Context에도 새 상태와 dispatch를 등록.

필드 하나에 최소 네 곳을 건드려야 했고, 이게 테이블 수만큼 반복됐다.
같은 작업을 여러 번 반복하는 게 일상이 된 시점에서, 이 구조를 근본적으로 바꿔야겠다고 판단했다.

---

## QueryParamBuilder를 만들기로 했다

세 문제를 다시 보면 공통 원인이 하나인데, 규약이 코드 바깥에 있었다는 것이다.
개발자가 규약을 알고, 타입에 옮기고, 호출 지점마다 맞는지 확인하는 모든 책임을 졌다.

그렇다면 규약을 타입 시스템 안으로 가져오면 어떨까?
도메인 모델에서 필터 가능한 필드를 자동으로 뽑아내고, 연산자 조합이 올바른지 컴파일러가 검사하고, 직렬화와 URL 동기화는 빌더가 알아서 처리한다면 — 세 문제가 한 번에 해결되는 구조다.

각 도메인 별 테이블에 사용이 가능하도록, URL 쿼리 파라미터의 구성, 직렬화, 상태 관리를 한 곳에서 처리하는 빌더를 만들기로 했다.

빌더를 개발하기 전에 세 가지 원칙을 먼저 잡았다.

첫 번째는 **타입이 올바른 사용을 강제**하는 것이었다. 숫자 필드에 `like`를 쓰는 일, 존재하지 않는 필드를 필터하는 일을 런타임이 아니라 컴파일 타임에 막는 구조를 목표로 했다. 허용되는 API의 경계를 개발자가 결정하는 게 아니라 타입 시스템이 결정하도록 설계하는 것이다.

두 번째는 **상태 변경이 새 인스턴스로만 이루어지는 것**이었다. 메서드를 호출하면 기존 인스턴스를 변경하는 게 아니라 새 인스턴스를 반환하기 때문에 `useState(queryBuilder)` 하나로 React 상태 관리가 자연스럽게 연결된다.

세 번째는 **값의 저장과 직렬화를 분리**하는 것이었다. 필터·정렬 조건은 내부에 원본 그대로 보존하고, URL 문자열로의 변환은 실제로 요청을 보내는 시점에만 일어난다. 이렇게 하면 "지금 어떤 조건이 걸려 있는가"를 언제든 원본 타입으로 꺼낼 수 있다.

---

## 타입 설계: FilterableFields와 OperatorsForField

클래스를 먼저 만들고 타입을 나중에 얹으면, 설계가 굳은 뒤에 타입이 끼어들어 완성된 코드를 뜯어야 하는 상황이 온다.
그래서 클래스 구현은 뒤로 미뤘다. 타입 설계에서 먼저 답해야 할 질문이 세 가지 있었다.

필터·정렬 대상이 될 수 있는 필드는 어떻게 뽑아낼 것인가.
그 필드에 허용되는 연산자는 어떻게 제한할 것인가.
연산자에 따라 값의 타입이 달라지는 건 어떻게 표현할 것인가.

첫 번째 질문에 답하려면 먼저 정해야 할 게 있었다. 어떤 타입의 필드에 필터가 의미 있는가.

설계의 출발점은 단순한 전제였다. 필터와 정렬이 의미 있는 타입은 `string`, `number`, `Date`, `boolean` 네 가지뿐이다.
객체나 배열, 함수 같은 타입에는 필터를 거는 게 의미가 없다.

이 전제에서 출발해서, 도메인 모델 `T`의 키 중 필터·정렬 대상이 될 수 있는 것만 추출하는 `FilterableFields<T>` 타입을 만들었다.

```typescript
// Shared/Model/QueryParamBuilder/QueryParamBuilder.type.ts
export type FilterableFields<T> = Exclude<
  {
    [K in keyof T]: T[K] extends string
      ? K
      : T[K] extends number
        ? K
        : T[K] extends number | undefined
          ? K
          : T[K] extends Date
            ? K
            : T[K] extends string | undefined
              ? K
              : T[K] extends boolean | undefined
                ? K
                : never;
  }[keyof T],
  undefined
>;
```

Mapped Type으로 각 키를 순회하면서, 해당 키의 값 타입이 네 가지 중 하나에 해당하면 키 이름을 그대로 반환하고 나머지는 `never`로 만든다.
그 결과를 `[keyof T]`로 인덱싱하면 `never`가 제거되고 유효한 키들의 Union이 남는다. 구체적인 타입에 적용하면 아래와 같이 흘러간다.

```typescript
type CoursePermission = {
  id: number;
  name: string;
  level: string;
  metadata: { createdBy: string };  // 객체 타입 → never
  createdAt: Date;
  isActive: boolean;
};

// Mapped Type 내부 단계
{
  id: 'id';
  name: 'name';
  level: 'level';
  metadata: never;      // 객체 타입은 필터 불가 → never
  createdAt: 'createdAt';
  isActive: 'isActive';
}['id' | 'name' | 'level' | 'metadata' | 'createdAt' | 'isActive']
// → 'id' | 'name' | 'level' | never | 'createdAt' | 'isActive'
// → 'id' | 'name' | 'level' | 'createdAt' | 'isActive'
```

마지막에 `Exclude<..., undefined>`를 감싸는 이유가 있다.
optional 필드(`name?: string`)는 TypeScript 내부에서 `T[K]`가 `string | undefined`가 되는데, Mapped Type을 거치고 나면 키에 `'name' | undefined`가 포함될 수 있다.

이를 제거하지 않으면 `field` 파라미터로 `undefined`가 넘어오는 경우가 생긴다.
`number | undefined`, `string | undefined` 케이스를 별도로 처리하는 것도 같은 이유다.
도메인 모델에서 nullable한 필드가 흔하기 때문에, 이를 제외하면 실제 사용에서 커버리지가 크게 떨어진다.

---

`FilterableFields<T>`로 어떤 필드를 필터할 수 있는지 결정했다면, 다음 질문은 자연스럽게 이어진다.
그 필드에 어떤 연산자를 쓸 수 있는가. 이 역할을 `OperatorsForField<T, K>`가 담당하며, 걸러낸 필드의 타입에 따라 허용되는 연산자 집합이 자동으로 좁혀진다.

```typescript
export type OperatorsForField<T, K extends keyof T> =
  T[K] extends string | undefined
    ? 'eq' | 'ne' | 'like' | 'i_like' | 'in' | 'nin'
    : T[K] extends number | undefined
      ? 'eq' | 'ne' | 'less_than' | 'more_than' | 'gte' | 'lte' | 'in' | 'nin'
      : T[K] extends Date | undefined
        ? 'eq' | 'ne' | 'less_than' | 'more_than' | 'gte' | 'lte'
        : T[K] extends boolean | undefined
          ? 'eq' | 'ne'
          : 'eq' | 'ne';
```

`string`에는 `like`와 `in`이 들어가고, `number`에는 범위 연산자가 허용된다.
`Date`에 `like`가 없는 건 날짜에 문자열 패턴 매칭이 의미가 없기 때문이다.
`boolean`은 참/거짓 여부만 판단하면 되니 `eq`와 `ne`만 허용한다.

잘못된 조합은 바로 컴파일 에러로 잡힌다.

```typescript
// CoursePermission.id 는 number → 'like' 연산자는 허용되지 않는다
queryBuilder.filter('id', 'john', 'like');
// Argument of type '"like"' is not assignable to parameter of type
// 'eq' | 'ne' | 'less_than' | 'more_than' | 'gte' | 'lte' | 'in' | 'nin'
```

---

## FilterValue — 연산자가 값의 타입도 결정한다

타입 설계를 이어가다 보니 한 가지가 더 보였는데, 연산자가 결정되는 순간 그 연산자에 넣어야 하는 값의 타입도 자동으로 좁힐 수 있다는 것이었다.
`gte` 연산자라면 값이 `number`나 `Date`여야 하고, `like`라면 `string`이어야 한다. `in`이라면 배열이어야 한다.

이 역할을 `FilterValue<T, K, Op>` 조건부 타입이 담당한다.

```typescript
export type FilterValue<
  T,
  K extends FilterableFields<T>,
  Op extends FilterOperator,
> = Op extends 'in' | 'nin'
  ? NonNullable<T[K]>[]     // in / nin은 항상 배열
  : Op extends 'like' | 'i_like'
    ? string                 // like 계열은 항상 string
    : NonNullable<T[K]>;    // 그 외는 필드 원본 타입
```

이 타입을 `getFilter` 오버로드의 반환 타입으로 연결하면, `operator`를 지정하는 순간 반환값의 `value`가 자동으로 좁혀진다.

```typescript
// operator를 지정하면 value 가 FilterValue<T, K, Op> 로 좁혀진다
getFilter<K extends FilterableFields<T>, Op extends OperatorsForField<T, K>>(
  field: K,
  operator: Op,
): { field: K; operator: Op; value: FilterValue<T, K, Op> } | undefined;

// operator 없이 호출하면 FilterCriteria 그대로
getFilter(field: FilterableFields<T>): FilterCriteria<T> | undefined;
```

소비자 입장에서 `getFilter('level', 'in')`을 호출하면 `value`가 `string[]`으로 바로 확정된다.
`Array.isArray` 분기나 `as` 단언 없이 배열로 바로 쓸 수 있다.

---

## QueryParams — 직렬화 결과도 타입으로 만들어진다

빌더가 최종적으로 필터·정렬 조건을 URL 파라미터 형태의 객체로 직렬화해 반환할 때, 그 반환 타입도 단순한 `Record<string, unknown>`이 아니라 타입 추론이 되도록 미리 설계해둬야 했다.

`filter__name__i_like`, `sort__createdAt` 같은 키를 런타임에 문자열로 만드는 건 어렵지 않다.
그런데 이 키들이 타입 레벨에서도 존재해야 IDE 자동완성과 타입 검사가 의미 있어진다.

이 역할을 `QueryParams<T, P>` 타입이 담당하며, 핵심은 Template Literal Type으로 키를 생성하는 `MakeFilterKey`다.

```typescript
// Shared/Model/QueryParamBuilder/QueryParams.ts
type MakeFilterKey<
  TField extends PropertyKey,
  TOperator extends FilterOperator,
> = TField extends string
  ? TOperator extends 'eq'
    ? `filter__${TField}`
    : `filter__${TField}__${TOperator}`
  : never;
```

`MakeFilterKey<'name', 'i_like'>`를 평가하면 `"filter__name__i_like"` 리터럴 타입이 나온다.
`'eq'`일 때는 연산자를 생략해서 `"filter__name"`이 된다.

이 키 생성 타입을 필드별 연산자 전체에 걸쳐 Union으로 펼치면 모든 유효한 필터 키가 타입 레벨에서 열거된다.

```typescript
// FilterableFields<T>의 각 필드에 OperatorsForField를 걸어 키를 생성한다
type AllFilterKeys<T> = {
  [K in FilterableFields<T>]: FilterKeysForField<T, K>;
}[FilterableFields<T>];

// 정렬 키도 같은 방식으로
type AllSortKeys<T> = {
  [K in SortableFields<T>]: K extends string ? `sort__${K}` : never;
}[SortableFields<T>];
```

최종적으로 `QueryParams<T, P>`는 페이지네이션 파라미터와 모든 필터 키, 모든 정렬 키를 하나의 타입으로 합성한다.

```typescript
export type QueryParams<T extends Record<string, unknown>, P extends PaginationParams = OffsetPagination> =
  ApiPaginationParams<P> & {
    [K in AllFilterKeys<T>]?: ExtractFieldFromFilterKey<K> extends keyof T
      ? T[ExtractFieldFromFilterKey<K>]
      : string;
  } & {
    [K in AllSortKeys<T>]?: 'ASC' | 'DESC';
  };
```

`ExtractFieldFromFilterKey`는 `"filter__name__i_like"`에서 `"name"`을 역추출해서 `T['name']`으로 값 타입을 연결한다.
덕분에 `build()`가 반환하는 객체는 단순한 `Record<string, unknown>`이 아니라, 모든 키와 값이 타입으로 보장된 객체가 된다.

---

## 불변 빌더 클래스: 메서드마다 새 인스턴스를 반환한다

타입 설계가 끝났으니 클래스를 만들 차례였다.

클래스 설계에서 가장 먼저 고민한 건 불변성이었다.
불변성이 없으면 `useState`에 감쌌을 때 React가 상태 변경을 감지하지 못하거나, 의도치 않은 참조 공유로 버그가 생긴다.
`immer`를 도입하거나 매번 spread 연산자로 복사를 챙기는 건 원하지 않았는데, 설계 자체가 불변이면 그런 처리가 필요 없기 때문이다.

모든 내부 상태는 `readonly`이며, 메서드를 호출하면 상태를 변경하는 대신 새 인스턴스를 만들어 반환한다.

클래스가 담당하는 역할은 크게 다섯 가지다.

1. **필터 조건 관리**: 연산자별 편의 메서드(`eq`, `like`, `in` 등)가 외부에 노출되고, 내부 `filter()` private 메서드가 실제 상태 변경을 담당한다.
2. **정렬 조건 관리**: `orderBy()`로 정렬 기준과 방향을 추가하고, `clearSorts()`로 전체를 초기화한다.
3. **페이지네이션 관리**: offset 방식은 `page()`·`take()`, cursor 방식은 `cursor()`가 담당한다. typed this로 두 방식을 타입 레벨에서 분리해 잘못된 호출을 막는다.
4. **조건 직렬화**: `build()`가 내부 상태를 URL 파라미터 형태의 `QueryParams<T, P>` 객체로 변환해 반환한다.
5. **불변 인스턴스 반환**: 모든 메서드가 기존 인스턴스를 변경하지 않고 새 인스턴스를 반환해, React `useState` 연동이 자연스럽게 된다.

```typescript
// Shared/Model/QueryParamBuilder/QueryParamBuilder.ts
class QueryParamBuilder<T, P extends PaginationParams = OffsetPagination> {
  private readonly filters: readonly FilterCriteria<T>[];
  private readonly sorts:   readonly SortCriteria<T>[];
  private readonly pagination: P;

  private filter<K extends FilterableFields<T>>(
    field: K,
    value: unknown,
    operator: OperatorsForField<T, K>,
  ): QueryParamBuilder<T, P> {
    const newFilters = this.filters
      .filter((f) => !(f.field === field && f.operator === operator))
      .concat({ field, operator, value: formatFilterValue(value, operator) });

    return new QueryParamBuilder<T, P>({
      filters: newFilters,
      sorts: this.sorts,
      pagination: this.pagination,
    });
  }
}
```

`filter()`를 `private`으로 선언한 건 의도된 설계다.
외부에서 직접 `filter('id', 'some-value', 'like')`처럼 호출하면 앞서 공들여 만든 `OperatorsForField<T, K>` 타입 제약을 우회할 수 있기 때문이다.
`filter()`는 타입 안전성이 보장된 편의 메서드들의 공통 구현체로만 동작하며, 외부에는 아래의 메서드들이 노출된다.

```typescript
// 외부에 노출되는 편의 메서드들 — 모두 private filter()를 경유한다
eq<K extends FilterableFields<T>>(field: K, value: T[K]): QueryParamBuilder<T, P>
like<K extends ...>(field: K, value: string): QueryParamBuilder<T, P>
iLike<K extends ...>(field: K, value: string): QueryParamBuilder<T, P>
lessThan<K extends ...>(field: K, value: T[K] extends number | Date ? T[K] : never): QueryParamBuilder<T, P>
in<K extends FilterableFields<T>>(field: K, values: NonNullable<T[K]>[]): QueryParamBuilder<T, P>
notIn<K extends FilterableFields<T>>(field: K, values: NonNullable<T[K]>[]): QueryParamBuilder<T, P>
```

---

세 번째 원칙 — 값의 저장과 직렬화를 분리한다 — 이 가장 구체적으로 드러나는 지점이 `in()` 메서드인데, 배열을 내부에 원본 그대로 저장하는 것도 같은 설계 의도에서 비롯된다.

```typescript
in<K extends FilterableFields<T>>(
  field: K,
  values: NonNullable<T[K]>[],
): QueryParamBuilder<T, P> {
  return this.filter(field, values, 'in' as OperatorsForField<T, K>);
}
```

`build()` 시점에 미리 `join`해버리면 `getFilter('level', 'in')`으로 꺼낼 때 `'basic,advanced'`라는 문자열이 반환된다.
소비자 입장에서 이를 다시 `split(',')` 하거나 `as string[]`으로 단언해야 하는데, 앞서 설계한 `FilterValue` 타입이 의미를 잃는다.
원본 배열을 보존해두면 `getFilter('level', 'in')`이 `string[]`을 그대로 돌려주며, `join`은 `build()` 직전에만 일어난다.

```typescript
build(): QueryParams<T, P> {
  const params: Record<string, unknown> = {};

  this.filters.forEach(({ field, operator, value }) => {
    const key = operator === 'eq'
      ? `filter__${String(field)}`
      : `filter__${String(field)}__${operator}`;

    params[key] = Array.isArray(value) ? value.join(',') : value ? String(value) : value;
  });

  this.sorts.forEach(({ field, direction }) => {
    params[`sort__${String(field)}`] = direction.toUpperCase();
  });

  return params as QueryParams<T, P>;
}
```

---

페이지네이션 방식이 offset과 cursor 두 가지이다 보니, cursor 기반으로 초기화한 빌더에서 실수로 `page()`를 호출하는 경우가 생길 수 있었는데 이걸 런타임이 아니라 타입 수준에서 막고 싶었다.

```typescript
// typed this: P가 OffsetPagination일 때만 컴파일된다
page(
  this: QueryParamBuilder<T, OffsetPagination>,
  pageIndex: number,
): QueryParamBuilder<T, OffsetPagination>

// typed this: P가 CursorPagination일 때만 컴파일된다
cursor(
  this: QueryParamBuilder<T, CursorPagination>,
  cursor: string,
): QueryParamBuilder<T, CursorPagination>
```

TypeScript의 typed this 기능이다.
`P`가 `CursorPagination`인 빌더에서 `page()`를 호출하면 컴파일 에러가 난다.
cursor 기반 페이지네이션에서 오프셋 방식의 페이지 이동을 호출하는 실수를 타입 수준에서 막는 것이다.

```typescript
const params = QueryParamBuilder.from<CoursePermission>()
  .iLike('name', '구름')
  .in('level', ['basic', 'advanced'])
  .orderBy('createdAt', 'desc')
  .page(0)
  .build();

// params 결과 — QueryParams<CoursePermission, OffsetPagination> 타입
{
  'filter__name__i_like': '구름',
  'filter__level__in': 'basic,advanced',
  'sort__createdAt': 'DESC',
  'page': 0,
  'take': 10,
}
```

모든 메서드가 새 인스턴스를 반환하므로 `useState(initialBuilder)` 하나로 상태 관리가 완결되며, 불변성도 자동으로 보장된다.

---

## React 훅 연동: useTableQueryOptions

클래스가 완성됐으면 이걸 TanStack Table과 연결하는 훅이 필요했다.

단순히 `useState`로 감싸는 것만으로는 부족했는데, TanStack Table이 상태 변경 콜백을 독특한 시그니처로 정의하기 때문이다.

```typescript
type OnChangeFn<T> = (updaterOrValue: T | ((old: T) => T)) => void;
```

새 상태값을 직접 받거나, 이전 상태를 받아 새 상태를 반환하는 updater 함수를 받는 두 형태를 모두 허용한다.
`useTableQueryOptions`는 이 시그니처를 내부에서 처리하고 `QueryParamBuilder`의 메서드 호출로 변환한다.

```typescript
// Shared/Model/QueryParamBuilder/QueryParamBuilder.hook.ts
export function useTableQueryOptions<T>(options?: OffsetOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialBuilder = useMemo(
    () => QueryParamBuilder.fromUrl<T>(searchParams, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [queryBuilder, setQueryBuilder] = useState(initialBuilder);
  // ...
}
```

`fromUrl()` 정적 메서드가 핵심이다.
URL에 이미 `filter__type__eq=RECRUITMENT&sort__createdAt=DESC`가 있다면 이를 파싱해서 빌더를 초기화하며, `options`는 URL에 값이 없을 때의 기본값 역할을 한다.
의존성 배열을 `[]`로 고정한 건 마운트 시 한 번만 URL을 읽어 초기화하고 이후 상태 변경은 모두 `setQueryBuilder`를 통해 이루어지도록 하기 위한 의도된 설계다.

단순히 `setSearchParams(queryBuilder.toUrlParams())`를 호출하면 URL에 있던 다른 파라미터가 전부 날아가는 문제가 있었는데, 탭 선택이나 모달 상태처럼 테이블과 무관한 파라미터들도 함께 사라지기 때문이다.

```typescript
const setSearchParamsRef = useRef(setSearchParams);
setSearchParamsRef.current = setSearchParams;

useEffect(() => {
  setSearchParamsRef.current(
    (prev) => {
      const next = new URLSearchParams();
      // 탭 선택, 모달 상태 등 테이블과 무관한 파라미터는 보존
      prev.forEach((value, key) => {
        if (key !== 'page' && key !== 'take' && key !== 'cursor'
            && !key.startsWith('sort__') && !key.startsWith('filter__')) {
          next.set(key, value);
        }
      });
      queryBuilder.toUrlParams().forEach((value, key) => {
        next.set(key, value);
      });
      return next;
    },
    { replace: true },
  );
}, [queryBuilder]);
```

기존 파라미터 중 테이블 관련(`page`, `take`, `sort__*`, `filter__*`)만 솎아내고 빌더 상태로 덮어쓰는 방식이다.
`useRef`로 `setSearchParams` 참조를 고정한 건 `useEffect` 의존성에 넣으면 렌더마다 이중 실행이 생기는 문제를 막기 위해서다.

---

`onPaginationChange`와 `onSortingChange`도 단순해 보이지만 각각 신경 쓴 지점이 있었다.

```typescript
const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
  (updater) => {
    setQueryBuilder((prev) => {
      const p = prev.getPagination() as OffsetPagination;
      const current = { pageIndex: p.pageIndex, pageSize: p.pageSize };
      const next = typeof updater === 'function' ? updater(current) : updater;

      return next.pageSize !== current.pageSize
        ? prev.take(next.pageSize).page(0)
        : prev.page(next.pageIndex);
    });
  },
  [],
);
```

`pageSize`가 바뀌었을 때 `pageIndex`를 0으로 초기화하는 게 눈에 띈다.
10개씩 보다가 2페이지를 보는 도중에 페이지 크기를 50개로 바꾸면, 기존 `pageIndex`를 그대로 유지했을 때 서버에 없는 페이지를 요청하게 된다.
페이지 크기가 바뀌면 무조건 첫 페이지로 돌아가는 게 맞다.

TanStack Table이 정렬 상태를 전달하는 방식 때문에 `onSortingChange`는 조금 다른 접근이 필요했다.

```typescript
const onSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
  setQueryBuilder((prev) => {
    const current = prev.getSorts().map((s) => ({
      id: s.field as string,
      desc: s.direction === SORTING_DIRECTION.DESC,
    }));
    const next = typeof updater === 'function' ? updater(current) : updater;

    return next.reduce(
      (builder, sort) =>
        builder.orderBy(
          sort.id as SortableFields<T>,
          sort.desc ? SORTING_DIRECTION.DESC : SORTING_DIRECTION.ASC,
        ),
      prev.clearSorts(),
    );
  });
}, []);
```

TanStack Table은 정렬 변경 시 "이 필드 정렬 추가해줘"라는 delta를 보내는 게 아니라, "앞으로 정렬 상태는 이렇다"는 새 배열 전체를 넘겨준다.
그래서 기존 정렬 상태를 `clearSorts()`로 초기화하고 새로 받은 배열을 `reduce()`로 순서대로 쌓아서 빌더를 재구성한다.

---

## TroubleShooting

### 0-based vs 1-based 페이지네이션

처음 구현에서 페이지 번호 기준이 엇갈렸다.

TanStack Table은 `pageIndex`를 0-based로 관리해서 첫 페이지가 `pageIndex: 0`이었지만, 당시 `QueryParamBuilder` 내부는 1-based였다.
훅 경계에서 이 둘을 이어주려면 변환이 필요했고, 처음에는 이렇게 해결했다.

```typescript
// 훅 경계에서 +1 변환
return prev.page(next.pageIndex + 1);
```

그런데 이 방식이 마음에 들지 않았다. `QueryParamBuilder` 내부가 1-based라는 사실을 쓰는 쪽에서 기억하고 있어야 하며, 변환을 빠뜨리면 조용히 틀린 페이지를 요청하게 된다.
결국 `QueryParamBuilder` 자체를 0-based로 전환했는데, TanStack Table, `QueryParamBuilder` 내부, API 파라미터 모두 `page: 0`이 첫 페이지로 통일되면서 변환 로직이 완전히 사라졌다.

```typescript
// ✅ 변환 없이 그대로 전달
return prev.page(next.pageIndex);
```

### 브라우저 뒤로가기 트랩

필터를 바꾸거나 정렬을 바꿀 때마다 뒤로가기 스택이 쌓이고 있었다.

검색어를 한 글자 입력할 때마다, 정렬 방향을 바꿀 때마다 브라우저 히스토리 엔트리가 하나씩 추가되었고, 테이블 페이지에서 뒤로가기를 눌러도 이전 페이지로 가지 못하고 쌓인 상태 변경을 역행할 뿐이었다.
필터를 10번 바꿨다면 뒤로가기를 10번 눌러야 비로소 이전 페이지로 이동하는 상황이었다.

```typescript
// ❌ 기본 동작 — history 엔트리를 새로 쌓는다
setSearchParams(queryBuilder.toUrlParams());

// ✅ replace: true — 현재 엔트리를 교체한다. 스택이 쌓이지 않는다
setSearchParams(queryBuilder.toUrlParams(), { replace: true });
```

---

## 달성한 것들

### 컴파일러가 규약을 강제하게 됐다

도입 이전에는 쿼리 파라미터를 직접 문자열로 작성해야 했다.

```typescript
// ❌ AS-IS — 오타도, 잘못된 연산자 조합도 컴파일러가 잡을 수 없다
searchParams: {
  filter__stutus__in: filterStatus,  // status → stutus 오타
  sort__createAt: 'DESC',            // createdAt → createAt 오타
  filter__id__like: someId,          // number 필드에 like 연산자
}

// ✅ TO-BE — 필드명, 연산자, 값의 타입이 모두 컴파일 타임에 검증된다
queryBuilder
  .in('stutus', filterStatus)   // 존재하지 않는 필드 → 컴파일 에러
  .orderBy('createAt', 'DESC')  // 오타 → 컴파일 에러
  .like('id', 'john')           // number 필드에 like → 컴파일 에러
```

`filter__stutus__in`으로 오타를 내도, 숫자 필드에 `like`를 써도 런타임에 API가 실패하기 전까지 아무것도 알려주지 않던 구조가, 잘못된 사용 자체를 작성할 수 없는 구조로 바뀌었다.

### 소비자 코드에서 런타임 방어 로직이 사라졌다

연산자를 지정하면 값의 타입이 자동으로 좁혀지기 때문에 꺼내서 쓰는 쪽에서 분기가 사라졌다.

```typescript
// ❌ AS-IS — URL searchParams에서 직접 읽어야 했다. 타입은 항상 string | null
const [searchParams] = useSearchParams();
const filterLevelIn = searchParams.get('filter__level__in'); // string | null
// in 연산자는 쉼표로 구분된 문자열이지만, 그 사실을 소비자가 직접 알아야 한다
const levels = filterLevelIn ? (filterLevelIn.split(',') as Level[]) : [];

// ✅ TO-BE — FilterValue가 string[]을 보장. 런타임 분기 불필요
const filter = queryBuilder.getFilter('level', 'in');
return filter?.value ?? [];
```

### 새 필드 추가가 메서드 호출 하나로 줄었다

이전에는 Course 권한 테이블에 정렬 기준 하나를 추가하는 작업이 네 곳의 수정을 불렀다.

```typescript
// ❌ AS-IS — 필드 하나에 최소 4곳을 건드려야 한다

// 1. Query 타입에 새 필드 추가
type GetCoursePermissionQuery = {
  sort__level?: 'ASC' | 'DESC'; // 추가
};

// 2. API 함수에 파라미터 전달 + optional이면 조건부 spread도
...(sortLevel && { sort__level: sortLevel }),

// 3. 훅에 useState 추가 + onChange 핸들러 작성
const [sortLevel, setSortLevel] = useState<'ASC' | 'DESC' | undefined>();

// 4. Context에 새 상태와 dispatch 등록
const CoursePermissionTableDispatchContext = createContext({
  setSortLevel: () => {},
  // ...
});

// ✅ TO-BE — 메서드 호출 하나
queryBuilder.orderBy('level', 'ASC')
```

URL 반영은 훅이 알아서 처리하고 타입이 틀리면 컴파일러가 잡기 때문에, 정렬 기준 하나 추가가 네 파일 수정에서 메서드 호출 하나로 줄었다.

---

## 마치며

처음에 이 빌더를 만들 때는 솔직히 타입 안전성보다 빠른 구현이 먼저였다.
`value: any`로 일단 넘기고 나중에 고치면 되겠다고 생각했는데, 그 판단이 소비자 코드에 방어 로직으로 돌아오는 데는 그리 오래 걸리지 않았다.

방어 로직을 지워내면서 비로소 알았는데, 그게 단순히 코드가 짧아지는 문제가 아니었다.
컴파일러가 틀린 사용을 미리 막아준다는 건, 규약을 아는 사람만 올바르게 쓸 수 있었던 API가 규약 자체를 강제하는 API로 바뀐다는 뜻이었다.

타입을 정확하게 정의하면 구현의 책임이 명확해지고 소비자 코드는 자연스럽게 단순해진다.
뭔가 제대로 된 걸 만들었다는 느낌은, 소비자 코드에서 분기 하나가 사라지는 걸 처음 봤을 때 들었다.
