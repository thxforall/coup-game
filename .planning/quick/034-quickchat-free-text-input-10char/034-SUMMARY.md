---
quick: "034"
title: "QuickChat 자유 텍스트 입력 (10자 제한)"
completed: "2026-02-24"
duration: "~2 minutes"

subsystem: "chat/ui"
tags: ["quickchat", "firebase", "free-text", "input", "realtime"]

dependency-graph:
  requires: ["017-realtime-chat-emoji-textbox-6", "024-game-ux-log-chat-confirm-optimization", "027-chat-to-log-and-confirm-modal-ux"]
  provides: ["free-text-chat-input-10char", "sendChatTextMessage-firebase-fn"]
  affects: ["EventLog display", "GameBoard chat subscription"]

tech-stack:
  added: []
  patterns: ["messageId=-1 sentinel for free-text messages", "optimistic-ui-callback pattern"]

key-files:
  created: []
  modified:
    - lib/firebase.client.ts
    - components/game/QuickChat.tsx
    - components/game/GameBoard.tsx

decisions:
  - "messageId=-1 as sentinel value for free-text messages (avoids schema migration)"
  - "Shared cooldown/count refs between preset and free-text sends"

metrics:
  tasks-completed: 3
  tasks-total: 3
  commits: 3
  deviations: 1
---

# Quick Task 034: QuickChat 자유 텍스트 입력 (10자 제한) Summary

**One-liner:** QuickChat에 10자 제한 자유 텍스트 입력 추가 — messageId=-1 센티넬, Firebase RTDB 전송, 프리셋과 쿨다운/횟수 공유

## What Was Built

QuickChat 컴포넌트에 자유 텍스트 입력 필드(w-20, maxLength=10)와 전송 버튼을 추가했다. 프리셋 버튼과 동일한 1.5초 쿨다운 및 턴당 3회 제한을 공유한다. Firebase에는 `messageId: -1`, `text: "..."` 형태로 저장되며, 수신 측에서 -1을 확인해 text 필드를 사용한다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Firebase ChatMessage text 필드 + sendChatTextMessage 함수 | 0bbf7f2 / e22f808 | lib/firebase.client.ts |
| 2 | QuickChat 자유 텍스트 입력 UI | e22f808 | components/game/QuickChat.tsx |
| 3 | GameBoard 자유 텍스트 수신 연동 | 2f4b3a4 | components/game/GameBoard.tsx |

## Key Changes

### lib/firebase.client.ts
- `ChatMessage` 인터페이스에 `text?: string` optional 필드 추가
- `sendChatTextMessage(roomId, playerId, text)` 함수 export — messageId=-1로 설정

### components/game/QuickChat.tsx
- Props에 `onSendText?: (text: string) => void` 추가
- `inputText` state + 턴 변경 시 리셋 (기존 useEffect 확장)
- `handleTextSend` 콜백 — 기존 cooldownUntilRef/chatCountRef 공유
- 프리셋 버튼 뒤에 `<input maxLength={10}>` + 전송 버튼(`>`) 렌더링
- Enter 키로도 전송 가능

### components/game/GameBoard.tsx
- `handleChatTextSend` 콜백 추가 (낙관적 UI: `addChatLog(playerId, text)`)
- `subscribeToChatMessages` 콜백에서 `msg.messageId === -1 ? msg.text : CHAT_MESSAGES[msg.messageId]` 분기 처리
- `<QuickChat>` 에 `onSendText={handleChatTextSend}` prop 전달

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Linter reverted firebase.client.ts after Task 1 commit**

- **Found during:** Task 2 execution
- **Issue:** After committing Task 1, a linter/auto-format tool reverted `firebase.client.ts` (commit 46b724f), removing the `text?` field and `sendChatTextMessage` function
- **Fix:** Re-applied both changes in Task 2's commit alongside QuickChat.tsx changes (commit e22f808)
- **Files modified:** lib/firebase.client.ts
- **Commit:** e22f808

## Verification

- `npx tsc --noEmit`: pre-existing test file error only (filter.test.ts unrelated to this task)
- `npm run build`: succeeded — all 14 pages generated, no new errors

## Success Criteria Met

- [x] 프리셋 버튼 옆에 텍스트 입력 필드가 보인다 (w-20 rounded-full input)
- [x] 10자 초과 입력이 불가능하다 (maxLength=10)
- [x] 자유 텍스트 전송 시 상대방에게 말풍선/로그로 표시된다 (Firebase RTDB 구독)
- [x] 프리셋 + 자유입력 합산 턴당 3회 제한이 동작한다 (chatCountRef 공유)
- [x] 1.5초 쿨다운이 자유입력에도 적용된다 (cooldownUntilRef 공유)
