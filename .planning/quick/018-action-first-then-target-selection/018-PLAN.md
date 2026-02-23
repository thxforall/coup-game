---
phase: quick-018
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ActionPanel.tsx
autonomous: true

must_haves:
  truths:
    - "Action buttons are always visible first without needing to select a target"
    - "Clicking a target-needing action (coup, assassinate, steal) shows target selection UI"
    - "Non-target actions (income, foreignAid, tax, exchange) fire immediately on click"
    - "After selecting a target, the action is sent automatically"
    - "Guess mode for coup still works (action -> target -> guess character -> send)"
    - "mustCoup (10+ coins) still restricts to coup only"
  artifacts:
    - path: "components/game/ActionPanel.tsx"
      provides: "Action-first then target selection UX flow"
  key_links:
    - from: "ActionPanel action button click"
      to: "handleAction or target selection"
      via: "pendingAction state determines flow"
---

<objective>
Change the ActionPanel UX flow from "select target first, then action" to "select action first, then target (if needed)".

Purpose: More intuitive UX -- players think about WHAT to do before WHO to do it to. The current target-first flow is confusing because the player must choose a target without knowing which action they will take.

Output: Updated ActionPanel.tsx with action-first flow.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/ActionPanel.tsx
@components/game/GameBoard.tsx
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refactor ActionPanel to action-first-then-target flow</name>
  <files>components/game/ActionPanel.tsx</files>
  <action>
Refactor ActionPanel.tsx to change the UX flow:

**Current flow:** Target selector (always visible at top) -> Action buttons (disabled if no target for target-needing actions)

**New flow:** Action buttons always visible -> Click target-needing action -> Show target selection inline (replaces/overlays action buttons) -> Select target -> Action fires

Implementation details:

1. Add state `pendingActionType` (stores the ActionType that needs a target, e.g. 'coup', 'assassinate', 'steal') -- replaces the current `targetId` as the primary flow state. Keep `targetId` for internal use.

2. **Action buttons (default view):**
   - Show all action buttons as before (row1 + row2 layout unchanged).
   - For non-target actions (income, foreignAid, tax, exchange): clicking fires `handleAction` immediately (same as now, no change needed since `needsTarget` is false).
   - For target-needing actions (coup, assassinate, steal): clicking sets `pendingActionType` to that action type instead of firing. The button should be enabled even without a target selected (remove the `hasTarget` disable check for initial click). Cost check still applies (e.g., assassinate disabled if coins < 3, coup disabled if coins < 7).

3. **Target selection view (shown when `pendingActionType` is set):**
   - Replace the action buttons area with a target selection panel.
   - Show header: "[Action name] - 대상을 선택하세요" with a back/cancel button (X or "취소") that clears `pendingActionType`.
   - Style the header with the action's variant color (e.g., assassin color for assassinate).
   - Show alive opponent buttons (same styling as current target buttons but larger/more prominent since this is the main interaction).
   - For coup in guess mode: after selecting target, show the character guess selection (same as current `isGuessMode && targetId && me.coins >= 7` block), then a "확인" confirm button to fire the action.
   - For non-guess-mode target actions: clicking a target player button immediately fires the action (no extra confirm step needed -- streamlined UX).

4. **Reset flow:** After action is sent (`handleAction` completes), reset `pendingActionType` to null and `targetId` to ''.

5. **mustCoup handling:** When `mustCoup` is true, show only coup button. Clicking it enters target selection as described above. The "반드시 쿠데타" message still shows.

6. **Visual polish:**
   - When in target selection mode, use a subtle animation or visual distinction (e.g. slide transition or different background) to indicate the mode change.
   - The selected action should be shown prominently in the target selection header so the player remembers what they chose.
   - Include the action's icon in the header.
  </action>
  <verify>
    - `npx next build` compiles without errors
    - Manual test: open game, verify action buttons show first without any target selector
    - Click "소득" (income) -> fires immediately (no target needed)
    - Click "암살" (assassinate) -> shows target selection panel
    - Click cancel in target selection -> returns to action buttons
    - Select a target in target selection -> action fires
    - Verify mustCoup (10+ coins) still works correctly
  </verify>
  <done>
    - Action buttons are the first thing players see (no target selector above)
    - Target-needing actions show target selection after clicking the action
    - Non-target actions fire immediately
    - Cancel returns to action view
    - All action types work correctly including guess mode coup
  </done>
</task>

</tasks>

<verification>
- `npx next build` succeeds
- All action types (income, foreignAid, tax, exchange, coup, assassinate, steal) work correctly
- Guess mode coup flow: action -> target -> guess -> fires
- mustCoup restriction works
- Mobile responsive (current grid layout preserved)
</verification>

<success_criteria>
- Players see action buttons first, not target selection
- Target selection appears only after clicking a target-needing action
- Smooth, intuitive two-step flow for targeted actions
- No regressions in game functionality
</success_criteria>

<output>
After completion, create `.planning/quick/018-action-first-then-target-selection/018-SUMMARY.md`
</output>
