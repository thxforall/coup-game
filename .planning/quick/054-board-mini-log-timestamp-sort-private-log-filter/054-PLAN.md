---
phase: quick
plan: 054
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "모바일 미니 로그가 타임스탬프 기준으로 올바르게 정렬된다"
    - "개인(private) 로그는 해당 플레이어의 보드에서만 표시된다"
    - "데스크톱/모바일 전체 로그 모달은 기존과 동일하게 동작한다"
  artifacts:
    - path: "components/game/GameBoard.tsx"
      provides: "미니 로그 타임스탬프 정렬 + private 로그 필터링"
  key_links:
    - from: "components/game/GameBoard.tsx (mini log)"
      to: "state.structuredLog"
      via: "structuredLog 사용하여 타임스탬프 정렬 + visibleTo 필터링"
      pattern: "structuredLog.*timestamp"
---

<objective>
보드 미니 로그(모바일 상단 최근 3개 표시) 두 가지 버그 수정:
1. 타임스탬프 정렬: 현재 `state.log` index 기반 정렬 -> `structuredLog` timestamp 기반 정렬
2. 개인 로그 필터: private 로그(visibleTo 설정)가 다른 플레이어 보드에서 보이지 않도록 처리

Purpose: 미니 로그 표시 순서가 정확하고, 개인 정보가 보호됨
Output: 수정된 GameBoard.tsx
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx
@components/game/EventLog.tsx
@lib/game/types.ts (LogEntry, visibleTo 필드)
@lib/game/filter.ts (filterStateForPlayer - structuredLog에서 visibleTo 필터링)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 미니 로그 structuredLog 기반 타임스탬프 정렬 + private 로그 필터링</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
GameBoard.tsx의 모바일 컴팩트 로그 섹션 (라인 517-573, `lg:hidden` 미니 로그)을 수정:

**현재 문제:**
- 라인 522-526: `state.log.map((entry, i) => ({ type: 'game', text: entry, timestamp: i }))` -- index 기반 정렬
- `structuredLog`를 사용하지 않아 private 로그 표시 불가 (사실 private log는 structuredLog에만 있고 state.log에는 없으므로, 반대로 structuredLog를 쓰면서 visibleTo 필터를 확인해야 함)

**수정 방법:**
1. `state.structuredLog`가 있으면 이를 우선 사용하여 미니 로그 생성:
   - `state.structuredLog`는 이미 `filterStateForPlayer`에서 visibleTo 필터링 완료된 상태
   - 각 entry의 `entry.timestamp`를 sortKey로 사용
   - entry.message를 text로 사용
   - `getLogColor` 대신 `LOG_TYPE_CONFIG` 스타일을 적용하되, 미니 로그에서는 간략하게 텍스트 색상만 적용

2. `state.structuredLog`가 없으면 기존 `state.log` 폴백 유지 (하위 호환)

3. 채팅 로그와의 병합은 기존과 동일하게 timestamp 기반 정렬

4. private 로그(visibleTo가 있는 entry)는 미니 로그에서 이탤릭 + Eye 아이콘으로 구분 표시 (EventLog의 StructuredLogEntry와 일관성 유지)

**구체적 코드 변경 (라인 521-563 영역):**
```tsx
{(() => {
  // structuredLog 우선 사용 (타임스탬프 정렬 + private 필터 완료)
  const useStructured = state.structuredLog && state.structuredLog.length > 0;

  const gameParts = useStructured
    ? state.structuredLog!.map((entry, i) => ({
        type: 'game' as const,
        text: entry.message,
        timestamp: entry.timestamp,
        isPrivate: !!entry.visibleTo,
        logType: entry.type,
      }))
    : state.log.map((entry, i) => ({
        type: 'game' as const,
        text: entry,
        timestamp: i,
        isPrivate: false,
        logType: undefined as string | undefined,
      }));

  const chatParts = chatLogs.map((c) => ({
    type: 'chat' as const,
    playerName: c.playerName,
    playerId: c.playerId,
    text: c.message,
    timestamp: useStructured ? c.timestamp : (gameParts.length + c.timestamp / 1e13),
    isPrivate: false,
    logType: undefined as string | undefined,
  }));

  const merged = [...gameParts, ...chatParts]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-3);
  // ... 렌더링 (기존과 유사하되 isPrivate면 이탤릭 처리)
})()}
```

- private 로그 항목은 `text-ambassador/70 italic` 스타일 + `▸` 대신 Eye 아이콘 (10px) 표시
- EventLog.tsx의 getLogColor를 import하여 non-structured 폴백에서 사용 (이미 import됨)
  </action>
  <verify>
1. `npx tsc --noEmit` 타입 에러 없음
2. `npm run build` 빌드 성공
3. 수동 확인: 게임 진행 시 미니 로그가 시간순으로 정렬되는지 확인
4. 수동 확인: private 로그(교환 결과 등)가 해당 플레이어 미니 로그에만 이탤릭으로 표시되는지 확인
  </verify>
  <done>
- 미니 로그가 structuredLog timestamp 기반으로 정렬됨
- private 로그가 해당 플레이어 보드에서만 이탤릭+아이콘으로 표시됨
- structuredLog 없는 경우 기존 동작 유지 (하위 호환)
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` 통과
- `npm run build` 성공
- 기존 EventLog (전체 로그 모달) 동작 변경 없음
</verification>

<success_criteria>
- 미니 로그 3개 항목이 타임스탬프 순서대로 표시됨
- private 로그는 해당 플레이어 미니 로그에서만 보임 (이탤릭 구분)
- 빌드 및 타입체크 통과
</success_criteria>

<output>
After completion, create `.planning/quick/054-board-mini-log-timestamp-sort-private-log-filter/054-SUMMARY.md`
</output>
