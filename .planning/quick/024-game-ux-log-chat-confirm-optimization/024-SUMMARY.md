---
phase: quick-024
plan: 01
subsystem: game-ux
tags: [eventlog, quickchat, confirm-modal, optimistic-ui]
completed: 2026-02-23
duration: ~5min
tech-stack:
  added: []
  patterns: [optimistic-ui, turn-based-rate-limit]
key-files:
  created:
    - components/game/ConfirmModal.tsx
  modified:
    - lib/game/types.ts
    - lib/game/engine.ts
    - components/game/EventLog.tsx
    - components/game/QuickChat.tsx
    - components/game/GameBoard.tsx
    - components/game/ActionPanel.tsx
    - lib/firebase.client.ts
decisions:
  - id: d024-1
    decision: "Use Date.now() as startAt for chat subscription (no past messages)"
    reason: "Prevents duplicate display of old messages on subscribe"
  - id: d024-2
    decision: "Optimistic UI filters own messages from subscription"
    reason: "Own message shown instantly via onSend callback, subscription skips own playerId"
  - id: d024-3
    decision: "Confirm modal for coup/assassinate only (not steal/others)"
    reason: "Only cost-based targeted actions need accidental click prevention"
---

# Quick-024: Game UX - Log, Chat, Confirm Optimization Summary

Turn start log separators with gold color, optimistic quick chat with 3-per-turn limit, and confirm modal for coup/assassinate cost actions.

## Task 1: Turn Start Log + Visual Separator
- Added `turn_start` to `LogEntryType` union
- `nextTurn()` in engine.ts now inserts "--- {name}의 턴 ---" log before turn transition
- EventLog renders turn_start entries with gold color, Zap icon, and `border-t` separator line
- Fallback getLogColor handles '턴' keyword

## Task 2: Quick Chat Bug Fix + Optimistic UI + 3-per-turn Limit
- Fixed `subscribeToChatMessages`: changed `startAt(Date.now() - 10_000)` to `startAt(Date.now())` to prevent past message flooding on subscribe
- Optimistic UI: QuickChat calls `onSend` callback immediately; GameBoard shows own bubble without Firebase roundtrip
- Subscription filters `msg.playerId === playerId` to prevent duplicate own messages
- Extracted `showChatBubble` helper in GameBoard for shared bubble display logic
- Added `turnId` prop to QuickChat: chat count resets on turn change
- Added `maxChats` prop (default 3): buttons disable after limit, shows "채팅 3회 제한" message

## Task 3: Action Confirm Modal (Coup/Assassinate)
- Created `ConfirmModal.tsx`: glass-panel overlay with title, message, confirm/cancel buttons
- ActionPanel shows confirm modal for coup (7 coin) and assassinate (3 coin) after target selection
- Guess mode coup also triggers confirm after character selection
- Cancel returns to target selection mode (does not reset entirely)
- Non-cost actions (income, foreignAid, tax, steal, exchange) fire immediately as before

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | e95038e | feat(quick-024): add turn start log with visual separator |
| 2 | 459ae67 | feat(quick-024): optimistic chat UI + 3-per-turn limit + subscription fix |
| 3 | f36e83b | feat(quick-024): add confirm modal for coup/assassinate actions |
