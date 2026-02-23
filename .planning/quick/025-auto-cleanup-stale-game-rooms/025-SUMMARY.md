---
phase: quick
plan: 025
subsystem: infra
tags: [firebase, cron, vercel, cleanup, rtdb]

# Dependency graph
requires: []
provides:
  - Vercel Cron job to delete stale Firebase RTDB game rooms every 10 minutes
  - createdAt/updatedAt timestamps on all GameState objects
  - deleteRoom and listRoomIds helpers in lib/firebase.ts
affects: [future-rooms, firebase-costs, lobby-ghost-rooms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-set updatedAt in updateRoom/updateRoomWithViews before every write"
    - "Cron route at /api/cron/* protected by CRON_SECRET env var"

key-files:
  created:
    - app/api/cron/cleanup-rooms/route.ts
    - vercel.json
  modified:
    - lib/game/types.ts
    - lib/firebase.ts
    - app/api/game/create/route.ts

key-decisions:
  - "updatedAt auto-injected in updateRoom/updateRoomWithViews so no API route needs manual update"
  - "createdAt set only at creation; updatedAt set on every state write"
  - "Legacy rooms (no timestamps) deleted immediately - they are pre-025 zombie rooms"
  - "MAX_DELETE_PER_RUN=50 to prevent Firebase REST API overload in a single cron tick"
  - "CRON_SECRET optional - works without it but validates when set"

patterns-established:
  - "Vercel cron at app/api/cron/*.ts with GET handler and CRON_SECRET bearer auth"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Quick Task 025: Auto-cleanup Stale Game Rooms Summary

**Vercel Cron-based Firebase RTDB room cleanup: timestamps on GameState + /api/cron/cleanup-rooms deleting game_over(30m), waiting(2h), and legacy/zombie rooms**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T14:48:16Z
- **Completed:** 2026-02-23T14:50:02Z
- **Tasks:** 2
- **Files modified:** 5 (3 modified, 2 created)

## Accomplishments

- Added `createdAt` and `updatedAt` optional fields to `GameState` interface (backward-compatible)
- Auto-stamp `updatedAt = Date.now()` in `updateRoom` and `updateRoomWithViews` before every Firebase write
- Set `createdAt` and `updatedAt` on room creation in `/api/game/create`
- Added `deleteRoom` and `listRoomIds` to `lib/firebase.ts`
- Created `/api/cron/cleanup-rooms` GET endpoint with tiered deletion logic
- Created `vercel.json` scheduling cron every 10 minutes

## Task Commits

1. **Task 1: GameState timestamps + firebase helpers** - `bc3b4fa` (feat)
2. **Task 2: Cron cleanup API + vercel.json** - `c3d12b5` (feat)

## Files Created/Modified

- `lib/game/types.ts` - Added optional `createdAt?: number` and `updatedAt?: number` to `GameState`
- `lib/firebase.ts` - Auto-set `updatedAt` in write functions; added `deleteRoom`, `listRoomIds`
- `app/api/game/create/route.ts` - Set `createdAt` and `updatedAt` on `initialState`
- `app/api/cron/cleanup-rooms/route.ts` - Cron handler: scans all rooms, deletes stale ones
- `vercel.json` - Vercel cron schedule: `*/10 * * * *`

## Decisions Made

- `updatedAt` auto-injected inside `updateRoom`/`updateRoomWithViews` so no existing API route needed to change - all 7+ routes get it for free
- `createdAt` only set at room creation time; never overwritten
- Legacy/zombie rooms (no timestamps at all) are deleted immediately - these are pre-025 rooms with no activity tracking
- Max 50 deletes per run prevents Firebase REST overload (large rooms list edge case)
- `CRON_SECRET` auth: optional but validated when set; Vercel auto-sends this header for its own cron calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build succeeded first try. The "cleanup error" log during `npm run build` is Next.js attempting static render of the cron route at build time (expected behavior; route is correctly `ƒ Dynamic` at runtime).

## User Setup Required

For production deployment, optionally set `CRON_SECRET` environment variable in Vercel project settings. Vercel will automatically inject it into cron call headers.

Note: Vercel Hobby plan limits cron to daily (once per day). The `vercel.json` uses `*/10 * * * *` (every 10 min) which requires Vercel Pro. If on Hobby plan, change to `"0 * * * *"` (hourly) or `"0 0 * * *"` (daily).

## Next Phase Readiness

- Firebase RTDB will no longer accumulate stale rooms indefinitely
- Lobby ghost-room problem resolved for rooms created after 025 deployment
- Legacy rooms (created before 025) will be cleaned on first cron run

---
*Phase: quick*
*Completed: 2026-02-23*
