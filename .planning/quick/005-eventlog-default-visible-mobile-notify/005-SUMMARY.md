---
phase: quick
plan: 005
subsystem: ui-mobile
tags: [mobile, eventlog, toast, ux]
dependency-graph:
  requires: [quick-004]
  provides: [mobile-compact-log, universal-toast-notifications]
  affects: []
tech-stack:
  added: []
  patterns: [mobile-compact-view, conditional-duration-toast]
key-files:
  created: []
  modified:
    - components/game/GameBoard.tsx
    - components/game/EventLog.tsx
    - components/game/GameToast.tsx
decisions:
  - id: D-Q005-1
    description: "getLogColor를 EventLog.tsx에서 named export하여 GameBoard에서 재사용"
    rationale: "색상 로직 중복 방지, 단일 소스 유지"
  - id: D-Q005-2
    description: "컴팩트 로그에서 text-text-muted 단색 대신 getLogColor 함수로 색상 적용"
    rationale: "로그 유형 구분이 시각적으로 유용"
metrics:
  duration: ~2min
  completed: 2026-02-23
---

# Quick 005: EventLog 모바일 기본 표시 + 토스트 알림 Summary

모바일에서 최근 3개 로그를 항상 표시하는 컴팩트 섹션 추가, 모든 새 로그에 토스트 알림 (일반 액션 2초, 중요 이벤트 2.5초)

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | 모바일 컴팩트 로그 섹션 추가 | 637bbc1 | GameBoard.tsx, EventLog.tsx |
| 2 | 모든 새 로그에 토스트 알림 | dfc6eff | GameToast.tsx |

## Changes Made

### Task 1: 모바일 컴팩트 로그 섹션
- `EventLog.tsx`: `getLogColor` 함수를 named export로 변경
- `GameBoard.tsx`: 상대방 영역 아래에 `lg:hidden` 컴팩트 로그 섹션 추가
  - `state.log.slice(-3)`으로 최근 3개 로그 표시
  - `getLogColor`로 로그 유형별 색상 적용
  - "전체 보기" 버튼으로 기존 오버레이 `setShowMobileLog(true)` 연동
  - `flex-shrink-0`으로 축소 방지, `bg-bg-card/80` 배경

### Task 2: 유니버설 토스트 알림
- `GameToast.tsx`: `addToast`에 optional `duration` 파라미터 추가 (기본값 2500ms)
- 기존 if-else 체인 마지막에 `else` 블록 추가: 일반 액션 로그도 `addToast(entry, 'action', 2000)` 호출
- 페이드아웃: `duration` 후 시작, `duration + 500ms` 후 DOM 제거
- 기존 도전/블록/카드잃음/승리 토스트는 2500ms 유지

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- `npx next build`에서 `/api/game/start` 관련 pre-existing 빌드 에러 존재 (이번 변경과 무관)
- TypeScript 컴파일은 변경 파일에 대해 정상 통과
