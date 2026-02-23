# Stack Research

**Domain:** Online multiplayer board game (Coup) — completing and polishing existing implementation
**Researched:** 2026-02-23
**Confidence:** HIGH for core additions (verified via npm registry + official docs); MEDIUM for Firebase emulator RTDB specifics (official docs partially inaccessible, cross-verified via multiple secondary sources)

---

## Context: What Already Exists

The project already has a working foundation. This research covers ADDITIONS only:

| Already In Place | Version |
|-----------------|---------|
| Next.js | 14.2.20 |
| React | 18.x |
| Firebase (client SDK) | ^11.3.1 |
| TypeScript | ^5 |
| Tailwind CSS | ^3.4.1 |
| Jest + ts-jest | ^29 |

The existing Jest setup targets `lib/` (pure game engine) with `ts-jest` and `testEnvironment: node`. This is correct for the game logic layer and should not change.

---

## Recommended Stack Additions

### Testing Layer

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@testing-library/react` | 16.3.2 | React component + hook testing | Standard companion to Jest for React; needed to test GameBoard, EventLog, and custom hooks like useGameAudio; v16 is the current stable release as of 2026-02 (verified npm) |
| `@testing-library/jest-dom` | 6.9.1 | DOM assertion matchers (`toBeInTheDocument`, `toHaveClass`, etc.) | Eliminates manual DOM inspection; standard with RTL; v6 is current stable (verified npm) |
| `@testing-library/user-event` | 14.6.1 | Simulates real user interactions (click, type, keyboard) | More realistic than `fireEvent`; required for testing action buttons, card selection, response flows in the UI layer (verified npm) |
| `jest-environment-jsdom` | 30.2.0 | JSDOM environment for React component tests | Required to run browser-like tests in Jest; the existing jest.config.js uses `testEnvironment: node` which is correct for engine tests but incompatible with React component tests (verified npm) |

**Why NOT Vitest:** The project already has Jest configured and working with ts-jest for the engine. Migrating to Vitest mid-project adds churn with no gameplay benefit. Keep Jest.

**Why NOT Cypress Component Testing:** Overkill for component-level tests. Reserve Cypress/Playwright for E2E only.

---

### E2E Testing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@playwright/test` | 1.58.2 | End-to-end game scenario testing across real browsers | **Playwright beats Cypress for this use case**: multiplayer testing requires multiple browser contexts (two players simultaneously), and Playwright natively supports multi-context/multi-page in a single test. Cypress requires paid add-ons or workarounds for multi-tab/multi-user scenarios. (Verified npm; comparison verified via multiple 2025 sources) |

**Critical Playwright pattern for multiplayer:** Use `browser.newContext()` to simulate two players in the same test:

```typescript
// E2E example: two players join the same room
const player1 = await browser.newContext();
const player2 = await browser.newContext();
const page1 = await player1.newPage();
const page2 = await player2.newPage();
await page1.goto('/room/test-room');
await page2.goto('/room/test-room');
```

This is the primary reason Playwright wins over Cypress for a multiplayer game. Cypress cannot do this without significant hacks.

**Why NOT Cypress:** No native multi-context support. Cross-browser testing (Safari/WebKit) is absent in Cypress free tier. Playwright executes ~2x faster per test.

---

### Local Development (Firebase Emulator)

| Tool | Version | Purpose | Why Recommended |
|------|---------|---------|-----------------|
| `firebase-tools` CLI | latest (via `npx firebase-tools` or global install) | Hosts Firebase Local Emulator Suite locally | Official Firebase toolchain; the only way to run RTDB emulator locally without hitting production; required to test security rules without real data (verified via firebase.google.com) |
| `@firebase/rules-unit-testing` | 5.0.0 | Unit test Firebase Security Rules | Purpose-built for testing `.rules` files against the emulator; allows asserting what data each player uid can/cannot read (verified npm) |

**Firebase Emulator prerequisites (verified via Firebase official docs + multiple secondary sources):**
- Java JDK 11+ required (Firestore emulator will require Java 21 in upcoming releases — install Java 21 now to be future-proof)
- Node.js 16+
- Firebase CLI 8.14.0+

**RTDB emulator default port:** 9000

**firebase.json configuration:**
```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "emulators": {
    "database": {
      "port": 9000,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

**Client SDK connection (existing `firebase.client.ts` needs this block):**
```typescript
import { connectDatabaseEmulator } from 'firebase/database';

// Add after getDatabase() call, before any reads/writes
if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}
```

**Server-side REST (existing `firebase.ts` — no SDK, just fetch):**
```bash
# .env.local for emulator
NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://127.0.0.1:9000/?ns=your-project-id
NEXT_PUBLIC_USE_EMULATOR=true
```

The existing server-side code in `firebase.ts` uses plain `fetch` against `NEXT_PUBLIC_FIREBASE_DATABASE_URL`. When this env var points to the local emulator, it works without any code changes. This is an advantage of the current REST-based server architecture.

---

### Security: Server-Side State Filtering

| Approach | Purpose | Why Recommended |
|----------|---------|-----------------|
| Firebase Admin SDK (`firebase-admin` ^13.6.1) | Trusted server writes that bypass client security rules | API routes that process game actions should write via Admin SDK, not REST with no auth. Admin SDK bypasses RTDB security rules intentionally — the server is the trusted authority. (Verified npm; pattern confirmed via official Firebase blog + multiple Next.js + Firebase guides) |
| State filtering in Next.js Route Handlers | Hide opponent card characters before sending state to each client | The core Coup security requirement: players must not see each other's hidden cards. Filter happens server-side in the API response, not in the database rules |

**State filtering pattern (do this in the API response layer):**

```typescript
// lib/game/filter.ts
import { GameState, Player } from './types';

export function filterStateForPlayer(state: GameState, viewingPlayerId: string): GameState {
  return {
    ...state,
    players: state.players.map((player: Player) => {
      if (player.id === viewingPlayerId) return player; // own cards: full visibility
      // Opponent cards: hide character name for unrevealed cards
      return {
        ...player,
        cards: player.cards.map(card => ({
          ...card,
          character: card.revealed ? card.character : ('hidden' as any),
        })),
      };
    }),
  };
}
```

This function is called in the API route before returning state to the client. The RTDB stores the full (unfiltered) state; only the server knows all card values.

**Why NOT Firebase Security Rules alone for this:** Firebase RTDB Security Rules cannot do field-level filtering within a node. Rules can deny read access to an entire path, but cannot partially expose a record (e.g., "show this player's cards as hidden to other players"). You cannot write a rule that says "return `character: 'hidden'` for cards where `revealed === false`." The only correct pattern is server-side filtering before the client receives the data. [Confidence: MEDIUM — this is a well-known RTDB limitation documented in community sources; official docs confirm rules control read/write at path level only]

**Why firebase-admin over plain REST for writes:** The current `firebase.ts` uses unauthenticated REST API calls. This works with RTDB in "open" mode but is insecure in production. When you add proper RTDB security rules (restricting writes to authenticated users), the server-side REST calls will break unless they carry an auth token. The Admin SDK handles this transparently.

---

### Supporting Libraries (Optional / Conditional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `msw` (Mock Service Worker) | 2.12.10 | Mock Next.js API routes in Jest tests | Only if you want to test React components that call the game API; allows intercepting `fetch('/api/action')` in tests without a running server (verified npm) |
| `zod` | ^3 | Runtime validation of incoming API payloads | Use when adding server-side action processing — validates that the action type and parameters from the client match the `GameAction` type before passing to the engine |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Playwright | Cypress | No multi-context support (needed for 2-player tests in same test run); missing Safari/WebKit; slightly slower per test |
| Playwright | Puppeteer | No built-in test runner, no multi-browser, requires more boilerplate |
| Server-side state filtering | Firebase Security Rules filtering | RTDB rules cannot do field-level value substitution; they are path-level access controls only |
| firebase-admin for server writes | Continue using plain REST fetch | Plain REST requires manual token management once security rules are tightened; Admin SDK handles auth transparently |
| @testing-library/react | Enzyme | Enzyme is effectively unmaintained for React 18+; RTL is the ecosystem standard |
| Keep Jest | Migrate to Vitest | Existing Jest+ts-jest setup works; migration cost exceeds benefit mid-project |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `boardgame.io` | The game engine is already written and tested (57 tests in engine.test.ts). Adopting boardgame.io would require a full rewrite of working code. It's designed for greenfield games. | Keep existing custom engine |
| Firestore (instead of RTDB) | Already on RTDB; migrating would require rewriting both `firebase.ts` and `firebase.client.ts` with no gameplay benefit | Keep Firebase RTDB |
| Socket.io / custom WebSocket | Firebase RTDB already provides real-time sync via `onValue`; adding a second real-time layer creates complexity and cost | Keep RTDB `onValue` subscriptions |
| Client-side state filtering | Hiding opponent cards on the client is security theater — any player can read the raw Firebase data via browser devtools | Server-side filtering only, before state leaves the API route |
| `@firebase/testing` (v0.20.11) | This package is deprecated; replaced by `@firebase/rules-unit-testing` | `@firebase/rules-unit-testing` ^5.0.0 |

---

## Installation

```bash
# Testing additions
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# E2E testing
npm install -D @playwright/test
npx playwright install  # Downloads browser binaries

# Firebase emulator (global recommended for CLI usage)
npm install -g firebase-tools
# or use npx: npx firebase-tools emulators:start

# Firebase Rules testing (against emulator)
npm install -D @firebase/rules-unit-testing

# Firebase Admin SDK (server-side trusted writes)
npm install firebase-admin

# Optional: API mocking for component tests
npm install -D msw

# Optional: Runtime validation
npm install zod
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@testing-library/react@16.3.2` | React 18.x | v16 requires React 18; confirmed compatible with Next.js 14 |
| `jest-environment-jsdom@30.2.0` | Jest 29.x | Version aligned with jest ^29 already in devDependencies |
| `@playwright/test@1.58.2` | Node.js 18+ | Works with Next.js 14 dev server; requires separate `playwright.config.ts` |
| `firebase-admin@13.6.1` | Node.js 18+ | Must only be imported in server-side code (API routes, not client components) |
| `@firebase/rules-unit-testing@5.0.0` | Firebase emulator (requires running emulator process) | Used with `initializeTestEnvironment()` |

---

## Jest Config Split Strategy

The existing `jest.config.js` uses `testEnvironment: node` which is correct for game engine tests. For React component tests, you need a separate config or a per-file override:

```javascript
// jest.config.js — updated to support both environments
module.exports = {
  projects: [
    {
      displayName: 'engine',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/lib/**/*.test.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    },
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/components/**/*.test.tsx'],
      setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    },
  ],
};
```

This keeps engine tests fast (no DOM overhead) while enabling component tests.

---

## Stack Patterns by Variant

**For unit testing game engine logic (existing pattern, keep as-is):**
- Jest + ts-jest + `testEnvironment: node`
- Pure function tests, no DOM, no Firebase
- Fast: ~50ms for the full suite

**For component testing (new pattern):**
- Jest + `jest-environment-jsdom` + `@testing-library/react`
- Mock Firebase subscriptions with Jest mocks or `msw`
- Target: GameBoard rendering, card reveal UI, action button states

**For E2E multiplayer scenario testing (new pattern):**
- Playwright with multi-context for 2-player scenarios
- Run against `next dev` + Firebase emulator (`emulators:start`)
- Target: full action→response→resolution flows with two browser sessions

**For Firebase security rule testing:**
- `@firebase/rules-unit-testing` + emulator running locally
- Test that Player A cannot read Player B's hidden cards from RTDB
- Run as a separate test suite, not in the main Jest config

---

## Sources

- npm registry (verified 2026-02-23): `@testing-library/react@16.3.2`, `firebase-admin@13.6.1`, `@playwright/test@1.58.2`, `@testing-library/jest-dom@6.9.1`, `@testing-library/user-event@14.6.1`, `jest-environment-jsdom@30.2.0`, `msw@2.12.10`, `boardgame.io@0.50.2`, `@firebase/rules-unit-testing@5.0.0`
- [Firebase Emulator Suite: Connect RTDB](https://firebase.google.com/docs/emulator-suite/connect_rtdb) — connectDatabaseEmulator API, port 9000 default (MEDIUM confidence: content partially inaccessible via WebFetch; cross-verified via community sources)
- [Firebase Emulator Setup](https://firebase.google.com/docs/emulator-suite/install_and_configure) — Java 11+ requirement, Node 16+ requirement, CLI 8.14.0+
- [Playwright vs Cypress 2025 comparison](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown) — multi-context advantage for Playwright (MEDIUM confidence: secondary source)
- [Firebase Security Rules overview](https://firebase.google.com/docs/database/security) — path-level access control model confirmed; field-level filtering not supported
- [Firebase Admin SDK bypass behavior](https://firebase.blog/posts/2019/03/firebase-security-rules-admin-sdk-tips/) — Admin SDK bypasses security rules by design
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security) — filter sensitive data in server-side DAL before client delivery

---

*Stack research for: Coup online multiplayer board game (subsequent milestone — testing, local dev, security)*
*Researched: 2026-02-23*
