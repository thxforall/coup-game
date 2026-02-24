---
phase: quick
plan: 058
subsystem: ui, api
tags: [lobby, room-list, game-status, firebase, nextjs]

requires:
  - phase: quick-039
    provides: "GET /api/game/list 로비 방 목록 API 기반"

provides:
  - "API에서 waiting + playing 방 모두 반환 (status 필드 포함)"
  - "로비 방 목록 UI에 진행 중 방 표시 (상태 배지 + 입장 불가)"

affects: []

tech-stack:
  added: []
  patterns:
    - "status 필드로 방 상태 구분 (waiting | playing)"
    - "game_over 방 제외, waiting 20개 + playing 10개 분리 버킷 수집"

key-files:
  created: []
  modified:
    - "app/api/game/list/route.ts"
    - "app/page.tsx"

key-decisions:
  - "game_over 방은 목록에서 제외 (끝난 게임은 노이즈)"
  - "playing 방에 alivePlayers 필드 추가로 생존자 수 표시"
  - "waiting 방 먼저 정렬, 각 그룹 내 createdAt 내림차순"
  - "playing 방 입장 버튼 없음 (관전 불가)"

patterns-established:
  - "방 목록 API: PLAYING_PHASES Set으로 진행 중 phase 판별"

duration: 2min
completed: 2026-02-24
---

# Quick 058: Room List Show In-Progress Games Summary

**로비 방 목록 API에서 waiting/playing 상태 방 모두 반환하고, UI에서 상태 배지와 opacity 구분으로 진행 중 방을 입장 불가로 표시**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T09:50:38Z
- **Completed:** 2026-02-24T09:52:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- API `/api/game/list`에서 `waiting` + `playing` 상태 방 모두 반환, `status` + `alivePlayers` 필드 추가
- `game_over` 방은 제외하여 종료된 게임 노이즈 방지
- 로비 UI에서 waiting 방 (초록 "대기 중" 배지 + 입장 버튼) / playing 방 (주황 "게임 중" 배지 + opacity-70 + 생존X/Y + 입장 불가) 분기 표시
- 빈 상태 메시지 "대기 중인 방이 없습니다" → "열려있는 방이 없습니다"

## Task Commits

1. **Task 1: API에 playing 상태 방 포함 + status/alivePlayers 필드 추가** - `d21bfaa` (feat)
2. **Task 2: 로비 방 목록 UI에 진행 중 방 표시** - `a82695f` (feat)

## Files Created/Modified
- `app/api/game/list/route.ts` - waiting/playing 분리 버킷 수집, status/alivePlayers 필드 추가
- `app/page.tsx` - RoomListItem 타입 업데이트, 상태별 UI 분기 (배지, 입장 버튼, 생존자 수)

## Decisions Made
- `PLAYING_PHASES` Set 상수로 진행 중 phase 목록을 명시적으로 관리 (game_over 제외)
- waiting 최대 20개, playing 최대 10개로 분리 제한 (총 30개)
- playing 방은 입장 버튼 없음 — 관전 기능 미구현으로 진입 차단

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 로비 활성도 표시 완료
- 관전(spectator) 기능 추후 추가 시 playing 방 입장 버튼 활성화 가능

---
*Phase: quick-058*
*Completed: 2026-02-24*
