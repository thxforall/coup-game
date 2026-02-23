---
phase: quick
plan: 036
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/TargetSelectModal.tsx
  - components/game/MyPlayerArea.tsx
autonomous: true
must_haves:
  truths:
    - "TargetSelectModal player buttons show a subtle left-border or outline in that player's assigned color"
    - "MyPlayerArea card area has a subtle player-color border/glow on the container"
    - "Colors match the existing getPlayerColor(playerId) palette used in chat/avatars"
  artifacts:
    - path: "components/game/TargetSelectModal.tsx"
      provides: "Player color borders on target selection buttons"
    - path: "components/game/MyPlayerArea.tsx"
      provides: "Player color border on own card area"
  key_links:
    - from: "components/game/TargetSelectModal.tsx"
      to: "lib/game/player-colors.ts"
      via: "import getPlayerColor"
      pattern: "getPlayerColor\\(p\\.id\\)"
    - from: "components/game/MyPlayerArea.tsx"
      to: "lib/game/player-colors.ts"
      via: "import getPlayerColor"
      pattern: "getPlayerColor\\(player\\.id\\)"
---

<objective>
Apply player-assigned colors as subtle borders on target selection buttons and the player's own card area.

Purpose: Strengthen visual identity by carrying player colors from avatars/chat into interactive game elements.
Output: Updated TargetSelectModal and MyPlayerArea with player-color borders.
</objective>

<context>
@lib/game/player-colors.ts — shared `getPlayerColor(playerId)` utility, returns hex color from 6-color palette
@components/game/TargetSelectModal.tsx — target player selection buttons (uses `FilteredPlayer[]` with `.id`)
@components/game/MyPlayerArea.tsx — own cards display (uses `Player` with `.id`)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add player color borders to TargetSelectModal buttons</name>
  <files>components/game/TargetSelectModal.tsx</files>
  <action>
    Import `getPlayerColor` from `@/lib/game/player-colors`.

    In the `aliveOthers.map()` block (line ~103), for each player button:
    - Compute `const playerColor = getPlayerColor(p.id);`
    - Add a subtle 2px left border using the player color on the default (unselected, non-disabled) state:
      `borderLeft: 3px solid {playerColor}` with low opacity (~40%)
    - When selected (`isSelected && !isStealNoCoins`), keep the existing accentColor border but add a subtle playerColor box-shadow glow:
      `boxShadow: 0 0 8px {playerColor}33` (very subtle)
    - When disabled (isStealNoCoins), no player color styling
    - Add a small colored dot (6x6 rounded-full) before the player name inside the button, using playerColor as backgroundColor, to reinforce identity

    Keep the existing selection behavior (accentColor border on selected) intact. Player color is additive, not replacing.
  </action>
  <verify>
    `npx tsc --noEmit` passes.
    Visual: TargetSelectModal buttons show colored left accent and dot per player.
  </verify>
  <done>Each target player button has a subtle player-color left border and identity dot, distinguishing players visually.</done>
</task>

<task type="auto">
  <name>Task 2: Add player color border to MyPlayerArea container</name>
  <files>components/game/MyPlayerArea.tsx</files>
  <action>
    Import `getPlayerColor` from `@/lib/game/player-colors`.

    In the MyPlayerArea component:
    - Compute `const playerColor = getPlayerColor(player.id);`
    - On the outer container div (line ~159, the `p-2 sm:p-4 rounded-2xl` div):
      - Replace the static `border: '1px solid var(--border-subtle)'` with a subtle player-color border:
        `border: 1.5px solid {playerColor}40` (hex with 25% alpha suffix)
      - Add a very subtle box-shadow glow: `boxShadow: 0 0 12px {playerColor}1A` (10% alpha)
    - On the PlayerBadge sub-component's avatar circle (line ~40):
      - Replace the gold background with the player's color:
        `backgroundColor: playerColor` and `border: 2px solid {playerColor}80`
      - Keep text color as dark (#0D0D0D)

    The effect should be subtle/muted — a hint of color, not a strong border. Use low alpha values.
  </action>
  <verify>
    `npx tsc --noEmit` passes.
    Visual: MyPlayerArea has a subtle colored border matching the player's assigned color.
  </verify>
  <done>MyPlayerArea container and avatar use the player's assigned color for a cohesive identity feel.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` — no type errors
- `npm run build` — build succeeds
- Visual check: player colors are subtle (not overpowering), consistent with avatar colors in chat/PlayerArea
</verification>

<success_criteria>
- TargetSelectModal buttons show per-player color accents
- MyPlayerArea container border reflects the player's assigned color
- All colors come from the shared getPlayerColor utility (consistent across app)
- No type errors, build passes
</success_criteria>

<output>
After completion, create `.planning/quick/036-player-color-border-card-selection-ui/036-SUMMARY.md`
</output>
