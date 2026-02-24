---
phase: 060-card-detail-modal-full-view
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/CardInfoModal.tsx
autonomous: true

must_haves:
  truths:
    - "카드 이미지가 잘리지 않고 전체가 보인다"
    - "캐릭터 이름이 이미지 위(하단)에 오버레이로 표시된다"
    - "능력 정보 섹션(고유 액션, 방어, 전략 팁)이 이미지 아래에 정상 표시된다"
  artifacts:
    - path: "components/game/CardInfoModal.tsx"
      provides: "전체 카드 이미지를 보여주는 CardInfoModal"
      contains: "aspect-ratio or object-contain"
  key_links:
    - from: "components/game/CardInfoModal.tsx"
      to: "/cards/{character}.jpg"
      via: "Next.js Image with aspect ratio container"
      pattern: "aspect-\\[|object-contain"
---

<objective>
CardInfoModal의 카드 이미지 헤더를 전체 카드가 보이도록 수정한다.

Purpose: 현재 `h-36 sm:h-48`로 고정된 높이에 `object-cover object-top`을 사용해 카드 이미지 상단만 보인다. 카드 전체를 표시해 사용자가 카드 아트를 온전히 감상할 수 있어야 한다.
Output: 카드 원본 비율을 유지하며 전체 이미지를 표시하는 CardInfoModal
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/kiyeol/development/coup/components/game/CardInfoModal.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: 카드 이미지 영역을 전체 표시로 변경</name>
  <files>components/game/CardInfoModal.tsx</files>
  <action>
이미지 헤더 div(`relative h-36 sm:h-48 w-full flex-shrink-0`)를 카드 원본 비율을 유지하는 방식으로 교체한다.

변경 방법:
1. 고정 높이(`h-36 sm:h-48`) 대신 `aspect-[2/3]` 또는 `aspect-[7/10]`을 사용해 카드 비율(세로가 긴 카드)을 맞춘다.
2. Image 컴포넌트의 `className`을 `object-cover object-top`에서 `object-contain`으로 변경한다.
3. 배경색이 없으면 letterbox가 생기므로 이미지 컨테이너에 `bg-slate-900` 추가한다.
4. 그라디언트 오버레이(`bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent`)와 캐릭터 이름 오버레이는 그대로 유지한다.

구체적인 코드 변경:
```tsx
// 기존
<div className="relative h-36 sm:h-48 w-full flex-shrink-0">
  <Image
    ...
    className="object-cover object-top"
    ...
  />

// 변경 후
<div className="relative w-full aspect-[2/3] flex-shrink-0 bg-slate-900">
  <Image
    ...
    className="object-contain"
    ...
  />
```

카드 이미지 실제 비율을 모르면 `aspect-[2/3]`(2:3, 카드 표준 비율)로 시작한다. 이미지가 너무 작아 보이면 `aspect-[3/4]`로 조정 가능.

그라디언트와 캐릭터 이름 position(`absolute bottom-3 left-4`)은 변경 없이 유지한다.
  </action>
  <verify>
개발 서버 실행 후(`npm run dev`) 브라우저에서 카드를 탭해 CardInfoModal을 열어 카드 이미지 전체가 잘림 없이 표시되는지 확인한다.
TypeScript 오류 없음: `npx tsc --noEmit`
  </verify>
  <done>
카드 이미지가 세로로 전체 표시되고 잘리지 않는다. 캐릭터 이름이 이미지 하단에 오버레이로 보인다. 능력 정보 섹션이 이미지 아래에 스크롤 가능하게 표시된다.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` 타입 오류 없음
- 브라우저에서 모바일 뷰(375px)로 CardInfoModal 열어 카드 전체 이미지 확인
- 이미지 하단 그라디언트와 캐릭터 이름 오버레이 정상 표시 확인
- 능력 정보 섹션이 이미지 아래 표시되고 스크롤 동작 확인
</verification>

<success_criteria>
카드 이미지가 `object-contain`으로 원본 비율을 유지하며 전체가 보인다. 고정 높이 클래스(`h-36`, `h-48`)가 제거되고 `aspect-[2/3]` 또는 유사한 비율 클래스로 대체된다.
</success_criteria>

<output>
완료 후 `.planning/quick/060-card-detail-modal-full-view/060-SUMMARY.md` 생성
</output>
