---
phase: quick-052
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - lib/game/engine.ts
  - lib/game/filter.ts
  - app/api/game/timeout/route.ts
  - components/game/ActionPanel.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "턴 액션 선택 시 45초 카운트다운 타이머가 표시된다"
    - "45초 내에 액션을 선택하지 않으면 자동으로 소득이 실행된다"
    - "10코인 이상인 플레이어가 타임아웃되면 랜덤 생존 상대에게 자동 쿠데타가 실행된다"
    - "기존 30초 응답 타임아웃은 변경 없이 동작한다"
  artifacts:
    - path: "lib/game/types.ts"
      provides: "actionDeadline field on GameState and FilteredGameState"
      contains: "actionDeadline"
    - path: "lib/game/engine.ts"
      provides: "resolveActionTimeout function + actionDeadline in nextTurn/initGame"
    - path: "components/game/ActionPanel.tsx"
      provides: "Countdown timer UI during action phase"
  key_links:
    - from: "lib/game/engine.ts nextTurn/initGame"
      to: "GameState.actionDeadline"
      via: "Date.now() + 45000"
      pattern: "actionDeadline.*Date\\.now\\(\\).*45000"
    - from: "lib/game/engine.ts resolveActionTimeout"
      to: "executeAction (income or coup)"
      via: "auto-action on deadline exceeded"
    - from: "app/api/game/timeout/route.ts"
      to: "resolveActionTimeout"
      via: "import and call alongside resolveTimeouts"
    - from: "components/game/GameBoard.tsx timeout polling"
      to: "actionDeadline"
      via: "useEffect polling checks actionDeadline too"
---

<objective>
Add 45-second timeout for turn action selection with auto-income (or auto-coup if 10+ coins).

Purpose: Prevent games from stalling when a player is AFK during their turn.
Output: Server-enforced action timeout with client countdown timer UI.
</objective>

<context>
@lib/game/types.ts
@lib/game/engine.ts (lines 60-130 for initGame/nextTurn, lines 689-729 for resolveTimeouts)
@lib/game/filter.ts
@app/api/game/timeout/route.ts
@components/game/ActionPanel.tsx
@components/game/GameBoard.tsx (lines 20-100 for WaitingResponseIndicator, lines 257-309 for timeout polling, lines 630-640 for ActionPanel render)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Server-side action timeout (types + engine + API)</name>
  <files>
    lib/game/types.ts
    lib/game/engine.ts
    lib/game/filter.ts
    app/api/game/timeout/route.ts
  </files>
  <action>
    1. **types.ts** - Add `actionDeadline?: number` (Unix ms timestamp) to:
       - `GameState` interface (after `pendingAction` field)
       - `FilteredGameState` interface (same position)
       - This is a top-level GameState field, NOT inside PendingAction (because there's no pendingAction during action phase)

    2. **engine.ts** - Set actionDeadline in `nextTurn()` and `initGame()`:
       - In `nextTurn()` (line ~129): add `actionDeadline: Date.now() + 45000` to the returned state object
       - In `initGame()` (line ~65-77): add `actionDeadline: Date.now() + 45000` to the initial GameState

    3. **engine.ts** - Create `resolveActionTimeout(state: GameState): GameState` function (after resolveTimeouts):
       - Guard: return state unchanged if `state.phase !== 'action'` or `!state.actionDeadline` or `Date.now() <= state.actionDeadline`
       - Get current turn player via `getPlayer(state, state.currentTurnId)`
       - If player has `coins >= 10`: auto-coup on random surviving opponent
         - Pick random target: `const alive = getAlivePlayers(state).filter(p => p.id !== state.currentTurnId)`, then `alive[Math.floor(Math.random() * alive.length)]`
         - Add log: `${player.name}이(가) 시간 초과로 자동 쿠데타를 실행합니다` (use addLog)
         - Call `executeAction(state, state.currentTurnId, 'coup', targetId)` and return result
       - Else: auto-income
         - Add log: `${player.name}이(가) 시간 초과로 자동 소득을 받습니다` (use addLog)
         - Call `executeAction(state, state.currentTurnId, 'income')` and return result
       - Export the function

    4. **filter.ts** - Pass through `actionDeadline` in `filterStateForPlayer()`:
       - In the return object (line ~68), add: `...(state.actionDeadline !== undefined && { actionDeadline: state.actionDeadline })`

    5. **timeout/route.ts** - Call resolveActionTimeout alongside resolveTimeouts:
       - Import `resolveActionTimeout` from engine
       - After `const resolved = resolveTimeouts(original)`, add: `const resolved2 = resolveActionTimeout(resolved)`
       - Change the comparison to check `resolved2 === original` (if no change, skip DB write)
       - Pass `resolved2` to `updateRoomWithViews` and `buildViews`

    IMPORTANT: Do NOT modify the existing `resolveTimeouts()` function or its behavior. The 30-second response timeout must remain unchanged.
  </action>
  <verify>
    - `npx tsc --noEmit` passes with no type errors
    - Grep for `actionDeadline` appears in types.ts (GameState + FilteredGameState), engine.ts (nextTurn + initGame + resolveActionTimeout), filter.ts, timeout/route.ts
    - Grep for `resolveActionTimeout` appears in engine.ts and timeout/route.ts
  </verify>
  <done>
    - GameState has actionDeadline field set to Date.now() + 45000 on every turn start
    - resolveActionTimeout auto-executes income (or coup for 10+ coins) when deadline exceeded
    - Timeout API endpoint calls both resolveTimeouts and resolveActionTimeout
    - FilteredGameState passes actionDeadline through to client
  </done>
</task>

<task type="auto">
  <name>Task 2: Client-side countdown timer + timeout polling for action phase</name>
  <files>
    components/game/ActionPanel.tsx
    components/game/GameBoard.tsx
  </files>
  <action>
    1. **ActionPanel.tsx** - Add countdown timer bar above action buttons:
       - Add props: Accept `actionDeadline?: number` in Props interface (passed from parent)
       - Add timer state with useEffect (same pattern as WaitingResponseIndicator lines 22-30):
         ```
         const [remainingMs, setRemainingMs] = useState(45000);
         useEffect(() => {
           if (!actionDeadline) return;
           const update = () => setRemainingMs(Math.max(0, actionDeadline - Date.now()));
           update();
           const interval = setInterval(update, 200);
           return () => clearInterval(interval);
         }, [actionDeadline]);
         ```
       - Import `useEffect` from react (already has useState)
       - Calculate display values: `remainingSeconds = Math.ceil(remainingMs / 1000)`, `progress = Math.max(0, remainingMs / 45000)`
       - Color logic: `isCritical = remainingSeconds <= 5`, `isUrgent = remainingSeconds <= 15`
         - Critical: red-500, Urgent: amber-500, Normal: emerald-500
       - Render timer bar at TOP of the component (before action buttons), inside the existing `<div className="space-y-3">`:
         ```jsx
         {actionDeadline && (
           <div className="space-y-1">
             <div className="flex items-center justify-between text-xs">
               <span className="text-text-muted">남은 시간</span>
               <span className={`font-bold tabular-nums ${isCritical ? 'text-red-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-text-muted'}`}>
                 {remainingSeconds}s
               </span>
             </div>
             <div className="w-full h-1 bg-bg-surface rounded-full overflow-hidden">
               <div
                 className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                 style={{ width: `${progress * 100}%` }}
               />
             </div>
           </div>
         )}
         ```

    2. **GameBoard.tsx** - Pass actionDeadline to ActionPanel:
       - Where ActionPanel is rendered (~line 636), add prop: `actionDeadline={state.actionDeadline}`
       - ActionPanel render is inside `{isMyTurn && state.phase === 'action' && (...)}` so it only shows on my turn

    3. **GameBoard.tsx** - Extend timeout polling to cover action phase:
       - The existing useEffect (lines 284-309) only fires for awaiting_response/awaiting_block_response phases
       - Extend the condition to ALSO fire when `state.phase === 'action'` and `state.actionDeadline` exists
       - Specifically in the useEffect:
         - Change `isAwaitingPhase` logic to: `const isAwaitingPhase = state.phase === 'awaiting_response' || state.phase === 'awaiting_block_response'`
         - Add: `const isActionPhase = state.phase === 'action' && !!state.actionDeadline`
         - Change `deadline` to: `const deadline = isActionPhase ? state.actionDeadline : state.pendingAction?.responseDeadline`
         - Change the guard: `if ((!isAwaitingPhase && !isActionPhase) || !deadline || timeoutRequestedRef.current) return;`
         - Add `state.actionDeadline` to the useEffect dependency array
       - This reuses the existing `fireTimeout()` callback which POSTs to /api/game/timeout

    NOTE: The `state.actionDeadline` field comes from FilteredGameState which we updated in Task 1. TypeScript may initially show errors until both tasks are complete. Ensure the ActionPanel Props interface adds `actionDeadline?: number`.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run build` succeeds
    - ActionPanel.tsx contains countdown timer with 45-second progress bar
    - GameBoard.tsx passes actionDeadline prop to ActionPanel
    - GameBoard.tsx timeout polling useEffect covers action phase
  </verify>
  <done>
    - Player sees 45-second countdown timer above action buttons during their turn
    - Timer changes color: green -> amber (15s) -> red+pulse (5s)
    - Client polls /api/game/timeout after deadline passes (same as response timeout pattern)
    - Auto-income or auto-coup executes server-side when timeout fires
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - no type errors
2. `npm run build` - successful build
3. Manual test: Start a game, observe 45s countdown timer on action panel
4. Manual test: Let timer expire, verify auto-income executes (coin +1, turn advances)
5. Manual test: Give player 10+ coins (via repeated income), let timer expire, verify auto-coup on random opponent
6. Manual test: Verify existing 30s response timeout still works for challenge/block phases
</verification>

<success_criteria>
- Turn action has 45-second server-enforced timeout with client countdown UI
- Timeout auto-executes income for normal players, coup for 10+ coin players
- Existing 30-second response timeout unchanged
- No type errors, build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/052-turn-action-timeout-auto-income/052-SUMMARY.md`
</output>
