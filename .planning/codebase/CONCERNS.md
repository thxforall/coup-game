# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Dual Firebase Integration:**
- Issue: Both REST API (`lib/firebase.ts`) and SDK client (`lib/firebase.client.ts`) implementations exist with potential inconsistency
- Files: `lib/firebase.ts`, `lib/firebase.client.ts`
- Impact: Risk of bugs if either implementation drifts from the other; maintenance burden for two parallel systems
- Fix approach: Consolidate to single pattern - use SDK for both server and client, or REST API exclusively. Server-side should use admin SDK if available.

**Dynamic Player ID Generation Without Verification:**
- Issue: `app/game/[roomId]/page.tsx` generates random player IDs from localStorage without server validation of uniqueness
- Files: `app/game/[roomId]/page.tsx` (lines 10-18)
- Impact: Two clients could get same ID; spoofing another player's identity is trivial
- Fix approach: Server should assign and validate player IDs during join. Move ID generation to API response.

**Weak Room ID Format:**
- Issue: Room IDs are 4 characters generated from limited charset (`app/api/game/create/route.ts` line 6)
- Files: `app/api/game/create/route.ts`
- Impact: Only ~33^4 = 1.2M possible room IDs; attackers could brute-force enumerate games
- Fix approach: Use longer random ID (6-8 chars) or UUID; consider rate limiting on room lookups

**Missing Error Handling in Client-Side Action:**
- Issue: `app/game/[roomId]/page.tsx` `sendAction()` (lines 55-64) doesn't handle fetch errors or HTTP error responses
- Files: `app/game/[roomId]/page.tsx`
- Impact: Silent failures when API calls fail; players won't know their action didn't apply; game state can diverge
- Fix approach: Check response.ok, parse error JSON, show toast error, retry logic

**No Validation on API Request Bodies:**
- Issue: Action routes (`app/api/game/action/route.ts`) trust action structure without validation
- Files: `app/api/game/action/route.ts`
- Impact: Malformed requests could cause runtime errors; wrong property names silently fail
- Fix approach: Use Zod/Yup schema validation before engine calls

## Known Bugs

**Assassinate Cost Not Refunded on Failed Challenge:**
- Symptoms: Player loses 3 coins for assassinate attempt, then their assassinate action is challenged and fails (they don't have Assassin card). Coins are NOT refunded (by design per comment on line 413 of engine.ts)
- Files: `lib/game/engine.ts` (lines 413, 266-288)
- Trigger: Assassinate action → opponent challenges → challenger wins
- Workaround: None; this is documented as "official rule" but worth confirming intent with game rules

**Race Condition in Room Subscription:**
- Symptoms: Player joins room, game starts immediately; new player's `subscribeToRoom()` listener might initialize after game already transitioned from 'waiting' phase
- Files: `app/game/[roomId]/page.tsx` (lines 33-53)
- Trigger: Multiple rapid game starts while room data is in flight
- Workaround: Initial fetch + subscription both fetch fresh state, but there's still a timing gap

**Firebase SDK Dynamic Require Pattern:**
- Symptoms: ESLint disabled for `require()` calls; could fail in edge cases
- Files: `lib/firebase.client.ts` (lines 7-10)
- Trigger: Tree-shaking or bundler optimization
- Workaround: Re-enable proper ES6 imports from firebase/database

## Security Considerations

**No Authentication/Authorization:**
- Risk: Any player can impersonate any other player by setting their localStorage ID
- Files: `app/game/[roomId]/page.tsx` (lines 10-18), all API endpoints
- Current mitigation: None; relies on implicit trust within a room
- Recommendations:
  - Add session tokens issued by server on room join
  - Validate token on every action
  - Consider OAuth/anonymous auth if multi-room play

**No Room Access Control:**
- Risk: Anyone with a room ID can join any room, read game state, send actions
- Files: `app/api/game/join/route.ts`, `lib/firebase.client.ts`
- Current mitigation: Just joining doesn't execute actions; only room members can act
- Recommendations:
  - Limit join list to X players max (already done: 6)
  - Add password/PIN to private rooms
  - Implement rate limiting on room lookups

**Client-Side Game State Exposed:**
- Risk: Game state including all card positions is sent to browser; player could cheat by reading opponent cards from state
- Files: `app/game/[roomId]/page.tsx`, `components/game/GameBoard.tsx`
- Current mitigation: Visual UI shows unrevealed cards, but full state is in React component state
- Recommendations:
  - Server should never send unrevealed opponent card details to client
  - Only send card count, names of revealed cards
  - Players should only see their own hand details

**Firebase Security Rules Not Visible:**
- Risk: No `.planning/` or documentation of Firebase Rules; cannot assess if database is properly protected
- Files: Firebase Rules (not in codebase)
- Current mitigation: Assumed to be default public access
- Recommendations:
  - Define and document Firebase Realtime Database rules
  - Restrict write access to authenticated users/room owners only
  - Validate all updates server-side

## Performance Bottlenecks

**Inefficient Game State Broadcasts:**
- Problem: Every action updates entire GameState object (145 line structure) in Firebase; all players download full state on every change
- Files: `lib/firebase.ts` (updateRoom), `app/game/[roomId]/page.tsx` (subscribeToRoom)
- Cause: Using PATCH on entire state object instead of targeted field updates
- Improvement path:
  - Update only changed fields (e.g., `players[0].coins` instead of full state)
  - Use Firebase multi-path updates or denormalize data
  - Could reduce bandwidth 5-10x for coin updates

**Unbounded Game Log:**
- Problem: `GameState.log` array grows indefinitely and is always synchronized
- Files: `lib/game/engine.ts` (log is pushed on every action), transmitted in every state update
- Cause: Game logs never trimmed; old entries remain until game ends
- Improvement path:
  - Trim log to last 20-30 entries
  - Archive old logs separately if needed
  - For 100+ turn games, log could be 10KB+

**No Memoization in Components:**
- Problem: `GameBoard.tsx` recalculates `me`, `others`, `isMyTurn`, etc. on every render without useMemo
- Files: `components/game/GameBoard.tsx` (lines 21-25), `components/game/PlayerArea.tsx`
- Cause: No memo wrapping; child components re-render even when props unchanged
- Improvement path: Wrap with useMemo, memoize child components

## Fragile Areas

**Complex Game Engine State Machine:**
- Files: `lib/game/engine.ts` (585 lines)
- Why fragile: Multiple game phases (action → awaiting_response → awaiting_block_response → lose_influence → exchange_select), nested state transitions, response tracking across players. One wrong check in `processResponse()` or `processBlockResponse()` cascades to invalid game state
- Safe modification:
  - Add invariant checks before/after each state change
  - Run full test suite after changes
  - Use TypeScript exhaustive checks for phase transitions
- Test coverage: Good - 758 lines of tests covering most scenarios, but missing:
  - Disconnection/reconnection edge cases
  - Concurrent action processing
  - Invalid phase transitions from corrupted state

**Firebase Sync Between Client and Server:**
- Files: `lib/firebase.ts`, `lib/firebase.client.ts`, API endpoints, `app/game/[roomId]/page.tsx`
- Why fragile: Server (REST API) and client (SDK onValue listener) both update same data. If server update fails silently and client retry succeeds, or vice versa, state diverges
- Safe modification:
  - All writes should go through single endpoint (server-only)
  - Client should only read, never write directly to Firebase
  - Add write-confirmation handshakes
- Test coverage: None for sync consistency

**Action Input Validation Missing:**
- Files: `app/api/game/action/route.ts` (no schema validation before engine call)
- Why fragile: `action` object is cast directly to types without runtime validation. Bad `cardIndex` or `keptIndices` could cause array out-of-bounds in engine
- Safe modification:
  - Add input validation middleware
  - Use Zod for strict schema validation
  - Validate before reaching game logic
- Test coverage: API tests don't exist; only game engine tests

## Scaling Limits

**Firebase Realtime Database Read/Write Limits:**
- Current capacity: Free tier allows ~100 concurrent connections, ~1GB storage
- Limit: Will hit concurrent user limit around 50-100 simultaneous games with 2-6 players
- Scaling path:
  - Upgrade to Blaze plan (pay-per-use)
  - Shard game rooms across multiple database instances
  - Consider Firestore instead for better scaling

**Room Enumeration Attack:**
- Current capacity: 4-character room IDs = 1.2M unique rooms possible
- Limit: Attackers could enumerate most rooms with simple loop
- Scaling path:
  - Use 6-8 character IDs → ~2B combinations
  - Add rate limiting on room lookups
  - Require player to know exact ID (not brute-forceable)

## Dependencies at Risk

**Firebase SDK Version Mismatch:**
- Risk: `firebase` ^11.3.1 in dependencies; major version changes can break API
- Impact: Package updates could require rewrite of firebase.client.ts or firebase.ts
- Migration plan:
  - Pin to exact version until audit-ready
  - Review changelog before major upgrades
  - Test in staging with canary deploy

**TypeScript Strict Mode Warnings:**
- Risk: Some `any` types and `// eslint-disable` comments suggest type issues
- Impact: Future stricter tsconfig could break build
- Migration plan:
  - Run `npm install` and check if tsconfig errors appear
  - Fix any remaining type issues
  - Remove eslint-disable comments

## Missing Critical Features

**No Game Persistence Across Disconnections:**
- Problem: Player disconnects, loses game state; no auto-rejoin to existing game
- Blocks: Casual players quit on connection issues; mid-game disruptions end the game
- Suggested approach:
  - Store playerSession token server-side with room + player ID
  - Allow rejoin within 5-10 minute window
  - Pause game if current player disconnects

**No Chat/Communication:**
- Problem: Players can't communicate in-game except through game state log
- Blocks: Social gameplay; bluffing discussions; casual banter
- Suggested approach: Add simple chat per room (could use Firebase Realtime)

**No Game History/Statistics:**
- Problem: No way to track wins, game duration, or historical games
- Blocks: Long-term engagement; competitive play
- Suggested approach: Store game results in Firestore; show player stats on home page

**No Undo/Rewind for Mistakes:**
- Problem: Misclick or network hiccup can't be undone; must play with mistake
- Blocks: Reduces trust in game fairness
- Suggested approach: Allow 1 undo per player per game (implement via state snapshots)

## Test Coverage Gaps

**API Routes Not Tested:**
- What's not tested: All endpoint logic in `/api/game/*`
- Files: `app/api/game/create/route.ts`, `app/api/game/join/route.ts`, `app/api/game/start/route.ts`, `app/api/game/action/route.ts`
- Risk: Endpoint bugs won't be caught until manual testing; no regression protection
- Priority: High - API is critical path

**Component UI Logic Not Tested:**
- What's not tested: Modal opens, button clicks, turn detection, phase-based visibility
- Files: `components/game/*.tsx` (GameBoard, ActionPanel, ResponseModal, CardSelectModal, ExchangeModal, PlayerArea)
- Risk: UI logic regressions won't be caught; visual bugs in prod
- Priority: Medium - tested manually, but should have snapshot/integration tests

**Firebase Integration Not Tested:**
- What's not tested: Room CRUD, subscription/listener logic, error handling on network failure
- Files: `lib/firebase.ts`, `lib/firebase.client.ts`
- Risk: Sync bugs, race conditions, silent failures won't be caught
- Priority: High - data layer criticality

**End-to-End Game Flow Not Tested:**
- What's not tested: Full game from room creation → join → start → action → win
- Files: Multiple (integration test needed)
- Risk: Can't catch regressions that only appear with full game flow
- Priority: High - highest user impact

---

*Concerns audit: 2026-02-23*
