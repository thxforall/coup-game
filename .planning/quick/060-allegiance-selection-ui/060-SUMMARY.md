---
phase: quick-060
plan: 01
status: complete
duration: ~3m
completed: 2026-02-24
tech-stack:
  patterns: ["API route pattern (ready API clone)", "prop drilling for callbacks"]
key-files:
  created:
    - app/api/game/allegiance/route.ts
  modified:
    - lib/game/engine.ts
    - app/api/game/start/route.ts
    - app/api/game/create/route.ts
    - app/api/game/join/route.ts
    - components/game/WaitingRoom.tsx
    - app/game/[roomId]/page.tsx
---

# Quick 060: Allegiance Selection UI Summary

종교개혁 모드 대기실에서 플레이어가 직접 진영(충성파/개혁파)을 선택할 수 있도록 구현

## What Was Done

### Task 1: Allegiance API + Engine + Create/Join
- `/api/game/allegiance` POST API 생성 (ready API 패턴 클론)
  - 검증: phase === waiting, gameMode === reformation, player 존재
  - Firebase updateRoomWithViews로 저장
- `initGame` 시그니처 확장: `players[].allegiance?` 수용, 없으면 교대 배정 폴백
- `/api/game/start` 수정: players에 allegiance 포함하여 initGame 전달
- Create API: reformation 모드이면 첫 플레이어에 `loyalist` 기본 배정
- Join API: reformation 모드이면 `players.length % 2` 기반 교대 배정

### Task 2: WaitingRoom UI + Page Handler
- `handleAllegiance` 콜백 추가 (game page)
- WaitingRoom Props에 `onAllegiance` 추가
- 종교개혁 모드에서만 진영 배지 표시 (충성파: 파란색, 개혁파: 빨간색)
- 본인 배지만 클릭 가능 (cursor-pointer + hover:opacity-80), 타인은 cursor-default
- 아바타 원형 배경색도 진영에 따라 변경 (blue-500/20 vs red-500/20)
- standard/guess 모드에서는 진영 UI 완전히 숨김

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | e0a5091 | feat(quick-060): allegiance selection API + initGame allegiance passthrough |
| 2 | 31d2de9 | feat(quick-060): WaitingRoom allegiance toggle UI + page handler |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **배지 UI 방식**: button 요소로 구현하여 본인은 클릭 가능, 타인은 disabled 처리
2. **기본 진영 배정 시점**: create/join API 시점에서 즉시 배정 (대기실 진입 즉시 배지 표시)
