---
phase: quick
plan: "055"
subsystem: game-ui
tags: [timer, ux, action-panel]
completed: 2026-02-24
duration: "2m"
key-files:
  modified:
    - components/game/ActionPanel.tsx
decisions: []
---

# Quick 055: Timer Bar Auto-Income Info Text Summary

ActionPanel 턴 타이머 바 아래에 시간 초과 시 자동 행동 안내 텍스트를 추가했다.

## What Was Done

### Task 1: 타이머 바 아래 자동 행동 안내 텍스트 추가
- **Commit:** 8e12295
- 기존 `mustCoup` 변수(`me.coins >= 10`) 활용
- mustCoup=true: "시간 초과 시 자동 쿠데타" 표시
- mustCoup=false: "시간 초과 시 자동 소득" 표시
- `text-xs text-text-muted text-center mt-1` 스타일로 비간섭 안내

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` 통과
- ActionPanel 타이머 바 블록 내 "시간 초과" 안내 텍스트 존재 확인
- mustCoup 조건 분기 확인
