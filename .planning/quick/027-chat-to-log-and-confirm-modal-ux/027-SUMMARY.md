---
phase: quick-027
plan: 01
subsystem: game-ux
tags: [quickchat, event-log, confirm-modal, speech-bubble, UX]
requires: [quick-017, quick-024]
provides: [chat-in-event-log, descriptive-confirm-buttons]
affects: []
tech-stack:
  added: []
  patterns: [chat-log-merge, timestamp-sort-key]
key-files:
  created: []
  modified:
    - components/game/GameBoard.tsx
    - components/game/EventLog.tsx
    - components/game/PlayerArea.tsx
    - components/game/ActionPanel.tsx
    - components/game/ConfirmModal.tsx
decisions:
  - "Chat logs use client-side timestamp + index-based sortKey for interleaving with game logs"
  - "Chat entries are appended after all game entries (chronologically after) since there is no shared clock"
  - "ChatLogEntry uses cyan color (text-cyan-400) and MessageCircle icon to distinguish from game events"
  - "ConfirmModal accepts confirmIcon as React.ElementType optional prop - backward compatible"
metrics:
  duration: "~6 minutes"
  completed: "2026-02-24"
---

# Phase quick-027: Chat to Log and Confirm Modal UX Summary

**One-liner:** Moved quickchat from player speech bubbles to timestamped event log entries; added per-action icons and descriptive labels to confirm modal buttons.

## What Was Built

### Task 1: Quickchat integrated into Event Log, speech bubbles removed

**GameBoard.tsx:**
- Replaced `chatBubbles Map` + `chatTimersRef` + `showChatBubble` with `chatLogs` state array
- `addChatLog(senderPlayerId, message)` helper records `{ playerName, message, timestamp }`, max 50 entries
- `handleChatSend` and `subscribeToChatMessages` callback both call `addChatLog`
- Removed `ChatBubble` import and my-player speech bubble render block
- Removed `chatBubble={chatBubbles.get(player.id)}` from `PlayerArea` calls
- Mobile compact log now merges game log + chat logs by sortKey, shows latest 3, chat in cyan

**EventLog.tsx:**
- Added `ChatLogItem` interface and `chatLogs?: ChatLogItem[]` prop
- `ChatLogEntry` sub-component: `MessageCircle` icon, `text-cyan-400` color, `bg-cyan-400/10` background when latest
- Merge logic for both structured and plain log modes: game entries get index-based sortKey, chat entries get `maxGame + (timestamp - minChat) / 1e13` sortKey
- `useEffect` deps include `chatLogs` for auto-scroll

**PlayerArea.tsx:**
- Removed `chatBubble` prop from interface
- Removed `ChatBubble` import
- Removed the `absolute -top-9` speech bubble render block

### Task 2: Confirm modal button with icons and descriptive labels

**ConfirmModal.tsx:**
- Added optional `confirmIcon?: React.ElementType` prop
- Confirm button renders `<ConfirmIcon size={14} strokeWidth={2.5} />` inline before label text
- Button uses `flex items-center justify-center gap-1.5` for icon + text layout

**ActionPanel.tsx:**
- `getConfirmInfo` now returns `icon` field per action:
  - `income` -> Coins / '소득 받기'
  - `foreignAid` -> Handshake / '원조 받기'
  - `tax` -> Crown / '세금 징수하기'
  - `exchange` -> Repeat / '카드 교환하기'
  - `steal` -> Anchor / '{name} 갈취하기'
  - `assassinate` -> Crosshair / '{name} 암살하기'
  - `coup` -> Zap / '{name} 쿠데타'
- `confirmIcon={confirmInfo.icon}` passed to `ConfirmModal`

## Decisions Made

| Decision | Rationale |
|---|---|
| Append chat after game logs by default | No shared clock between Firebase RTDB messages and game log index; safest approach |
| Max 50 chat log entries | Prevents unbounded memory growth; UI only shows recent entries anyway |
| Keep `ChatBubble.tsx` file | File not deleted since it may be reused elsewhere; just unused by GameBoard/PlayerArea now |
| Optional `confirmIcon` prop | Backward-compatible change; existing ConfirmModal callers outside ActionPanel unaffected |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: Only pre-existing test file error (filter.test.ts), no errors in changed files
- `npm run build`: Success
- `grep chatBubble components/game/GameBoard.tsx components/game/PlayerArea.tsx`: No results
- `ConfirmModal.tsx`: confirmIcon prop present
