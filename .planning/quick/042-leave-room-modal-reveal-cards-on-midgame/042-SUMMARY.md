---
phase: quick-042
plan: 01
status: complete
completed: 2026-02-24
duration: ~5min
subsystem: game-ux
tags: [leave-api, confirm-modal, card-reveal, window-confirm-removal]
tech-stack:
  patterns: [inline-confirm-ui, confirm-modal-reuse, leave-api-endpoint]
key-files:
  created:
    - app/api/game/leave/route.ts
  modified:
    - lib/game/engine.ts
    - components/game/SettingsModal.tsx
    - components/game/GameBoard.tsx
---

# Quick-042: Leave Room Modal + Reveal Cards on Midgame Summary

**One-liner:** Leave API with midgame card reveal + inline/modal confirm UI replacing all window.confirm

## What Was Done

### Task 1: Leave API + engine removePlayer
- Added `removePlayer(state, playerId)` to `lib/game/engine.ts`
  - Reveals all player cards (revealed: true)
  - Sets isAlive: false
  - Adds log: "{name}이(가) 게임을 떠났습니다"
  - Handles pendingAction cleanup (actor/target/blocker leaves -> nullify + nextTurn, pending responder -> auto-pass)
  - Handles current turn player leaving -> nextTurn
  - checkWinner for game_over when 1 survivor
- Created `/api/game/leave` POST endpoint
  - waiting: removes player from players array
  - game_over: returns 200 (no-op)
  - in-game: calls removePlayer + buildViews + updateRoomWithViews

### Task 2: UI Changes
- **SettingsModal:**
  - "방 없애기" button now uses inline confirm UI (red tone, matching restart confirm pattern)
  - "로비로 돌아가기" now calls leave API before clearActiveRoom + redirect
  - All window.confirm/alert removed
- **GameBoard:**
  - Header LogOut button now shows ConfirmModal (bottom sheet) instead of window.confirm
  - game_over "방 나가기" button also calls leave API
  - ConfirmModal dynamically imported

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 3b79fad | feat(quick-042): leave API + engine removePlayer |
| 2 | 81048b1 | feat(quick-042): window.confirm removal + confirm UI + leave API integration |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript: no new errors (only pre-existing filter.test.ts cast issue)
- Build: successful
- grep window.confirm/window.alert: 0 matches in target files
