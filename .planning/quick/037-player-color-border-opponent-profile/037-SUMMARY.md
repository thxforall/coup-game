---
phase: quick
plan: 037
subsystem: ui
tags: [react, tailwind, player-colors, gameboard, mobile-responsive]

# Dependency graph
requires:
  - phase: quick-033
    provides: getPlayerColor utility and PLAYER_AVATAR_COLORS palette
  - phase: quick-036
    provides: colored border pattern established in MyPlayerArea
provides:
  - Player-specific colored border on all opponent PlayerArea cards (desktop + mobile compact)
affects: [GameBoard, PlayerArea, opponent profile cards]

# Tech tracking
tech-stack:
  added: []
  patterns: [getPlayerColor(player.id) + playerColor40 border + playerColor1A glow shadow applied to all player card containers]

key-files:
  created: []
  modified:
    - components/game/PlayerArea.tsx

key-decisions:
  - "Replaced static border-border-subtle Tailwind class with inline style border: 1.5px solid playerColor40 on both desktop and mobile chip containers"
  - "Kept isCurrentTurn ring-2 ring-gold Tailwind ring intact — CSS ring and CSS border are independent properties so both coexist"
  - "Combined glow shadows: when isCurrentTurn, boxShadow includes both gold glow and player color glow"
  - "avatarColor (charCode sum index) and playerColor (getPlayerColor) both derive the same color — getPlayerColor reuses the same algorithm, consistent"

patterns-established:
  - "Player color border pattern: border: 1.5px solid ${playerColor}40 + boxShadow: 0 0 12px ${playerColor}1A mirrors MyPlayerArea pattern from quick-036"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Quick Task 037: Player Color Border on Opponent Profiles Summary

**Subtle player-specific colored borders (1.5px, 25% opacity + faint glow) applied to all opponent PlayerArea cards in GameBoard top row, matching MyPlayerArea's quick-036 pattern on both desktop and mobile compact chip views.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T00:00:00Z
- **Completed:** 2026-02-23T15:58:12Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Imported `getPlayerColor` into `PlayerArea.tsx` alongside existing `PLAYER_AVATAR_COLORS`
- Desktop opponent cards now show `1.5px solid ${playerColor}40` border + `0 0 12px ${playerColor}1A` glow
- Mobile compact chip buttons show the same subtle player-colored border
- Current turn gold ring (`ring-2 ring-gold`) remains visible on top — Tailwind `ring` is independent of CSS `border`
- Eliminated players (opacity-50) inherit the border naturally, dimmed by the parent opacity

## Task Commits

1. **Task 1: Add player color border to PlayerArea desktop and mobile views** - `18a66a3` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `components/game/PlayerArea.tsx` - Added `getPlayerColor` import, computed `playerColor`, replaced static `border border-border-subtle` classes with inline style `border: 1.5px solid ${playerColor}40` + glow shadow on both desktop card and mobile compact chip

## Decisions Made

- Used `getPlayerColor(player.id ?? '')` — the existing `playerIndex` charCode computation is equivalent but `getPlayerColor` is the canonical API used by MyPlayerArea, EventLog, TargetSelectModal
- Combined gold + player glow in `boxShadow` when `isCurrentTurn` so both visual cues persist simultaneously
- No changes to mobile bottom sheet — avatar already has `avatarColor` glow via `boxShadow: 0 0 0 2px ${avatarColor}50, 0 0 12px ${avatarColor}30`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript error in `lib/game/filter.test.ts` (unrelated test file) and pre-existing ESLint warning in `ResponseModal.tsx` confirmed not introduced by this task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All opponent profile cards in GameBoard top row now have consistent player-color borders matching the MyPlayerArea and TargetSelectModal styling from quick-036
- Visual identity system complete: avatar circle, card border, event log name, and target modal button all share the same player color

---
*Phase: quick-037*
*Completed: 2026-02-24*
