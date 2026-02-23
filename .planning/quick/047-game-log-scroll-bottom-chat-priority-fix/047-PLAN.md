---
phase: quick
plan: 047
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/EventLog.tsx
autonomous: true

must_haves:
  truths:
    - "Chat messages appear interleaved with game log entries in chronological order"
    - "Chat messages do NOT all cluster at the bottom of the log"
    - "Newest entry (game or chat) is highlighted as latest"
  artifacts:
    - path: "components/game/EventLog.tsx"
      provides: "Timestamp-based chronological merge of game and chat logs"
  key_links:
    - from: "mergedStructured sort"
      to: "entry.timestamp / item.timestamp"
      via: "sortKey = timestamp"
      pattern: "sortKey:\\s*.*\\.timestamp"
---

<objective>
Fix game log + chat log merge sorting so entries are interleaved chronologically by timestamp, instead of chat always appearing after all game entries.

Purpose: Chat messages currently cluster at the bottom because sortKey for chat = maxGameIndex + fractional offset, making all chat sort after all game entries. Both LogEntry and ChatLogItem have `timestamp: number` fields — use these directly.
Output: Updated EventLog.tsx with timestamp-based sorting for both mergedStructured and mergedPlain paths.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/EventLog.tsx
@lib/game/types.ts (LogEntry interface — has `timestamp: number`)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix mergedStructured and mergedPlain sort to use timestamp</name>
  <files>components/game/EventLog.tsx</files>
  <action>
In `EventLog.tsx`, fix both merge sections:

**mergedStructured (lines 161-177):**
- Change game entry sortKey from `i` (index) to `entry.timestamp`
- Change chat entry sortKey from `maxGame + (item.timestamp - minChat) / 1e13` to `item.timestamp`
- Remove `minChat` and `maxGame` intermediate variables (no longer needed)
- Keep the `.sort((a, b) => a.sortKey - b.sortKey)` — it now sorts by real timestamps

**mergedPlain (lines 184-201):**
- For the plain text fallback path: plain `log` entries (string[]) have NO timestamp.
- Use corresponding `structuredLog` timestamps when available. But this path only runs when `!useStructured` (no structuredLog), so plain entries genuinely lack timestamps.
- Strategy: Keep index-based sortKey for game entries (i), and for chat entries use `item.timestamp`. To interleave, normalize chat timestamps into the index space. Since we cannot know real ordering without timestamps, keep current behavior for plain path (chat after game) — this is acceptable because the plain path is only a fallback when structuredLog is unavailable, which is rare.
- So: ONLY fix the `mergedStructured` block. Leave `mergedPlain` as-is since it lacks timestamp data.

Result: In the structured path (primary path), game and chat entries sort by actual timestamp, interleaving correctly.
  </action>
  <verify>
    1. `npx tsc --noEmit` passes with no type errors
    2. `npm run build` succeeds
    3. Manual review: the mergedStructured block uses `entry.timestamp` and `item.timestamp` as sortKey
  </verify>
  <done>
    - mergedStructured sorts game entries by `entry.timestamp` and chat entries by `item.timestamp`
    - Chat messages interleave chronologically with game log entries instead of clustering at bottom
    - Build passes with no errors
  </done>
</task>

</tasks>

<verification>
- TypeScript compilation: `npx tsc --noEmit`
- Production build: `npm run build`
- Code review: sortKey uses `.timestamp` not index for mergedStructured
</verification>

<success_criteria>
- Chat and game log entries in mergedStructured are sorted by real timestamps
- Chat no longer always appears after all game entries
- No regressions — build and type check pass
</success_criteria>

<output>
After completion, create `.planning/quick/047-game-log-scroll-bottom-chat-priority-fix/047-SUMMARY.md`
</output>
