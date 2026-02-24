---
phase: quick
plan: 055
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ActionPanel.tsx
autonomous: true

must_haves:
  truths:
    - "내 턴일 때 타이머 바 아래에 시간 초과 시 자동 행동 안내 텍스트가 보인다"
    - "10코인 이상이면 '시간 초과 시 자동 쿠데타' 안내가 표시된다"
    - "10코인 미만이면 '시간 초과 시 자동 소득' 안내가 표시된다"
  artifacts:
    - path: "components/game/ActionPanel.tsx"
      provides: "타이머 바 아래 안내 텍스트"
      contains: "시간 초과"
  key_links: []
---

<objective>
ActionPanel의 턴 타이머 바 아래에 "시간 초과 시 자동 소득" (또는 10코인 이상이면 "시간 초과 시 자동 쿠데타") 안내 텍스트를 추가한다.

Purpose: 플레이어가 시간 초과 시 어떤 일이 일어나는지 미리 알 수 있도록 안내
Output: ActionPanel 타이머 바에 안내 텍스트 추가
</objective>

<context>
@components/game/ActionPanel.tsx — 타이머 바 위치 (lines 237-253), mustCoup 변수 (line 136)
@lib/game/engine.ts — resolveActionTimeout: 10코인 이상 자동 쿠데타, 미만 자동 소득
</context>

<tasks>

<task type="auto">
  <name>Task 1: 타이머 바 아래 자동 행동 안내 텍스트 추가</name>
  <files>components/game/ActionPanel.tsx</files>
  <action>
ActionPanel.tsx의 타이머 바 영역 (lines 238-253, `{actionDeadline && (...)}` 블록) 내부에서,
타이머 progress bar (`<div className="w-full h-1 ...">`) 아래에 안내 텍스트를 추가한다.

이미 존재하는 `mustCoup` 변수 (line 136: `const mustCoup = me.coins >= 10;`)를 활용:
- mustCoup이 true이면: "⏱ 시간 초과 시 자동 쿠데타"
- mustCoup이 false이면: "⏱ 시간 초과 시 자동 소득"

스타일:
- `text-xs text-text-muted text-center mt-1` 클래스 사용
- 눈에 띄지만 방해되지 않는 수준의 작은 안내 텍스트

구현 위치: line 251 (`</div>`) 바로 아래, 타이머 바 컨테이너 `</div>` (line 252) 닫기 전.
  </action>
  <verify>
`npm run build` 성공 확인.
ActionPanel.tsx에서 "시간 초과" 텍스트가 타이머 바 블록 내에 존재하는지 grep으로 확인.
  </verify>
  <done>
타이머 바 아래에 "시간 초과 시 자동 소득" 또는 "시간 초과 시 자동 쿠데타" 안내 텍스트가 조건부로 표시된다.
  </done>
</task>

</tasks>

<verification>
- `npm run build` 통과
- ActionPanel에서 actionDeadline 존재 시 안내 텍스트가 렌더링되는지 코드 확인
- mustCoup 조건에 따라 텍스트가 분기되는지 확인
</verification>

<success_criteria>
- 내 턴에 타이머 바 아래에 자동 행동 안내 텍스트가 표시됨
- 10코인 이상이면 "자동 쿠데타", 미만이면 "자동 소득" 표시
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/055-timer-bar-auto-income-info-text/055-SUMMARY.md`
</output>
