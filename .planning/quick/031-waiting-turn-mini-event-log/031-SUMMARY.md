---
phase: quick
plan: 031
subsystem: game-ui
tags: [event-log, waiting-ux, mini-log, react-memo]
tech-stack:
  patterns: [shared-hook-extraction, component-composition]
key-files:
  modified:
    - components/game/EventLog.tsx
    - components/game/GameBoard.tsx
metrics:
  duration: ~5min
  completed: 2026-02-24
---

# Quick 031: Waiting Turn Mini Event Log Summary

**One-liner:** Replaced static pulse text in waiting-turn areas with scrollable MiniEventLog showing full game + chat history via shared useMergedLog hook.

## What Was Done

### Task 1: MiniEventLog Component (153fe21)
- Extracted log merge logic from `EventLog` into a reusable `useMergedLog` hook (handles both structured and plain log merging with chat interleaving)
- Created `LogEntries` helper component for shared rendering between EventLog and MiniEventLog
- Added `MiniEventLog` component with:
  - Status message header (animate-pulse, text-xs, text-text-muted)
  - Scrollable log area (flex-1 overflow-y-auto)
  - Auto-scroll to bottom via useEffect + bottomRef
  - memo wrapping for render optimization
- Exported as named export: `export const MiniEventLog = memo(MiniEventLogInner)`

### Task 2: GameBoard Integration (9727b0f)
- Imported `MiniEventLog` alongside existing `EventLog` and `getLogColor`
- Replaced action-phase waiting area (static "X의 턴입니다..." pulse) with `MiniEventLog` showing full log
- Replaced lose_influence waiting area (static "X이(가) 잃을 카드를 선택하고 있습니다..." pulse) with `MiniEventLog` showing full log
- Both pass `state.log`, `state.structuredLog`, `chatLogs`, and appropriate `statusMessage`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: No new type errors (pre-existing filter.test.ts issue only)
- `npm run build`: Build succeeded
