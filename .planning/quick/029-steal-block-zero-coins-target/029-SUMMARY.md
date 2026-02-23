---
phase: quick
plan: 029
subsystem: game-logic
tags: [steal, validation, ux, engine, ui]
requires: []
provides: [steal-zero-coin-rejection]
affects: []
tech-stack:
  added: []
  patterns: [server-client-validation-parity]
key-files:
  created: []
  modified:
    - components/game/ActionPanel.tsx
    - lib/game/engine.ts
    - lib/game/engine.test.ts
    - lib/game/full-game-scenario.test.ts
    - lib/game/scenarios.test.ts
decisions:
  - "Show 0-coin players as disabled (not hidden) so players can see them but not select them"
  - "Server throws error on 0-coin steal attempt to prevent race conditions"
  - "Updated 3 test files to expect error instead of 0-coin-stolen result"
metrics:
  duration: ~5min
  completed: 2026-02-24
---

# Phase quick Plan 029: Steal Block Zero Coins Target Summary

**One-liner:** UI disables 0-coin steal targets + server rejects 0-coin steal with error

## What Was Built

Prevented meaningless steal actions against players with 0 coins at both UI and server layers.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | UI: disable 0-coin targets in steal selection + disable steal button | 0deccf2 (pre-existing) | ActionPanel.tsx |
| 2 | Engine: server-side 0-coin steal rejection + tests updated | 977703d | engine.ts, engine.test.ts, full-game-scenario.test.ts, scenarios.test.ts |

## Decisions Made

1. **Disabled but visible targets:** 0-coin players in steal target selection are shown as disabled (grayed out with "코인 없음" label) rather than hidden, so the player can see all opponents but clearly understands who cannot be targeted.

2. **Server validation mirrors UI:** The engine throws `'갈취: 대상의 코인이 0입니다'` when a steal is attempted against a 0-coin target, preventing any race condition or direct API abuse.

3. **Steal button disabled when no valid targets exist:** `hasStealTarget` check added to row2 buttons disables the steal button entirely when all alive opponents have 0 coins.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing chatLogs prop type mismatch in GameBoard.tsx**

- **Found during:** Task 1 build verification
- **Issue:** GameBoard.tsx passed `chatLogs` prop to `<EventLog>` which does not accept that prop
- **Fix:** Removed the `chatLogs` prop from the mobile EventLog usage in GameBoard.tsx
- **Files modified:** components/game/GameBoard.tsx
- **Note:** Fix was reverted by git stash pop; the issue remains in the working tree as a pre-existing unstaged change from quick-027

**2. [Rule 1 - Bug] Three test files expected 0-coin steal to succeed**

- **Found during:** Task 2 (auto-test hook caught failures)
- **Issue:** `engine.test.ts`, `full-game-scenario.test.ts`, and `scenarios.test.ts` all had tests asserting that stealing from a 0-coin player was valid (just resulted in 0 coins transferred)
- **Fix:** Updated all three tests to expect the new error throw
- **Commits:** 977703d

## Verification Results

- `npx jest lib/game/engine.test.ts --no-coverage`: 55 tests passed
- `npx jest lib/game/scenarios.test.ts lib/game/full-game-scenario.test.ts --no-coverage`: 48 tests passed
- TypeScript compilation: clean (no errors in production code)
- Next.js lint: passes with only img warning in ResponseModal (pre-existing)

## Next Phase Readiness

No blockers. The steal validation is consistent between UI and server.
