---
phase: quick
plan: 032
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/PlayerArea.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "Mobile player areas do not overlap in the top horizontal bar"
    - "Each compact player chip shows avatar, name, online status, coin count, and card status (alive count / revealed icons)"
    - "Tapping a compact player chip opens a detail popover showing the full card view"
    - "Desktop (sm+ breakpoint) layout remains unchanged"
  artifacts:
    - path: "components/game/PlayerArea.tsx"
      provides: "Compact mobile view + detail popover on tap"
    - path: "components/game/GameBoard.tsx"
      provides: "Updated container for compact player chips"
  key_links:
    - from: "components/game/PlayerArea.tsx"
      to: "components/game/GameBoard.tsx"
      via: "PlayerArea rendered in horizontal scroll row"
---

<objective>
Fix overlapping PlayerArea components on mobile by making them compact chips that expand on tap.

Purpose: On small screens (< 640px), the current 88px-wide PlayerArea cards with 12px-wide card images overlap and look broken. Replace with compact horizontal chips (~60-70px wide) showing essential info (avatar, name, coins, card count), and show full card detail in a popover/bottom-sheet when tapped.

Output: PlayerArea.tsx with responsive compact/full modes, updated GameBoard container.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/PlayerArea.tsx
@components/game/GameBoard.tsx
@lib/game/types.ts (FilteredPlayer interface: id, name, coins, cards, isAlive, isReady)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Compact mobile PlayerArea with tap-to-expand detail</name>
  <files>components/game/PlayerArea.tsx</files>
  <action>
Refactor PlayerArea to have two display modes based on screen size:

**Mobile compact chip (default, visible below sm breakpoint):**
- Horizontal layout, single row: avatar circle (w-6 h-6) + online dot + truncated name (max 4 chars) + coin badge + card status indicator
- Card status: show small dots/icons representing cards (e.g., green dot for alive card, red skull icon for revealed card) instead of full card images
- Total width should be ~70-80px, using `flex-shrink-0`
- Current turn indicator: gold ring around the entire chip (not the play arrow in name)
- Dead player: opacity-50, strikethrough or dimmed name
- Wrap the compact chip in a button/clickable div
- On tap, set a local `showDetail` state to true

**Detail popover (shown when `showDetail` is true on mobile):**
- Use a fixed-position overlay (similar pattern to CardInfoModal) - a small card anchored near center of screen
- Show: player name, online status, coin count, and the full card display (existing FaceDownCard / RevealedCard components)
- Include a close button or tap-outside-to-close
- Keep the existing CardInfoModal for revealed card taps within the detail view

**Desktop (sm+ breakpoint):**
- Keep the EXACT current layout unchanged. Use `hidden sm:block` for desktop view and `sm:hidden` for compact view within the same component.
- Both views share the same data, just different presentation.

Important implementation notes:
- Use useState for `showDetail` toggle
- The compact view should NOT render FaceDownCard/RevealedCard components at all (they are too large)
- For card status dots in compact view: iterate `player.cards` and show a small colored indicator (6px dot: gray for face-down alive, red for revealed)
- Preserve the existing `memo` wrapper on export
- Keep all existing sub-components (PlayerBadge, CoinBadge, FaceDownCard, RevealedCard) - they are used in desktop view and detail popover
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors.
Visually inspect: on mobile viewport (375px), player chips should be compact single-line items that don't overlap. On desktop (1024px+), layout should be identical to before.
  </verify>
  <done>
PlayerArea renders compact chips on mobile (no overlap), shows detail popover on tap, and preserves desktop layout unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update GameBoard container for compact player row</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
Update the "other players" horizontal row container (line ~433) in GameBoard.tsx:

- Keep `overflow-x-auto scrollbar-hide` for cases with many players
- Change `gap-1.5` to `gap-1` on mobile (gap-1 sm:gap-1.5) to tighten spacing for compact chips
- Add `flex-nowrap` to prevent wrapping (chips should always be in a single horizontal row)
- Reduce vertical padding: `py-1.5 sm:py-3` instead of `py-2 sm:py-3`
- The container should handle both compact (mobile) and full (desktop) PlayerArea seamlessly since PlayerArea internally handles its own responsive display

No other changes to GameBoard.tsx.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors.
Test with 2, 4, and 5 other players on a 375px viewport - chips should fit or scroll horizontally without overlap.
  </verify>
  <done>
GameBoard container properly accommodates compact player chips on mobile with no visual overlap.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. On mobile (375px width): player area shows compact chips, no overlap, scrollable if needed
3. Tap a compact chip: detail popover appears with full card view
4. Tap outside or close button: detail popover dismisses
5. On desktop (1024px+): layout is identical to current (full PlayerArea cards visible)
6. Current turn player has gold ring indicator on both mobile and desktop
7. Dead players show dimmed on both views
8. Revealed card tap in detail popover still opens CardInfoModal
</verification>

<success_criteria>
- No overlapping player elements on mobile screens (375px - 640px)
- Compact chips show all essential info: avatar, name, online, coins, card status
- Tap-to-expand works and shows full card detail
- Desktop layout completely unchanged
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/032-mobile-player-area-overlap-click-detail/032-SUMMARY.md`
</output>
