---
phase: quick
plan: 047
subsystem: ui
tags: [react, eventlog, chat, timestamp, sorting]

# Dependency graph
requires: []
provides:
  - EventLog mergedStructured sorts by real timestamp for chronological game+chat interleaving
affects: [ui, game-log, chat-log]

# Tech tracking
tech-stack:
  added: []
  patterns: [timestamp-based merge sort for log interleaving]

key-files:
  created: []
  modified:
    - components/game/EventLog.tsx

key-decisions:
  - "Use entry.timestamp and item.timestamp directly as sortKey instead of index-offset math"
  - "Leave mergedPlain path unchanged since plain log entries lack timestamps (fallback path only)"

patterns-established:
  - "Merge sort pattern: both game and chat entries use real Unix timestamps as sortKey"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Quick Task 047: Game Log Chat Interleave Timestamp Fix Summary

**mergedStructured sort changed from index+offset math to real timestamps, so chat messages interleave chronologically with game log entries instead of clustering at bottom**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T17:01:00Z
- **Completed:** 2026-02-24T17:06:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Fixed mergedStructured sort to use `entry.timestamp` and `item.timestamp` as sortKey
- Removed `minChat` and `maxGame` intermediate variables (no longer needed)
- Chat messages now appear interleaved with game entries in real chronological order
- mergedPlain fallback path intentionally left unchanged (plain string[] entries have no timestamps)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix mergedStructured and mergedPlain sort to use timestamp** - `131875e` (fix)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `components/game/EventLog.tsx` - mergedStructured sortKey changed from index/offset to entry.timestamp / item.timestamp

## Decisions Made
- Used `entry.timestamp` and `item.timestamp` directly as sortKey — both `LogEntry` and `ChatLogItem` have `timestamp: number` fields, so no normalization needed
- mergedPlain path left as-is: plain `log: string[]` entries have no timestamps, and this path only runs when structuredLog is unavailable (rare fallback)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build failure confirmed to be pre-existing (missing `@/lib/settings` and missing API route files) — unrelated to this change. TypeScript compilation of EventLog.tsx itself is clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chat log interleaving is now timestamp-accurate in the primary structured log path
- No blockers

---
*Phase: quick-047*
*Completed: 2026-02-24*
