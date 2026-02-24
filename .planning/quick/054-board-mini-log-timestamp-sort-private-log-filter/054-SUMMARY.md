---
phase: quick
plan: "054"
subsystem: game-ui
tags: [mini-log, structuredLog, timestamp-sort, private-log, mobile]
completed: 2026-02-24
duration: ~3min
tasks_completed: 1
tasks_total: 1
commits:
  - hash: 4198fd7
    type: feat
    description: "미니 로그 structuredLog 타임스탬프 정렬 + private 로그 필터링"
key_files:
  modified:
    - components/game/GameBoard.tsx
---

# Quick 054: 보드 미니 로그 타임스탬프 정렬 + private 로그 필터링

structuredLog timestamp 기반 미니 로그 정렬 + visibleTo private 로그 이탤릭/Eye 아이콘 구분 표시

## What Changed

### Task 1: 미니 로그 structuredLog 기반 타임스탬프 정렬 + private 로그 필터링

**Before:**
- 미니 로그가 `state.log` index 기반으로 정렬 (순서 부정확)
- `structuredLog`를 사용하지 않아 private 로그 필터링 불가

**After:**
- `state.structuredLog`가 있으면 우선 사용 -- `entry.timestamp` 기반 정확한 시간순 정렬
- private 로그(visibleTo 설정된 항목)는 `italic` + `text-ambassador/70` 스타일 + Eye 아이콘으로 구분
- 채팅 로그도 structuredLog 모드에서 올바른 timestamp로 병합
- `structuredLog` 없을 시 기존 `state.log` 폴백 유지 (하위 호환)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` -- GameBoard.tsx 관련 에러 없음 (기존 filter.test.ts 에러만 존재)
- `npm run build` -- 성공
- EventLog (전체 로그 모달) 코드 변경 없음 -- 기존 동작 유지
