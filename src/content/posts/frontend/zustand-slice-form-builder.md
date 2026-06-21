## 문제: 문항 200개, 전체가 리렌더링된다

goorm의 강의 빌더는 섹션 → 유닛 → 컴포넌트 3단계로 구성된다. 강의 하나에 섹션 10개, 유닛 40개면 화면에 컴포넌트가 200개 이상 렌더링된다.  

처음엔 단일 `useState`로 전체 강의 트리를 관리했다.  

```typescript
const [course, setCourse] = useState<CourseTree>(initialCourse);

const updateUnitTitle = (unitId: string, title: string) => {
  setCourse(prev => deepMerge(prev, { units: { [unitId]: { title } } }));
};
```

문제는 **유닛 제목 하나를 수정해도 강의 전체가 리렌더링**된다는 것이었다. 입력 중 300ms 지연이 발생했고, 사용자 피드백이 "버벅인다"로 쏟아졌다.  

---

## Zustand 슬라이스 패턴

Zustand 슬라이스 패턴은 스토어를 독립적인 관심사 단위로 쪼개는 방식이다. 각 슬라이스는 자신의 상태와 액션만 갖는다.  

```typescript
// courseSlice.ts
export const createCourseSlice = (set: SetState) => ({
  course: null as Course | null,
  setCourse: (course: Course) => set({ course }),
});

// sectionSlice.ts
export const createSectionSlice = (set: SetState) => ({
  sections: {} as Record<string, Section>,
  updateSection: (id: string, patch: Partial<Section>) =>
    set((s) => ({
      sections: { ...s.sections, [id]: { ...s.sections[id], ...patch } },
    })),
});

// unitSlice.ts
export const createUnitSlice = (set: SetState) => ({
  units: {} as Record<string, Unit>,
  updateUnit: (id: string, patch: Partial<Unit>) =>
    set((s) => ({
      units: { ...s.units, [id]: { ...s.units[id], ...patch } },
    })),
});
```

슬라이스를 조합해 단일 스토어를 만든다.  

```typescript
export const useBuilderStore = create<BuilderStore>()((...a) => ({
  ...createCourseSlice(...a),
  ...createSectionSlice(...a),
  ...createUnitSlice(...a),
}));
```

---

## 셀렉터로 정밀한 구독

슬라이스를 쪼갠 것만으로는 부족하다. 컴포넌트가 **자신이 관심 있는 필드만** 구독해야 한다.  

```typescript
// UnitTitle.tsx
// 이 컴포넌트는 해당 unit의 title만 구독한다
const title = useBuilderStore(
  (s) => s.units[unitId]?.title,
  shallow,
);

const updateUnit = useBuilderStore((s) => s.updateUnit);

return (
  <input
    value={title ?? ''}
    onChange={(e) => updateUnit(unitId, { title: e.target.value })}
  />
);
```

`shallow` 비교를 붙이면 참조가 바뀌어도 값이 같으면 리렌더링을 건너뛴다. 결과적으로 유닛 200개 중 수정 중인 유닛 1개만 리렌더링된다.  

---

## 파생 상태는 셀렉터로

"섹션 내 유닛 목록" 같은 파생 상태는 컴포넌트 외부에 셀렉터 함수로 분리했다.  

```typescript
// selectors.ts
export const selectUnitsBySection = (sectionId: string) =>
  (s: BuilderStore) =>
    Object.values(s.units).filter((u) => u.sectionId === sectionId);
```

```typescript
// SectionUnits.tsx
const units = useBuilderStore(selectUnitsBySection(sectionId), shallow);
```

셀렉터를 컴포넌트 밖에 두면 동일한 로직을 여러 컴포넌트에서 재사용할 수 있고, 테스트도 쉬워진다.  

---

## 결과

- 입력 지연 **300ms → 체감 0ms**
- 전체 리렌더 횟수 **O(유닛 수) → O(1)**
- 슬라이스 단위 파일 분리로 각 도메인 로직이 명확히 격리됨

슬라이스 패턴은 팀에서 처음엔 "복잡해 보인다"는 의견이 있었다. 하지만 구현 후엔 "어느 상태가 어디 있는지 바로 찾을 수 있다"는 피드백으로 바뀌었다.  
