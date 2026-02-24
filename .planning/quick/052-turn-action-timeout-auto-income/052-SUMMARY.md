---
phase: quick-052
plan: 01
subsystem: game-engine
tags: [timeout, auto-income, auto-coup, countdown-timer, action-deadline]
dependency-graph:
  requires: [quick-007]
  provides: [turn-action-timeout, auto-income-on-afk, auto-coup-on-afk]
  affects: []
tech-stack:
  added: []
  patterns: [server-enforced-deadline, client-polling-timeout]
key-files:
  created: []
  modified:
    - lib/game/types.ts
    - lib/game/engine.ts
    - lib/game/filter.ts
    - app/api/game/timeout/route.ts
    - components/game/ActionPanel.tsx
    - components/game/GameBoard.tsx
decisions: []
metrics:
  duration: "3m"
  completed: "2026-02-24"
---

# Quick-052: Turn Action Timeout Auto-Income Summary

45-second server-enforced action timeout with countdown timer UI -- auto-income for normal players, auto-coup for 10+ coin players on AFK.

## What Was Done

### Task 1: Server-side action timeout (types + engine + API)
- Added `actionDeadline?: number` field to `GameState` and `FilteredGameState` interfaces
- Set `actionDeadline = Date.now() + 45000` in `initGame()` and `nextTurn()`
- Created `resolveActionTimeout()` function: auto-income or auto-coup (10+ coins) on random surviving opponent
- Passed `actionDeadline` through `filterStateForPlayer()` to client
- Updated timeout API to call `resolveActionTimeout` alongside `resolveTimeouts`
- **Commit:** ebc180c

### Task 2: Client-side countdown timer + timeout polling
- Added countdown timer bar above action buttons in ActionPanel (45s progress bar)
- Timer color transitions: green -> amber (15s) -> red with pulse animation (5s)
- Passed `actionDeadline` prop from GameBoard to ActionPanel
- Extended GameBoard timeout polling useEffect to cover `action` phase (reuses existing `fireTimeout` callback)
- **Commit:** c40868e

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | ebc180c | feat(quick-052): server-side 45s action timeout with auto-income/coup |
| 2 | c40868e | feat(quick-052): client-side 45s countdown timer + action timeout polling |
