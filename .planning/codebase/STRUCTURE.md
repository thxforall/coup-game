# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
coup/
├── app/                        # Next.js app router directory
│   ├── api/
│   │   └── game/              # Game API routes
│   │       ├── create/        # Create new game room
│   │       ├── join/          # Join existing room
│   │       ├── start/         # Start game (initialize deck/cards)
│   │       └── action/        # Process player actions
│   ├── game/
│   │   └── [roomId]/          # Dynamic game page per room
│   ├── page.tsx               # Lobby page
│   ├── layout.tsx             # Root layout with metadata
│   └── globals.css            # Global Tailwind + custom CSS
├── components/
│   └── game/                  # Reusable game UI components
│       ├── GameBoard.tsx      # Main game board layout
│       ├── GameToast.tsx      # Toast notifications
│       ├── WaitingRoom.tsx    # Pre-game lobby display
│       ├── PlayerArea.tsx     # Opponent player display
│       ├── MyPlayerArea.tsx   # Current player's hand/coins display
│       ├── ActionPanel.tsx    # Action buttons for current player
│       ├── ResponseModal.tsx  # Challenge/block decision UI
│       ├── CardSelectModal.tsx # Card reveal selection UI
│       ├── ExchangeModal.tsx  # Ambassador card exchange UI
│       └── EventLog.tsx       # Game event history display
├── lib/                       # Shared utilities and business logic
│   ├── game/
│   │   ├── engine.ts         # Core game state machine
│   │   ├── engine.test.ts    # Game engine tests
│   │   └── types.ts          # TypeScript type definitions
│   ├── firebase.ts           # Server-side Firebase REST API wrapper
│   ├── firebase.client.ts    # Client-side Firebase SDK wrapper
│   ├── audio.ts              # Audio player implementation
│   └── useGameAudio.ts       # React hook for audio feedback
├── migrations/               # Database migration files (if any)
├── jest.config.js           # Jest testing configuration
├── next.config.js           # Next.js build configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies and scripts
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components, layout definitions, API handlers
- Key files: `page.tsx` (lobby), `layout.tsx` (root wrapper), `api/game/` (endpoints)

**app/api/game/:**
- Purpose: Backend API endpoints for game operations
- Contains: POST/PATCH handlers for game state mutations
- Key files: `create/route.ts`, `join/route.ts`, `start/route.ts`, `action/route.ts`

**app/game/[roomId]/:**
- Purpose: Dynamic game room pages served per roomId
- Contains: Single page component that subscribes to room and renders UI
- Key files: `page.tsx` (fetches state, routes to WaitingRoom or GameBoard)

**components/game/:**
- Purpose: Reusable React components for game UI
- Contains: Presentation-only components (no API calls, only callbacks)
- Key files: GameBoard (main layout), ResponseModal (decision UI), EventLog (history)

**lib/game/:**
- Purpose: Core game logic and type system
- Contains: Pure state transition functions, type definitions, tests
- Key files: `engine.ts` (state machine), `types.ts` (GameState/Player/Action definitions), `engine.test.ts` (test suite)

**lib/:**
- Purpose: Shared utilities across app and server
- Contains: Firebase client/server wrappers, audio hook, type exports
- Key files: `firebase.ts` (server REST), `firebase.client.ts` (client SDK), `audio.ts`, `useGameAudio.ts`

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Lobby - create or join game
- `app/game/[roomId]/page.tsx`: Game room - main player experience
- `app/layout.tsx`: Root HTML structure and metadata

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` → project root)
- `next.config.js`: Next.js build settings
- `jest.config.js`: Jest runner configuration
- `tailwind.config.js`: Tailwind CSS color/style configuration
- `package.json`: Dependencies (Next.js, React, Firebase, Jest, etc.)

**Core Logic:**
- `lib/game/types.ts`: All game type definitions (GameState, Player, ActionType, etc.)
- `lib/game/engine.ts`: Pure functions for state transitions (processAction, processResponse, etc.)
- `lib/firebase.ts`: Server-side database reads/writes via REST API
- `lib/firebase.client.ts`: Client-side real-time subscriptions via Firebase SDK

**Testing:**
- `lib/game/engine.test.ts`: Unit tests for game engine functions

## Naming Conventions

**Files:**
- Components: PascalCase, single word or compound (GameBoard.tsx, ActionPanel.tsx)
- Pages: index or route name in brackets (page.tsx, route.ts for [roomId])
- Utilities: camelCase (firebase.ts, useGameAudio.ts)
- Tests: *.test.ts or *.spec.ts suffix

**Directories:**
- Feature folders lowercase (api/game, components/game, lib/game)
- Dynamic routes in brackets ([roomId], [id])
- Grouped by concern (api, components, lib)

**Variables/Functions:**
- camelCase for variables and functions (processAction, getRoom, currentTurnId)
- PascalCase for types and interfaces (GameState, ActionType, Player)
- UPPERCASE_SNAKE_CASE for constants (CHARACTER_NAMES, BLOCK_CHARACTERS, ALL_CHARACTERS)
- Underscore prefix for private/internal utilities (_helpers, _internal)

## Where to Add New Code

**New Feature (e.g., spectator mode, chat):**
- Primary code: `lib/` for logic, `components/game/` for UI if needed
- Tests: `lib/game/engine.test.ts` if game logic, or colocated `.test.tsx` for components
- Types: Update `lib/game/types.ts` with new interface
- API: Add new route in `app/api/game/` if backend state needed

**New Component/Module:**
- Implementation: `components/game/` if reusable UI, `lib/` if utility
- Pattern: Default export from component file, props interface above component definition
- Usage example: Import in GameBoard or page component with TypeScript types

**New Game Action (e.g., influence swap):**
- Type definition: Add to ActionType union in `lib/game/types.ts`
- Logic: Add `process[ActionName]()` function in `lib/game/engine.ts`
- Handler: Add case in switch statement in `app/api/game/action/route.ts`
- UI: Add button/modal in `components/game/ActionPanel.tsx` or ResponseModal.tsx
- Tests: Add test cases in `lib/game/engine.test.ts`

**Utilities:**
- Shared helpers: `lib/[feature].ts` (e.g., lib/audio.ts, lib/validation.ts)
- React hooks: `lib/use[Name].ts` (e.g., lib/useGameAudio.ts)
- Type exports: Always include in `lib/game/types.ts` or dedicated types file

## Special Directories

**lib/game/:**
- Purpose: Self-contained game engine (can be extracted to separate package)
- Generated: No
- Committed: Yes
- No external dependencies except TypeScript types

**app/api/:**
- Purpose: Server-only route handlers
- Generated: No
- Committed: Yes
- Only runs on server; can access environment secrets

**components/game/:**
- Purpose: UI components marked with 'use client' for interactivity
- Generated: No
- Committed: Yes
- No direct database access; uses callbacks to parent

**.next/:**
- Purpose: Build output from `next build`
- Generated: Yes (created at build time)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (via npm install)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-23*
