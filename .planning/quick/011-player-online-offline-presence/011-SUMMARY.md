---
phase: quick
plan: "011"
subsystem: presence
tags: [firebase, realtime, presence, ui]
requires: []
provides:
  - real-time player online/offline presence dots in WaitingRoom and GameBoard
affects: []
tech-stack:
  added: []
  patterns:
    - Firebase Realtime Database presence with onDisconnect
    - PresenceMap subscription passed as prop through component tree
key-files:
  created: []
  modified:
    - app/game/[roomId]/page.tsx
    - components/game/GameBoard.tsx
    - components/game/PlayerArea.tsx
    - components/game/WaitingRoom.tsx
decisions:
  - description: "Make presence prop optional in GameBoard and WaitingRoom with default empty map"
    reason: "Backwards compatible; components render gray dots if presence not yet loaded"
metrics:
  duration: "~10 minutes"
  completed: "2026-02-23"
---

# Phase quick Plan 011: Player Online/Offline Presence Summary

**One-liner:** Firebase onDisconnect presence dots (emerald/gray) wired from GamePage into WaitingRoom and GameBoard via PresenceMap prop.

## What Was Built

Real-time player presence indicators — a green dot (online) or gray dot (offline) — displayed next to each player's name in both the WaitingRoom lobby and the GameBoard opponents row.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire presence setup and subscription in GamePage | a15482a | app/game/[roomId]/page.tsx |
| 2 | Show presence dots in PlayerArea, GameBoard, and WaitingRoom | 5a2af40 | components/game/GameBoard.tsx, components/game/PlayerArea.tsx, components/game/WaitingRoom.tsx |

## Implementation Details

### Task 1 — GamePage presence wiring
- Imported `setupPresence`, `subscribeToPresence`, `PresenceMap` from `@/lib/firebase.client`
- Added `presence` state (`PresenceMap`, default `{}`)
- `useEffect` calling `setupPresence(roomId, playerId)` — registers current player as online, sets `onDisconnect` handler
- `useEffect` calling `subscribeToPresence(roomId, cb)` — subscribes to all players' presence
- Passed `presence` prop to both `<WaitingRoom>` and `<GameBoard>`

### Task 2 — UI dots
- **GameBoard.tsx**: Added `presence?: PresenceMap` to Props, destructures with default `{}`, passes `online={!!presence[player.id]?.online}` to each `<PlayerArea>`
- **PlayerArea.tsx**: Added `online?: boolean` to `Props` and `PlayerBadgeProps`. Inside `PlayerBadge`, placed a `w-2 h-2 rounded-full` dot between the avatar circle and name span — `bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]` when online, `bg-gray-500` when offline
- **WaitingRoom.tsx**: Added `presence?: PresenceMap` to Props. Inside each player `<li>`, placed a `w-2.5 h-2.5 rounded-full` dot between avatar and name span using same emerald/gray logic

## Verification

- `npx tsc --noEmit` — only pre-existing `filter.test.ts` error, no new errors
- `npm run build` — succeeded (11/11 static pages generated)
- Visual behavior: green dot for connected tabs, gray dot appears within seconds of tab close via Firebase `onDisconnect`

## Deviations from Plan

None — plan executed exactly as written.
