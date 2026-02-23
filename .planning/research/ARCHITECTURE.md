# Architecture Research

**Domain:** Online multiplayer card game (Coup) — Next.js 14 + Firebase Realtime Database
**Researched:** 2026-02-23
**Confidence:** HIGH (core patterns verified against official Firebase docs, Next.js docs, Playwright docs)

---

## Current Architecture (Baseline)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  app/game/[roomId]/page.tsx                                  │   │
│  │  - subscribeToRoom() → Firebase SDK onValue()                │   │
│  │  - setState(fullGameState)  ← PROBLEM: full state exposed    │   │
│  └──────────────────────────┬─────────────────────────────────┘    │
│                              │ fetch POST /api/game/action           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                   Next.js Server (API Routes)                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  /api/game/action  /api/game/create  /api/game/join        │     │
│  │  /api/game/start                                           │     │
│  │  - reads/writes full GameState via Firebase REST API       │     │
│  └──────────────────────────────┬─────────────────────────────┘    │
└─────────────────────────────────┼────────────────────────────────── ┘
                                  │ REST (fetch to .json endpoint)
┌─────────────────────────────────┼─────────────────────────────────┐
│           Firebase Realtime Database                                │
│                                                                     │
│   game_rooms/{roomId}/state  →  Full GameState JSON                │
│   (deck, all players' cards, pendingAction, etc.)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Problem

The client subscribes to `game_rooms/{roomId}` and receives the full `GameState` object including:
- `players[*].cards` — all players' unrevealed cards (the hidden information)
- `deck` — the remaining deck order
- `pendingAction.exchangeCards` — cards drawn for exchange

Any player can open DevTools and read all opponents' cards. This breaks the core game mechanic.

---

## Target Architecture

### Three Changes Required

1. **Server-side state filtering** — API routes produce per-player filtered views written to separate DB paths
2. **Firebase emulator** — local dev runs against emulated DB with no production traffic or billing
3. **E2E testing** — Playwright multi-context tests simulate multiple players in a single test run

---

## Component Boundaries (Target)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                             │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  app/game/[roomId]/page.tsx                                    │  │
│  │  - subscribeToRoom(roomId, playerId)                           │  │
│  │    → Firebase SDK listens to:                                  │  │
│  │      game_rooms/{roomId}/views/{playerId}                      │  │
│  │    → receives FilteredGameState (own cards only)               │  │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ fetch POST /api/game/action            │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────────┐
│                  Next.js Server (API Routes)                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/game/action (and other routes)                         │   │
│  │                                                              │   │
│  │  1. Read full GameState from master path (REST API)          │   │
│  │  2. processAction() → new GameState                          │   │
│  │  3. writeFullState(roomId, newState)   ← master              │   │
│  │  4. for each player:                                         │   │
│  │       view = filterStateForPlayer(newState, playerId)        │   │
│  │       writePlayerView(roomId, playerId, view)                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  lib/game/filter.ts  (new)                                   │   │
│  │  filterStateForPlayer(state: GameState, playerId: string)    │   │
│  │    → FilteredGameState                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                              │ REST (master) + REST (views per player)
┌─────────────────────────────┼──────────────────────────────────────┐
│           Firebase Realtime Database                                 │
│                                                                      │
│   game_rooms/{roomId}/state              ← full GameState (server)  │
│   game_rooms/{roomId}/views/{playerId}   ← FilteredGameState        │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `app/game/[roomId]/page.tsx` | Orchestrates real-time state + action dispatch | Firebase SDK (read), `/api/game/*` (write) |
| `lib/firebase.client.ts` | Firebase SDK subscribeToRoom per player view | Firebase Realtime DB `views/{playerId}` |
| `lib/firebase.ts` | Server-side REST reads/writes | Firebase REST API |
| `/api/game/action` (and other routes) | Validate, mutate state, write master + views | `lib/game/engine`, `lib/game/filter`, `lib/firebase` |
| `lib/game/engine.ts` | Pure game logic, no I/O | Called by API routes only |
| `lib/game/filter.ts` (new) | Produce per-player view from full state | Called by API routes after every mutation |
| `lib/game/types.ts` | Shared type definitions | Imported everywhere |

---

## Data Structures

### FilteredGameState (new type in types.ts)

```typescript
// Player as seen by self — own cards fully visible
interface SelfPlayer extends Omit<Player, 'cards'> {
  cards: Card[];         // full card data (character + revealed)
}

// Opponent as seen by another player — hidden cards masked
interface OpponentPlayer extends Omit<Player, 'cards'> {
  cards: MaskedCard[];   // character hidden unless revealed === true
}

interface MaskedCard {
  revealed: boolean;
  character: Character | null;  // null when revealed === false
}

interface FilteredGameState {
  self: SelfPlayer;
  opponents: OpponentPlayer[];
  currentTurnId: string;
  phase: GamePhase;
  pendingAction: FilteredPendingAction | null;
  log: string[];
  winnerId?: string;
  // deck is NOT included — never exposed to any client
}

// pendingAction with exchangeCards masked (null if not this player's exchange)
interface FilteredPendingAction extends Omit<PendingAction, 'exchangeCards'> {
  exchangeCards?: Character[] | null;
}
```

### DB Path Structure

```
game_rooms/
  {roomId}/
    state/                      # Full GameState — server writes, clients cannot read
      players/
      deck/
      currentTurnId/
      phase/
      pendingAction/
      log/
      winnerId/
    views/
      {playerId}/               # FilteredGameState — server writes, only that player reads
        self/
        opponents/
        currentTurnId/
        phase/
        pendingAction/
        log/
        winnerId/
```

---

## Data Flow

### Action Flow (current player takes a turn)

```
Player clicks "Tax"
    │
    ▼
page.tsx: sendAction({ type: 'tax' })
    │  fetch POST /api/game/action
    │  body: { roomId, playerId, action }
    ▼
/api/game/action:
    1. getRoom(roomId)           ← REST GET game_rooms/{roomId}/state.json
    2. processAction(state, ...) ← pure engine, no I/O
    3. updateRoom(roomId, state) ← REST PATCH game_rooms/{roomId}.json  { state: newState }
    4. for each player in state.players:
         view = filterStateForPlayer(newState, player.id)
         updatePlayerView(roomId, player.id, view)
           ← REST PATCH game_rooms/{roomId}.json  { views/{playerId}: view }
    5. return { ok: true }
    │
    ▼  (Firebase pushes to all clients simultaneously)
Firebase onValue triggers for each connected player
    │  each receives game_rooms/{roomId}/views/{their playerId}
    ▼
page.tsx: setState(filteredState)  ← only own cards visible
```

### Real-time Subscription Flow

```typescript
// lib/firebase.client.ts (updated)
export function subscribeToRoom(
  roomId: string,
  playerId: string,                          // NEW: scope to player's view
  callback: (state: FilteredGameState) => void
): () => void {
  const viewRef = ref(getDb(), `game_rooms/${roomId}/views/${playerId}`);
  return onValue(viewRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as FilteredGameState);
    }
  });
}
```

---

## Pattern 1: Server-Side State Filtering

**What:** After every state mutation, the server produces a per-player `FilteredGameState` and writes it to `views/{playerId}`. Clients subscribe only to their own view path.

**When to use:** Any time game state contains information that must be hidden from some players (cards, deck order, private bids, hidden roles).

**Trade-offs:**
- Pro: Clients never receive opponent card data; no client-side trust required
- Pro: No Firebase Security Rules complexity needed for field-level hiding
- Con: Server must write N+1 paths per action (1 master + N player views); slight latency increase
- Con: Firebase Realtime DB Security Rules cannot do field-level filtering (verified from official docs); path-level separation is the only supported pattern

**Example — filter function:**

```typescript
// lib/game/filter.ts
import { GameState, FilteredGameState, Character } from './types';

export function filterStateForPlayer(
  state: GameState,
  playerId: string
): FilteredGameState {
  const selfPlayer = state.players.find(p => p.id === playerId);
  if (!selfPlayer) throw new Error(`Player ${playerId} not in game`);

  const opponents = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      ...p,
      cards: p.cards.map(card => ({
        revealed: card.revealed,
        // Only expose character if the card is already revealed (face-up)
        character: card.revealed ? card.character : null as unknown as Character,
      })),
    }));

  const pendingAction = state.pendingAction
    ? {
        ...state.pendingAction,
        // Hide exchangeCards unless this player is the one exchanging
        exchangeCards:
          state.pendingAction.actorId === playerId
            ? state.pendingAction.exchangeCards
            : undefined,
      }
    : null;

  return {
    self: selfPlayer,
    opponents,
    currentTurnId: state.currentTurnId,
    phase: state.phase,
    pendingAction,
    log: state.log,
    winnerId: state.winnerId,
  };
}
```

---

## Pattern 2: Firebase Emulator Integration

**What:** `firebase emulators:start` runs a local Realtime Database on port 9000. App connects to emulator via environment variable; production Firebase is never touched in local dev or CI.

**When to use:** All local development and all CI/E2E test runs. Never use production Firebase in tests.

**Trade-offs:**
- Pro: Zero billing risk in dev/CI; fast cold start; can seed with test data programmatically
- Pro: `connectDatabaseEmulator` is the official supported API (HIGH confidence, official docs)
- Con: Requires Java JDK 11+ installed for emulator to run
- Con: Emulator state is ephemeral by default (use `--export-on-exit` / `--import` flags for persistence)

**firebase.json configuration:**

```json
{
  "emulators": {
    "database": {
      "port": 9000,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  },
  "database": {
    "rules": "database.rules.json"
  }
}
```

**Environment variables (.env.local for dev, .env.test for CI):**

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
# All other NEXT_PUBLIC_FIREBASE_* vars still needed (emulator uses them for project identity)
```

**Client SDK connection (lib/firebase.client.ts update):**

```typescript
import { connectDatabaseEmulator } from 'firebase/database';

function getDb() {
  const db = getDatabase(getApp());
  if (
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true' &&
    !(db as any)._instanceStarted  // guard against double-connect
  ) {
    connectDatabaseEmulator(db, '127.0.0.1', 9000);
  }
  return db;
}
```

**Server REST API connection (lib/firebase.ts update):**

```typescript
// The emulator accepts the same REST API at localhost:9000
function dbUrl() {
  if (process.env.FIREBASE_EMULATOR === 'true') {
    return `http://127.0.0.1:9000`;  // emulator base URL
  }
  return process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
}

function roomUrl(roomId: string) {
  return `${dbUrl()}/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/game_rooms/${roomId}.json`;
}
```

Note: The REST URL format for the emulator is `http://127.0.0.1:9000/{project-id}/path.json`, which differs from the production format. The server-side env var should be `FIREBASE_EMULATOR` (no `NEXT_PUBLIC_` prefix) so it is not exposed to the browser.

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:emulator": "firebase emulators:exec --ui 'next dev'",
    "test:e2e": "firebase emulators:exec 'playwright test'",
    "emulator": "firebase emulators:start"
  }
}
```

---

## Pattern 3: E2E Game Scenario Testing with Playwright

**What:** Playwright's multiple `BrowserContext` instances simulate different players in a single test, coordinated with `Promise.all()` for simultaneous actions. Firebase emulator provides the backend; no production data is touched.

**When to use:** Full game flow tests (action → response → block → challenge chains). Complements unit tests of `engine.ts` which already exist.

**Trade-offs:**
- Pro: Tests the full stack including real-time sync (onValue propagation between contexts)
- Pro: Playwright natively supports multiple contexts in one test; no third-party plugin needed
- Con: Tests are slower than unit tests (require running Next.js + Firebase emulator)
- Con: Real-time async behavior requires careful `waitForFunction` / `expect().toBeVisible()` patterns to avoid flakiness
- Playwright wins over Cypress here: Playwright drives the browser externally (better for multi-context), Cypress runs inside the browser (hard constraints for multi-tab/multi-user scenarios) — verified from multiple 2026 comparison sources

**Example — two-player game test:**

```typescript
// tests/e2e/game-flow.spec.ts
import { test, expect, chromium } from '@playwright/test';

test('player 1 income → turn passes to player 2', async () => {
  const browser = await chromium.launch();

  // Two isolated browser contexts = two players
  const p1Context = await browser.newContext();
  const p2Context = await browser.newContext();
  const p1Page = await p1Context.newPage();
  const p2Page = await p2Context.newPage();

  // Seed: create a room and join both players (via API calls or UI)
  // Both navigate to same room URL
  await p1Page.goto('/game/TEST01');
  await p2Page.goto('/game/TEST01');

  // Player 1 takes income action
  await p1Page.click('[data-testid="action-income"]');

  // Player 2's UI should show it is now their turn
  await expect(p2Page.locator('[data-testid="my-turn-indicator"]')).toBeVisible();

  // Verify player 1 does NOT see player 2's cards
  const p2CardTexts = await p1Page.locator('[data-testid="opponent-card"]').allTextContents();
  expect(p2CardTexts.every(t => t === '?')).toBe(true);  // masked cards

  await browser.close();
});
```

**Test data setup approach:**

Since the game currently uses `localStorage` for `playerId` (no auth), E2E tests should inject `playerId` into `localStorage` before navigation to establish deterministic player identity:

```typescript
await p1Context.addInitScript(() => {
  localStorage.setItem('coup_player_id', 'test-player-1');
});
await p2Context.addInitScript(() => {
  localStorage.setItem('coup_player_id', 'test-player-2');
});
```

---

## Recommended Project Structure (additions only)

```
lib/
├── game/
│   ├── engine.ts           # existing — pure game logic
│   ├── engine.test.ts      # existing — unit tests
│   ├── filter.ts           # NEW — filterStateForPlayer()
│   ├── filter.test.ts      # NEW — unit tests for filter logic
│   └── types.ts            # UPDATED — add FilteredGameState, MaskedCard
├── firebase.ts             # UPDATED — emulator REST URL support
└── firebase.client.ts      # UPDATED — connectDatabaseEmulator + per-player view path

tests/
└── e2e/
    ├── game-flow.spec.ts   # NEW — full game scenario E2E
    └── state-hiding.spec.ts # NEW — verify opponent cards are masked

firebase.json               # NEW (root) — emulator configuration
database.rules.json         # NEW (root) — security rules
playwright.config.ts        # NEW (root) — E2E test configuration
```

---

## Build Order (Dependencies Between Components)

The components must be built in this order due to direct dependencies:

```
Step 1: FilteredGameState types
  └─ lib/game/types.ts
     Add MaskedCard, FilteredGameState, FilteredPendingAction interfaces
     (No dependencies on other new work)

Step 2: filter.ts
  └─ lib/game/filter.ts + filter.test.ts
     Depends on: updated types.ts
     Verify with unit tests before touching API routes

Step 3: API route updates
  └─ app/api/game/action/route.ts (and create/join/start)
     Add filterStateForPlayer() calls after every updateRoom()
     Add updatePlayerView() to firebase.ts
     Depends on: filter.ts, updated firebase.ts

Step 4: Client subscription update
  └─ lib/firebase.client.ts
     subscribeToRoom now takes playerId, listens to views/{playerId}
     page.tsx passes playerId to subscribeToRoom
     Depends on: API routes writing views/ paths (Step 3)

Step 5: Firebase emulator setup
  └─ firebase.json, database.rules.json
     connectDatabaseEmulator in firebase.client.ts
     Emulator REST URL in firebase.ts
     .env.local additions
     Can be done in parallel with Steps 1-4 but must be done before Step 6

Step 6: E2E tests
  └─ playwright.config.ts, tests/e2e/
     Depends on: all Steps 1-5 complete
     Emulator must be running during test execution
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Filtering

**What people do:** Send full GameState to all clients, then filter display-side in React ("don't render opponent cards").

**Why it's wrong:** The raw data is still in the browser's memory and network responses. Any player can open DevTools and read it. Display filtering is not security.

**Do this instead:** Filter at the server before writing to DB, so the browser never receives the data.

### Anti-Pattern 2: Firebase Security Rules for Field-Level Hiding

**What people do:** Try to write a Security Rule that allows read on `/game_rooms/{roomId}` but somehow hides `players.*.cards` for non-owners.

**Why it's wrong:** Firebase Realtime Database Security Rules operate at the path level, not the field level (confirmed by official Firebase docs). You cannot grant read access to a node while hiding a sub-field within it. Rules can only allow or deny an entire path.

**Do this instead:** Separate the data structure so private data lives at a distinct path (`views/{playerId}/`) that is only readable by that player.

### Anti-Pattern 3: Testing Against Production Firebase

**What people do:** Run E2E tests using production environment variables, writing test game rooms to the real database.

**Why it's wrong:** Creates billing costs, pollutes production data, causes test pollution between runs, and makes CI non-deterministic.

**Do this instead:** Use `firebase emulators:exec` to wrap test commands; emulator state is wiped between runs by default.

### Anti-Pattern 4: Single BrowserContext for Multi-Player Tests

**What people do:** Use a single Playwright page/context and click through both players' turns in sequence (impossible since each player needs a distinct localStorage identity).

**Why it's wrong:** `localStorage` is scoped to the browser context. Two players in the same context would share the same `coup_player_id`, making it impossible to simulate two distinct players.

**Do this instead:** Create two separate `BrowserContext` instances with `addInitScript` to inject distinct `playerId` values into each player's localStorage before navigation.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2-6 players per room (current target) | Current architecture is fine; N+1 DB writes per action is negligible |
| 100 concurrent rooms | Firebase Realtime DB handles this natively; no changes needed |
| 1000+ concurrent rooms | Consider batched writes for player views (Firebase `update()` can write multiple paths atomically in a single REST call using a multi-path update) |
| Auth hardening | Add Firebase Authentication; update Security Rules to `auth.uid === $playerId` for view paths; remove localStorage-based playerId |

### Multi-Path Write Optimization

Rather than N separate REST calls for N player views, the server can write all views atomically:

```typescript
// lib/firebase.ts — batch write master state + all views in one PATCH
export async function updateRoomWithViews(
  roomId: string,
  state: GameState,
  views: Record<string, FilteredGameState>  // playerId → view
): Promise<void> {
  const payload: Record<string, unknown> = { state };
  for (const [playerId, view] of Object.entries(views)) {
    payload[`views/${playerId}`] = view;
  }
  const res = await fetch(roomUrl(roomId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update room: ${res.status}`);
}
```

This is a Firebase multi-path update: a single PATCH with nested keys applies all updates atomically.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Firebase Realtime DB (production) | REST API (server) + SDK onValue (client) | Existing pattern; no change to REST transport |
| Firebase Realtime DB (emulator) | Same REST + SDK but pointed at `127.0.0.1:9000` | Emulator accepts same API; only URL changes |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API Route ↔ Game Engine | Direct function call | Engine is pure; no I/O boundary needed |
| API Route ↔ Filter | Direct function call | Filter is pure; called after every engine mutation |
| API Route ↔ Firebase | lib/firebase.ts (REST) | Server-only; not imported by client components |
| Client ↔ Firebase | lib/firebase.client.ts (SDK) | 'use client' file; not imported by server components |
| E2E Tests ↔ App | Playwright HTTP + browser automation | Tests use Firebase emulator; no production DB contact |

---

## Sources

- [Firebase Realtime Database Security Rules — use conditions](https://firebase.google.com/docs/database/security/rules-conditions) — HIGH confidence (official docs): Confirmed rules are path-level only; field-level hiding requires data restructuring
- [Firebase Emulator Suite — connect and prototype](https://firebase.google.com/docs/emulator-suite/connect_and_prototype) — HIGH confidence (official docs): connectDatabaseEmulator API confirmed
- [Setting Up Firebase Emulators with Next.js — MakerKit](https://makerkit.dev/blog/tutorials/setting-up-firebase-emulators-nextjs) — MEDIUM confidence (verified blog): Specific Next.js + emulator env var patterns
- [Next.js Testing — Playwright](https://nextjs.org/docs/app/guides/testing/playwright) — HIGH confidence (official docs, updated 2026-02-20): Official setup guide for Playwright + Next.js App Router
- [Playwright Browser Contexts — playwright.dev](https://playwright.dev/docs/browser-contexts) — HIGH confidence (official docs): Multiple contexts for multi-user simulation confirmed
- [Effective Strategies for Testing Multi-User Workflows in Playwright — TestDriver](https://testdriver.ai/articles/effective-strategies-for-testing-multi-user-workflows-in-playwright) — MEDIUM confidence (verified): addInitScript and Promise.all patterns for multi-user tests
- [Why Playwright Seems to Be Winning Over Cypress — d4b.dev](https://www.d4b.dev/blog/2026-02-17-why-playwright-seems-to-be-winning-over-cypress-for-end-to-end-testing) — MEDIUM confidence: Published 2026-02-17; Playwright recommended over Cypress for multi-context scenarios

---
*Architecture research for: Coup online multiplayer board game*
*Researched: 2026-02-23*
