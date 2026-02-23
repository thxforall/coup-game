# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Client-Server with Real-Time Synchronization

The Coup game uses a Next.js full-stack architecture with a dual-database strategy:
- **Server Layer:** Firebase REST API for state mutations (POST/PATCH)
- **Client Layer:** Firebase SDK for real-time subscriptions (onValue)
- **State Management:** Centralized immutable game state stored in Firebase Realtime Database

This separation allows stateless server functions while maintaining instant client sync across all players in a room.

**Key Characteristics:**
- Immutable game state updates (pure functions returning new state)
- Turn-based action processing through API routes
- Real-time state propagation via Firebase listeners
- Phase-based game progression (waiting → action → response → resolution)
- Deterministic game logic with no client-side state mutations

## Layers

**Presentation Layer:**
- Purpose: User interface and player interaction
- Location: `components/game/`
- Contains: React components for game board, modals, action panels, event logs
- Depends on: Game state from Firebase, action submission callbacks
- Used by: Game page component `app/game/[roomId]/page.tsx`

**Game Logic Layer:**
- Purpose: Core rule enforcement and state transitions
- Location: `lib/game/engine.ts`, `lib/game/types.ts`
- Contains: Pure functions that compute new game state from actions
- Depends on: Game type definitions, no external services
- Used by: Action API route `app/api/game/action/route.ts`

**API Layer:**
- Purpose: Stateless request handlers for game actions
- Location: `app/api/game/`
- Contains: Route handlers for create, join, start, action endpoints
- Depends on: Firebase persistence layer, game engine
- Used by: Client page components

**Persistence Layer:**
- Purpose: Database communication
- Location: `lib/firebase.ts` (server), `lib/firebase.client.ts` (client)
- Contains: Firebase REST API wrappers (server) and SDK wrappers (client)
- Depends on: Firebase configuration from environment
- Used by: API routes (server) and page components (client)

**Utility Layer:**
- Purpose: Audio feedback and type definitions
- Location: `lib/audio.ts`, `lib/useGameAudio.ts`
- Contains: Audio player logic, React hook for audio state synchronization
- Depends on: Game state and phase changes
- Used by: Game board component

## Data Flow

**Game Creation Flow:**

1. Player submits nickname on lobby (`app/page.tsx`)
2. Client calls `POST /api/game/create` with playerName and playerId
3. API handler generates 4-letter room code and creates initial GameState
4. Server writes to Firebase: `game_rooms/{roomId}/state`
5. API returns roomId, client navigates to `/game/{roomId}`
6. Page component subscribes via `subscribeToRoom()` and renders waiting room

**Game Action Flow:**

1. Current player clicks action button (GameBoard component)
2. `onAction()` callback posts to `POST /api/game/action`
3. Server calls `getRoom(roomId)` to fetch current state
4. Server invokes appropriate game engine function:
   - `processAction()` - parses action, validates rules, creates pending action
   - `processResponse()` - handles challenge/block/pass
   - `processBlockResponse()` - handles block challenges
   - `processLoseInfluence()` - handles card reveals
   - `processExchangeSelect()` - handles ambassador card selection
5. Engine returns new GameState
6. Server updates Firebase via `updateRoom()`
7. Firebase triggers all subscribed clients via `onValue` listeners
8. UI re-renders with new state automatically

**Turn Progression:**

1. Current player in 'action' phase selects action
2. State transitions to 'awaiting_response' phase, all other players see response prompts
3. Each player responds with challenge/block/pass
4. Engine resolves based on responses (challenge verification, block success/failure)
5. If action succeeds, it's executed, state transitions to next phase or next turn
6. Next alive player becomes current turn, phase returns to 'action'

**State Snapshot:**

```
GameState {
  players: [{ id, name, coins, cards: [{character, revealed}], isAlive, isReady }, ...]
  currentTurnId: string              // Who's playing now
  phase: GamePhase                    // waiting|action|awaiting_response|...
  deck: Character[]                   // Remaining cards in draw pile
  pendingAction: {                    // Current action being contested
    type: ActionType
    actorId: string
    targetId?: string
    responses: { [playerId]: ResponseType | null }  // Null = not yet responded
    blockerId?: string
    blockerCharacter?: Character      // Character blocker claims
    losingPlayerId?: string           // Who must choose card to reveal
    exchangeCards?: Character[]       // Cards drawn for ambassador exchange
  } | null
  log: string[]                       // Game event history
  winnerId?: string
}
```

## Key Abstractions

**GameState:**
- Purpose: Single source of truth for all game information
- Examples: Used in `lib/game/engine.ts`, API routes, React components
- Pattern: Immutable updates via pure functions; never mutated directly

**Game Engine Functions:**
- Purpose: Pure functions that validate and compute state transitions
- Examples: `processAction()`, `processResponse()`, `processChallenge()` in `lib/game/engine.ts`
- Pattern: Input state + action → Output new state; throw errors on invalid moves

**Phase Machine:**
- Purpose: Control flow for game progression
- Pattern: Explicit phase enum in `GamePhase` type; each phase has allowed actions

**Player Cards:**
- Purpose: Track character roles and reveal status
- Pattern: Array of Card objects; card.revealed = true means player lost that influence

## Entry Points

**Lobby Page:**
- Location: `app/page.tsx`
- Triggers: Browser navigates to `/`, user creates/joins game
- Responsibilities: Collect player name, generate/accept room code, manage localStorage for player identity

**Game Page:**
- Location: `app/game/[roomId]/page.tsx`
- Triggers: User navigates to `/game/{roomId}`
- Responsibilities: Subscribe to Firebase, route to WaitingRoom or GameBoard, collect playerId from localStorage

**API Route Handlers:**
- Create Room: `app/api/game/create/route.ts` - generates room, initializes state
- Join Room: `app/api/game/join/route.ts` - adds player to existing room
- Start Game: `app/api/game/start/route.ts` - initializes cards and deck when all players ready
- Action Handler: `app/api/game/action/route.ts` - processes all game actions, delegates to engine functions

## Error Handling

**Strategy:** Fail-safe validation at multiple layers

**Patterns:**
- API routes validate request body and return 400/403/404 with error messages
- Game engine throws errors on rule violations (e.g., "코인이 10개 이상이면 쿠를 해야 합니다")
- API catches engine errors and returns to client with error message
- Client displays error in UI (GameToast or error state)
- Firebase failures are not caught; assume network failure and retry on next request

## Cross-Cutting Concerns

**Logging:** Event log appended to GameState.log on every action; displayed in EventLog component

**Validation:**
- Engine functions validate: action validity, coin sufficiency, target existence, phase appropriateness
- API routes validate: required fields, authentication (current turn check), authorization (card losing player)

**Authentication:**
- Players identified by localStorage playerId (client-generated UUID)
- No backend auth; relies on client honesty + API turn/phase checks
- All players can read entire game state; only current player/designated player can act

---

*Architecture analysis: 2026-02-23*
