---
phase: quick
plan: 008
subsystem: game-engine
tags: [challenge, lose_influence, card-selection, ux, engine]

dependency-graph:
  requires: []
  provides:
    - "도전/블록도전 시 카드를 잃는 플레이어가 직접 카드 선택"
    - "ChallengeLoseContext로 카드 선택 후 continuation 분기"
  affects:
    - "future phases involving challenge UX"

tech-stack:
  added: []
  patterns:
    - "lose_influence 페이즈 재활용: challengeLoseContext.continuation으로 이후 흐름 결정"
    - "1장 보유 시 자동 제거, 2장 이상 보유 시 UI 선택 유도"

key-files:
  created: []
  modified:
    - lib/game/types.ts
    - lib/game/engine.ts
    - lib/game/engine.test.ts
    - lib/game/filter.ts
    - components/game/GameBoard.tsx
    - app/api/game/restart/route.ts

decisions:
  - id: d1
    decision: "ChallengeLoseContext.continuation 3가지 값으로 분기"
    rationale: "execute_action(도전실패/블록도전성공), next_turn(도전성공), block_success_next_turn(블록도전실패) — 각 경우 이후 흐름이 다름"
  - id: d2
    decision: "카드 1장 보유 시 자동 제거 유지"
    rationale: "선택지가 없을 때 불필요한 UI 대기 없앰 — UX 최적화"
  - id: d3
    decision: "challengeLoseContext를 processLoseInfluence 후 제거"
    rationale: "암살 실행 시 다시 lose_influence 페이즈가 올 수 있으므로 컨텍스트 오염 방지"

metrics:
  duration: "6분"
  completed: "2026-02-23"
  tasks-completed: 3
  tasks-total: 3
---

# Quick Task 008: Choose Own Card to Lose Summary

**One-liner:** 도전/블록도전 시 카드 잃는 플레이어가 `ChallengeLoseContext`와 기존 `lose_influence` 페이즈를 활용해 직접 카드를 선택하도록 변경

## What Was Built

쿠 공식 룰에서 카드를 잃을 때 항상 해당 플레이어가 선택해야 한다. 기존에는 `removeFirstLiveCard`로 첫 번째 비공개 카드를 자동 제거했는데, 이를 `lose_influence` 페이즈로 전환하여 유저가 직접 선택하도록 변경했다.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | 엔진 로직 수정 - lose_influence 전환 | ecc6c49 | types.ts, engine.ts, filter.ts |
| 2 | 테스트 업데이트 및 새 테스트 추가 | ecc6c49 | engine.test.ts |
| 3 | UI 상태 메시지 및 대기 표시 개선 | 212298b | GameBoard.tsx |

## Decisions Made

1. **ChallengeLoseContext 타입 도입**: `continuation` 필드 3가지로 이후 흐름 분기
   - `execute_action`: 도전 실패(도전자 카드 잃음) 또는 블록 도전 성공(블로커 카드 잃음) → 원래 액션 실행
   - `next_turn`: 도전 성공(행동자 블러프) → 다음 턴
   - `block_success_next_turn`: 블록 도전 실패(도전자 카드 잃음) → 블록 확정 메시지 후 다음 턴

2. **카드 1장 보유 시 자동 제거**: `getLiveCardCount > 1` 체크로 선택 여부 결정

3. **processLoseInfluence에서 컨텍스트 소비 후 제거**: `delete cleanPending.challengeLoseContext`로 다음 `lose_influence`(예: 암살 실행)에 영향 주지 않도록

## Test Results

- 기존 도전/블록 테스트 8개 수정 (lose_influence 중간 단계 포함)
- 새 describe `'도전 시 카드 선택 (lose_influence)'` 테스트 5개 추가
- 전체 **55개 테스트 모두 통과**
- `npx tsc --noEmit` — 내 변경 파일 타입 에러 없음
- `npm run build` — 빌드 성공

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] app/api/game/restart/route.ts 타입 캐스팅 버그**

- **Found during:** Task 3 빌드 검증
- **Issue:** `(state as Record<string, unknown>).gameMode`로 불필요한 타입 캐스팅 사용 — `GameState`에 이미 `gameMode` 필드가 있음
- **Fix:** `state.gameMode`로 직접 접근
- **Files modified:** `app/api/game/restart/route.ts`
- **Commit:** 212298b

**2. [Rule 3 - Blocking] 자동 복원된 resolveChallenge 재적용**

- **Found during:** Task 1 실행 중
- **Issue:** 자동 포맷터/린터가 편집 중에 `resolveChallenge` 함수를 이전 버전으로 복원
- **Fix:** 함수를 정확히 타겟팅하여 재적용
- **Impact:** 없음 (최종 결과 동일)
