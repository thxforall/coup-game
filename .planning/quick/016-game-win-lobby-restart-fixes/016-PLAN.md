---
phase: quick-016
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/action/route.ts
  - app/api/game/restart/route.ts
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "게임 우승자가 결정되면 더 이상 턴이 진행되지 않는다"
    - "재시작 버튼을 누르면 대기실(WaitingRoom)로 돌아간다"
    - "게임오버 후 로비로 돌아가면 새 방을 만들 수 있다"
  artifacts:
    - path: "app/api/game/action/route.ts"
      provides: "game_over phase guard on all actions"
    - path: "app/api/game/restart/route.ts"
      provides: "Restart returns to waiting phase instead of new game"
    - path: "components/game/GameBoard.tsx"
      provides: "Game over screen with working restart and lobby buttons"
  key_links:
    - from: "app/api/game/action/route.ts"
      to: "engine game_over phase"
      via: "early return guard before processing any action"
      pattern: "phase.*game_over"
    - from: "app/api/game/restart/route.ts"
      to: "WaitingRoom component"
      via: "sets phase to waiting instead of calling initGame"
      pattern: "phase.*waiting"
---

<objective>
Fix three game flow bugs: (1) prevent actions after game_over, (2) restart goes to WaitingRoom instead of starting new game, (3) ensure lobby return and new room creation works properly.

Purpose: Core game loop must terminate correctly on win and restart cleanly.
Output: Patched API routes and GameBoard component.
</objective>

<context>
@app/api/game/action/route.ts
@app/api/game/restart/route.ts
@components/game/GameBoard.tsx
@app/game/[roomId]/page.tsx
@lib/game/engine.ts
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Guard game_over phase in action route + fix timeout polling</name>
  <files>app/api/game/action/route.ts, components/game/GameBoard.tsx</files>
  <action>
1. In `app/api/game/action/route.ts`:
   - Add an early return guard AFTER `resolveTimeouts` and BEFORE the switch statement: if `state.phase === 'game_over'`, return 400 error `{ error: '게임이 종료되었습니다' }`.
   - This prevents any action processing after a winner is determined (including edge cases where timeout resolution triggers game_over).

2. In `components/game/GameBoard.tsx`:
   - In the timeout polling `useEffect` (around line 207), add `state.phase === 'game_over'` to the early return conditions. The timeout polling should NOT fire when the game is already over. Specifically, update the `isAwaitingPhase` check or add a separate guard:
     ```
     if (state.phase === 'game_over') return;
     ```
     at the top of the useEffect body (before the isAwaitingPhase check).
  </action>
  <verify>
    - `npm run build` passes without errors
    - Read the updated files to confirm guards are in place
  </verify>
  <done>
    - action/route.ts returns 400 when phase is game_over
    - GameBoard timeout polling stops when game is over
  </done>
</task>

<task type="auto">
  <name>Task 2: Restart goes to WaitingRoom (waiting phase) instead of starting new game</name>
  <files>app/api/game/restart/route.ts</files>
  <action>
Modify `app/api/game/restart/route.ts` to reset to waiting phase instead of calling `initGame()`:

1. Instead of creating a new game with `initGame(allPlayers, state.gameMode)`, build a waiting-phase state:
   ```ts
   const newState: GameState = {
     players: state.players.map((p) => ({
       id: p.id,
       name: p.name,
       coins: 2,
       cards: [],
       isAlive: true,
       isReady: false,
     })),
     currentTurnId: state.players[0].id,
     phase: 'waiting',
     deck: [],
     pendingAction: null,
     log: ['게임이 재시작되었습니다. 준비를 눌러주세요!'],
     gameMode: state.gameMode,
   };
   ```
   This resets all players to the WaitingRoom with isReady: false, so the host must wait for everyone to ready up again before starting.

2. Update the imports: remove `initGame` import since it's no longer used. Add `GameState` to the imports from types.

3. The views generation stays the same (filterStateForPlayer will handle waiting phase correctly).

4. Keep existing validations (host-only, force flag for mid-game restart) as-is.
  </action>
  <verify>
    - `npm run build` passes
    - Read the file to confirm phase is set to 'waiting' and initGame is not called
  </verify>
  <done>
    - Restart API sets phase to 'waiting' with all players having isReady: false
    - Players see WaitingRoom after restart, not a new game
    - Host can start game again after all players ready up
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify lobby return and new room creation flow</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
Verify the existing lobby return flow in GameBoard.tsx game_over screen:

1. The "로비로 돌아가기" link (around line 321-327) uses `<a href="/">` with `onClick={() => clearActiveRoom()}`. This correctly clears the activeRoom from localStorage before navigating to lobby.

2. In the lobby page (app/page.tsx), the useEffect checks `getActiveRoom()` -- if null (cleared), it shows the lobby form. The user can then create a new room normally.

3. This flow should already work correctly. However, verify by reading the code that:
   - `clearActiveRoom()` is called before navigation
   - The lobby page doesn't have any stale state issues

If the flow is already correct, no changes needed for this task. The primary fixes are in Tasks 1 and 2.

NOTE: If there's an issue where the `<a href="/">` tag doesn't trigger the onClick reliably (e.g., navigation happens before clearActiveRoom completes), convert it to a button with router.push:
   ```tsx
   <button
     className="btn-primary inline-block px-8 py-3 text-center w-full"
     onClick={() => { clearActiveRoom(); window.location.href = '/'; }}
   >
     로비로 돌아가기
   </button>
   ```
   Using `window.location.href` ensures full page reload, clearing any stale client state.
  </action>
  <verify>
    - `npm run build` passes
    - Read GameBoard.tsx to confirm lobby return button properly clears state
  </verify>
  <done>
    - Lobby return button clears activeRoom and navigates to lobby
    - User can create new room from lobby after returning from game
  </done>
</task>

</tasks>

<verification>
- `npm run build` completes without errors
- `npm test` passes (if tests exist for engine)
- Manual flow: game over -> restart -> shows WaitingRoom -> ready up -> start new game
- Manual flow: game over -> lobby return -> create new room works
- No actions can be processed after game_over phase
</verification>

<success_criteria>
1. After a winner is determined (phase: game_over), no further turns or actions are processed
2. Restart button takes all players back to WaitingRoom with ready status reset
3. Lobby return from game_over screen allows creating new rooms
4. Build passes with no type errors
</success_criteria>

<output>
After completion, create `.planning/quick/016-game-win-lobby-restart-fixes/016-SUMMARY.md`
</output>
