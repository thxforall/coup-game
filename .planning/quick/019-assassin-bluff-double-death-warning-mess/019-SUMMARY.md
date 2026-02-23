---
phase: quick
plan: "019"
subsystem: ui
tags: [react, game-logic, ux, warning, event-log]

# Dependency graph
requires:
  - phase: quick-018
    provides: ActionPanel two-step UX flow (action-first then target selection)
provides:
  - Assassination challenge danger warning banner in ResponseModal
  - Double-death event log message in engine.ts resolveChallenge
affects: [game-ux, event-log, response-modal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional warning banner pattern: render extra UI only when pending.type matches specific action"
    - "Contextual button text: action-specific challenge button labels"

key-files:
  created: []
  modified:
    - components/game/ResponseModal.tsx
    - lib/game/engine.ts

key-decisions:
  - "Warning banner placed above challenge button so it's always visible without toggling detail view"
  - "Challenge button text changes to '암살자가 아니라고 생각해요' only for assassinate actions"
  - "Extra log in resolveChallenge rather than executeAction - fires at the moment of challenge failure, before card loss selection"

patterns-established:
  - "Pending action type check: use !isBlockPhase && pending.type === 'assassinate' for assassinate-specific UI"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Quick-019: Assassin Bluff Double Death Warning Summary

**Red warning banner in ResponseModal + double-death event log on assassination challenge failure, ensuring players understand 2명 피해 risk before challenging**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T14:24:38Z
- **Completed:** 2026-02-23T14:25:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added red warning banner (rgba(231,76,60,0.1) background) above the challenge button in ResponseModal when pending.type === 'assassinate' and not in block phase
- Banner text: "도전 실패 시 도전자 + 암살 대상 모두 카드를 잃습니다! (2명 피해)" with TriangleAlert icon
- Changed challenge button text to '도전! (암살자가 아니라고 생각해요)' specifically for assassinate actions
- Added extra log in resolveChallenge when assassination challenge fails: "${challenger}이(가) 도전에 실패하여 카드를 잃고, ${target}도 암살됩니다!"
- All 112 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: ResponseModal에 암살 도전 위험 경고 배너 추가** - `2e26f3a` (feat)
2. **Task 2: engine.ts에 암살 도전 실패 시 상세 로그 메시지 추가** - `c68fdb0` (feat)

## Files Created/Modified
- `components/game/ResponseModal.tsx` - Added assassinate warning banner + contextual challenge button text
- `lib/game/engine.ts` - Added double-death preview log in resolveChallenge for assassinate actions

## Decisions Made
- Warning banner placed above challenge button (always visible) rather than inside the collapsible detail section where it was previously described only
- Extra log fires in `resolveChallenge` (challenge_fail branch) rather than `executeAction` so players see the warning at the decisive moment when the challenge fails
- Structured log uses `type: 'challenge_fail'` with both actorId and targetId for future EventLog filtering capability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - pre-existing type error in `lib/game/filter.test.ts` is unrelated to these changes.

## Next Phase Readiness
- Assassination flow now has clear 2-player-damage warnings at both UI (ResponseModal) and event log (engine) layers
- No blockers

---
*Phase: quick-019*
*Completed: 2026-02-23*
