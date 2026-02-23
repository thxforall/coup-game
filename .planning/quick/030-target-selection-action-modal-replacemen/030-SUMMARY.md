---
phase: quick
plan: 030
subsystem: ui
tags: [react, modal, ux, game, target-selection, coup]

requires:
  - plan: 029
    provides: steal 0-coin target blocking (UI + server validation)
  - plan: 018
    provides: action-first then target selection two-step flow pattern
provides:
  - TargetSelectModal component for target-requiring actions (steal, assassinate, coup)
  - ActionPanel refactored to use modal overlay instead of full-screen inline replacement
affects:
  - future UX plans referencing ActionPanel or target selection flow

tech-stack:
  added: []
  patterns:
    - "Modal overlay pattern: action buttons remain visible behind modal overlay"
    - "pendingActionType persists through ConfirmModal cancel so TargetSelectModal reappears"

key-files:
  created:
    - components/game/TargetSelectModal.tsx
  modified:
    - components/game/ActionPanel.tsx

key-decisions:
  - "TargetSelectModal is separate from ConfirmModal — target selection is a step before final confirmation"
  - "pendingActionType is cleared only on successful action execution, not on ConfirmModal cancel, so TargetSelectModal reopens automatically"
  - "Render condition pendingActionType && !confirmAction prevents TargetSelectModal and ConfirmModal from showing simultaneously"
  - "Guess mode coup character selection is handled inside TargetSelectModal, not ActionPanel"

patterns-established:
  - "Modal-first UX: actions that need additional input use modal overlays, not inline panel replacement"

duration: 3min
completed: 2026-02-24
---

# Quick Task 030: Target Selection Action Modal Replacement Summary

**대상 선택 인라인 UI를 TargetSelectModal 모달로 교체 — 갈취/암살/쿠데타 선택 시 오버레이 팝업으로 대상 선택, 액션 버튼은 배경에 항상 유지**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-23T15:13:32Z
- **Completed:** 2026-02-23T15:16:27Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `TargetSelectModal.tsx`: bottom-sheet modal with action header (icon, name, desc, cost, claimedChar), player target buttons (steal 0-coin disabled), guess-mode coup character selection, confirm/cancel buttons
- Refactored `ActionPanel.tsx`: removed 127-line inline target selection block, replaced with `<TargetSelectModal>` conditional render
- Flow: action button click → TargetSelectModal overlay → select target → ConfirmModal final confirm → action fires. ConfirmModal cancel → TargetSelectModal reappears automatically

## Task Commits

1. **Task 1: TargetSelectModal 컴포넌트 생성** - `bc0c74a` (feat)
2. **Task 2: ActionPanel에서 인라인 대상 선택을 TargetSelectModal로 교체** - `832fbbb` (feat)

## Files Created/Modified

- `components/game/TargetSelectModal.tsx` - New modal component for target player selection
- `components/game/ActionPanel.tsx` - Removed inline target-selection early-return block; added TargetSelectModal import and conditional render

## Decisions Made

- `pendingActionType` is NOT cleared when TargetSelectModal calls `onSelectTarget` — it is only cleared after the action executes successfully. This means cancelling ConfirmModal brings back the TargetSelectModal automatically, matching the plan's intent.
- Render condition `pendingActionType && pendingActionDef && !confirmAction` prevents the two modals from stacking visually.
- Unused imports removed from ActionPanel (Shield, X, ChevronRight, Player, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES, VARIANT_TEXT_COLORS, ALL_CHARACTERS, GUESS_CHAR_ICONS).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `lib/game/filter.test.ts` (line 77) — unrelated to this task, exists before and after changes. Build (`next build`) passes successfully despite tsc --noEmit reporting it.

## Next Phase Readiness

- ActionPanel is now cleaner (net -161 lines) and follows consistent modal pattern
- TargetSelectModal can be reused or extended for other target-selection scenarios

---
*Phase: quick*
*Completed: 2026-02-24*
