---
phase: quick
plan: 051
subsystem: game-engine
tags: [private-log, visibleTo, UX, event-log]
completed: 2026-02-24
duration: ~3min
tech-stack:
  patterns: [visibleTo field for per-player log filtering]
key-files:
  modified:
    - lib/game/types.ts
    - lib/game/engine.ts
    - lib/game/filter.ts
    - components/game/EventLog.tsx
---

# Quick 051: 비공개 개인 로그 (카드 교체/교환) Summary

**One-liner:** LogEntry.visibleTo 필드로 도전 실패 카드 교체, 블록 도전 실패 카드 교체, 대사 교환 시 본인만 볼 수 있는 비공개 로그 추가

## What Was Done

### Task 1: LogEntry visibleTo 필드 + filter.ts 필터링 (7309264)
- `LogEntry` 인터페이스에 `visibleTo?: string` optional 필드 추가
- `filterStateForPlayer`에서 `structuredLog` 배열을 `visibleTo` 기준으로 필터링 (없거나 본인 playerId만 통과)

### Task 2: engine.ts 3가지 시나리오 비공개 로그 (a6d5724)
- `addPrivateLog` 헬퍼 함수 추가 (structuredLog에만 visibleTo 로그 push, log[] string 배열에는 미추가)
- **시나리오 A:** `resolveChallenge` - 도전 실패 시 행동자에게 "XX이(가) 덱으로 돌아가고 새 카드를 받았습니다"
- **시나리오 B:** `processBlockResponse` - 블록 도전 실패 시 블로커에게 동일 메시지
- **시나리오 C:** `processExchangeSelect` - 교환 완료 시 "교환: [후보들] 중 XX을(를) 선택했습니다"

### Task 3: EventLog 비공개 로그 시각적 구분 (3ab6523)
- `Eye` 아이콘 (lucide-react) + `italic` + `text-ambassador/70` 색상으로 비공개 로그 시각적 구분
- 기존 로그와 명확히 차별화됨

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `addPrivateLog`는 `log[]` (string[])에 추가하지 않음 | 비공개 로그는 structuredLog 전용 — 기존 string log 기반 렌더링에 영향 없음 |
| 비공개 로그 색상으로 `text-ambassador/70` 선택 | 보라색 계열이 "개인 정보" 느낌 전달, 기존 로그 색상과 충돌 없음 |

## Verification

- `npx tsc --noEmit` 통과 (pre-existing filter.test.ts 타입 에러만 존재)
- `addPrivateLog` 호출 3곳 확인 (resolveChallenge, processBlockResponse, processExchangeSelect)
- `visibleTo` 필터링 로직 filter.ts에 존재 확인
