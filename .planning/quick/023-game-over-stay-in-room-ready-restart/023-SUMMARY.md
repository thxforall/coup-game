---
phase: quick
plan: "023"
subsystem: ui
tags: [game-over, restart, firebase, ux, next.js]

# Dependency graph
requires:
  - phase: quick-016
    provides: game_over guard + restart API + WaitingRoom restart flow
  - phase: quick-009
    provides: SettingsModal with restart button
provides:
  - game_over -> 대기실 -> 재시작 끊김 없는 흐름
  - check API game_over active:true response
  - Non-host 재시작 대기 UX (spinner + message)
  - 방 나가기 버튼 (기존 로비로 돌아가기 대체)
affects: [future UX polish tasks, reconnect flow changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check API: isPlayer만 체크, phase는 active 여부에 영향 없음"
    - "game_over 화면: isHost 분기로 방장/비방장 UX 분리"
    - "views 구독으로 restart 후 waiting 상태 자동 수신 (firebase.client.ts 수정 불필요)"

key-files:
  created: []
  modified:
    - app/api/game/check/route.ts
    - components/game/GameBoard.tsx

key-decisions:
  - "check API에서 game_over 조건 제거 - phase는 active 판단 기준이 아님"
  - "firebase.client.ts 수정 불필요 - views 구독이 restart 후 waiting 수신 처리"
  - "비방장 재시작 버튼 대신 spinner+안내 텍스트 표시"

patterns-established:
  - "game over 화면 isHost 분기: 방장=액션 버튼, 비방장=상태 표시"

# Metrics
duration: 5min
completed: 2026-02-23
---

# Quick Task 023: Game Over Stay-in-Room + Ready Restart Summary

**game_over 후 방에 머물며 방장 재시작 시 전원 대기실 자동 전환, 비방장에게 재시작 대기 spinner 표시**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-23T14:37:00Z
- **Completed:** 2026-02-23T14:41:30Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- check API에서 game_over 조건 제거 - 게임 종료 후 새로고침해도 로비로 튕기지 않고 방 페이지 유지
- 방장 재시작 시 views 구독을 통해 모든 클라이언트가 waiting 상태를 자동 수신, WaitingRoom 렌더링
- 비방장 game over 화면에 "방장의 재시작을 기다리는 중..." spinner 표시로 명확한 UX 안내
- "로비로 돌아가기" 버튼을 "방 나가기"로 변경하여 의미를 명확히

## Task Commits

Each task was committed atomically:

1. **Task 1: check API + subscribeToRoom 수정** - `bb1fa1d` (fix)
2. **Task 2: game over 화면 개선** - `e00746d` (feat)

**Plan metadata:** (included in this docs commit)

## Files Created/Modified
- `app/api/game/check/route.ts` - game_over phase 조건 제거, isPlayer만 체크
- `components/game/GameBoard.tsx` - isHost 분기로 방장/비방장 game over UX 분리, 버튼 텍스트 수정

## Decisions Made
- **check API에서 phase 조건 완전 제거:** 방에 속한 플레이어(isPlayer)이면 phase 관계없이 active:true 반환. game_over, 진행 중 등 모든 상태에서 방 페이지로 리다이렉트됨.
- **firebase.client.ts 수정 불필요:** restart API가 `updateRoomWithViews`를 호출하므로 views/{playerId}에 waiting 상태가 기록됨. 기존 views 구독이 이를 수신하여 WaitingRoom 전환 처리.
- **비방장 spinner 표시:** 방장이 아닌 경우 "다시 시작" 버튼 대신 RotateCcw animate-spin + 안내 텍스트로 대기 상태를 명확히 전달.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - straightforward implementation.

## Next Phase Readiness
- game_over -> 대기실 -> 재시작 흐름 완성
- 연속 게임 플레이 UX 정상 작동
- 향후 대기실 UI 개선 시 WaitingRoom 컴포넌트 참조

---
*Phase: quick*
*Completed: 2026-02-23*
