---
phase: quick
plan: "062"
subsystem: realtime-sync
tags: [firebase, rtdb, room-deletion, bug-fix]
dependency-graph:
  requires: []
  provides: ["viewRef room deletion detection"]
  affects: []
tech-stack:
  added: []
  patterns: ["dual-subscription deletion guard"]
key-files:
  created: []
  modified:
    - lib/firebase.client.ts
decisions: []
metrics:
  duration: "2min"
  completed: "2026-02-24"
---

# Quick 062: Fix Room Delete Detection During Game

viewRef onValue else 브랜치 추가 -- 게임 중 방 삭제 시 onRoomDeleted 콜백 호출

## What Was Done

### Task 1: viewRef onValue 콜백에 방 삭제 감지 else 브랜치 추가
- **Commit:** ed2bd62
- **Files:** lib/firebase.client.ts
- **Change:** `subscribeToRoom` 함수의 viewRef `onValue` 콜백에 `else` 브랜치를 추가하여 `snapshot.exists() === false`일 때 `onRoomDeleted?.()` 호출

## Bug Analysis

**Problem:** 게임 진행 중(phase !== 'waiting') 호스트가 방을 삭제하면 다른 플레이어가 자동으로 로비로 리다이렉트되지 않음.

**Root Cause:** `subscribeToRoom`에서 게임 시작 후 `stateRef` 구독이 자동 해제(line 74-77)되어, `stateRef`의 `onRoomDeleted` 콜백이 더 이상 호출되지 않음. `viewRef`에는 삭제 감지 로직이 없었음.

**Fix:** `viewRef` `onValue` 콜백에 `else` 브랜치를 추가하여, 방 전체가 삭제되어 `views/{playerId}` snapshot이 존재하지 않을 때 `onRoomDeleted?.()` 를 호출.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript type check (`npx tsc --noEmit`) passed
- viewRef와 stateRef 모두 방 삭제 시 onRoomDeleted를 호출하는 코드 확인 완료
