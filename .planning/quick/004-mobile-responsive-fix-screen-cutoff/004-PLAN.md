---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/layout.tsx
  - app/globals.css
  - app/page.tsx
  - components/game/GameBoard.tsx
  - components/game/PlayerArea.tsx
  - components/game/MyPlayerArea.tsx
  - components/game/ActionPanel.tsx
  - components/game/EventLog.tsx
autonomous: true

must_haves:
  truths:
    - "Game board fits within mobile viewport (375px width) without horizontal scroll"
    - "All UI elements are visible and tappable on mobile without cutoff"
    - "Event log is accessible on mobile (collapsed or toggled)"
    - "Player cards scale down proportionally on small screens"
    - "Action buttons are readable and tappable on mobile"
  artifacts:
    - path: "components/game/GameBoard.tsx"
      provides: "Mobile-responsive game layout"
    - path: "components/game/PlayerArea.tsx"
      provides: "Responsive opponent cards"
    - path: "components/game/MyPlayerArea.tsx"
      provides: "Responsive player cards"
    - path: "components/game/ActionPanel.tsx"
      provides: "Responsive action grid"
  key_links:
    - from: "GameBoard.tsx"
      to: "EventLog.tsx"
      via: "Mobile toggle/collapse pattern"
      pattern: "lg:w-80|hidden"
---

<objective>
Fix mobile screen cutoff by making the entire game UI responsive. The current layout has fixed widths (EventLog w-80, cards at fixed pixel sizes, grid-cols-3/4 action buttons) that cause horizontal overflow and content cutoff on mobile devices.

Purpose: The game is primarily played on mobile. Screen cutoff makes it unplayable.
Output: Fully responsive game that works on 375px+ screens without horizontal scroll.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix GameBoard layout - mobile-first responsive restructure</name>
  <files>
    components/game/GameBoard.tsx
    components/game/EventLog.tsx
    app/globals.css
    app/layout.tsx
  </files>
  <action>
    The GameBoard currently uses a horizontal flex layout with EventLog as a fixed w-80 (320px) sidebar. On mobile (375px), the EventLog alone consumes 85% of screen width, pushing the turn area off-screen.

    **GameBoard.tsx changes:**
    1. Change the center area from `flex-row` to stacked on mobile, side-by-side on desktop:
       - Replace `<div className="flex-1 flex flex-row min-h-0 overflow-hidden">` with `<div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">`
    2. Hide EventLog sidebar on mobile, show it on lg+ screens:
       - Change EventLog wrapper from `<div className="w-80 flex-shrink-0 border-r ...">` to `<div className="hidden lg:block w-80 flex-shrink-0 border-r ...">`
    3. Add a mobile log toggle button in the header (between logo and turn info):
       - Add state: `const [showMobileLog, setShowMobileLog] = useState(false)`
       - Add a ScrollText icon button in the header, visible only on mobile (`lg:hidden`), that toggles `showMobileLog`
       - When `showMobileLog` is true, render EventLog as a full-width overlay/panel below the header (absolute positioned, z-30, with a semi-transparent background)
       - The mobile log panel should be max-h-[50vh] with overflow-y-auto
       - Tapping the toggle again or tapping outside closes it
    4. Opponent player row: Change `flex-row flex-wrap` to use `overflow-x-auto` with `gap-2` and add `scrollbar-hide` class for clean horizontal scroll on mobile when there are 5 opponents

    **app/layout.tsx changes:**
    - Add `viewport` export for proper mobile meta tag:
      ```
      export const viewport = {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
      };
      ```
      This prevents double-tap zoom and pinch zoom that interfere with game interactions.

    **app/globals.css changes:**
    - Add scrollbar-hide utility:
      ```css
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      ```

    **DO NOT** change the desktop layout (lg+ breakpoint) - it should remain identical to current behavior.
  </action>
  <verify>
    - `npx next build` compiles without errors
    - Open browser dev tools, toggle to iPhone SE (375px): no horizontal scrollbar on game board
    - EventLog is hidden on mobile, toggle button shows/hides it
    - On desktop (1024px+), EventLog sidebar appears as before
  </verify>
  <done>
    - GameBoard has no horizontal overflow on 375px screens
    - EventLog is hidden on mobile with a toggle button to show it
    - Desktop layout is unchanged
    - Viewport meta prevents zoom interference on mobile
  </done>
</task>

<task type="auto">
  <name>Task 2: Make cards, action buttons, and player areas responsive</name>
  <files>
    components/game/PlayerArea.tsx
    components/game/MyPlayerArea.tsx
    components/game/ActionPanel.tsx
    app/page.tsx
  </files>
  <action>
    **PlayerArea.tsx (opponent cards):**
    1. Change card sizes from fixed 80x112px to responsive:
       - FaceDownCard: change default props from `width=80, height=112` to use CSS classes instead of inline width/height. Use `w-14 h-20 sm:w-[80px] sm:h-[112px]` (56x80 on mobile, 80x112 on sm+)
       - RevealedCard: same responsive sizing pattern
    2. Change `min-w-[140px]` on the outer div to `min-w-[110px] sm:min-w-[140px]`
    3. Reduce padding on mobile: `p-2 sm:p-3`

    **MyPlayerArea.tsx (my cards):**
    1. Change CharacterCard from fixed `width: '120px', height: '170px'` inline styles to CSS classes:
       - Use `w-[90px] h-[128px] sm:w-[120px] sm:h-[170px]` (90x128 on mobile, 120x170 on sm+)
       - Update Image `sizes` prop to `(max-width: 640px) 90px, 120px`
    2. Header row: On mobile, stack PlayerBadge and "내 영향력" label vertically if needed:
       - Add `flex-wrap` to the header flex container
    3. Reduce outer padding: `p-3 sm:p-4`

    **ActionPanel.tsx:**
    1. Row 1 (income/foreign aid/coup): Change `grid-cols-3` to `grid-cols-2 sm:grid-cols-3`
       - On mobile, the 3rd button (coup) wraps to next row which is fine - it gets more space
    2. Row 2 (tax/assassinate/steal/exchange): Change `grid-cols-4` to `grid-cols-2 sm:grid-cols-4`
       - On mobile, 4 buttons in 2x2 grid is much more tappable
    3. Reduce button padding on mobile: `p-2 sm:p-3`
    4. Target selection pills: ensure `flex-wrap` is already there (it is), just verify no overflow

    **app/page.tsx (Lobby):**
    1. Character icons at bottom: Change `flex items-center gap-4` to `flex items-center gap-3 sm:gap-4 flex-wrap justify-center`
       - This ensures wrapping on very narrow screens instead of overflow
    2. The lobby card already has `max-w-[520px]` and `w-full px-4` which is good

    **Important:** Use Tailwind responsive prefixes (sm: 640px, lg: 1024px) consistently. Do NOT use arbitrary breakpoints or media queries. The mobile-first approach means the base class is for mobile, sm/lg are for larger screens.
  </action>
  <verify>
    - `npx next build` compiles without errors
    - iPhone SE (375px): cards are smaller but visible, no horizontal scroll
    - Action buttons are in 2-column grid on mobile, readable text
    - iPad (768px): cards at full size, action buttons in proper grid
    - Desktop (1024px+): no visual changes from current design
  </verify>
  <done>
    - Opponent cards scale from 56x80 (mobile) to 80x112 (sm+)
    - My cards scale from 90x128 (mobile) to 120x170 (sm+)
    - Action buttons use 2-col grid on mobile, 3/4-col on sm+
    - Lobby character icons wrap on narrow screens
    - No horizontal overflow on any screen size 375px+
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete mobile responsive fix for all game screens: lobby, waiting room, game board, action panel, cards, and event log</what-built>
  <how-to-verify>
    1. Run `npm run dev` and open on your mobile phone or use browser dev tools mobile emulation
    2. Check lobby page (/) - no horizontal scroll, character icons wrap nicely
    3. Create a game room - waiting room looks good on mobile
    4. During gameplay: opponent cards are smaller but readable, action buttons are in 2x2 grid
    5. Your cards at bottom are visible without cutoff
    6. Tap the log icon in header to show/hide event log on mobile
    7. On desktop (resize browser to full width): everything looks the same as before
  </how-to-verify>
  <resume-signal>Type "approved" or describe any remaining layout issues</resume-signal>
</task>

</tasks>

<verification>
- `npx next build` succeeds
- No horizontal scrollbar on any page at 375px viewport width
- All interactive elements (buttons, cards, inputs) are tappable on mobile
- Desktop layout is visually unchanged
</verification>

<success_criteria>
- Game is fully playable on iPhone SE (375px) without any screen cutoff
- EventLog accessible via toggle on mobile
- Cards and buttons scale appropriately per screen size
- Zero horizontal overflow on mobile viewports
- Desktop experience unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/004-mobile-responsive-fix-screen-cutoff/004-SUMMARY.md`
</output>
