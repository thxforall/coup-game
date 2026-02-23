---
phase: quick
plan: "036"
subsystem: ui/visual-identity
tags: [player-colors, TargetSelectModal, MyPlayerArea, border, avatar]
requires: [033-player-color-chat-log-profile]
provides: [player-color-borders-interactive-elements]
affects: []
tech-stack:
  added: []
  patterns: [player-color-propagation]
key-files:
  created: []
  modified:
    - components/game/TargetSelectModal.tsx
    - components/game/MyPlayerArea.tsx
decisions:
  - "Left border (3px, 40% alpha) chosen for unselected state — subtle but visible"
  - "Selected state retains accentColor border + adds playerColor glow via boxShadow"
  - "Avatar background switched from gold to playerColor for consistent identity"
  - "Border alpha values: 40% (left border), 25% (container border), 10% (glow) for subtlety"
metrics:
  duration: "5 min"
  completed: "2026-02-24"
---

# Phase quick Plan 036: Player Color Border & Card Selection UI Summary

**One-liner:** Propagated per-player assigned colors from `getPlayerColor()` into TargetSelectModal buttons (left border + identity dot) and MyPlayerArea container/avatar.

## What Was Built

Applied the shared `getPlayerColor(playerId)` utility — already used in chat/event log/avatars — to two additional interactive UI elements:

1. **TargetSelectModal**: Each target player button now shows:
   - A 3px colored left border in the player's assigned color (66% alpha when unselected)
   - A subtle box-shadow glow in player color when selected (alongside existing accentColor border)
   - A 6px circular identity dot before the player name
   - Disabled (steal with 0 coins) state: no player color applied

2. **MyPlayerArea**: The player's own card area now shows:
   - Outer container border replaced with 1.5px player-color border (25% alpha)
   - Subtle box-shadow glow on container (10% alpha)
   - Avatar circle uses player's assigned color instead of gold background

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0c10656 | feat(quick-036): add player color borders and identity dots to TargetSelectModal |
| 2 | 100fe50 | feat(quick-036): add player color border and avatar color to MyPlayerArea |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Left border (not full border) for buttons | Directional accent is less visual noise than full color border |
| Alpha values: 40%/25%/10% | Intentionally subtle — reinforces identity without overpowering card/action colors |
| Gold avatar replaced with playerColor | Consistent with all other player avatar instances in the app |
| Identity dot for target buttons | Quick visual scan without needing to read player names |

## Files Modified

- `components/game/TargetSelectModal.tsx` — import + per-button playerColor logic
- `components/game/MyPlayerArea.tsx` — import + container border/glow + PlayerBadge color

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — no type errors in modified files
- `npm run build` — compiled successfully, all 14 static pages generated
