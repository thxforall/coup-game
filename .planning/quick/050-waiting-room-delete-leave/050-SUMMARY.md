---
phase: quick
plan: 050
subsystem: game-ui
tags: [waiting-room, leave, redirect, firebase]
dependency-graph:
  requires: []
  provides: [waiting-room-leave-button, room-deleted-redirect]
  affects: []
tech-stack:
  added: []
  patterns: [firebase-snapshot-null-detection, onRoomDeleted-callback]
key-files:
  created: []
  modified:
    - components/game/WaitingRoom.tsx
    - lib/firebase.client.ts
    - app/game/[roomId]/page.tsx
decisions: []
metrics:
  duration: "~5min"
  completed: 2026-02-24
---

# Quick 050: 대기실 방 나가기 + 방 삭제 시 자동 리다이렉트 Summary

비방장 플레이어 대기실 "방 나가기" 버튼 + 방장 방 삭제 시 Firebase snapshot null 감지로 잔류 플레이어 자동 로비 리다이렉트

## What Was Done

### Task 1: 비방장 대기실 "방 나가기" 버튼 + 방 삭제 시 자동 리다이렉트
**Commit:** `08f07f6`

**WaitingRoom.tsx 변경:**
- `onLeave: () => void` prop 추가
- 비방장 영역에 "방 나가기" 버튼 추가 (`LogOut` 아이콘, ghost 스타일, confirm 후 onLeave 호출)
- 상단 "로비로" 버튼도 `window.confirm` 후 `onLeave()` 호출하도록 변경 (기존: clearActiveRoom + redirect만)

**lib/firebase.client.ts 변경:**
- `subscribeToRoom` 4번째 파라미터 `onRoomDeleted?: () => void` 추가
- stateRef onValue 콜백에서 `snapshot.exists() === false`일 때 `onRoomDeleted?.()` 호출

**app/game/[roomId]/page.tsx 변경:**
- `handleLeave` 콜백 추가: leave API POST -> clearActiveRoom -> redirect
- `subscribeToRoom` 호출 시 onRoomDeleted 콜백 전달 (방 삭제 감지 -> clearActiveRoom + redirect)
- WaitingRoom에 `onLeave={handleLeave}` prop 전달

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript type check: passed (pre-existing filter.test.ts error only)
- Build: passed successfully
