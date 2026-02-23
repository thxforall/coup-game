---
quick: "012"
name: "korean-terminology-namu-wiki-update"
one-liner: "나무위키 쿠(보드게임) 기준 한국어 용어 전면 통일: 강탈→갈취, 세금→세금징수, 쿠→쿠데타"
subsystem: "ui-text, game-engine, docs"
tags: ["terminology", "i18n", "korean", "ui-labels"]

dependency-graph:
  requires: []
  provides:
    - "나무위키 표준 용어 적용 완료"
  affects: []

file-tracking:
  created: []
  modified:
    - "lib/game/types.ts"
    - "components/game/ActionPanel.tsx"
    - "components/game/ResponseModal.tsx"
    - "components/game/CardInfoModal.tsx"
    - "components/game/WaitingRoom.tsx"
    - "app/page.tsx"
    - "lib/game/engine.ts"
    - "lib/game/engine.test.ts"
    - "lib/game/full-game-scenario.test.ts"
    - "README.md"

decisions:
  - id: "D1"
    decision: "scenarios.test.ts는 기존 영문 주석 위주라 변경 불필요"
    rationale: "파일 검토 결과 강탈/세금 한국어 설명 문자열 없음"
  - id: "D2"
    decision: "engine.test.ts의 에러 메시지 assertion도 함께 업데이트"
    rationale: "에러 메시지 변경 시 테스트가 실패하므로 함께 갱신"

metrics:
  duration: "~5분 (13:31 ~ 13:36 UTC)"
  completed: "2026-02-23"
  tasks-completed: 2
  tasks-total: 2
---

# Quick 012: Korean Terminology Namu-Wiki Update Summary

**One-liner:** 나무위키 쿠(보드게임) 기준 한국어 용어 전면 통일: 강탈→갈취, 세금→세금징수, 쿠→쿠데타

## What Was Done

한국 보드게임 커뮤니티 표준(나무위키 기준) 용어로 전체 코드베이스 UI 텍스트, 엔진 로그, 테스트 설명, README를 통일했다.

**변경 규칙 적용:**
| 구버전 | 신버전 | 적용 대상 |
|--------|--------|-----------|
| 강탈 | 갈취 | UI 레이블, 엔진 로그, 설명 텍스트 |
| 세금 | 세금징수 | UI 레이블, 엔진 로그, README |
| 쿠 (버튼) | 쿠데타 | UI 레이블, 안내 문구, 에러 메시지 |
| 외국 원조 차단 | 해외 원조 차단 | README 캐릭터 테이블 |

## Task Results

### Task 1: 핵심 타입 및 컴포넌트 용어 통일
**Commit:** f6edc3b

**파일별 변경 항목:**
- `lib/game/types.ts` — ACTION_NAMES 3개(coup/tax/steal), ActionType 주석 4개, PendingAction 주석 2개
- `components/game/ActionPanel.tsx` — 버튼 레이블 3개(쿠데타/세금징수/갈취), 안내 문구 3개, 주석 2개, mustCoup 메시지
- `components/game/ResponseModal.tsx` — steal ACTION_CONTEXT challengeInfo/passInfo, Captain/Ambassador 블록 컨텍스트 각 3곳
- `components/game/CardInfoModal.tsx` — Duke 세금→세금징수, Captain 강탈→갈취(action/blocks/blocksDesc/tip), Ambassador blocks/blocksDesc
- `components/game/WaitingRoom.tsx` — Guess 모드 배지 1곳
- `app/page.tsx` — 게임 모드 설명 1곳

### Task 2: 엔진 로그, 테스트 설명, README 용어 통일
**Commit:** a174c03

**파일별 변경 항목:**
- `lib/game/engine.ts` — 주석 1개, 에러 메시지 3개, 쿠데타 로그 2개, 갈취 로그 1개, 세금징수 로그 1개
- `lib/game/engine.test.ts` — 강제 쿠데타 에러 assertion 2개 (Rule 1: Bug — 에러 메시지 변경에 따른 테스트 동기화)
- `lib/game/full-game-scenario.test.ts` — 테스트 describe 문자열 및 주석 12곳
- `README.md` — 캐릭터 테이블 세금징수/갈취/해외 원조 적용

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] engine.test.ts 에러 메시지 assertion 동기화**

- **Found during:** Task 2 - engine.ts 에러 메시지 변경 직후 hook이 테스트 실패 감지
- **Issue:** `engine.test.ts` line 859, 863에서 `'코인이 10개 이상이면 쿠를 해야 합니다'`를 assertion으로 사용하고 있었음
- **Fix:** engine.ts 에러 메시지와 동일하게 `'쿠데타'`로 갱신
- **Files modified:** `lib/game/engine.test.ts`
- **Commit:** a174c03

## Verification Results

```
강탈 잔존: 0건
쿠 단독 사용 잔존: 0건
세금징수 적용: 6곳 확인
Tests: 112 passed, 0 failed
```

## Next Phase Readiness

- 모든 UI 텍스트가 나무위키 표준 용어를 사용함
- 코드 식별자(ActionType: 'steal', 'tax', 'coup')는 변경 없음 - API 호환성 유지
- 추가 작업 불필요
