---
phase: quick
plan: 029
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ActionPanel.tsx
  - lib/game/engine.ts
  - lib/game/engine.test.ts
autonomous: true

must_haves:
  truths:
    - "갈취 대상 선택 시 코인 0인 플레이어는 선택 불가 (비활성/숨김)"
    - "모든 생존 상대가 코인 0이면 갈취 버튼 자체가 비활성화"
    - "서버에서도 코인 0 대상에 대한 갈취를 거부"
  artifacts:
    - path: "components/game/ActionPanel.tsx"
      provides: "UI 필터링 - steal 대상에서 0코인 플레이어 제외"
    - path: "lib/game/engine.ts"
      provides: "서버 검증 - steal 대상 0코인 거부"
    - path: "lib/game/engine.test.ts"
      provides: "steal 0코인 거부 테스트"
  key_links:
    - from: "components/game/ActionPanel.tsx"
      to: "target selection filtering"
      via: "pendingActionType === steal 일 때 coins > 0 필터"
      pattern: "p\\.coins.*>.*0"
---

<objective>
갈취(steal) 액션에서 코인 0인 플레이어를 대상으로 선택할 수 없게 처리

Purpose: 코인 0인 플레이어에게 갈취하는 것은 무의미하며 UX 혼란을 야기함
Output: UI에서 0코인 플레이어 필터링 + 서버 검증 추가
</objective>

<context>
@components/game/ActionPanel.tsx
@lib/game/engine.ts
@lib/game/engine.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: UI - 갈취 대상에서 0코인 플레이어 필터링 + 갈취 버튼 비활성화</name>
  <files>components/game/ActionPanel.tsx</files>
  <action>
ActionPanel.tsx에서 두 가지 수정:

1. **대상 선택 화면(target selection mode)에서 0코인 플레이어 필터링:**
   - 라인 300 근처 `aliveOthers.map((p) => {` 부분에서, `pendingActionType === 'steal'`일 때 `p.coins === 0`인 플레이어 버튼을 disabled 처리하고 시각적으로 구분.
   - disabled 버튼에 "코인 없음" 표시 또는 opacity 처리로 선택 불가 상태 표현.
   - 접근법: aliveOthers를 필터링하지 말고 disabled prop으로 처리 (플레이어가 존재함은 보여주되 선택만 막기).

2. **갈취 버튼 자체 비활성화 (모든 상대가 0코인일 때):**
   - 라인 233 `visibleButtons` 필터 또는 row2 렌더링 부분에서, steal 버튼의 disabled 조건에 추가:
   - `aliveOthers.every(p => p.coins === 0)` 이면 steal 버튼도 disabled.
   - 이미 `canAfford` 로직이 있으므로, steal 타입일 때 `const hasStealTarget = aliveOthers.some(p => p.coins > 0)` 조건을 disabled에 추가.
  </action>
  <verify>
  `npm run build` 성공. 수동으로: 갈취 선택 시 코인 0 플레이어가 disabled로 표시되는지, 모든 상대 0코인일 때 갈취 버튼 자체가 비활성인지 확인.
  </verify>
  <done>갈취 대상 선택에서 0코인 플레이어 선택 불가, 대상 없으면 갈취 버튼 비활성</done>
</task>

<task type="auto">
  <name>Task 2: Engine - 서버사이드 steal 대상 0코인 검증 + 테스트</name>
  <files>lib/game/engine.ts, lib/game/engine.test.ts</files>
  <action>
1. **engine.ts의 processAction에서 steal 검증 추가:**
   - 라인 251 근처 `case 'steal':` 분기에서, targetId가 있으면 대상 플레이어의 coins를 확인.
   - `if (type === 'steal' && targetId) { const target = getPlayer(s, targetId); if (target.coins === 0) throw new Error('갈취: 대상의 코인이 0입니다'); }`
   - 이 검증은 기존 `if ((type === 'assassinate' || type === 'steal') && !targetId)` 체크 바로 아래에 추가.

2. **engine.test.ts에 테스트 추가:**
   - 기존 테스트 패턴을 따라 `describe('steal')` 블록 안에(없으면 생성) 테스트 케이스 추가:
   - `it('코인 0인 플레이어에게 갈취 시 에러', () => { ... })` - 대상 coins를 0으로 설정하고 processAction steal 호출 시 에러 throw 확인.
  </action>
  <verify>`npx jest lib/game/engine.test.ts --no-coverage` 통과</verify>
  <done>서버에서 0코인 대상 갈취 시 에러 반환, 테스트 통과</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. `npx jest lib/game/engine.test.ts --no-coverage` 통과
3. steal 대상 0코인 검증이 UI + 서버 양쪽에서 동작
</verification>

<success_criteria>
- 갈취 대상 선택 시 코인 0인 플레이어 disabled 처리
- 모든 생존 상대 코인 0이면 갈취 버튼 비활성
- 서버에서 0코인 대상 갈취 요청 시 400 에러 반환
- 기존 테스트 깨지지 않음 + 새 테스트 통과
</success_criteria>

<output>
After completion, create `.planning/quick/029-steal-block-zero-coins-target/029-SUMMARY.md`
</output>
