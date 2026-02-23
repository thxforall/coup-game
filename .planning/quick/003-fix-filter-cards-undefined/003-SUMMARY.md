---
phase: quick
plan: 003
subsystem: api
tags: [firebase, defensive-coding, undefined-handling]

requires:
  - phase: none
    provides: n/a
provides:
  - Defensive undefined cards handling in filterStateForPlayer
  - Firebase getRoom sanitization for dropped empty arrays
  - Regression test for undefined cards scenario
affects: []

tech-stack:
  added: []
  patterns:
    - "Firebase empty array restoration: ?? [] on read-back"

key-files:
  created: []
  modified:
    - lib/game/filter.ts
    - lib/firebase.ts
    - lib/game/filter.test.ts

key-decisions:
  - "Two-layer defense: sanitize at Firebase read + fallback at filter usage"

patterns-established:
  - "Firebase data sanitization: always restore potentially dropped empty arrays in getRoom"

duration: 1min
completed: 2026-02-23
---

# Quick 003: Fix filterStateForPlayer undefined cards Summary

**Two-layer defense against Firebase dropping empty arrays: sanitization in getRoom + nullish coalescing in filter.ts**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T12:43:59Z
- **Completed:** 2026-02-23T12:44:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- filterStateForPlayer no longer throws TypeError when p.cards is undefined
- Firebase getRoom now sanitizes players.cards and state.log to restore empty arrays
- Regression test covers the undefined cards scenario (9 tests passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add defensive fallback in filter.ts and sanitize in firebase.ts** - `986bc1e` (fix)
2. **Task 2: Add regression test for undefined cards in filter** - `73d4d7a` (test)

## Files Created/Modified
- `lib/game/filter.ts` - Added `?? []` fallback for p.cards in both self and opponent branches
- `lib/firebase.ts` - Added post-read sanitization in getRoom to restore empty arrays dropped by Firebase
- `lib/game/filter.test.ts` - Added regression test for undefined cards from Firebase

## Decisions Made
- Two-layer defense: sanitize at data source (firebase.ts) AND at usage point (filter.ts) for robustness
- Also defaulted state.log to [] in getRoom since it has the same Firebase empty-array-drop issue

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in filter.test.ts (line 77, Record<string, unknown> cast) - unrelated to this change, not addressed

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fix is complete and tested
- No blockers

---
*Quick task: 003-fix-filter-cards-undefined*
*Completed: 2026-02-23*
