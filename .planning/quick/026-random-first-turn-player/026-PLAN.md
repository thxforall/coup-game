---
phase: quick
plan: 026
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/engine.ts
autonomous: true

must_haves:
  truths:
    - "Game start picks a random player for the first turn, not always the host"
    - "Turn order proceeds normally after the random first player"
  artifacts:
    - path: "lib/game/engine.ts"
      provides: "Random first turn selection in initGame"
      contains: "Math.random"
  key_links:
    - from: "lib/game/engine.ts#initGame"
      to: "gamePlayers random index"
      via: "Math.random for currentTurnId assignment"
      pattern: "gamePlayers\\[.*Math"
---

<objective>
Randomize first turn player on game start.

Purpose: Currently the host (first player in array) always goes first, giving them an unfair advantage. Picking a random starting player makes it fair.
Output: Updated `initGame` in `lib/game/engine.ts`
</objective>

<context>
@lib/game/engine.ts — initGame function (line 43-67)

The `initGame` function currently sets `currentTurnId: gamePlayers[0].id` which always gives the first turn to the host. Change this to pick a random player from the `gamePlayers` array.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Randomize first turn player in initGame</name>
  <files>lib/game/engine.ts</files>
  <action>
In `initGame` (line 60), replace:
```ts
currentTurnId: gamePlayers[0].id,
```
with:
```ts
currentTurnId: gamePlayers[Math.floor(Math.random() * gamePlayers.length)].id,
```

Also update the log message on line 64 to announce who goes first. After computing the random starter, include a log entry like `${starterName}이(가) 첫 번째 턴입니다`. To do this cleanly:

1. Compute the random index before the return statement:
   ```ts
   const firstPlayerIndex = Math.floor(Math.random() * gamePlayers.length);
   const firstPlayer = gamePlayers[firstPlayerIndex];
   ```

2. Use `firstPlayer.id` for `currentTurnId`

3. Add the first-turn announcement to the log array (after the game start message):
   ```ts
   log: [
     mode === 'guess' ? '게임이 시작되었습니다! (추측 모드)' : '게임이 시작되었습니다!',
     `--- ${firstPlayer.name}의 턴 ---`,
   ],
   ```
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors.
Run `npm run build` to confirm build succeeds.
  </verify>
  <done>
initGame picks a random player for currentTurnId instead of always gamePlayers[0]. Log announces who goes first.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- `npm run build` succeeds
- Code review: `currentTurnId` no longer hardcoded to `gamePlayers[0].id`
</verification>

<success_criteria>
- initGame uses Math.random to select first turn player
- First turn log message shows the randomly selected player's name
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/026-random-first-turn-player/026-SUMMARY.md`
</output>
