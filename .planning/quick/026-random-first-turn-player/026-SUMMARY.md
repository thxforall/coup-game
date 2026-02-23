---
phase: quick
plan: 026
subsystem: game-engine
tags: [fairness, randomization, initGame]
completed: 2026-02-23
duration: ~2min
key-files:
  modified:
    - lib/game/engine.ts
    - lib/game/engine.test.ts
decisions:
  - id: random-first-turn
    decision: "Use Math.random index into gamePlayers array for first turn selection"
    reason: "Simplest approach, no external dependency needed"
---

# Quick 026: Random First Turn Player Summary

Random first turn selection using Math.floor(Math.random() * gamePlayers.length) instead of hardcoded gamePlayers[0].

## What Changed

### lib/game/engine.ts - initGame function
- Compute `firstPlayerIndex` via `Math.floor(Math.random() * gamePlayers.length)`
- Use `firstPlayer.id` for `currentTurnId` instead of `gamePlayers[0].id`
- Add turn announcement log entry: `--- ${firstPlayer.name}의 턴 ---`

### lib/game/engine.test.ts
- Updated `initGame: 올바른 초기 상태` test to accept any valid player ID for `currentTurnId`
- Updated log length expectation from 1 to 2 (game start + turn announcement)
- Added pattern match for turn announcement format

## Commits

| Hash | Message |
|------|---------|
| d6bbc6e | feat(quick-026): randomize first turn player in initGame |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing test that assumed deterministic first player**
- Found during: Task 1 verification
- Issue: Test `initGame: 올바른 초기 상태` hardcoded `expect(state.currentTurnId).toBe('a')` and `expect(state.log).toHaveLength(1)`
- Fix: Changed to `expect(['a', 'b']).toContain(state.currentTurnId)` and updated log length/pattern assertions
- Files modified: lib/game/engine.test.ts
- Commit: d6bbc6e

## Verification

- All 55 engine tests pass
- TypeScript compilation clean (pre-existing filter.test.ts warning only)
- Next.js build succeeds
