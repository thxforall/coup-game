---
phase: quick
plan: 059
subsystem: game-engine
tags: [reformation, embezzlement, examine, inquisitor, reverse-challenge]
completed: 2026-02-24
duration: ~5 minutes
requires: []
provides:
  - 횡령 역도전 메커니즘
  - 심문 대상 카드 선택 UI/로직
affects: []
tech-stack:
  added: []
  patterns:
    - 역도전 (reverse challenge) 패턴 for embezzlement
    - 2-phase examine (card_select -> select)
key-files:
  created: []
  modified:
    - lib/game/engine.ts
    - lib/game/types.ts
    - lib/game/filter.ts
    - components/game/ExamineModal.tsx
    - components/game/ActionPanel.tsx
    - components/game/ResponseModal.tsx
    - components/game/GameBoard.tsx
    - app/api/game/action/route.ts
decisions:
  - id: embezzlement-reverse-challenge
    choice: "resolveEmbezzlementChallenge를 resolveChallenge 시작부에 분기"
    reason: "횡령은 getRequiredCharacter로 매핑 불가 (역방향 로직이므로)"
  - id: examine-card-select-phase
    choice: "examine_card_select -> examine_select 2단계 phase"
    reason: "대상이 카드 선택 후 심문관이 돌려주기/교체 결정하는 원래 룰 구현"
---

# Quick Task 059: 종교개혁 확장판 룰 수정 Summary

횡령 역도전 메커니즘 + 심문 대상 카드선택 주체 변경 + 공격 제한 검증

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | 횡령 역도전 메커니즘 | c6d1255 | resolveEmbezzlementChallenge, ActionPanel/ResponseModal 설명 업데이트 |
| 2 | 심문 카드선택 주체 변경 | 36535bb | examine_card_select phase, processExamineCardSelect, ExamineModal 이중 모드 |
| 3 | 공격 제한 확인 | (검증만) | canTargetPlayer 올바름 확인, 빌드 성공 |

## What Changed

### Task 1: 횡령 역도전

- **Before:** 횡령은 공작 능력으로 처리. 도전 시 공작이 없으면 도전 성공 (일반 도전과 동일)
- **After:** 횡령은 "공작이 없다"는 선언. 도전 시 공작이 **있으면** 도전 성공 (역방향)
  - `resolveEmbezzlementChallenge()` 함수 추가
  - `getRequiredCharacter()`에서 embezzlement의 Duke 매핑 제거
  - ActionPanel: claimedChar 제거, desc 업데이트
  - ResponseModal: challengeInfo에 역도전 설명 추가

### Task 2: 심문 대상 카드선택

- **Before:** 심문 시 랜덤으로 대상의 비공개 카드 1장 자동 선택
- **After:** 대상 플레이어가 보여줄 카드를 직접 선택 (카드 1장이면 자동)
  - `examine_card_select` phase 추가 (types.ts)
  - `processExamineCardSelect()` 함수 추가 (engine.ts)
  - `resolveExamineTimeout()` 확장 (examine_card_select 타임아웃 시 랜덤 자동 선택)
  - ExamineModal: 대상용 카드선택 UI + 심문관용 돌려주기/교체 UI 이중 모드
  - GameBoard: examine_card_select 대기 메시지 + 타임아웃 폴링
  - route.ts: examine_card_select API 핸들러

### Task 3: 공격 제한 검증

- canTargetPlayer: 쿠데타/암살/갈취 + 해외원조 블록에 올바르게 적용됨 확인
- 전향은 같은 진영 제한 없음 (올바름)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` - 타입 에러 없음
- `npm run build` - 빌드 성공
- examine_card_select phase가 GamePhase에 존재
- processExamineCardSelect가 engine.ts에서 export됨
- getRequiredCharacter에서 embezzlement가 Duke를 반환하지 않음
