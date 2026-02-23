---
phase: quick-009
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/SettingsModal.tsx
  - components/game/GameBoard.tsx
  - app/api/game/restart/route.ts
  - app/game/[roomId]/page.tsx
autonomous: true

must_haves:
  truths:
    - "Settings gear icon opens a modal when clicked"
    - "Host can force-restart game mid-game (with confirmation)"
    - "Any player can leave to lobby (clears active room)"
    - "Current game mode is displayed read-only in settings"
    - "Modal closes on backdrop click or X button"
  artifacts:
    - path: "components/game/SettingsModal.tsx"
      provides: "Settings modal component"
    - path: "components/game/GameBoard.tsx"
      provides: "Settings icon wired with onClick"
    - path: "app/api/game/restart/route.ts"
      provides: "Restart API works mid-game (not just game_over)"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "components/game/SettingsModal.tsx"
      via: "dynamic import, showSettings state"
      pattern: "showSettings.*SettingsModal"
    - from: "components/game/SettingsModal.tsx"
      to: "/api/game/restart"
      via: "fetch POST on confirm"
      pattern: "fetch.*api/game/restart"
---

<objective>
Add a settings modal triggered by the existing gear icon in GameBoard header. The modal provides: (1) game reset/restart for host with confirmation, (2) leave to lobby for all players, (3) read-only game mode display.

Purpose: Give players in-game control to restart or leave without refreshing/URL hacking.
Output: Working SettingsModal component + wired gear icon + extended restart API.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx (gear icon at line 346-351, modal patterns at line 100-103)
@components/game/ResponseModal.tsx (modal styling reference: glass-panel, backdrop, animate-slide-up)
@app/api/game/restart/route.ts (current restart logic, game_over-only restriction)
@app/game/[roomId]/page.tsx (handleRestart callback, passes onRestart to GameBoard)
@lib/game/types.ts (FilteredGameState has gameMode, GamePhase types)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend restart API to work mid-game + Create SettingsModal component</name>
  <files>
    app/api/game/restart/route.ts
    components/game/SettingsModal.tsx
  </files>
  <action>
**1. Extend restart API (`app/api/game/restart/route.ts`):**
- Remove the `state.phase !== 'game_over'` restriction. Allow restart from ANY phase except `waiting`.
- Keep the host-only check (`state.players[0].id !== playerId` returns 403).
- Add a `force` boolean field to request body (optional). When `force: true` and phase is not `game_over`, proceed with restart. When `force` is missing/false and phase is not `game_over`, return 400 with error message "진행 중인 게임입니다. 강제 재시작하려면 확인하세요". This prevents accidental mid-game restarts.
- Existing game_over restart (without force) should still work as before for backward compatibility.

**2. Create SettingsModal (`components/game/SettingsModal.tsx`):**
- Props: `{ state: FilteredGameState; playerId: string; roomId: string; onClose: () => void; onRestart: () => Promise<void> }`
- Follow existing modal pattern: fixed inset-0 overlay with backdrop blur, centered panel, animate-slide-up.
- Use `Settings` icon from lucide-react in header.
- Style with existing design tokens: bg-bg-dark, border-border-subtle, text-text-primary/secondary.

**Modal content sections:**

a) **Game Mode Display (read-only):**
   - Show `state.gameMode === 'guess' ? '추측 모드' : '스탠다드 모드'` with a badge.
   - Small info text explaining the mode.

b) **게임 재시작 (Host only):**
   - Only show if `state.players[0]?.id === playerId`.
   - Button styled with `btn-gold` pattern (amber/gold border + text).
   - On click: show inline confirmation text "정말 게임을 재시작하시겠습니까? 모든 진행이 초기화됩니다." with "확인" and "취소" buttons.
   - "확인" calls `fetch('/api/game/restart', { method: 'POST', body: JSON.stringify({ roomId, playerId, force: true }) })`. On success, close modal. On error, show error text.
   - Use `RotateCcw` icon from lucide-react.

c) **로비로 돌아가기 (All players):**
   - Button styled with `btn-ghost` / subtle pattern.
   - On click: show inline confirmation "방을 나가시겠습니까?".
   - "확인" calls `clearActiveRoom()` from `@/lib/storage`, then `window.location.href = '/'`.
   - Use `LogOut` icon from lucide-react.

d) **닫기 button** at bottom: `btn-ghost` style, calls `onClose`.

- Export as default with `memo()` wrapper.
  </action>
  <verify>
    - `npx tsc --noEmit` passes (no type errors)
    - SettingsModal.tsx exists with correct props interface
    - restart route.ts accepts force parameter and allows mid-game restart for host
  </verify>
  <done>
    - SettingsModal renders game mode, restart (host-only with confirmation), leave lobby
    - Restart API accepts force:true for mid-game restart, backward compatible for game_over
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire Settings icon in GameBoard + pass props from page</name>
  <files>
    components/game/GameBoard.tsx
    app/game/[roomId]/page.tsx
  </files>
  <action>
**1. GameBoard.tsx changes:**
- Add `const [showSettings, setShowSettings] = useState(false);` state.
- Add dynamic import at top (next to other modals): `const SettingsModal = dynamic(() => import('./SettingsModal'), { ssr: false });`
- Wire the existing Settings button (line 346-351) with `onClick={() => setShowSettings(true)}`.
- Render SettingsModal at the end of the JSX (after ExchangeModal), conditionally: `{showSettings && <SettingsModal state={state} playerId={playerId} roomId={roomId} onClose={() => setShowSettings(false)} onRestart={onRestart!} />}`
- ALSO add the settings gear icon to the game_over screen (line 247-297) so players can access settings even after game ends. Add a small gear button in the top-right corner of the game_over panel.

**2. page.tsx - no changes needed.**
The `handleRestart` callback and `onRestart` prop already exist and are passed to GameBoard. The SettingsModal will call the restart API directly with force:true for mid-game, while the existing onRestart flow handles game_over restarts from the victory screen.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run build` succeeds (no build errors)
    - Settings gear icon in header has onClick handler
    - SettingsModal renders when showSettings is true
  </verify>
  <done>
    - Gear icon opens SettingsModal on click
    - Modal shows game mode, restart (host only), leave lobby
    - Modal closes on backdrop click or close button
    - Build passes without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - no type errors
2. `npm run build` - clean build
3. Manual check: gear icon in header has onClick, SettingsModal component exists with proper structure
</verification>

<success_criteria>
- Settings gear icon opens modal in all game phases (action, awaiting_response, etc.)
- Host sees restart button with force confirmation; non-host does not see it
- All players see "로비로 돌아가기" with confirmation
- Game mode displayed read-only
- Restart API works mid-game with force:true, remains backward compatible
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/009-gear-settings-game-reset/009-SUMMARY.md`
</output>
