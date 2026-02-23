---
phase: quick
plan: "011"
type: execute
wave: 1
depends_on: []
files_modified:
  - app/game/[roomId]/page.tsx
  - components/game/GameBoard.tsx
  - components/game/PlayerArea.tsx
  - components/game/WaitingRoom.tsx
autonomous: true

must_haves:
  truths:
    - "Each player sees a green dot next to online players' names"
    - "When a player closes their tab, their dot turns gray for others within seconds"
    - "Presence dots appear in both WaitingRoom and GameBoard views"
  artifacts:
    - path: "app/game/[roomId]/page.tsx"
      provides: "Presence setup + subscription wiring"
      contains: "setupPresence"
    - path: "components/game/PlayerArea.tsx"
      provides: "Green/gray presence dot next to player name"
      contains: "online"
    - path: "components/game/WaitingRoom.tsx"
      provides: "Green/gray presence dot next to player name"
      contains: "online"
  key_links:
    - from: "app/game/[roomId]/page.tsx"
      to: "lib/firebase.client.ts"
      via: "setupPresence + subscribeToPresence"
      pattern: "setupPresence|subscribeToPresence"
    - from: "app/game/[roomId]/page.tsx"
      to: "components/game/GameBoard.tsx"
      via: "presence prop"
      pattern: "presence="
---

<objective>
Add real-time player online/offline presence indicators (green/gray dots) next to each player's name in both WaitingRoom and GameBoard.

Purpose: Let players know who is actively connected, reducing confusion about disconnected players.
Output: Green dot = online, gray dot = offline, visible in all game phases.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/firebase.client.ts — Already has setupPresence(), subscribeToPresence(), PresenceMap type exported
@app/game/[roomId]/page.tsx — Game page, needs presence wiring
@components/game/GameBoard.tsx — Main game UI, passes player data to PlayerArea
@components/game/PlayerArea.tsx — Shows each opponent's name/cards/coins
@components/game/WaitingRoom.tsx — Pre-game lobby with player list
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire presence setup and subscription in GamePage</name>
  <files>app/game/[roomId]/page.tsx</files>
  <action>
    In GamePage component:

    1. Import `setupPresence`, `subscribeToPresence`, and `PresenceMap` from `@/lib/firebase.client`.

    2. Add state: `const [presence, setPresence] = useState<PresenceMap>({})`.

    3. Add a useEffect that calls `setupPresence(roomId, playerId)` when both roomId and playerId are available. Return the cleanup function. This registers the current player as online and sets onDisconnect handler.

    4. Add a separate useEffect that calls `subscribeToPresence(roomId, (p) => setPresence(p))` when roomId is available. Return the unsubscribe cleanup.

    5. Pass `presence` prop to both `<WaitingRoom>` and `<GameBoard>`:
       - `<WaitingRoom state={state} playerId={playerId} roomId={roomId} onStart={handleStart} presence={presence} />`
       - `<GameBoard state={state} playerId={playerId} roomId={roomId} onAction={sendAction} onRestart={handleRestart} presence={presence} />`
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit` passes (or only pre-existing errors).</verify>
  <done>GamePage sets up presence on mount, subscribes to presence changes, and passes presence map to child components.</done>
</task>

<task type="auto">
  <name>Task 2: Show presence dots in PlayerArea, GameBoard, and WaitingRoom</name>
  <files>
    components/game/GameBoard.tsx
    components/game/PlayerArea.tsx
    components/game/WaitingRoom.tsx
  </files>
  <action>
    **GameBoard.tsx:**
    1. Add `presence` to Props interface: `presence: PresenceMap` (import PresenceMap from `@/lib/firebase.client`).
    2. Pass `presence` to each `<PlayerArea>` in the opponents row:
       `<PlayerArea key={player.id} player={player} isCurrentTurn={...} online={!!presence[player.id]?.online} />`

    **PlayerArea.tsx:**
    1. Add `online?: boolean` to the Props interface.
    2. In the `PlayerBadge` sub-component, add `online?: boolean` prop.
    3. Inside PlayerBadge, next to the avatar div (right after it, before the name span), add a presence dot:
       ```tsx
       <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
         online ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
       }`} />
       ```
       This goes inside the existing `flex items-center gap-2` wrapper, between the avatar circle and the name span.
    4. Pass `online` from PlayerArea to PlayerBadge: `<PlayerBadge name={player.name} playerIndex={playerIndex} isCurrentTurn={isCurrentTurn} online={online} />`
    5. Accept `online` in the destructured props of both PlayerArea and PlayerBadge.

    **WaitingRoom.tsx:**
    1. Add `presence?: PresenceMap` to Props interface (import PresenceMap from `@/lib/firebase.client`).
    2. In each player `<li>`, between the avatar div and the name span, add a presence dot:
       ```tsx
       <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
         presence?.[p.id]?.online ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
       }`} />
       ```
       Place it right after the avatar `<div>` and before the `<span>` with the player name.
  </action>
  <verify>
    1. `npx tsc --noEmit` passes (or only pre-existing errors).
    2. `npm run build` succeeds.
    3. Visual check: open game in browser, see green dots next to connected players. Close a tab, see dot turn gray for others.
  </verify>
  <done>
    - Green dot (emerald-500 with glow) appears next to each online player's name in both WaitingRoom and GameBoard.
    - Gray dot (gray-500) appears for offline/disconnected players.
    - Dots update in real-time via Firebase presence subscription.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no new type errors
2. `npm run build` — build succeeds
3. Manual test: open two browser tabs in the same room, both show green dots. Close one tab, the other shows that player's dot turn gray within a few seconds.
</verification>

<success_criteria>
- Green/gray presence dots visible next to every player name in WaitingRoom and GameBoard
- Presence updates in real-time (within ~5 seconds of connect/disconnect)
- No TypeScript errors introduced
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/011-player-online-offline-presence/011-SUMMARY.md`
</output>
