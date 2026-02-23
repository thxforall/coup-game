# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `GameBoard.tsx`, `ActionPanel.tsx`, `MyPlayerArea.tsx`)
- Type definition files: camelCase with `.types.ts` suffix (e.g., `types.ts` in `lib/game/`)
- Utility/hook files: camelCase (e.g., `useGameAudio.ts`, `audio.ts`, `firebase.ts`)
- API routes: kebab-case following Next.js app router convention (e.g., `app/api/game/create/route.ts`)

**Functions:**
- Component functions: PascalCase, exported as default (e.g., `export default function GameBoard()`)
- Regular functions: camelCase (e.g., `getPlayer()`, `processAction()`, `generateRoomId()`)
- Helper functions: camelCase, often prefixed with action verb (e.g., `addLog()`, `nextTurn()`, `hasCharacter()`)
- Private functions: camelCase with no special prefix, just not exported (e.g., `shuffle()`, `removeFirstLiveCard()`)

**Variables:**
- Constants (game rules, configs): UPPER_SNAKE_CASE or camelCase depending on use (e.g., `ALL_CHARACTERS`, `CHARACTER_NAMES`)
- React state: camelCase with useState hook (e.g., `targetId`, `setTargetId`, `loading`, `setLoading`)
- Object variables: camelCase (e.g., `actor`, `responder`, `pendingAction`)

**Types:**
- Type names: PascalCase (e.g., `GameState`, `Player`, `Character`, `PendingAction`)
- Type aliases for unions: PascalCase (e.g., `ActionType`, `ResponseType`, `GamePhase`)
- Interfaces: PascalCase with `I` prefix NOT used (e.g., `interface Props`, `interface Card`)

## Code Style

**Formatting:**
- No explicit formatter configured (eslint present but no `.prettierrc` or Prettier config)
- Indentation: 2 spaces (observed throughout codebase)
- Line length: No strict limit enforced, but generally concise
- Trailing commas: Used in multi-line objects/arrays

**Linting:**
- Tool: ESLint 8.x with Next.js preset (`eslint-config-next`)
- Config: `next lint` command available in package.json
- No custom `.eslintrc` configuration file found; uses Next.js defaults

**Semicolons:**
- Always used at end of statements
- Used in type declarations and imports

## Import Organization

**Order:**
1. External libraries (React, Next.js, Firebase)
2. Type imports (`import { GameState, Character }`)
3. Utility/lib imports (`import { processAction }`)
4. Component imports (relative imports starting with `./`)

**Path Aliases:**
- Alias configured: `@/*` → `./*` (tsconfig.json)
- Used throughout: `@/lib/game/types`, `@/lib/firebase`, `@/lib/useGameAudio`
- Always use absolute path aliases instead of relative paths for non-component files

**Example from `GameBoard.tsx`:**
```typescript
import { GameState, Character, CHARACTER_NAMES } from '@/lib/game/types';
import { useGameAudio } from '@/lib/useGameAudio';
import PlayerArea from './PlayerArea';
```

## Error Handling

**Patterns:**
- Throw errors with descriptive messages in helper functions (e.g., `throw new Error('Player not found')`)
- API routes return `NextResponse.json()` with `{ error: message }` and HTTP status codes
- Unknown error types cast with `instanceof Error` check (e.g., `err instanceof Error ? err.message : String(err)`)
- Validation happens early with guard clauses returning error responses

**Example from `app/api/game/action/route.ts`:**
```typescript
if (!roomId || !playerId || !action) {
  return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
}

try {
  // ... action processing
} catch (err: unknown) {
  return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 400 });
}
```

## Logging

**Framework:** console object

**Patterns:**
- Game events logged to `GameState.log` array (string array)
- Console logging used for errors: `console.error('[CREATE ROOM ERROR]', msg)`
- Log messages include emojis for visual clarity in game logs (e.g., `'🏆 ${player.name}이(가) 승리했습니다!'`)
- Log messages in Korean with grammatical particles like `이(가)`, `에게`, `을(를)`, `으로`

**Example from `lib/game/engine.ts`:**
```typescript
function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [...state.log, msg] };
}

s = addLog(s, `${actor.name}이(가) 외국 원조를 받았습니다 (+2 코인)`);
```

## Comments

**When to Comment:**
- Section headers: Large functions divided into logical sections with comment banners (e.g., `// ============================================================`)
- Clarification: When non-obvious logic needs explanation
- Game rule notes: Business logic comments explaining Coup game rules (e.g., `// 암살의 경우 코인 환불 안함 (공식 룰)`)
- NOT used for obvious code (e.g., variable assignments, simple loops)

**JSDoc/TSDoc:**
- Minimal use; mainly on exported public functions
- Example from `lib/useGameAudio.ts`:
```typescript
/**
 * 게임 상태 변화를 감지하여 자동으로 효과음을 재생하는 훅
 */
export function useGameAudio(state: GameState | null, playerId: string) {
```

**Comment Style:**
- Section dividers: `// ============================================================`
- Inline comments: Use sparingly, prefer self-documenting code
- Korean language for domain-specific comments

## Function Design

**Size:**
- Generally compact functions (20-50 lines)
- Complex logic broken into helper functions (e.g., `resolveChallenge()`, `executeAction()`)
- Pure functions preferred where possible (e.g., `processAction()` returns new state, doesn't mutate)

**Parameters:**
- Most game logic functions take `state: GameState` as first parameter
- Additional parameters are specific IDs or action details
- Props interfaces named `Props` in React components
- Destructuring used in function signatures (e.g., `{ state, playerId, onAction }`)

**Return Values:**
- Game logic functions return new `GameState` (immutable pattern)
- Helper functions return specific types (e.g., `Player`, `boolean`, `string`)
- API routes return `NextResponse` object

**Example from `lib/game/engine.ts`:**
```typescript
export function processAction(
  state: GameState,
  actorId: string,
  action: { type: ActionType; targetId?: string }
): GameState {
  // ... computation
  return nextTurn(s);
}
```

## Module Design

**Exports:**
- Lib files export multiple named functions: `export function getRoom()`, `export async function createRoom()`
- Components export single default function: `export default function GameBoard()`
- Type files export all type/interface definitions as named exports

**Barrel Files:**
- NOT extensively used; components import directly from specific files
- Single barrel file pattern: `index.ts` would be optional but not currently in use

**Code Organization:**
- State immutability: All state updates create new objects rather than mutating
- Pure functions: Game engine functions are pure (no side effects beyond state return)
- Separation of concerns: Game logic in `lib/game/`, UI in `components/game/`, API in `app/api/`

**Immutable Pattern Example from `lib/game/engine.ts`:**
```typescript
const updatedPlayers = s.players.map((p) =>
  p.id === actorId ? { ...p, coins: p.coins + 1 } : p
);
s = addLog({ ...s, players: updatedPlayers }, 'message');
```

---

*Convention analysis: 2026-02-23*
