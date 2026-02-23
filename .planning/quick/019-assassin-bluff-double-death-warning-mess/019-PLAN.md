---
phase: quick
plan: "019"
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ResponseModal.tsx
  - lib/game/engine.ts
autonomous: true

must_haves:
  truths:
    - "암살 액션에 도전할 때 ResponseModal에 '도전 실패 시 2명이 카드를 잃는다'는 위험 경고가 눈에 띄게 표시된다"
    - "도전 실패 후 암살이 진행될 때 이벤트 로그에 '도전자 + 암살 대상 2명 피해' 상황이 명확히 기록된다"
  artifacts:
    - path: "components/game/ResponseModal.tsx"
      provides: "암살 도전 위험 경고 배너"
    - path: "lib/game/engine.ts"
      provides: "암살 도전 실패 시 상세 로그 메시지"
  key_links:
    - from: "components/game/ResponseModal.tsx"
      to: "pending.type === 'assassinate'"
      via: "조건부 경고 배너 렌더링"
---

<objective>
암살자 블러핑 도전 시 2명이 피해를 입는 위험한 시나리오에 대한 경고 UI와 이벤트 로그 메시지를 추가한다.

Purpose: 암살 액션에 도전할 때, 도전 실패 시 도전자(카드 1장 잃음) + 암살 대상(카드 1장 잃음) = 2명이 피해를 입는 위험한 상황임을 플레이어가 인지하도록 한다. 현재는 상세 보기 토글 뒤에 숨겨져 있어 놓치기 쉽다.

Output: ResponseModal에 경고 배너 + engine.ts에 상세 로그 메시지
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/ResponseModal.tsx
@lib/game/engine.ts
@lib/game/types.ts
@components/game/EventLog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: ResponseModal에 암살 도전 위험 경고 배너 추가</name>
  <files>components/game/ResponseModal.tsx</files>
  <action>
  ResponseModal 컴포넌트에서, 암살(assassinate) 액션에 대해 응답하는 상황일 때 (isBlockPhase가 아니고 pending.type === 'assassinate'), 도전 버튼 위에 눈에 띄는 경고 배너를 추가한다.

  위치: 버튼 섹션(line 341 부근) 시작 직후, 도전 버튼 바로 위에 삽입.

  경고 배너 내용:
  - 빨간/주황 배경의 경고 박스 (TriangleAlert 아이콘 재사용)
  - 텍스트: "도전 실패 시 도전자 + 암살 대상 모두 카드를 잃습니다! (2명 피해)"
  - 스타일: `backgroundColor: 'rgba(231, 76, 60, 0.1)'`, `border: '1px solid rgba(231, 76, 60, 0.3)'`, 둥근 모서리 `rounded-lg`, 패딩 `px-3 py-2.5`
  - 아이콘 + 텍스트 flex row, gap-2
  - 텍스트 크기: `text-[11px]`, 색상: `text-red-400`
  - "2명 피해" 부분은 `font-bold`로 강조

  조건: `!isBlockPhase && pending.type === 'assassinate'` 일 때만 표시.

  또한, 도전 버튼 텍스트도 암살 상황일 때 약간 변경:
  현재: '도전! (거짓말이라고 생각해요)'
  변경: '도전! (암살자가 아니라고 생각해요)' — 암살 상황에서만.
  비암살 상황은 기존 텍스트 유지.
  </action>
  <verify>
  `npx tsc --noEmit` 타입 체크 통과.
  ResponseModal에서 pending.type === 'assassinate'일 때 경고 배너가 렌더링되는지 코드 확인.
  </verify>
  <done>
  암살 액션 응답 시 도전 버튼 위에 "2명 피해" 경고 배너가 표시되고, 도전 버튼 텍스트가 암살 맥락에 맞게 변경됨.
  </done>
</task>

<task type="auto">
  <name>Task 2: engine.ts에 암살 도전 실패 시 상세 로그 메시지 추가</name>
  <files>lib/game/engine.ts</files>
  <action>
  resolveChallenge 함수(line 455)에서 도전 실패(actorHasCard === true) 분기 내에, 암살(assassinate) 액션인 경우 추가 경고 로그를 삽입한다.

  위치: line 483~486 부근, 기존 "도전 실패!" 로그 직후.

  조건: `pending.type === 'assassinate'` 일 때만.

  추가할 로그:
  ```typescript
  if (pending.type === 'assassinate') {
    s = addLog(s, `${challenger.name}이(가) 도전에 실패하여 카드를 잃고, ${getPlayer(s, pending.targetId!).name}도 암살됩니다!`, {
      type: 'challenge_fail',
      actorId: pending.actorId,
      targetId: pending.targetId,
    });
  }
  ```

  또한, executeAction의 assassinate case(line 602~616)에서 `addLog` 호출 시, 도전 실패 후 암살이 진행되는 경우를 구분하여 메시지를 변경한다.

  현재: `${actor.name}이(가) ${target.name}을 암살합니다`
  변경: 도전 실패 후 진행되는 경우(pendingAction에 이전 도전 실패 흔적이 있을 때 = 이미 도전자가 카드를 잃은 후)에는 별도 메시지 불필요 — resolveChallenge에서 이미 추가한 로그가 충분하므로 executeAction의 기존 메시지는 그대로 유지.

  핵심: resolveChallenge에서 도전 실패 직후 "2명 피해" 상황을 예고하는 로그만 추가하면 됨.
  </action>
  <verify>
  `npx tsc --noEmit` 타입 체크 통과.
  기존 테스트 실행: `npx jest --passWithNoTests` (또는 프로젝트의 테스트 명령어) 통과.
  resolveChallenge에서 assassinate + 도전 실패 시 추가 로그가 생성되는지 코드 확인.
  </verify>
  <done>
  암살 도전 실패 시 "도전자 카드 잃음 + 대상도 암살됨" 내용의 이벤트 로그 메시지가 추가됨. 기존 테스트 통과.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 전체 타입 체크 통과
2. `npx jest --passWithNoTests` — 기존 테스트 통과
3. ResponseModal 코드에서 assassinate 조건부 경고 배너 존재 확인
4. engine.ts resolveChallenge에서 assassinate 도전 실패 로그 존재 확인
</verification>

<success_criteria>
- 암살 액션 응답 시 ResponseModal에 빨간 경고 배너("2명 피해")가 도전 버튼 위에 표시됨
- 도전 버튼 텍스트가 암살 상황에서 맥락에 맞게 변경됨
- 암살 도전 실패 시 이벤트 로그에 "도전자 + 암살 대상 2명 피해" 메시지가 기록됨
- 타입 체크 및 기존 테스트 통과
</success_criteria>

<output>
After completion, create `.planning/quick/019-assassin-bluff-double-death-warning-mess/019-SUMMARY.md`
</output>
