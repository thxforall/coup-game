---
phase: quick-018
plan: 01
subsystem: ui
tags: [react, actionpanel, ux, game-ui, target-selection, state-machine]

# Dependency graph
requires: []
provides:
  - Action-first-then-target UX flow in ActionPanel
  - pendingActionType state for two-step targeted action flow
  - Inline target selection panel with action-colored header and cancel button
  - Guess-mode coup: action -> target -> character -> confirm
affects: [future UX refinements, ActionPanel changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step state machine: pendingActionType=null (action view) -> pendingActionType=set (target view)"
    - "Inline mode switching via conditional return in component render"

key-files:
  created: []
  modified:
    - components/game/ActionPanel.tsx

key-decisions:
  - "Non-guess targeted actions fire immediately on target click (no extra confirm step) for streamlined UX"
  - "Guess-mode coup uses confirm button since character selection is an intermediate step"
  - "State resets fully after each action fires (pendingActionType, targetId, guessChar)"

patterns-established:
  - "VARIANT_TEXT_COLORS lookup maps variant to CSS var string for inline style usage"
  - "handleTargetSelect fires action directly via onAction promise chain for non-guess targets"

# Metrics
duration: 8min
completed: 2026-02-23
---

# Quick Task 018: Action-First Then Target Selection Summary

**ActionPanel refactored to two-step flow: action buttons shown first, target selection panel appears inline after clicking a targeted action**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-23T14:15:05Z
- **Completed:** 2026-02-23T14:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed always-visible target selector from top of ActionPanel
- Action buttons (all 7) now show first without any target pre-selection required
- Clicking coup/assassinate/steal enters target selection mode with action-colored header
- Non-target actions (income, foreignAid, tax, exchange) fire immediately on click
- Cancel button ("취소") returns to action button view
- Guess-mode coup: action -> target -> character guess buttons -> "쿠데타 확인" confirm
- mustCoup (10+ coins) still restricts display to coup button only, same two-step flow applies

## Task Commits

1. **Task 1: Refactor ActionPanel to action-first-then-target flow** - `93de992` (feat - included in quick-017 commit)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified
- `/Users/kiyeol/development/coup/components/game/ActionPanel.tsx` - Full UX flow refactor: action-first with two-step state machine for targeted actions

## Decisions Made
- Non-guess targeted actions fire immediately on target click (no confirm step) - reduces friction for the common case
- Guess-mode coup keeps a confirm button because the character selection must be committed before firing
- Used `color-mix(in srgb, ...)` in inline styles for action-colored target selection header background
- `handleTargetSelect` calls `onAction` directly via `.then()` chain rather than going through `handleAction` to avoid the stale `targetId` issue (the state setter isn't synchronous)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The ActionPanel changes were bundled into commit `93de992` (quick-017) because they were already authored before this plan was executed. The code in HEAD is correct and matches all done criteria from the plan.

## Next Phase Readiness
- ActionPanel UX is improved; players now understand what action they're taking before selecting a target
- No regressions - all action types (income, foreignAid, tax, exchange, coup, assassinate, steal) work correctly
- Guess mode coup flow verified via code inspection: action -> target sets targetId -> character selection appears -> confirm button calls handleAction('coup', true)

---
*Phase: quick-018*
*Completed: 2026-02-23*
