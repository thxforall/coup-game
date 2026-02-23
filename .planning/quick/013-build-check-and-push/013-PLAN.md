---
phase: quick-013
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["(any files with build/lint/test errors)"]
autonomous: true

must_haves:
  truths:
    - "npm run build completes with exit code 0"
    - "npm run lint completes with no errors"
    - "npm test completes with all tests passing"
    - "All changes are committed and pushed to remote"
  artifacts: []
  key_links: []
---

<objective>
Run full build, lint, and test checks on the project. Fix any errors found. Then commit all uncommitted changes and push to remote.

Purpose: Ensure codebase is clean and all recent work (quick-011, quick-012, and other uncommitted changes) is pushed to remote.
Output: Clean build, all tests passing, changes pushed to origin/main.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
This is a Next.js 14 project (coup board game) with Jest for testing.

Uncommitted modified files:
- app/api/game/action/route.ts
- app/api/game/create/route.ts
- app/api/game/start/route.ts
- components/game/EventLog.tsx
- components/game/GameBoard.tsx
- lib/firebase.client.ts
- lib/game/filter.ts
- lib/storage.ts

Untracked files include .planning docs, BgmPlayer component, public/audio, and other plan files.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build, Lint, and Test — Fix All Errors</name>
  <files>(files with errors — determined at runtime)</files>
  <action>
    Run checks in this order, fixing errors at each step before proceeding:

    1. **Lint check:** `npm run lint`
       - Fix any ESLint errors (unused imports, type issues, etc.)
       - Re-run lint until clean

    2. **Build check:** `npm run build`
       - Fix any TypeScript compilation errors
       - Fix any Next.js build errors (missing exports, bad imports, etc.)
       - Re-run build until it succeeds with exit code 0

    3. **Test check:** `npm test`
       - Fix any failing tests
       - If tests fail due to code changes from quick-011/012, update tests to match new behavior
       - Re-run tests until all pass

    For each fix: make the minimal change needed. Do not refactor unrelated code.
  </action>
  <verify>
    All three commands succeed:
    - `npm run lint` — no errors
    - `npm run build` — exit code 0
    - `npm test` — all tests pass
  </verify>
  <done>Build, lint, and tests all pass cleanly.</done>
</task>

<task type="auto">
  <name>Task 2: Commit All Changes and Push to Remote</name>
  <files>(all modified and untracked files)</files>
  <action>
    1. Stage all modified tracked files:
       - app/api/game/action/route.ts
       - app/api/game/create/route.ts
       - app/api/game/start/route.ts
       - components/game/EventLog.tsx
       - components/game/GameBoard.tsx
       - lib/firebase.client.ts
       - lib/game/filter.ts
       - lib/storage.ts

    2. Stage new feature files:
       - components/game/BgmPlayer.tsx
       - app/api/game/check/ (directory)
       - public/audio/ (directory)

    3. Stage planning docs:
       - All .planning/quick/ new plan files
       - plans/ directory files

    4. Create a single commit with a descriptive message covering all changes.
       Use conventional commit format. Since this spans multiple features, use a general message like:
       "feat: add BGM player, game check API, and various bug fixes"
       Include details in commit body about what's included.

    5. Push to remote: `git push origin main`

    IMPORTANT: Do NOT stage .env files or any files containing secrets. Check `git diff --staged` before committing.
  </action>
  <verify>
    - `git status` shows clean working tree (no unstaged changes)
    - `git log -1` shows the new commit
    - `git push` succeeded (check exit code)
  </verify>
  <done>All changes committed and pushed to origin/main. Remote is up to date.</done>
</task>

</tasks>

<verification>
- `npm run lint` passes
- `npm run build` exits 0
- `npm test` — all tests pass
- `git status` — clean working tree
- `git log --oneline -1` — shows new commit
- Remote is up to date with local
</verification>

<success_criteria>
- Zero build errors, zero lint errors, all tests green
- All uncommitted work pushed to remote
- No secrets or .env files committed
</success_criteria>

<output>
After completion, create `.planning/quick/013-build-check-and-push/013-SUMMARY.md`
</output>
