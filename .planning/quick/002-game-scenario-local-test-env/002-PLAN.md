---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/test-helpers.ts
  - lib/game/scenarios.test.ts
autonomous: true

must_haves:
  truths:
    - "All 7 action types are tested end-to-end (income, foreignAid, coup, tax, assassinate, steal, exchange)"
    - "Every challengeable action has both successful and failed challenge paths tested"
    - "Every blockable action has block + block-challenge paths tested"
    - "Multi-turn scenarios test elimination, turn skipping, and game_over"
    - "Test helpers make writing new scenarios trivial (few lines per scenario)"
  artifacts:
    - path: "lib/game/test-helpers.ts"
      provides: "Reusable scenario test DSL and helpers"
      exports: ["scenario", "createPlayers", "act", "respond", "blockRespond", "loseInfluence", "exchangeSelect", "expectState"]
    - path: "lib/game/scenarios.test.ts"
      provides: "Comprehensive end-to-end scenario tests"
      min_lines: 400
  key_links:
    - from: "lib/game/scenarios.test.ts"
      to: "lib/game/engine.ts"
      via: "imports processAction, processResponse, processBlockResponse, processLoseInfluence, processExchangeSelect"
      pattern: "import.*from.*engine"
    - from: "lib/game/test-helpers.ts"
      to: "lib/game/engine.ts"
      via: "wraps engine functions in fluent API"
      pattern: "import.*from.*engine"
---

<objective>
Build a scenario test DSL and comprehensive end-to-end game scenario tests for the Coup engine.

Purpose: The existing 58 unit tests cover individual functions well, but lack full game flow coverage. Scenario tests validate complete game sequences (action -> response -> resolution -> next turn) and catch integration bugs between engine phases.

Output: A test helper module with fluent API for writing scenarios, and a test file covering all action/challenge/block/exchange combinations.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/engine.ts
@lib/game/types.ts
@lib/game/engine.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create scenario test helper DSL</name>
  <files>lib/game/test-helpers.ts</files>
  <action>
Create a fluent test helper module that wraps engine functions into a chainable scenario builder. This makes writing multi-step game scenarios concise and readable.

Key design:

1. `GameScenario` class with chainable methods:
   - `static create(config)` - creates deterministic game state with configurable players/cards/coins/deck
   - `.action(playerId, action)` - wraps processAction
   - `.respond(playerId, response, character?)` - wraps processResponse
   - `.blockRespond(playerId, response)` - wraps processBlockResponse
   - `.loseInfluence(playerId, cardIndex)` - wraps processLoseInfluence
   - `.exchangeSelect(playerId, keptIndices)` - wraps processExchangeSelect
   - `.allPass()` - all pending responders pass (handles both awaiting_response and awaiting_block_response)
   - `.expectPhase(phase)` - assert current phase
   - `.expectCoins(playerId, coins)` - assert player coins
   - `.expectAlive(playerId, alive)` - assert player alive status
   - `.expectCards(playerId, count)` - assert live card count
   - `.expectWinner(playerId)` - assert game winner
   - `.expectCurrentTurn(playerId)` - assert whose turn
   - `.state` getter - access raw GameState for custom assertions

2. Each chainable method returns `this` for fluency. Methods that wrap engine functions should update internal state and return `this`.

3. `create()` static method accepts:
   ```ts
   interface ScenarioConfig {
     players: Array<{
       id: string;
       name: string;
       coins?: number; // default 2
       cards: [Character, Character];
       alive?: boolean; // default true
       revealedIndices?: number[]; // which cards are revealed
     }>;
     currentTurnId?: string; // default first player
     deck?: Character[]; // default reasonable deck
   }
   ```

4. Assertion methods should throw descriptive errors including the current game state context (phase, pending action type) so failures are easy to debug.

Do NOT duplicate engine logic. The helpers only wrap and assert.
  </action>
  <verify>
    `npx jest --testPathPattern=scenarios --passWithNoTests` runs without import errors (validates the module compiles).
    TypeScript compilation: `npx tsc --noEmit lib/game/test-helpers.ts` passes.
  </verify>
  <done>
    test-helpers.ts exports GameScenario class with all chainable methods. Module compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write comprehensive scenario tests</name>
  <files>lib/game/scenarios.test.ts</files>
  <action>
Create `lib/game/scenarios.test.ts` using the GameScenario helper. Organize tests into describe blocks covering every game flow combination. Each test should be a complete scenario from action to resolution.

Test structure (all tests use the fluent DSL):

**1. Basic Action Flows (uncontested)** - describe('Scenario: Uncontested Actions')
- income -> next turn (trivial but confirms baseline)
- foreignAid -> all pass -> +2 coins -> next turn
- tax -> all pass -> +3 coins -> next turn
- steal -> all pass -> coins transferred -> next turn
- assassinate -> all pass -> lose_influence -> card revealed -> next turn
- exchange -> all pass -> exchange_select -> cards chosen -> next turn
- coup -> lose_influence -> card revealed -> next turn

**2. Challenge Scenarios** - describe('Scenario: Challenges')
For each challengeable action (tax, steal, assassinate, exchange):
- Challenge SUCCESS (bluff detected): actor loses card, action cancelled
- Challenge FAIL (actor truthful): challenger loses card, action executes
Specific cases:
- tax bluff challenged -> actor loses card, no coins gained
- tax real challenged -> challenger loses card, +3 coins
- steal bluff challenged -> actor loses card, no steal
- steal real challenged -> challenger loses card, steal executes
- assassinate bluff challenged -> actor loses card, coins NOT refunded, target safe
- assassinate real challenged -> challenger loses card, target enters lose_influence
- exchange bluff challenged -> actor loses card, no exchange
- exchange real challenged -> challenger loses card, exchange proceeds

**3. Block Scenarios** - describe('Scenario: Blocks')
- foreignAid blocked by Duke -> all pass block -> action cancelled
- assassinate blocked by Contessa -> all pass block -> action cancelled (coins not refunded)
- steal blocked by Captain -> all pass block -> no steal
- steal blocked by Ambassador -> all pass block -> no steal

**4. Block Challenge Scenarios** - describe('Scenario: Block Challenges')
- foreignAid -> Duke block (real) -> challenge block -> challenger loses card, block holds
- foreignAid -> Duke block (bluff) -> challenge block -> blocker loses card, action executes
- assassinate -> Contessa block (real) -> challenge block -> challenger loses card, target safe
- assassinate -> Contessa block (bluff) -> challenge block -> blocker loses card, target enters lose_influence
- steal -> Captain block (real) -> challenge -> challenger loses card, no steal
- steal -> Captain block (bluff) -> challenge -> blocker loses card, steal executes

**5. Complex Multi-Turn Scenarios** - describe('Scenario: Multi-Turn Games')
- Full 3-player game to completion: multiple turns of income -> coup -> eliminations -> game_over with winner
- Assassination chain: assassinate -> Contessa block bluff -> challenge block -> blocker loses card -> lose_influence -> elimination -> game_over
- Challenge causes elimination mid-action -> turn skips dead player
- Player with 10+ coins forced to coup
- Exchange with varying deck sizes (0, 1, 2 cards in deck)

**6. Edge Case Scenarios** - describe('Scenario: Edge Cases')
- Double loss guard: assassinate target who dies from block challenge (existing edge case, tested via scenario flow)
- Last two players: action leads to game_over
- Dead player skipped in response collection (only alive non-actor players respond)

Player setup for tests - use consistent named configs:
- `BLUFFER_P1`: p1 has cards that DON'T match claimed action (for challenge success tests)
- `TRUTHFUL_P1`: p1 has the real card for claimed action (for challenge fail tests)
- `ASSASSIN_SETUP`: p1 has Assassin + 5 coins, p2 has Contessa (for assassinate+block tests)

Each test should be 5-15 lines using the fluent API. Example pattern:
```ts
test('tax challenged (bluff) -> actor loses card', () => {
  GameScenario.create({
    players: [
      { id: 'p1', name: 'Alice', cards: ['Captain', 'Ambassador'] }, // no Duke = bluff
      { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] },
      { id: 'p3', name: 'Charlie', cards: ['Duke', 'Duke'] },
    ],
  })
    .action('p1', { type: 'tax' })
    .respond('p2', 'challenge')
    .expectPhase('action')
    .expectCards('p1', 1)  // lost a card
    .expectCoins('p1', 2)  // no tax received
    .expectCurrentTurn('p2');
});
```

Target: 40+ scenario tests covering all combinations above.
  </action>
  <verify>
    `npx jest --testPathPattern=scenarios --verbose` - all tests pass.
    `npx jest --verbose` - all 66 existing tests + new scenario tests pass (no regressions).
  </verify>
  <done>
    scenarios.test.ts contains 40+ passing tests across 6 describe blocks. All existing tests still pass. Every action type, challenge path, block path, and block-challenge path has at least one end-to-end scenario test.
  </done>
</task>

</tasks>

<verification>
1. `npx jest --verbose` - all tests pass (existing 66 + new 40+)
2. `npx jest --testPathPattern=scenarios --verbose` - scenario tests run independently
3. `npx jest --coverage --collectCoverageFrom="lib/game/engine.ts"` - coverage should increase from scenario tests hitting full flow paths
</verification>

<success_criteria>
- GameScenario fluent DSL makes writing new scenarios trivial (5-15 lines per test)
- All 7 action types have at least 1 uncontested scenario test
- All 4 challengeable actions have both success/fail challenge tests (8 tests)
- All 3 blockable actions have block tests (4 tests, steal has 2 blockers)
- Block challenges covered for real and bluff blocks (6+ tests)
- Multi-turn game completion scenarios (2+ tests)
- Edge cases from existing tests replicated as scenarios (3+ tests)
- Zero test regressions on existing 66 tests
</success_criteria>

<output>
After completion, create `.planning/quick/002-game-scenario-local-test-env/002-SUMMARY.md`
</output>
