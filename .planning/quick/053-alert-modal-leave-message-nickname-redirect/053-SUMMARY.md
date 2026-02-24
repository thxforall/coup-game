---
phase: quick-053
plan: 01
subsystem: ui
tags: [react, modal, ux, alert, confirm, redirect, nextjs]

requires:
  - phase: quick-042
    provides: 방 나가기 모달 + leave API 기반
  - phase: quick-050
    provides: waiting room 나가기/삭제 리다이렉트 패턴

provides:
  - AlertModal 컴포넌트 (단일 확인 버튼 알림 모달, BottomSheet 기반)
  - WaitingRoom의 모든 window.confirm/alert -> 스타일된 모달 교체
  - 퇴장 시 "방에서 나왔습니다" 중립 메시지 (추방 워딩 제거)
  - 닉네임 없는 /game/XXXX URL 직접 접속 -> /?join=XXXX 리다이렉트 안내

affects:
  - future-ux: 브라우저 기본 alert/confirm 사용 금지 패턴 확립
  - lobby: /?join=XXXX 쿼리파라미터 활용 가능

tech-stack:
  added: []
  patterns:
    - "AlertModal: 단일 확인 버튼 알림용 모달, ConfirmModal과 대응"
    - "hasBeenInRoomRef: 방 참가 이력 추적으로 추방/미참가 구분"
    - "alertState union type: left | no-nickname 상태 분기"

key-files:
  created:
    - components/ui/AlertModal.tsx
  modified:
    - components/game/WaitingRoom.tsx
    - app/game/[roomId]/page.tsx
    - app/api/game/leave/route.ts

key-decisions:
  - "추방/자발적퇴장 구분이 Firebase 구독 특성상 불가 -> 중립 메시지 '방에서 나왔습니다'"
  - "닉네임 없는 접속: hasBeenInRoomRef=false이면 미참가 상태로 판단"
  - "닉네임 없는 접속 리다이렉트: /?join=XXXX (방 코드 쿼리파라미터 포함)"
  - "WaitingRoom 확인 상태 관리: ConfirmAction union type으로 단일 state"

patterns-established:
  - "AlertModal 패턴: BottomSheet 기반 단일버튼 알림, title/message/buttonLabel/onClose"
  - "브라우저 기본 alert/confirm 사용 금지 (앱 전체)"

duration: 3min
completed: 2026-02-24
---

# Quick 053: Alert Modal + Leave Message + Nickname Redirect Summary

**BottomSheet 기반 AlertModal 신규 생성 + WaitingRoom/GamePage의 window.alert/confirm을 스타일된 모달로 전면 교체, 닉네임 없는 URL 직접 접속 시 /?join=XXXX 안내 리다이렉트**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T09:20:17Z
- **Completed:** 2026-02-24T09:23:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- AlertModal 컴포넌트 신규 생성 (BottomSheet 기반, 단일 확인 버튼)
- WaitingRoom의 window.confirm 3곳, window.alert 1곳 -> 스타일된 모달로 교체
- GamePage의 alert('방에서 추방되었습니다') -> "방에서 나왔습니다" AlertModal로 교체
- 닉네임 없이 /game/XXXX URL 직접 접속 시 "참가 안내" AlertModal + /?join=XXXX 리다이렉트

## Task Commits

Each task was committed atomically:

1. **Task 1: AlertModal 생성 + WaitingRoom window.confirm/alert 모달 교체** - `1c7670d` (feat)
2. **Task 2: 퇴장/추방 AlertModal + 닉네임 없는 URL 접속 리다이렉트** - `6bfc2c1` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `components/ui/AlertModal.tsx` - 단일 확인 버튼 알림 모달 컴포넌트 (BottomSheet 기반, ConfirmModal의 단순화 버전)
- `components/game/WaitingRoom.tsx` - window.confirm/alert -> ConfirmModal/AlertModal 교체, ConfirmAction union type 상태 관리
- `app/game/[roomId]/page.tsx` - alert() -> AlertModal, hasBeenInRoomRef로 추방/미참가 구분, 닉네임 없는 접속 /?join=XXXX 리다이렉트
- `app/api/game/leave/route.ts` - waiting 단계 나가기 시 "이(가) 방을 나갔습니다" 로그 추가

## Decisions Made
- **추방/자발적퇴장 메시지 통일:** Firebase 구독 특성상 kick과 leave를 구분할 수 없어 "방에서 나왔습니다" 중립 메시지 채택
- **닉네임 없는 접속 감지:** `hasBeenInRoomRef`로 방 참가 이력 추적 - false인 상태에서 players 목록에 없으면 미참가로 판단
- **WaitingRoom 상태 관리:** `ConfirmAction | null` union type 단일 state로 kick/leave/delete 모달 분기
- **방 나가기 로그:** leave API의 waiting 단계에서 플레이어 나가기 로그 추가 (추방과 구분 가능)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- 기존 test 파일(filter.test.ts)에 pre-existing 타입 에러 존재 - 본 작업과 무관, 변경하지 않음

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 브라우저 기본 alert/confirm이 WaitingRoom, GamePage에서 완전히 제거됨
- AlertModal 재사용 가능한 컴포넌트로 확립 (향후 다른 곳에서도 활용 가능)
- /?join=XXXX 쿼리파라미터 처리는 로비 페이지(app/page.tsx)에서 추가 구현 가능

---
*Phase: quick-053*
*Completed: 2026-02-24*
