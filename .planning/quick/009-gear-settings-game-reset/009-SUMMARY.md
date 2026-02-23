---
phase: quick-009
plan: "01"
subsystem: ui-game
tags: [settings, modal, restart, game-control]
requires: []
provides:
  - settings-modal-component
  - mid-game-restart-api
affects: []
tech-stack:
  added: []
  patterns:
    - dynamic-import-modal
    - inline-confirmation-pattern
key-files:
  created:
    - components/game/SettingsModal.tsx
  modified:
    - app/api/game/restart/route.ts
    - components/game/GameBoard.tsx
decisions:
  - "SettingsModal calls API directly with force:true for mid-game restart, bypassing onRestart prop"
  - "gear icon added to both main game header AND game_over panel for consistent access"
  - "gameMode optional field handled gracefully (shows 스탠다드 모드 when undefined)"
metrics:
  duration: "15 minutes"
  completed: "2026-02-23"
---

# Phase quick-009 Plan 01: Gear Settings Game Reset Summary

**One-liner:** Settings gear icon opens SettingsModal with host-only mid-game restart (force:true) and leave-lobby for all players.

## What Was Built

Two tasks completed atomically:

1. **Restart API extension + SettingsModal component** (`944ace8`)
2. **GameBoard wiring of gear icon + SettingsModal renders** (`9ff9f56`)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend restart API + Create SettingsModal | 944ace8 | app/api/game/restart/route.ts, components/game/SettingsModal.tsx |
| 2 | Wire gear icon in GameBoard | 9ff9f56 | components/game/GameBoard.tsx |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| SettingsModal calls `/api/game/restart` directly with `force: true` | Bypasses the `onRestart` prop (which has no force param) for mid-game restart |
| gear icon in game_over panel (top-right, absolute positioned) | Players need settings access after game ends too, not just during play |
| `onRestart ?? (async () => {})` fallback | SettingsModal prop requires non-optional onRestart; GameBoard's onRestart is optional |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Settings gear icon opens modal in all game phases (action, awaiting_response, etc.)
- [x] Host sees restart button with force confirmation; non-host does not see it
- [x] All players see "로비로 돌아가기" with confirmation
- [x] Game mode displayed read-only
- [x] Restart API works mid-game with force:true, remains backward compatible
- [x] Build passes cleanly (`npm run build` success)
