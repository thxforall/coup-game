---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/filter.ts
  - lib/firebase.ts
  - lib/game/filter.test.ts
autonomous: true

must_haves:
  truths:
    - "filterStateForPlayer handles players with undefined cards without crashing"
    - "Firebase getRoom returns players with cards defaulting to [] when Firebase drops empty arrays"
  artifacts:
    - path: "lib/game/filter.ts"
      provides: "Defensive fallback for undefined cards"
      contains: "?? []"
    - path: "lib/firebase.ts"
      provides: "Sanitization of Firebase data to restore dropped empty arrays"
    - path: "lib/game/filter.test.ts"
      provides: "Test case for undefined cards scenario"
  key_links:
    - from: "lib/firebase.ts"
      to: "lib/game/filter.ts"
      via: "getRoom returns sanitized GameState with cards always as array"
---

<objective>
Fix TypeError in filterStateForPlayer when p.cards is undefined.

Purpose: Firebase Realtime Database drops empty arrays on storage. When players join in "waiting" phase with `cards: []`, Firebase stores nothing for that field. On read-back, `cards` is `undefined`, causing `p.cards.map()` to throw.

Output: Defensive code in filter.ts + sanitization in firebase.ts + regression test.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/filter.ts
@lib/firebase.ts
@lib/game/filter.test.ts
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add defensive fallback in filter.ts and sanitize in firebase.ts</name>
  <files>lib/game/filter.ts, lib/firebase.ts</files>
  <action>
In `lib/game/filter.ts`:
- Line 27: Change `cards: p.cards` to `cards: p.cards ?? []`
- Line 33: Change `p.cards.map(...)` to `(p.cards ?? []).map(...)`

In `lib/firebase.ts`, in the `getRoom` function (after line 23):
- Before returning, sanitize the state to ensure `players[].cards` always defaults to `[]`.
- Add a helper or inline map:
  ```
  const state = data.state as GameState;
  // Firebase drops empty arrays - restore defaults
  state.players = (state.players ?? []).map(p => ({
    ...p,
    cards: p.cards ?? [],
  }));
  ```
- Also default `state.log` to `[]` if undefined (same Firebase issue).
- Return `{ id: roomId, state }`.

This two-layer defense ensures: (1) data is correct at the source, (2) filter.ts is safe even if called with unsanitized data.
  </action>
  <verify>
Run: `npx tsc --noEmit` - no type errors
Run: `npx jest filter` - existing tests pass
  </verify>
  <done>
Both filter.ts and firebase.ts have defensive handling for undefined cards. TypeScript compiles cleanly.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add regression test for undefined cards in filter</name>
  <files>lib/game/filter.test.ts</files>
  <action>
Add a new test case in `lib/game/filter.test.ts` that verifies `filterStateForPlayer` handles players with `undefined` cards (simulating Firebase behavior).

Create a test state where one or more players have `cards: undefined as any` (using `as any` to bypass TypeScript since this is a runtime issue from Firebase).

Test should verify:
- No TypeError thrown
- The player with undefined cards gets `cards: []` in output
- Other players with undefined cards get `cards: []` (empty masked cards array)

Example test:
```typescript
it('handles undefined cards from Firebase (empty array dropped)', () => {
  const state = {
    ...baseState,
    players: baseState.players.map(p => ({
      ...p,
      cards: undefined as any,  // Firebase drops empty arrays
    })),
  };
  // Should not throw
  const result = filterStateForPlayer(state, 'alice');
  expect(result.players[0].cards).toEqual([]);
  expect(result.players[1].cards).toEqual([]);
});
```
  </action>
  <verify>
Run: `npx jest filter` - all tests pass including new test
  </verify>
  <done>
Regression test exists and passes, proving undefined cards no longer causes TypeError.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. `npx jest filter` passes (all existing + new test)
3. Manual: The error path (join game -> filterStateForPlayer with empty cards) no longer throws
</verification>

<success_criteria>
- filterStateForPlayer never throws on undefined cards
- Firebase getRoom always returns players with cards as array
- Regression test covers this scenario
- All existing tests still pass
</success_criteria>

<output>
After completion, create `.planning/quick/003-fix-filter-cards-undefined/003-SUMMARY.md`
</output>
