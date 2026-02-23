# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Jest 29.x
- Config: `jest.config.js`
- Preset: `ts-jest` for TypeScript support

**Assertion Library:**
- Built-in Jest matchers (expect API)

**Run Commands:**
```bash
npm test                    # Run all tests with verbose output
npm run build              # Build (includes type checking)
npm run lint               # Run linting via next lint
```

**Configuration (`jest.config.js`):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

## Test File Organization

**Location:**
- Co-located with source files: `lib/game/engine.test.ts` is paired with `lib/game/engine.ts`

**Naming:**
- Pattern: `[filename].test.ts`
- Test file for `engine.ts` → `engine.test.ts`

**Structure:**
```
lib/
├── game/
│   ├── engine.ts          # Game logic implementation
│   ├── engine.test.ts     # Tests for game logic
│   └── types.ts           # Type definitions
└── firebase.ts            # Firebase utilities (no tests)
```

**Coverage:**
- Game engine fully tested: 687 lines of test code covering all game phases
- No other files currently tested (game logic is primary test focus)

## Test Structure

**Suite Organization:**
```typescript
describe('기본 액션', () => {
  test('income: 코인 +1, 즉시 다음 턴', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'income' });
    expect(alice.coins).toBe(3);
  });
});

describe('도전 (Challenge)', () => {
  test('tax 도전 성공 (블러프) → 행동자 카드 잃음, 행동 취소', () => {
    // ... test body
  });
});
```

**Patterns:**
- Top-level `describe()` blocks group related tests by game feature
- Each test has a descriptive name in Korean explaining the scenario
- Test names follow pattern: `[action]: [expected outcome]`

**Setup:**
- Helper function `createTestState()` creates deterministic initial game state with 3 players
- Helper function `allPass()` simulates all players passing response in awaiting phases
- Tests override state properties as needed using spread operator

**Example setup pattern from `lib/game/engine.test.ts`:**
```typescript
function createTestState(overrides?: Partial<GameState>): GameState {
  const players: Player[] = [
    { id: 'p1', name: 'Alice', coins: 2, cards: [...], isAlive: true, isReady: true },
    { id: 'p2', name: 'Bob', coins: 2, cards: [...], isAlive: true, isReady: true },
    { id: 'p3', name: 'Charlie', coins: 2, cards: [...], isAlive: true, isReady: true },
  ];

  return {
    players,
    currentTurnId: 'p1',
    phase: 'action',
    deck: ['Captain', 'Contessa', ...],
    pendingAction: null,
    log: ['게임이 시작되었습니다!'],
    ...overrides,
  };
}
```

**Teardown:**
- No explicit teardown needed; each test creates fresh state
- Immutable state updates mean no cleanup required

## Test Structure Examples

**Basic action test:**
```typescript
test('income: 코인 +1, 즉시 다음 턴', () => {
  const state = createTestState();
  const result = processAction(state, 'p1', { type: 'income' });

  const alice = getPlayer(result, 'p1');
  expect(alice.coins).toBe(3);
  expect(result.currentTurnId).toBe('p2');
  expect(result.phase).toBe('action');
  expect(result.pendingAction).toBeNull();
});
```

**Complex scenario with state progression:**
```typescript
test('tax 도전 실패 (진짜) → 도전자 카드 잃음, 행동 실행', () => {
  const state = createTestState();
  let s = processAction(state, 'p1', { type: 'tax' });
  s = processResponse(s, 'p2', 'challenge');

  const bob = getPlayer(s, 'p2');
  expect(bob.cards.some(c => c.revealed)).toBe(true);
  const alice = getPlayer(s, 'p1');
  expect(alice.coins).toBe(5);
  expect(s.currentTurnId).toBe('p2');
});
```

## Mocking

**Framework:** Not explicitly used in current tests

**Approach:**
- Tests use pure functions and deterministic state
- No external dependencies mocked (Firebase not tested)
- Game logic tested in isolation by controlling state input

**What to Mock (if needed in future):**
- Firebase API calls (already separated to `lib/firebase.ts`)
- Sound manager (`lib/audio.ts`)

**What NOT to Mock:**
- Game state objects: Use real state structures for integration testing
- Helper functions: Core functions like `getPlayer()` should run as-is for accurate testing

## Fixtures and Factories

**Test Data:**
The test file provides factory functions for generating consistent test data:

```typescript
function createTestState(overrides?: Partial<GameState>): GameState {
  // Creates 3-player game with specific card distribution
}

function allPass(state: GameState): GameState {
  // Simulates all players passing through response phases
}
```

**Custom State Builders:**
Tests use inline state modifications for specific scenarios:

```typescript
const state = createTestState({
  players: createTestState().players.map(p =>
    p.id === 'p1' ? { ...p, coins: 7 } : p
  ),
});
```

**Location:**
- Fixtures defined in test file itself (lines 14-70 of `engine.test.ts`)
- No separate fixtures directory

## Coverage

**Requirements:** Not enforced; no coverage threshold in jest.config.js

**Current Coverage:**
- `lib/game/engine.ts`: Comprehensive coverage including:
  - All action types (income, foreignAid, coup, tax, assassinate, steal, exchange)
  - Challenge scenarios (success and failure cases)
  - Block scenarios (valid, invalid, bluff)
  - Block challenge scenarios (blocking player truthful vs bluffing)
  - Card loss and elimination
  - Ambassador exchange mechanics
  - Edge cases (10+ coins forcing coup, player elimination, game over detection)
  - Complex multi-turn scenarios

- `lib/game/types.ts`: Not tested (type definitions only)
- Components: Not tested
- API routes: Not tested
- `lib/firebase.ts`: Not tested (external API wrapper)
- `lib/useGameAudio.ts`: Not tested
- `lib/audio.ts`: Not tested

## Test Types

**Unit Tests:**
- Scope: Individual game engine functions (`processAction`, `processResponse`, `processBlockResponse`, etc.)
- Approach: Test single function behavior with various inputs
- Examples: Basic action tests, individual challenge scenarios

**Integration Tests:**
- Scope: Multi-step game scenarios involving action → response → resolution
- Approach: Chain multiple function calls together, verify final state
- Examples: "challenge → elimination → turn skip" compound scenario, full turn rotation

**E2E Tests:**
- Framework: Not implemented
- Would need: Browser automation (Cypress, Playwright) + server running
- Current: Manual testing via UI components

## Common Patterns

**Async Testing:**
- No async tests in current suite (game logic is synchronous)
- If needed: Jest supports `async/await` and returns Promise

**Error Testing:**
```typescript
test('coup: 코인 부족 시 에러', () => {
  const state = createTestState();
  expect(() =>
    processAction(state, 'p1', { type: 'coup', targetId: 'p2' })
  ).toThrow('코인 7개 필요');
});

test('타겟 없이 대상이 필요한 액션 사용 시 에러', () => {
  const state = createTestState();
  expect(() =>
    processAction(state, 'p1', { type: 'assassinate' })
  ).toThrow('대상이 필요합니다');
});
```

**State Assertion Pattern:**
```typescript
const result = processAction(state, 'p1', { type: 'income' });
const alice = getPlayer(result, 'p1');
expect(alice.coins).toBe(3);              // Check state change
expect(result.currentTurnId).toBe('p2');  // Check side effects
expect(result.phase).toBe('action');      // Check phase
expect(result.pendingAction).toBeNull();  // Check pending state
```

**Multi-step scenarios:**
```typescript
let s = createTestState();
s = processAction(s, 'p1', { type: 'tax' });
s = processResponse(s, 'p2', 'block', 'Duke');
s = allPass(s);  // Everyone else passes
expect(s.phase).toBe('action');
```

## Test Coverage Summary

**Total Tests:** ~55 test cases across 7 describe blocks

**Test Distribution:**
- Basic Actions: 10 tests (income, foreignAid, coup, tax, steal, assassinate, exchange)
- Challenge Scenarios: 6 tests (success/failure for tax, assassinate, steal, exchange)
- Block Scenarios: 5 tests (various block attempts and bluffs)
- Block Challenge: 5 tests (block resolution with challenges)
- Card Loss & Exchange: 3 tests (influence loss, elimination, ambassador exchange)
- Edge Cases: 5 tests (10+ coin forcing, elimination detection, game over, validation)
- Complex Scenarios: 1 test suite with multiple compound scenarios (6+ tests)

---

*Testing analysis: 2026-02-23*
