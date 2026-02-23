---
phase: quick
plan: 037
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/PlayerArea.tsx
autonomous: true

must_haves:
  truths:
    - "Each opponent profile card has a subtle colored border matching their player color"
    - "Both desktop (sm+) and mobile compact chip views show the color border"
    - "The mobile detail bottom sheet avatar retains its existing color glow"
  artifacts:
    - path: "components/game/PlayerArea.tsx"
      provides: "Player color border on opponent cards"
      contains: "getPlayerColor"
  key_links:
    - from: "components/game/PlayerArea.tsx"
      to: "lib/game/player-colors.ts"
      via: "getPlayerColor(player.id)"
      pattern: "getPlayerColor"
---

<objective>
Apply player-specific color borders to opponent profile cards (PlayerArea) in the GameBoard top row.

Purpose: Visual consistency with MyPlayerArea (quick-036) — each player has their unique color subtly shown on their card border.
Output: Updated PlayerArea.tsx with colored borders on both desktop and mobile compact views.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/PlayerArea.tsx
@components/game/MyPlayerArea.tsx (reference for border style pattern)
@lib/game/player-colors.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add player color border to PlayerArea desktop and mobile views</name>
  <files>components/game/PlayerArea.tsx</files>
  <action>
    Import `getPlayerColor` from `@/lib/game/player-colors` (already imports PLAYER_AVATAR_COLORS, add getPlayerColor).

    In the `PlayerArea` component, compute `const playerColor = getPlayerColor(player.id);` (similar to MyPlayerArea).

    Apply subtle border to BOTH views, matching MyPlayerArea's pattern:

    1. **Desktop view (sm+ block):** On the outer `div` (currently `bg-bg-card border border-border-subtle rounded-xl`), replace the static `border border-border-subtle` with inline style `border: 1.5px solid ${playerColor}40` and add `boxShadow: 0 0 12px ${playerColor}1A`. Keep the existing `isCurrentTurn` ring-2 ring-gold overlay — the gold ring sits on top via Tailwind `ring` which is separate from CSS border, so both can coexist. Remove the Tailwind `border border-border-subtle` classes since inline style handles border now.

    2. **Mobile compact chip (sm:hidden button):** Same approach — replace `border border-border-subtle` with inline style `border: 1.5px solid ${playerColor}40` and subtle `boxShadow: 0 0 8px ${playerColor}1A`. Keep the `isCurrentTurn` ring-2 ring-gold intact.

    3. **Mobile detail bottom sheet:** The avatar already uses `avatarColor` with glow. No changes needed there. But optionally add the same subtle border to the bottom sheet container if it has a border (check BottomSheet — likely not needed, leave as-is).

    Do NOT change the avatar circle background color logic — it already uses PLAYER_AVATAR_COLORS which produces the same color as getPlayerColor. The border is the only addition.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors.
    Run `npx next lint` to confirm no lint errors.
    Visually: opponent cards at the top of GameBoard should have a subtle colored border matching each player's unique color.
  </verify>
  <done>
    - Desktop opponent cards show subtle player-colored border (1.5px, 25% opacity) with faint glow
    - Mobile compact chips show the same subtle player-colored border
    - Current turn gold ring still visible on top of the colored border
    - Eliminated players (opacity-50) still show the border but dimmed by the opacity
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- `npx next lint` passes
- Each opponent's card border color matches their avatar color
- Gold ring for current turn player still works on both desktop and mobile
</verification>

<success_criteria>
All opponent profile cards in the GameBoard top row display a subtle, player-specific colored border consistent with MyPlayerArea's styling pattern from quick-036.
</success_criteria>

<output>
After completion, create `.planning/quick/037-player-color-border-opponent-profile/037-SUMMARY.md`
</output>
