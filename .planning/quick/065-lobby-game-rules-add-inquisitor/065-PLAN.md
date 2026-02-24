# Quick Task 065: 로비 게임 규칙 종교재판관 추가

## Problem
`app/page.tsx`의 로비 게임 규칙 캐릭터 탭에 5가지 기본 캐릭터만 표시되어 있고,
종교재판관(Inquisitor)이 누락되어 있음.

## Solution
캐릭터 배열에 종교재판관 항목 추가. 로비는 게임 모드 컨텍스트가 없으므로
항상 6번째 캐릭터로 표시 (종교개혁 모드 전용 표시).

## Tasks

### Task 1: 캐릭터 배열에 종교재판관 추가
- **파일**: `app/page.tsx` (lines 507-513)
- **변경**: 캐릭터 배열에 Inquisitor 항목 추가
- **검증**: 빌드 성공 확인

## Files Modified
- `app/page.tsx`
