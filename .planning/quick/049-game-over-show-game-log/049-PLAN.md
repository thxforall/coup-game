---
phase: quick-049
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "게임 오버 화면에서 전체 게임 로그(구조화 로그 + 채팅)를 확인할 수 있다"
    - "게임 로그는 스크롤 가능한 영역에 표시된다"
    - "게임 오버 UI(승리/패배, 다시 시작, 방 나가기)는 그대로 유지된다"
  artifacts:
    - path: "components/game/GameBoard.tsx"
      provides: "game_over 화면에 EventLog 컴포넌트 렌더링"
  key_links:
    - from: "GameBoard.tsx game_over block"
      to: "EventLog component"
      via: "structuredLog + chatLogs props"
      pattern: "<EventLog.*structuredLog"
---

<objective>
게임 완료(game_over) 화면에 게임 로그를 표시한다.

Purpose: 게임이 끝난 후 플레이어가 전체 게임 진행 로그를 리뷰할 수 있게 한다.
Output: game_over 화면 하단에 EventLog 컴포넌트가 렌더링됨
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx (lines 310-393: game_over early return)
@components/game/EventLog.tsx (reusable log component)
</context>

<tasks>

<task type="auto">
  <name>Task 1: game_over 화면에 EventLog 추가</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
    GameBoard.tsx의 game_over 블록(line 311-393)에서, 기존 glass-panel div 아래에 게임 로그 섹션을 추가한다.

    현재 구조:
    ```
    <div className="min-h-screen flex items-center justify-center px-4">
      <GameToast ... />
      <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up relative">
        ... 승리/패배 UI ...
      </div>
      {showSettings && <SettingsModal ... />}
    </div>
    ```

    변경할 구조:
    1. 최외곽 div를 `flex-col items-center justify-center` 레이아웃으로 변경
    2. 기존 glass-panel 아래에 게임 로그 영역 추가:
       - max-w-sm w-full (기존 패널과 동일 너비)
       - max-h-60 overflow-y-auto (스크롤 가능, 높이 제한)
       - mt-4 간격
       - glass-panel 스타일 적용 (배경 통일)
       - EventLog 컴포넌트에 props 전달: log={state.log}, structuredLog={state.structuredLog}, chatLogs={chatLogs}, players={state.players}
       - hideHeader={false} (기본값) — "게임 로그" 헤더 표시

    주의사항:
    - chatLogs는 이미 컴포넌트 상단에서 useState로 선언되어 있으므로 game_over 스코프에서 접근 가능
    - state.log, state.structuredLog, state.players도 동일하게 접근 가능
    - 기존 승리/패배 UI, 버튼, 설정 모달 등은 일체 변경하지 않는다
  </action>
  <verify>
    1. npx tsc --noEmit 타입 에러 없음
    2. 게임을 완료(game_over)한 후 화면에서 게임 로그 영역이 보이는지 확인
  </verify>
  <done>game_over 화면에서 기존 승리/패배 UI 아래에 스크롤 가능한 게임 로그가 표시된다</done>
</task>

</tasks>

<verification>
- npx tsc --noEmit: 타입 에러 없음
- 게임 오버 화면에서 EventLog가 structuredLog + chatLogs와 함께 렌더링됨
- 기존 game_over UI(아이콘, 텍스트, 버튼)가 그대로 유지됨
- 로그 영역이 max-h-60으로 제한되어 스크롤 가능
</verification>

<success_criteria>
- game_over 화면에 게임 로그가 표시된다
- 로그는 스크롤 가능하며 기존 UI를 가리지 않는다
- 타입 에러 없이 빌드 성공
</success_criteria>

<output>
After completion, create `.planning/quick/049-game-over-show-game-log/049-SUMMARY.md`
</output>
