# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**Firebase:**
- Firebase Realtime Database - Game state persistence and real-time synchronization
  - SDK/Client: `firebase` ^11.3.1
  - Implementation: Dual approach
    - Server: REST API via fetch (`lib/firebase.ts`) for server-side operations
    - Client: SDK `onValue()` subscriptions (`lib/firebase.client.ts`) for real-time updates
  - Auth: Public (no authentication required; uses database rules)

## Data Storage

**Databases:**
- Firebase Realtime Database (NoSQL)
  - Connection: `NEXT_PUBLIC_FIREBASE_DATABASE_URL` environment variable
  - Client: Firebase SDK (`firebase/database`)
  - Data structure: `game_rooms/{roomId}` → `{ state: GameState }`

**File Storage:**
- None - Audio files loaded from public assets

**Caching:**
- None - Firebase provides real-time synchronization instead

## Authentication & Identity

**Auth Provider:**
- Custom session-based identity (no dedicated auth provider)
  - Implementation: Player ID and name passed in API requests
  - Session: Ephemeral, tied to room membership
  - Files: `app/api/game/create/route.ts`, `app/api/game/join/route.ts`

## Monitoring & Observability

**Error Tracking:**
- None - Basic error logging to console

**Logs:**
- Console logging for development and server-side errors
  - Pattern: `console.error('[CONTEXT]', message)` in API routes
  - Client-side: Game action logs stored in `GameState.log` array

## CI/CD & Deployment

**Hosting:**
- Not detected - Infrastructure setup not configured

**CI Pipeline:**
- None - No GitHub Actions or other CI/CD detected

**Current Deployment Strategy:**
- Next.js development server: `npm run dev`
- Production build: `npm run build && npm start`
- Suitable for Vercel, traditional Node.js servers, or serverless platforms

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket (used by SDK)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` - Firebase Realtime Database URL (critical for both client and server)

**Secrets location:**
- `.env.local` (not committed, must be set in deployment environment)
- Example provided: `.env.local.example`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None - Firebase Realtime Database handles all state synchronization

## API Routes

**Game Management:**
- `POST /api/game/create` - Create new game room (`app/api/game/create/route.ts`)
  - Consumes: `createRoom()` from `lib/firebase.ts` (REST API)
  - Returns: `{ roomId }`

- `POST /api/game/join` - Join existing game room (`app/api/game/join/route.ts`)
  - Consumes: `getRoom()`, `updateRoom()` from `lib/firebase.ts` (REST API)
  - Returns: `{ roomId }`

- `POST /api/game/start` - Initialize and start game (`app/api/game/start/route.ts`)
  - Consumes: `getRoom()`, `updateRoom()` from `lib/firebase.ts` (REST API)
  - Dependencies: Game engine initialization

- `POST /api/game/action` - Process player action (`app/api/game/action/route.ts`)
  - Consumes: `getRoom()`, `updateRoom()` from `lib/firebase.ts` (REST API)
  - Dependencies: Game engine action processor

## Real-time Synchronization

**Client-side:**
- `subscribeToRoom(roomId, callback)` in `lib/firebase.client.ts`
  - Uses Firebase SDK `onValue()` for real-time updates
  - Unsubscribe function returned for cleanup
  - Used in `app/game/[roomId]/page.tsx` for live game state updates

**Server-side:**
- One-time reads via REST API `fetch()` in `lib/firebase.ts`
- No long-polling or WebSocket connections on server

## Browser APIs

**Client-side Features:**
- Web Vibration API (`navigator.vibrate()`)
  - Purpose: Haptic feedback for game events
  - Implementation: `lib/useGameAudio.ts` with intensity levels (light/medium/heavy)

---

*Integration audit: 2026-02-23*
