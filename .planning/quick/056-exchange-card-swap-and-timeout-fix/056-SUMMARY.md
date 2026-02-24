---
phase: quick-056
plan: 01
subsystem: ui
tags: [react, game-engine, exchange, timeout, ux, typescript]

# Dependency graph
requires:
  - phase: quick-035
    provides: ExchangeModal 최적화 기반
  - phase: quick-052
    provides: 턴 액션 45초 타임아웃 패턴 (resolveActionTimeout)
provides:
  - ExchangeModal swap 방식 카드 선택 (최대 선택 시 마지막 교체)
  - 카드 선택 순서 배지 (1, 2 표시)
  - exchange_select 단계 45초 타임아웃 자동 기존 카드 유지
  - ExchangeModal 내 카운트다운 타이머 바
  - 클라이언트 타임아웃 폴링 exchange_select 포함
affects: [exchange flow, game-engine timeouts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "카드 선택 swap: 최대 선택 도달 시 [...prev.slice(0, -1), i] 패턴으로 마지막 교체"
    - "exchange_select timeout: resolveExchangeTimeout 함수 체이닝 in timeout route"
    - "타이머 바: deadline prop → useEffect remainingMs → progress bar 패턴 재사용"

key-files:
  created: []
  modified:
    - components/game/ExchangeModal.tsx
    - lib/game/types.ts
    - lib/game/engine.ts
    - app/api/game/timeout/route.ts
    - components/game/GameBoard.tsx

key-decisions:
  - "swap 방식: 이미 선택된 카드 클릭은 해제, 꽉 찼을 때 새 클릭은 마지막 선택 교체"
  - "타임아웃 시 기존 카드 유지: keptIndices = liveCards.map((_, i) => i) 로 현재 카드 인덱스 유지"
  - "exchangeDeadline은 PendingAction 안에 저장 (actionDeadline은 GameState 최상위)"

patterns-established:
  - "Timer bar: deadline prop → useEffect interval 200ms → remainingMs state → progress/color"
  - "Timeout chain: resolveTimeouts → resolveActionTimeout → resolveExchangeTimeout"

# Metrics
duration: 8min
completed: 2026-02-24
---

# Quick-056: Exchange Card Swap and Timeout Fix Summary

**ExchangeModal swap 방식 카드 선택 UX + exchange_select 45초 타임아웃 자동 기존 카드 유지 구현**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-24T09:25:00Z
- **Completed:** 2026-02-24T09:33:17Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- ExchangeModal 카드 선택 swap 방식: 최대 선택 도달 시 새 카드 클릭하면 마지막 선택이 자동 교체됨
- 선택된 카드에 순서 배지(1, 2) 표시로 직관적 UX 제공
- exchange_select 단계 진입 시 45초 exchangeDeadline 설정 + 시간 초과 시 기존 카드 자동 유지
- ExchangeModal 내 카운트다운 타이머 바 표시 (ActionPanel 동일 패턴)
- GameBoard 타임아웃 폴링에 exchange_select 단계 포함

## Task Commits

1. **Task 1: ExchangeModal 카드 swap 선택 UX + 선택 순서 배지** - `81a834e` (feat)
2. **Task 2: exchange_select 45초 타임아웃 + 클라이언트 폴링** - `c5fcad6` (feat)

## Files Created/Modified

- `components/game/ExchangeModal.tsx` - swap toggle 로직, 선택 순서 배지, exchangeDeadline prop, 타이머 바
- `lib/game/types.ts` - PendingAction/FilteredPendingAction에 exchangeDeadline 필드 추가
- `lib/game/engine.ts` - exchange_select 진입 시 exchangeDeadline 설정, resolveExchangeTimeout 함수
- `app/api/game/timeout/route.ts` - resolveExchangeTimeout 체이닝
- `components/game/GameBoard.tsx` - exchange_select 타임아웃 폴링, ExchangeModal에 exchangeDeadline 전달

## Decisions Made

- swap 방식 채택: `[...prev.slice(0, -1), i]` — 마지막 선택을 새 카드로 교체. 기존 선택 해제 후 재선택보다 자연스러운 UX
- 타임아웃 시 기존 카드 유지: `keptIndices = liveCards.map((_, i) => i)` — 현재 손패 인덱스 그대로 유지
- exchangeDeadline을 PendingAction 내에 저장 (actionDeadline은 GameState 최상위와 다른 위치)
- 타이머 바 UI는 ActionPanel 패턴 그대로 재사용 (deadline prop → useEffect 200ms interval → progress)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ExchangeModal UX 완성. 카드 교환 흐름이 자연스럽게 동작함
- exchange_select 타임아웃으로 무한 대기 방지 완료
- 기존 테스트 112개 모두 통과, 타입 에러 없음

---
*Phase: quick-056*
*Completed: 2026-02-24*
