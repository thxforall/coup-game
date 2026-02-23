---
phase: quick
plan: 031
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/EventLog.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "다른 플레이어 턴 대기 시 스크롤 가능한 이벤트 로그가 표시된다"
    - "lose_influence 대기 시에도 이벤트 로그가 표시된다"
    - "대기 상태 헤더에 현재 상황 메시지가 animate-pulse로 표시된다"
    - "모바일에서도 미니 로그가 잘 보인다"
  artifacts:
    - path: "components/game/EventLog.tsx"
      provides: "MiniEventLog 컴포넌트 export"
    - path: "components/game/GameBoard.tsx"
      provides: "대기 영역에 MiniEventLog 사용"
  key_links:
    - from: "GameBoard.tsx"
      to: "EventLog.tsx"
      via: "MiniEventLog import"
      pattern: "MiniEventLog"
---

<objective>
대기 턴 영역의 단순 pulse 메시지를 미니 이벤트 로그로 교체하여, 다른 플레이어 턴 동안 게임 진행 상황을 실시간으로 확인할 수 있게 한다.

Purpose: 대기 시간에 유용한 정보를 제공하여 게임 몰입감 향상
Output: 대기 영역에 스크롤 가능한 이벤트 로그 + 상태 헤더 표시
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/EventLog.tsx
@components/game/GameBoard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: MiniEventLog 컴포넌트 생성</name>
  <files>components/game/EventLog.tsx</files>
  <action>
    EventLog.tsx 파일 하단에 `MiniEventLog` 컴포넌트를 추가하고 named export 한다.

    MiniEventLog props:
    - `log: string[]`
    - `structuredLog?: LogEntry[]`
    - `chatLogs?: ChatLogItem[]` (default [])
    - `statusMessage: string` — 상단에 표시할 대기 메시지 (예: "X의 턴입니다...")

    구현:
    1. 상단에 statusMessage를 animate-pulse + text-text-muted text-xs로 표시 (한 줄, 좌측 정렬, px-3 py-2)
    2. 그 아래에 기존 EventLog와 동일한 로그 렌더링 로직 사용 (StructuredLogEntry, ChatLogEntry 재사용)
    3. 단, "게임 로그" 헤더(sticky header)는 제거 — statusMessage가 그 역할을 대신함
    4. 전체를 `flex-1 flex flex-col min-h-0 overflow-hidden`으로 감싸고, 로그 영역은 `flex-1 overflow-y-auto`
    5. 하단으로 자동 스크롤 (useEffect + bottomRef, 기존 패턴 동일)
    6. memo로 감싸기

    기존 EventLog 내부의 mergedStructured/mergedPlain 로직을 공유하기 위해, 로그 머지 로직을 별도 함수 `useMergedLog(log, structuredLog, chatLogs)`로 추출하여 EventLog와 MiniEventLog 모두에서 사용한다.

    export: `export const MiniEventLog = memo(MiniEventLogInner);`
  </action>
  <verify>
    `npx tsc --noEmit` 타입 에러 없음
  </verify>
  <done>MiniEventLog 컴포넌트가 EventLog.tsx에서 named export 되고, 기존 EventLog도 정상 동작</done>
</task>

<task type="auto">
  <name>Task 2: GameBoard 대기 영역에 MiniEventLog 적용</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
    1. `import EventLog, { getLogColor }` 에 `MiniEventLog`를 추가:
       `import EventLog, { getLogColor, MiniEventLog } from './EventLog';`

    2. 대기 메시지 영역 (lines 533-540) 교체:
       기존:
       ```tsx
       {!isMyTurn && !mustRespond && state.phase === 'action' && (
           <div className="flex-1 flex items-center justify-center">
               <p className="text-text-muted text-sm animate-pulse">
                   {currentPlayer?.name}의 턴입니다...
               </p>
           </div>
       )}
       ```
       변경:
       ```tsx
       {!isMyTurn && !mustRespond && state.phase === 'action' && (
           <MiniEventLog
               log={state.log}
               structuredLog={state.structuredLog}
               chatLogs={chatLogs}
               statusMessage={`${currentPlayer?.name}의 턴입니다...`}
           />
       )}
       ```

    3. lose_influence 대기 영역 (lines 542-550) 교체:
       기존:
       ```tsx
       {state.phase === 'lose_influence' &&
           state.pendingAction?.losingPlayerId !== playerId && (
               <div className="flex-1 flex items-center justify-center">
                   <p className="text-text-muted text-sm animate-pulse">
                       {state.players.find((p) => p.id === state.pendingAction?.losingPlayerId)?.name}이(가) 잃을 카드를 선택하고 있습니다...
                   </p>
               </div>
           )}
       ```
       변경:
       ```tsx
       {state.phase === 'lose_influence' &&
           state.pendingAction?.losingPlayerId !== playerId && (
               <MiniEventLog
                   log={state.log}
                   structuredLog={state.structuredLog}
                   chatLogs={chatLogs}
                   statusMessage={`${state.players.find((p) => p.id === state.pendingAction?.losingPlayerId)?.name}이(가) 잃을 카드를 선택하고 있습니다...`}
               />
           )}
       ```

    4. MiniEventLog는 flex-1을 가지므로 부모 flex 컨테이너에서 남은 공간을 채움 — 기존 flex-1 div 제거 대신 MiniEventLog 자체가 flex-1 역할
  </action>
  <verify>
    `npx tsc --noEmit` 타입 에러 없음, `npm run build` 성공
  </verify>
  <done>대기 턴 영역과 lose_influence 대기 영역 모두 MiniEventLog로 교체되어 스크롤 가능한 이벤트 로그가 표시됨</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 타입 에러 없음
2. `npm run build` — 빌드 성공
3. 수동 확인: 2인 이상 게임에서 다른 플레이어 턴일 때 이벤트 로그가 표시되는지 확인
</verification>

<success_criteria>
- 다른 플레이어 턴 대기 시 단순 텍스트 대신 스크롤 가능한 이벤트 로그 표시
- 상단에 현재 상태 메시지 (animate-pulse) 유지
- lose_influence 대기 시에도 동일하게 이벤트 로그 표시
- 기존 데스크톱 사이드바 EventLog에 영향 없음
- 빌드 성공
</success_criteria>

<output>
After completion, create `.planning/quick/031-waiting-turn-mini-event-log/031-SUMMARY.md`
</output>
