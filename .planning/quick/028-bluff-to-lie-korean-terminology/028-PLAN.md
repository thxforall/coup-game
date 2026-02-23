---
phase: quick-028
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ResponseModal.tsx
  - components/game/GameRulesModal.tsx
  - components/game/EventLog.tsx
  - components/game/GameBoard.tsx
  - lib/game/engine.ts
  - lib/game/engine.test.ts
  - lib/game/full-game-scenario.test.ts
autonomous: true

must_haves:
  truths:
    - "UI에 '블러프'라는 단어가 더 이상 표시되지 않는다"
    - "모든 곳에서 '블러프' 대신 '거짓말'이 사용된다"
    - "기존 테스트가 모두 통과한다"
  artifacts:
    - path: "components/game/ResponseModal.tsx"
      contains: "거짓말"
    - path: "components/game/GameRulesModal.tsx"
      contains: "거짓말"
    - path: "lib/game/engine.ts"
      contains: "거짓말"
  key_links: []
---

<objective>
Replace all occurrences of "블러프" with "거짓말" across the codebase (source + test files).

Purpose: User-facing terminology should say "거짓말" instead of the loanword "블러프" for clearer Korean expression.
Output: All source and test files updated, tests passing.
</objective>

<context>
@.planning/PROJECT.md
This is a straightforward find-and-replace task across 7 files.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace "블러프" with "거짓말" in all source and test files</name>
  <files>
    components/game/ResponseModal.tsx
    components/game/GameRulesModal.tsx
    components/game/EventLog.tsx
    components/game/GameBoard.tsx
    lib/game/engine.ts
    lib/game/engine.test.ts
    lib/game/full-game-scenario.test.ts
  </files>
  <action>
    Replace every occurrence of "블러프" with "거짓말" in these files.

    Key replacements (source files):
    - ResponseModal.tsx:372 — "블러프라고 생각해요" -> "거짓말이라고 생각해요"
    - GameRulesModal.tsx:65 — "블러프:" -> "거짓말:" and "가지고 있지 않은 캐릭터의 능력을 사용 가능"
    - GameRulesModal.tsx:123 — "상대가 블러프인지" -> "상대가 거짓말인지", "블러프면" -> "거짓말이면"
    - EventLog.tsx:19 — includes('블러프') -> includes('거짓말')
    - GameBoard.tsx:241,250 — "블러프 발각!" -> "거짓말 발각!"
    - engine.ts:415,531 — "블러프였습니다" -> "거짓말이었습니다"

    Test files: Replace all "블러프" with "거짓말" in test descriptions and comments.
    These are in engine.test.ts and full-game-scenario.test.ts.

    IMPORTANT: Do NOT touch any files in .planning/ or plans/ directories.
  </action>
  <verify>
    1. `grep -r "블러프" --include="*.ts" --include="*.tsx" /Users/kiyeol/development/coup/components /Users/kiyeol/development/coup/lib` returns no results
    2. `npx vitest run` — all tests pass
    3. `npx next build` or `npx tsc --noEmit` — no type errors
  </verify>
  <done>
    Zero occurrences of "블러프" remain in source/test files. All tests pass. No build errors.
  </done>
</task>

</tasks>

<verification>
- grep confirms zero "블러프" in .ts/.tsx files (excluding .planning/)
- All existing tests pass without modification to test logic (only string replacements)
- Build succeeds
</verification>

<success_criteria>
- "블러프" completely replaced by "거짓말" in all 7 files
- All tests green
- No type or build errors
</success_criteria>

<output>
After completion, create `.planning/quick/028-bluff-to-lie-korean-terminology/028-SUMMARY.md`
</output>
