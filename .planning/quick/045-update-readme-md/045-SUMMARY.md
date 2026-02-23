---
phase: quick-045
plan: 01
subsystem: documentation
tags: [readme, release-notes, v0.5.0]

dependency-graph:
  requires: [quick-039, quick-040, quick-041, quick-042, quick-043, quick-044]
  provides: [updated-readme-v0.5.0]
  affects: []

key-files:
  modified:
    - README.md

metrics:
  duration: ~2min
  completed: 2026-02-24
---

# Quick-045: README.md v0.5.0 Update Summary

**One-liner:** README.md updated with v0.5.0 features (room browser, leave, player colors, bottom sheet, free-text quickchat, volume slider) and corrected project structure.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | README.md 전체 업데이트 | 463b929 | 주요 기능/구조/릴리스 노트 업데이트 |

## Changes Applied

### Feature Section Updates
- Replaced "추방 재접속 차단" with "추방 플레이어 재입장 허용"
- Added: room list browser, leave room, mandatory coup highlight
- Added: player colors, TargetSelectModal, bottom sheet modals, free-text quickchat, ready button colors
- Added: BGM volume slider

### Project Structure Updates
- API routes: `list/`, `leave/`, `delete/`
- Components: `TargetSelectModal.tsx`, `ConfirmModal.tsx`, `ChatBubble.tsx`
- Lib: `player-colors.ts`
- Public: `bg/`, `profile/`
- Fixed `join/` description from "추방 차단 포함" to "재입장 허용"

### Release Notes
- Added v0.5.0 row (2026-02-24)

## Deviations from Plan

None - plan executed exactly as written.
