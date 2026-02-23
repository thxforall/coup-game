---
phase: quick-017
plan: 01
subsystem: ui
tags: [react, firebase, realtime-database, chat, animation, tailwind]

# Dependency graph
requires:
  - phase: quick-011
    provides: Firebase presence 구독 패턴 (onValue)
  - phase: quick-015
    provides: 360px 모바일 반응형 기반
provides:
  - 6개 퀵챗 버튼 (QuickChat.tsx) - 실시간 전송
  - 말풍선 표시 (ChatBubble.tsx) - 3초 자동 소멸
  - Firebase RTDB game_rooms/{roomId}/chat 실시간 채팅 인프라
affects: [future-social-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Firebase RTDB onValue 구독으로 클라이언트 SDK 직접 채팅 (서버 API 없이)"
    - "Map-based 말풍선 상태 관리 (playerId -> {message, leaving})"
    - "setTimeout ref 패턴으로 말풍선 자동 소멸 타이머 관리"

key-files:
  created:
    - components/game/QuickChat.tsx
    - components/game/ChatBubble.tsx
  modified:
    - lib/firebase.client.ts
    - components/game/GameBoard.tsx
    - components/game/PlayerArea.tsx
    - app/globals.css

key-decisions:
  - "서버 API 라우트 없이 클라이언트 SDK 직접 사용 - 채팅은 ephemeral 데이터, 서버 검증 불필요"
  - "seenChatKeysRef로 중복 메시지 방지 - onValue 재호출 시 전체 스냅샷 재처리 방지"
  - "30초 이상 된 메시지 무시 - 페이지 로드 시 과거 메시지 표시 방지"

patterns-established:
  - "ChatBubble: absolute positioning, 부모는 relative"
  - "QuickChat: 1.5초 쿨다운, disabled prop으로 죽은 플레이어 차단"

# Metrics
duration: 15min
completed: 2026-02-23
---

# Quick Task 017: 실시간 퀵챗 이모티콘/텍스트 버튼 6개 Summary

**Firebase RTDB 직접 구독으로 6개 프리셋 퀵챗 버튼 + 3초 자동 소멸 말풍선 실시간 채팅 구현**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-23T14:10:00Z
- **Completed:** 2026-02-23T14:25:00Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments
- Firebase RTDB `game_rooms/{roomId}/chat` 경로에 클라이언트 SDK로 직접 메시지 저장/구독
- 6개 퀵챗 버튼 (드루와, 공작 업, ㅠㅠ, 넌 뒤졌다, 봐줘, 👍) - 가로 스크롤, 1.5초 쿨다운
- 말풍선이 해당 플레이어 위에 표시되고 3초 후 fade-out 애니메이션으로 자동 소멸
- 내 채팅도 MyPlayerArea 위에 표시

## Task Commits

1. **Task 1: 채팅 API + Firebase 구독 인프라** - `8806500` (feat)
2. **Task 2: QuickChat 버튼 + ChatBubble 말풍선 UI** - `93de992` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `lib/firebase.client.ts` - CHAT_MESSAGES 상수, sendChatMessage, subscribeToChatMessages 추가
- `components/game/QuickChat.tsx` - 6개 퀵챗 버튼, 쿨다운, 가로 스크롤
- `components/game/ChatBubble.tsx` - 말풍선 UI, chatBubbleIn/Out 애니메이션
- `components/game/GameBoard.tsx` - 채팅 구독, chatBubbles Map 상태, QuickChat/ChatBubble 통합
- `components/game/PlayerArea.tsx` - chatBubble prop 추가, 말풍선 표시
- `app/globals.css` - chatBubbleIn/chatBubbleOut @keyframes 추가

## Decisions Made
- **클라이언트 SDK 직접 사용:** 서버 API 라우트(`/api/game/chat`) 대신 Firebase 클라이언트 SDK로 직접 쓰기. 채팅은 게임 상태에 영향 없는 ephemeral 데이터이므로 서버 검증 불필요, 실시간성 향상.
- **seenChatKeysRef 중복 방지:** `onValue`는 변경 시마다 전체 스냅샷을 반환하므로 이미 처리한 키를 Set에 기록해 중복 처리 방지.
- **30초 타임아웃 필터:** 페이지 로드 시 이전 채팅 메시지가 즉시 표시되는 것을 방지.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- TypeScript에서 `state.phase !== 'game_over'` 비교 오류 (게임 오버 시 early return 이후라 타입상 불가능한 비교). 조건문을 제거하여 해결 (게임 오버 시 early return이 이미 처리).
- `chatTimersRef.current` ESLint react-hooks 경고. cleanup 함수에서 ref 대신 로컬 변수 사용으로 해결.

## Next Phase Readiness
- 퀵챗 인프라 완성, 추후 커스텀 메시지나 이모지 추가 가능
- Firebase chat 경로 데이터가 무한 쌓이지 않도록 향후 cleanup 고려 가능 (현재는 30초 필터로 클라이언트 무시)

---
*Phase: quick-017*
*Completed: 2026-02-23*
