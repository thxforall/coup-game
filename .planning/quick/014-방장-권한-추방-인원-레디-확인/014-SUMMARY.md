---
phase: quick-014
plan: 01
subsystem: ui, api
tags: [next.js, firebase, waitingroom, kick, ready, host-controls]

requires:
  - phase: quick-011
    provides: presence 표시 (WaitingRoom 기반 컴포넌트)

provides:
  - POST /api/game/kick - 방장 전용 플레이어 추방 엔드포인트
  - POST /api/game/ready - isReady 토글 엔드포인트
  - WaitingRoom UI - 추방 버튼, 레디 토글, 레디 상태 아이콘
  - GamePage - 추방 감지 후 메인 화면 리다이렉트

affects:
  - phase-3-ux-polish
  - any future WaitingRoom changes

tech-stack:
  added: []
  patterns:
    - "kick/ready API: getRoom → validate → mutate → updateRoomWithViews + Firebase DELETE for kicked player view"
    - "추방 감지: playerIdRef + subscribeToRoom 콜백에서 players 목록 체크"

key-files:
  created:
    - app/api/game/kick/route.ts
    - app/api/game/ready/route.ts
  modified:
    - components/game/WaitingRoom.tsx
    - app/game/[roomId]/page.tsx

key-decisions:
  - "추방된 플레이어 view는 updateRoomWithViews 이후 별도 DELETE 요청으로 제거"
  - "추방 감지는 subscribeToRoom 콜백 내에서 playerIdRef로 체크 (stale closure 방지)"
  - "방장(index 0)은 레디 상태 표시 안함 - 항상 준비 완료로 간주"
  - "게임 시작 조건: players.length >= 2 && players.slice(1).every(p => p.isReady)"

patterns-established:
  - "WaitingRoom 콜백 패턴: onKick(targetId), onReady() - GamePage에서 fetch 담당"
  - "useRef로 playerId 최신값 유지하여 비동기 콜백의 stale closure 방지"

duration: 2min
completed: 2026-02-23
---

# Quick Task 014: 방장 권한 추방 + 인원 레디 확인 Summary

**방장의 대기실 플레이어 추방(kick) API + 일반 플레이어 레디(ready) 토글 API + WaitingRoom UI 업데이트로 게임 시작 전 방 관리 기능 완성**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T13:57:38Z
- **Completed:** 2026-02-23T13:59:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- POST /api/game/kick: 방장만 추방 가능, 추방 후 views 갱신 + 추방된 플레이어 view Firebase에서 DELETE
- POST /api/game/ready: isReady 토글 후 updateRoomWithViews 갱신
- WaitingRoom: 레디 아이콘(CheckCircle2/Circle), 방장 X 추방 버튼, 일반 플레이어 준비 완료/취소 토글 버튼
- GamePage: handleKick/handleReady 추가, subscribeToRoom 콜백에서 추방 감지 → router.push('/')

## Task Commits

1. **Task 1: 추방(kick) + 레디(ready) API 라우트 생성** - `e138997` (feat)
2. **Task 2: WaitingRoom UI - 추방 버튼 + 레디 토글 + 레디 상태 표시** - `ce8b92f` (feat)

## Files Created/Modified

- `app/api/game/kick/route.ts` - 방장 전용 플레이어 추방 API, 추방 후 Firebase view 노드 삭제
- `app/api/game/ready/route.ts` - 플레이어 isReady 토글 API
- `components/game/WaitingRoom.tsx` - 레디 상태 아이콘, 추방 버튼(방장), 준비 토글 버튼(일반), 게임 시작 조건 강화
- `app/game/[roomId]/page.tsx` - handleKick/handleReady 콜백, playerIdRef, 추방 감지 리다이렉트

## Decisions Made

- 추방된 플레이어의 view는 `updateRoomWithViews` 이후 별도 Firebase REST DELETE로 제거 (multi-path PATCH에서 제외 방식 대신 명시적 삭제)
- `playerIdRef` 사용: subscribeToRoom 콜백은 클로저라 stale playerId를 참조할 수 있어 ref로 최신값 보장
- 방장은 레디 상태 표시 없음 - 방장이 게임을 시작하는 주체이므로 항상 준비 완료로 간주
- 확인 다이얼로그(`window.confirm`)를 WaitingRoom 내부에서 처리, onKick은 순수 API 호출만 담당

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. 기존 pre-existing TypeScript 에러(filter.test.ts의 타입 캐스팅)는 이번 작업과 무관한 것으로 확인.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 방장 권한 관리(추방) + 레디 시스템 완성으로 게임 시작 흐름이 완전히 갖춰짐
- Phase 3 (UX & Polish)에서 애니메이션, 토스트 알림 등 추가 가능
- 현재 추방 알림은 alert()로 처리 - 추후 토스트로 교체 검토 가능

---
*Phase: quick-014*
*Completed: 2026-02-23*
