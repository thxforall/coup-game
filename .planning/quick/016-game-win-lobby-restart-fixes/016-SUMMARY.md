---
phase: quick-016
plan: 01
subsystem: game-flow
tags: [game-over, restart, lobby, guard, timeout]
dependency-graph:
  requires: [quick-007, quick-009]
  provides: [game-over-guard, waiting-room-restart, lobby-return-fix]
  affects: []
tech-stack:
  added: []
  patterns: [phase-guard, waiting-room-reset]
key-files:
  created: []
  modified:
    - app/api/game/action/route.ts
    - app/api/game/restart/route.ts
    - components/game/GameBoard.tsx
decisions:
  - id: restart-to-waiting
    choice: "Restart resets to waiting phase instead of calling initGame"
    reason: "Players should re-ready before starting a new game"
  - id: lobby-button-fix
    choice: "Use button + window.location.href instead of <a> tag"
    reason: "Prevents race condition where navigation fires before clearActiveRoom"
metrics:
  duration: ~2min
  completed: 2026-02-23
---

# Quick-016: Game Win / Lobby / Restart Fixes Summary

game_over phase guard on actions + restart to WaitingRoom + reliable lobby return button

## What Was Done

### Task 1: Guard game_over phase in action route + fix timeout polling
- Added early return guard in `action/route.ts` after `resolveTimeouts()`: returns 400 when `phase === 'game_over'`
- Added `game_over` guard at top of timeout polling `useEffect` in `GameBoard.tsx` to prevent unnecessary timeout API calls
- **Commit:** bf33df2

### Task 2: Restart goes to WaitingRoom instead of starting new game
- Replaced `initGame()` call with manual waiting-phase state construction
- All players reset with `isReady: false`, `coins: 2`, empty cards
- Phase set to `'waiting'` so WaitingRoom component renders
- Removed unused `initGame` import, added `GameState` type import
- **Commit:** 73b2fb7

### Task 3: Lobby return button reliability fix
- Converted `<a href="/">` to `<button>` with explicit `clearActiveRoom()` then `window.location.href = '/'`
- Ensures localStorage is cleared before navigation begins (no race condition)
- Full page reload clears any stale React state
- **Commit:** c427ecd

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` passes on all three tasks
- All guards and state resets confirmed via code review
