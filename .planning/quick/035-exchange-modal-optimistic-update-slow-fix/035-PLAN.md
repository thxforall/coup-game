---
phase: quick-035
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ExchangeModal.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "ExchangeModal card toggle is instant with no visible lag on mobile"
    - "Selecting/deselecting cards feels fluid even during Firebase updates"
    - "Exchange confirm still works correctly after optimization"
  artifacts:
    - path: "components/game/ExchangeModal.tsx"
      provides: "Optimized exchange modal with stable props"
    - path: "components/game/GameBoard.tsx"
      provides: "Memoized onSelect callback and stable prop references"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "components/game/ExchangeModal.tsx"
      via: "stable memoized props (player, exchangeCards, onSelect)"
      pattern: "useCallback.*exchange_select|useMemo.*exchangeCards"
---

<objective>
Fix slow/laggy card selection in ExchangeModal during Ambassador card exchange.

Purpose: The ExchangeModal card toggle feels sluggish because:
1. GameBoard passes inline arrow `onSelect` and new `me`/`exchangeCards` references on every Firebase state update, defeating `memo()` on ExchangeModal
2. `transition-all` on card buttons causes layout thrashing during frequent re-renders
3. Every Firebase presence/chat update re-renders the entire modal

Output: Fluid, instant card toggle in ExchangeModal regardless of Firebase update frequency.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/ExchangeModal.tsx
@components/game/GameBoard.tsx
@app/game/[roomId]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stabilize ExchangeModal props in GameBoard to prevent unnecessary re-renders</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
In GameBoard.tsx, the ExchangeModal receives three props that break memo on every Firebase update:

1. **`onSelect` inline arrow** - `(keptIndices) => onAction({ type: 'exchange_select', keptIndices })` creates a new function reference every render. Wrap this in `useCallback`:
   ```ts
   const handleExchangeSelect = useCallback(
     (keptIndices: number[]) => onAction({ type: 'exchange_select', keptIndices }),
     [onAction]
   );
   ```
   Then pass `onSelect={handleExchangeSelect}` to ExchangeModal.

2. **`exchangeCards` reference** - `state.pendingAction?.exchangeCards` is a new array reference on every Firebase snapshot. Stabilize with useMemo using JSON comparison:
   ```ts
   const exchangeCardsRaw = state.pendingAction?.exchangeCards;
   const exchangeCardsMemo = useMemo(() => exchangeCardsRaw, [JSON.stringify(exchangeCardsRaw)]);
   ```
   Then pass `exchangeCards={exchangeCardsMemo!}` to ExchangeModal.

3. **`player` (me) reference** - `me` is recomputed from `state.players` on every Firebase update. The `useMemo` for `me` already exists (line ~140), but `state.players` is a new array each time, so it always recomputes. Add a stable memo by comparing the serialized player data:
   ```ts
   const meRaw = state.players.find((p) => p.id === playerId);
   const meStable = useMemo(() => meRaw, [JSON.stringify(meRaw)]);
   ```
   Replace the existing `me` useMemo with this pattern. Use `meStable` for ExchangeModal's `player` prop specifically, or replace `me` entirely if it does not break other usages (it should not since the value is identical, just reference-stable).

IMPORTANT: Only change the `me` memo and add `handleExchangeSelect`/`exchangeCardsMemo`. Do NOT change any other part of GameBoard. Keep the existing `me` variable name to avoid breaking other references.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npm run build` to confirm build passes.
  </verify>
  <done>ExchangeModal receives reference-stable props so memo() actually prevents re-renders during Firebase updates.</done>
</task>

<task type="auto">
  <name>Task 2: Optimize ExchangeModal CSS transitions and memo comparison</name>
  <files>components/game/ExchangeModal.tsx</files>
  <action>
In ExchangeModal.tsx, make these targeted changes:

1. **Replace `transition-all` with specific transitions** on the card buttons (line ~67). `transition-all` animates EVERY CSS property change (including layout properties) which causes jank during re-renders. Change to:
   ```
   transition-transform transition-opacity duration-150
   ```
   This only animates `transform` (for scale-105) and `opacity` (for opacity-70/100), which are GPU-composited and do not cause layout thrashing.

2. **Strengthen memo comparison** - The default `memo()` does shallow comparison. Since we stabilized props in Task 1, this should already work. But as a safety net, add a custom comparator to absolutely guarantee no unnecessary re-renders:
   ```ts
   export default memo(ExchangeModal, (prev, next) => {
     return (
       prev.player === next.player &&
       prev.exchangeCards === next.exchangeCards &&
       prev.onSelect === next.onSelect
     );
   });
   ```
   This is equivalent to shallow compare for these 3 props but makes the intent explicit and avoids any future prop additions accidentally breaking memo.

3. **Add `will-change-transform` hint** to card buttons to promote them to their own compositor layer, preventing repaints of the entire modal:
   ```
   className="... will-change-transform transition-transform transition-opacity duration-150 ..."
   ```

Do NOT change the toggle logic, the layout structure, or the BottomSheet usage. Only CSS transition classes and memo comparator.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Visually verify in browser: open Ambassador exchange modal, rapidly toggle cards - selection should feel instant with no perceptible delay.
  </verify>
  <done>Card toggle in ExchangeModal is visually instant. No layout thrashing from transition-all. Memo comparator explicitly prevents re-renders from Firebase state churn.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds
3. Manual test: Start a game, use Ambassador exchange action, toggle cards rapidly - should feel instant
4. Open React DevTools Profiler (if available): ExchangeModal should NOT re-render on Firebase updates when props haven't meaningfully changed
</verification>

<success_criteria>
- ExchangeModal card selection is instant with no visible lag
- ExchangeModal does not re-render on irrelevant Firebase state updates
- No transition-all on card buttons (only transform + opacity transitions)
- Build passes, no type errors
- Exchange flow still works end-to-end (select cards, confirm, exchange completes)
</success_criteria>

<output>
After completion, create `.planning/quick/035-exchange-modal-optimistic-update-slow-fix/035-SUMMARY.md`
</output>
