# Pitfalls Research

**Domain:** Online multiplayer board game (Coup) — polishing/completion phase
**Researched:** 2026-02-23
**Confidence:** HIGH (codebase analysis + official rules + Firebase docs + community sources)

---

## Critical Pitfalls

Mistakes that cause incorrect gameplay, data loss, or security breaches that require rewrites.

---

### Pitfall 1: Full GameState Exposed to All Clients

**What goes wrong:**
Every player's browser receives the complete `GameState` object including all opponents' unrevealed card characters (`Player.cards[].character`). A player can open DevTools and read everyone's hand at any time, destroying the bluffing core of Coup.

**Why it happens:**
Firebase Realtime Database `onValue` listener delivers the entire node to the subscriber. The current architecture writes one shared `state` object and all clients read the same path. There is no per-player filtering.

**How to avoid:**
Server-side state projection before delivery. Two options:

Option A — API-filtered reads (simpler): Add a `/api/game/state?roomId=X&playerId=Y` endpoint that reads from Firebase server-side (using Firebase Admin SDK) and strips opponent card characters before responding. Clients poll or use SWR instead of direct Firebase listeners.

Option B — Separate Firebase paths per player (harder): Write to `/game_rooms/{roomId}/player_views/{playerId}` with already-filtered state. Server writes N paths on each state change. Clients subscribe only to their own path.

The current codebase already uses Firebase REST API on the server — Option A is the natural next step.

**Warning signs:**
- All clients use `firebase.client.ts` `onValue` on the same `/game_rooms/{roomId}` path
- `Player.cards` array is fully populated in the delivered payload (cards with `revealed: false` still show character names)
- No filtering in `GameBoard.tsx` or any client component strips opponent card data

**Phase to address:**
Security hardening phase (before any real user testing). This is a "works but is broken" issue — the game functions correctly but is fundamentally cheatable.

---

### Pitfall 2: No Atomic Read-Modify-Write on Game State (Race Condition)

**What goes wrong:**
Two players submit actions within milliseconds of each other. Both read the same stale state from Firebase, both compute a new state from it, and whichever write arrives second silently overwrites the first. One valid action is lost without any error.

**Concrete Coup scenario:** Player A challenges while Player B passes, both hitting the API simultaneously. Server A reads state (no responses yet), Server B reads state (no responses yet), both compute partial states and write. One response is lost; the pending action never resolves correctly.

**Why it happens:**
`updateRoom` uses `PATCH` with `fetch` — a plain HTTP write with no compare-and-swap. Firebase REST API has no built-in optimistic concurrency for this pattern. Multiple Next.js serverless function instances can execute in parallel.

**How to avoid:**
Use Firebase Realtime Database transactions via the Admin SDK (not REST API) on the server:

```typescript
// Replace getRoom + updateRoom pattern with:
import { getDatabase } from 'firebase-admin/database';

const db = getDatabase();
await db.ref(`/game_rooms/${roomId}/state`).transaction((currentState) => {
  if (!currentState) return; // abort
  const newState = applyAction(currentState, action);
  return newState;
});
```

`runTransaction` retries automatically if another write happens concurrently — only one write wins per state version. This requires switching the server from Firebase REST API to Firebase Admin SDK.

Alternative if staying on REST: add an `etag`/`version` field to the state and reject writes where the incoming version does not match the stored version (optimistic locking).

**Warning signs:**
- `lib/firebase.ts` uses plain `fetch` with `PUT`/`PATCH` — no transactions
- No version/etag field in `GameState`
- Multiple simultaneous players can both respond to the same pending action

**Phase to address:**
State management hardening phase. Implement before load testing with 4+ players.

---

### Pitfall 3: Client-Supplied `playerId` with No Server-Side Authentication

**What goes wrong:**
The `playerId` is generated client-side (stored in `localStorage`), passed in every API request body, and trusted by the server as identity. Any player can set their `playerId` to any other player's ID and submit actions on their behalf — claiming another player's turn, forcing them to "pass" during challenges, or selecting which card they lose.

**Why it happens:**
`app/api/game/join/route.ts` accepts `playerId` from the request body and stores it directly. There is no session token, no Firebase Auth, and no server-generated ID. The only validation is `currentTurnId !== playerId` for turn-gated actions, which an attacker can bypass by using the victim's stored ID.

**How to avoid:**
Short-term (no auth): Generate `playerId` server-side at join time and return it as a signed token (e.g. JWT with room+player claim). Store in client-side cookie/localStorage. Verify the JWT on every action request.

Long-term: Integrate Firebase Anonymous Auth. Anonymous UIDs are cryptographically generated server-side and verified via Firebase ID tokens on each request.

**Warning signs:**
- `join/route.ts`: `const { roomId, playerName, playerId } = await req.json()` — playerId comes from client
- No session cookie, no JWT, no Firebase Auth token validation in any API route
- `action/route.ts` trusts `playerId` from body for authorization decisions

**Phase to address:**
Security hardening phase. Block this before exposing the game to anyone outside the development team.

---

### Pitfall 4: Blocker Can Also Be Prompted to Challenge Their Own Block

**What goes wrong:**
When a block is declared, `processResponse` builds `blockResponses` that includes all alive players except the blocker (`filter p.id !== responderId`). However, the actor (whose action was blocked) IS included in this response pool. This is correct — the actor should be able to challenge the block. But the UI needs to correctly route: only non-blockers see the "challenge block / pass" prompt. If the UI shows the block-challenge prompt to all players including the blocker, the blocker could accidentally challenge their own block, causing an invalid state.

**Why it happens:**
The engine correctly excludes the blocker from `blockResponses`. However the UI (ResponseModal, GameBoard) must independently check whether the current player is the blocker and suppress the challenge-block prompt. If the UI just checks `phase === 'awaiting_block_response'` to show the modal, the blocker will see it too.

**How to avoid:**
In `GameBoard.tsx`/`ResponseModal.tsx`: before showing any response modal, verify `state.pendingAction.responses[myPlayerId] === null` (i.e. this player has not yet responded AND is expected to respond). The blocker's ID is not in `blockResponses` keys at all, so checking `myPlayerId in responses` is the correct gate.

```typescript
const shouldShowBlockChallengeModal =
  state.phase === 'awaiting_block_response' &&
  state.pendingAction?.responses[myPlayerId] === null &&  // null = hasn't responded yet
  myPlayerId in (state.pendingAction?.responses ?? {});   // player is in the response pool
```

**Warning signs:**
- `ResponseModal` checks only `phase` to decide visibility without verifying the player is in the response pool
- Players report seeing challenge prompts when it isn't their decision to make
- Blocker sees "challenge your own block" option

**Phase to address:**
Game logic correctness phase. Verify this during the UI/UX pass using per-player browser tabs.

---

### Pitfall 5: No Input Validation Allows Invalid Action Payloads

**What goes wrong:**
The `/api/game/action` route casts `action.type`, `action.response`, `action.character`, and `action.cardIndex` directly from the request body with `as ActionType`, `as ResponseType`, etc. An attacker can send arbitrary values that bypass TypeScript's compile-time checks at runtime: `{ type: "admin_reset" }`, `{ cardIndex: -1 }`, `{ character: "God" }`. The engine will throw unhandled errors or produce corrupt state.

**Why it happens:**
TypeScript types are erased at runtime. `as ActionType` is a compile-time assertion, not a runtime guard. There is no Zod, Joi, or manual validation schema applied before the engine functions are called.

**How to avoid:**
Add a Zod (or equivalent) validation schema at the API entry point:

```typescript
import { z } from 'zod';

const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.enum(['income', 'foreignAid', 'exchange', 'tax']) }),
  z.object({ type: z.enum(['coup', 'assassinate', 'steal']), targetId: z.string().min(1) }),
  z.object({ type: z.literal('respond'), response: z.enum(['challenge', 'block', 'pass']), character: z.enum(['Duke','Contessa','Captain','Assassin','Ambassador']).optional() }),
  z.object({ type: z.literal('lose_influence'), cardIndex: z.number().int().min(0).max(1) }),
  z.object({ type: z.literal('exchange_select'), keptIndices: z.array(z.number().int().min(0)).min(1).max(2) }),
]);
```

Also validate that `cardIndex` points to an un-revealed card (engine-level guard).

**Warning signs:**
- `action/route.ts` uses `as ActionType`, `as ResponseType`, `as Character` without prior validation
- `action.cardIndex` is passed directly to `processLoseInfluence` without bounds checking
- `action.keptIndices` array length is not validated before `processExchangeSelect`

**Phase to address:**
Input validation phase (immediately). This is a security and stability issue.

---

### Pitfall 6: Assassination Challenge Double-Loss Not Handled for Already-Dead Player

**What goes wrong:**
The official rule: if a player falsely claims Contessa to block an assassination, and the block is challenged and they lose, they lose two influence cards — one for the failed block challenge, one for the assassination proceeding. The current engine handles this correctly when the blocker survives the first card loss (goes to `lose_influence` phase). However, if the blocker only has 1 remaining influence before the block challenge, `removeFirstLiveCard` kills them and `checkWinner` returns `game_over` or transitions to `nextTurn` — the assassination action is never executed. This is correct per the rules (dead players cannot be assassinated further), but the game should log clearly that the player was eliminated through this double-loss path, not just a simple challenge loss.

**Why it happens:**
The flow in `processBlockResponse` (lines 332-343) calls `removeFirstLiveCard`, then `checkWinner`, then returns early if `game_over`. The `executeAction` path is only reached if the player survived. This is logically correct but the log messages don't reflect the "double-loss due to assassination" narrative.

**How to avoid:**
Add a specific log message when `pending.type === 'assassinate'` and the blocker is eliminated by the challenge before the assassination executes. Example: `"${blocker.name}이(가) 블러프가 발각되어 두 장을 모두 잃고 탈락했습니다"`.

**Warning signs:**
- The log shows only "challenge successful, blocker was bluffing" but doesn't mention the assassination
- Players are confused about why they lost when they "only" got challenged on a block

**Phase to address:**
Game rule accuracy phase. Low severity but important for player understanding.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Plain PATCH instead of transaction for state writes | Simple code, no Admin SDK setup | Lost updates under concurrent writes; corrupts game state at 4+ players | Never for production; use transactions |
| Client-generated `playerId` in localStorage | No auth setup required | Full impersonation vulnerability; any player can act as another | Never for real users; replace with server-generated tokens before public use |
| Full state sent to all clients | Simple subscription, one Firebase path | Opponents' cards visible in DevTools; ruins game integrity | Never; implement per-player views before real testing |
| `as ActionType` cast without runtime validation | No schema library needed | Corrupt state from malformed requests; crash vectors | Never in a networked API; add Zod schema |
| `removeFirstLiveCard` auto-selects first unrevealed card | Simplifies challenge resolution flow | Player cannot choose which card to lose after a challenge (official rules require player choice) | Acceptable for challenge-initiated card loss only if consistent with house rules; verify against official rules |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase REST API | Using `PATCH` assumes atomic partial update — but concurrent writes on the same path use last-write-wins semantics | Switch to Firebase Admin SDK `runTransaction()` for all game state mutations |
| Firebase Realtime DB security rules | Leaving database open (`.read: true, .write: true`) which is the default for new projects | Add rules that restrict writes to only valid authenticated sessions; at minimum require auth before allowing writes |
| Firebase client SDK subscription | Subscribing to the room root path `/game_rooms/{roomId}` delivers entire state including all hidden cards | Subscribe to a filtered view path or use the API-layer filtering pattern |
| Next.js serverless functions | Assuming sequential execution — multiple players can trigger concurrent function invocations of the same route | Treat each API call as stateless and concurrent; use transactions, not optimistic reads |
| Firebase REST API without auth | Database URL is public and requests require no token — any caller with the URL can read/write all rooms | Enable Firebase Auth or database secret-based access; do not ship to production with open rules |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Log array grows unbounded in GameState | Each action appends to `state.log`; Firebase node size increases every turn; slow syncs | Cap log at last 50 entries or move log to a separate `/log/{roomId}` path | At ~100 turns (roughly 20-30 minute game); noticeable lag starts in the 4-6 player late-game |
| Entire game state in one Firebase node | Any change (even a coin update) triggers a full state resync to all subscribers | Split state into sub-nodes: `/state/players`, `/state/phase`, `/state/pendingAction`; subscribe granularly | With 6 players and high event rate, every action floods all clients with full state |
| Deck array stored in Firebase | Deck is sent to all clients, revealing shuffle order — attackers can predict draws | Store deck server-side only or hash it; omit from client-delivered state | Immediately — this is a security issue, not a scale issue |
| Client directly writes to Firebase | Bypasses all server-side validation; any client can write arbitrary state | All mutations must go through the Next.js API routes | Day one of real users |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client-supplied `playerId` trusted as identity | Player impersonation; forced card loss on opponents; acting out of turn | Server-generated player tokens (JWT or Firebase Anonymous Auth UID); never trust client-provided identity claims |
| Full game state (including hidden cards and deck) sent to clients | Complete hand visibility destroys bluffing mechanic; deck order predictable | Server-side state projection per player; strip `cards[].character` for unrevealed opponent cards; strip `deck` entirely |
| No Firebase Security Rules | Direct REST reads/writes bypass all game logic; anyone can read all rooms or corrupt state | Add `.read`/`.write` rules requiring auth; validate state shape with `.validate` rules |
| `keptIndices` in exchange not server-validated | Player can keep 0 cards, keep 3+ cards, or keep cards they don't have | Validate array length equals live card count; validate indices are in range; validate cards kept exist in the offer set |
| `cardIndex` in `lose_influence` not validated | Player can choose to "lose" an already-revealed card (no-op), effectively skipping their penalty | Server must verify `state.players[playerId].cards[cardIndex].revealed === false` before accepting |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication whose turn/decision it is | Players sit confused waiting for nothing, or click buttons that have no effect | Show a clear contextual header: "Waiting for Bob to challenge or pass" with player name highlighted |
| Action panel shown to wrong players | Non-active player clicks an action and gets a confusing error | Gate the action panel and all response modals strictly on `phase` + `myPlayerId in pendingAction.responses` |
| No timeout for challenge/block responses | A disconnected player stalls the entire game indefinitely | Add a 30-second timeout per response; auto-pass on timeout with a visible countdown |
| No reconnection state on page reload | Player refreshes tab and loses their `playerId` from memory, cannot rejoin their session | Persist `playerId` in `localStorage` with room association; attempt auto-rejoin on page load |
| No feedback when action is rejected | API returns 400/403 but UI silently fails | Always show a toast/error for failed API calls; indicate why (not your turn, invalid action, etc.) |
| Response modal appears for 0 milliseconds and auto-resolves | Fast players hit pass before opponents can challenge, creating unfair timing pressure | Consider a minimum display time (1-2 seconds) or a "lock in" confirmation step |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Challenge system:** Often missing the `removeFirstLiveCard` vs. player-choice distinction — verify: challenged player must choose which card to lose when they have 2 unrevealed cards (the engine currently auto-selects the first; official rules require player choice)
- [ ] **Block challenge double-loss:** The assassination+Contessa bluff path works mechanically but verify: a player who bluff-blocks assassination with 1 card remaining gets eliminated (no `lose_influence` step needed); a player with 2 cards must first lose one to the challenge, then proceed to `lose_influence` for the assassination
- [ ] **Exchange card selection:** `processExchangeSelect` gives the player `liveCards + 2 exchangeCards` to choose from — verify: a player with 1 remaining live card sees 3 options and keeps 1; a player with 2 live cards sees 4 options and keeps 2
- [ ] **Deck state in client payload:** The `deck` array (containing remaining characters in shuffle order) is included in the Firebase state delivered to clients — verify this is stripped from client views before shipping
- [ ] **Actions against dead/dying players:** The turn ordering (`nextTurn`) correctly skips eliminated players — verify with a scenario where eliminating player B causes turn to skip directly to player C
- [ ] **Coup when target is already eliminated:** The server validates `currentTurnId === playerId` but does not validate that `targetId` refers to an alive player — a coup against a dead player would waste 7 coins and enter `lose_influence` with no cards to select

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Full state exposed to clients | MEDIUM | Add per-player projection API endpoint; update client to fetch from there instead of direct Firebase; existing game sessions need no migration |
| Race condition corrupts game state | HIGH | Add a `stateVersion` counter; detect version mismatch on write and return error; client re-fetches and retries; requires Firebase Admin SDK migration |
| Client-generated playerId compromise | HIGH | Rotate to server-generated tokens; invalidate all existing sessions; existing rooms may need to be closed and recreated |
| Invalid input corrupts state | MEDIUM | Add Zod validation layer; existing state may need manual repair if corrupted entries exist in Firebase |
| Missing action timeouts stall game | LOW | Add a Cloud Function or cron that auto-advances stalled games after N minutes; can be added without touching core game logic |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Full GameState exposed to clients | Phase: State security / Per-player views | Test: Open two browsers as different players; opponent cards must not be visible in DevTools network tab |
| Race condition on concurrent writes | Phase: State management hardening | Test: Simulate simultaneous API calls with the same roomId; verify only one write wins and both clients reach consistent state |
| Client-generated playerId | Phase: Authentication hardening | Test: Attempt to submit actions using another player's ID; server must reject |
| No input validation | Phase: API hardening | Test: Send malformed payloads (invalid enum values, out-of-range indices); all must return 400 without crashing |
| Wrong player prompted in UI | Phase: UI correctness pass | Test: Multi-browser session; verify each player sees prompts only when they are in the response pool |
| Blocker sees challenge-own-block UI | Phase: UI correctness pass | Test: Player who blocks must not see the "challenge block" prompt |
| Log growing unbounded | Phase: Performance / polish | Test: Simulate a 50-turn game; measure Firebase node size and sync latency |
| Deck visible to clients | Phase: State security | Test: After exchange action, verify deck contents are not in client-delivered state |
| Challenge: auto-selects card vs. player choice | Phase: Game rule accuracy | Test: Challenge a player with 2 unrevealed cards; verify they are prompted to choose which card to lose |
| Coup against dead player | Phase: Input validation | Test: Attempt to coup an eliminated player; server must return error |

---

## Sources

- Codebase analysis: `/Users/kiyeol/development/coup/lib/game/engine.ts`, `/Users/kiyeol/development/coup/app/api/game/action/route.ts`, `/Users/kiyeol/development/coup/lib/firebase.ts` — direct code review (HIGH confidence)
- Official Coup rules — double-loss on failed Contessa block challenge: [Dized Rules: Block Assassinate (Contessa)](https://rules.dized.com/game/xzsTtI3VTV-2wvos3otxIg/vn1Jy3lnRzq-_-YW0Poqeg/block-assassinate-contessa) (HIGH confidence)
- Firebase Realtime Database transaction documentation: [Firebase Read and Write Data](https://firebase.google.com/docs/database/web/read-and-write), [Firebase Concurrency Handling](https://moldstud.com/articles/p-solving-the-mystery-of-firebase-realtime-database-concurrency-issues) (HIGH confidence — official docs)
- Firebase Security Rules documentation: [Use conditions in Security Rules](https://firebase.google.com/docs/database/security/rules-conditions) (HIGH confidence — official docs)
- boardgame.io simultaneous action race condition: [Issue #828](https://github.com/boardgameio/boardgame.io/issues/828) — confirms last-write-wins problem in concurrent turn-based games (MEDIUM confidence)
- Server-side validation for card game cheating prevention: [3e8 Development: Slow Down Cheaters](https://3e8.io/2016/slowdown-cheaters-with-server-side-validation/) (MEDIUM confidence)
- PROJECT.md documented known issues: race conditions, full state exposure, no input validation (HIGH confidence — primary source)

---
*Pitfalls research for: Online multiplayer Coup board game (polishing/completion phase)*
*Researched: 2026-02-23*
