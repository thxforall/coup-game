---
phase: quick-035
plan: 01
subsystem: ui
tags: [react, memo, usecallback, usememo, performance, tailwind, firebase]

# Dependency graph
requires:
  - phase: quick-034
    provides: QuickChat free text input (GameBoard onSendText prop)
provides:
  - Stable reference props for ExchangeModal (me, exchangeCards, onSelect)
  - GPU-composited card button transitions (no layout thrashing)
  - Explicit memo comparator on ExchangeModal
affects: [future-gameboard-changes, exchange-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON.stringify useMemo trick for deep-equality reference stabilization"
    - "Custom memo comparator for explicit prop checking"
    - "will-change-transform + transition-transform/opacity for GPU-composited animations"

key-files:
  created: []
  modified:
    - components/game/GameBoard.tsx
    - components/game/ExchangeModal.tsx

key-decisions:
  - "Use JSON.stringify inside useMemo dependency array to stabilize references without lodash"
  - "Replace transition-all with transition-transform + transition-opacity to avoid layout thrashing"
  - "Add explicit memo comparator instead of relying on default shallow compare"

patterns-established:
  - "JSON.stringify useMemo: useMemo(() => raw, [JSON.stringify(raw)]) for deep-equal reference stability"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Quick Task 035: ExchangeModal Optimistic Update Slow Fix Summary

**Eliminated ExchangeModal re-render jank by stabilizing all three props with useCallback/useMemo+JSON.stringify and replacing layout-thrashing transition-all with GPU-composited transitions**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-23T15:48:12Z
- **Completed:** 2026-02-23T15:53:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- ExchangeModal no longer re-renders on every Firebase presence/chat update
- Card toggle animations are now GPU-composited (transform + opacity only), preventing layout thrashing
- Explicit memo comparator makes the optimization intent clear and future-proof

## Task Commits

1. **Task 1: Stabilize ExchangeModal props in GameBoard** - `d63c556` (perf)
2. **Task 2: Optimize ExchangeModal CSS transitions and memo comparator** - `cba886f` (perf)

## Files Created/Modified

- `components/game/GameBoard.tsx` - Added `handleExchangeSelect` useCallback, `exchangeCardsMemo` useMemo, stabilized `me` with JSON.stringify comparator, updated ExchangeModal JSX to use stable props
- `components/game/ExchangeModal.tsx` - Replaced `transition-all` with `transition-transform transition-opacity duration-150`, added `will-change-transform`, added explicit memo comparator for player/exchangeCards/onSelect

## Decisions Made

- **JSON.stringify dependency trick**: Used `useMemo(() => raw, [JSON.stringify(raw)])` rather than adding lodash `isEqual`. This avoids a new dependency while achieving deep-equality reference stabilization. The `// eslint-disable-next-line` comment is needed since ESLint hooks plugin doesn't recognize JSON.stringify as a valid dependency expression.
- **Explicit memo comparator**: Added `memo(ExchangeModal, (prev, next) => ...)` to make intent explicit rather than relying on default shallow compare which works identically but is less obvious.
- **transition-transform + transition-opacity**: These two properties are GPU-composited in all major browsers and do not trigger layout/paint. `transition-all` would animate layout properties (width, height, padding) on any class change, causing the main thread to be involved in every card toggle animation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript error in `lib/game/filter.test.ts` (unrelated to this task) was the only tsc output. Build passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ExchangeModal card selection is now instant and fluid regardless of Firebase update frequency
- The JSON.stringify useMemo pattern can be applied to other expensive prop stabilizations in GameBoard if needed
- No blockers

---
*Phase: quick-035*
*Completed: 2026-02-24*
