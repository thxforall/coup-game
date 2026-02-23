---
phase: quick-039
plan: 01
subsystem: lobby
tags: [room-list, lobby-ui, join, api]
completed: 2026-02-24
duration: ~8min
key-files:
  created:
    - app/api/game/list/route.ts
  modified:
    - app/api/game/join/route.ts
    - app/page.tsx
---

# Quick 039: Room List + Kicked Player Rejoin Summary

**One-liner:** Lobby room browser with 10s polling + kicked player rejoin by removing kickedPlayerIds gate

## What Was Done

### Task 1: Room List API + Kicked Rejoin (8be4ace)
- Created `GET /api/game/list` endpoint returning waiting rooms (max 20, newest first)
- Parallel room fetching with `Promise.all` for performance
- Returns: roomId, hostName, playerCount, maxPlayers, gameMode, createdAt
- Removed `kickedPlayerIds` check from `/api/game/join` route (lines 19-21)
- kickedPlayerIds field kept in GameState type for backward compatibility

### Task 2: Lobby Room List UI (2c562db)
- Added third tab "방 목록" (rooms) to lobby alongside "방 만들기" and "방 참가"
- Room cards display: host name, player count badge (e.g. 2/6), game mode badge (Standard/Guess), room code in monospace
- 10-second auto-polling when rooms tab is active (cleanup on tab switch)
- Manual refresh button with spinning indicator
- Empty state: "대기 중인 방이 없습니다" with link to create tab
- Click "입장" button to join room directly (reuses existing join API flow)
- Action button hidden on rooms tab (each room has its own join button)

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Max 20 rooms in list API | Prevent excessive Firebase reads; 30 candidates fetched, filtered to 20 waiting |
| 2 | 10s polling (not WebSocket) | Consistent with existing project patterns; waiting rooms change infrequently |
| 3 | Keep kickedPlayerIds in type | Backward compatibility; existing rooms may have the field in Firebase |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` - no new errors (pre-existing test file error only)
- `npm run build` - success, /api/game/list endpoint included in build output
- Room list API returns JSON array of waiting rooms
- Kicked player check removed from join route
