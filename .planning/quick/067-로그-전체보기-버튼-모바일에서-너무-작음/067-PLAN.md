# Quick Task 067: 로그 전체보기 버튼 모바일에서 너무 작음

## Task
모바일 미니 로그 영역의 "전체" 버튼이 `text-[10px] px-2 py-0.5`로 너무 작아 터치하기 어려움.

## Plan
1. GameBoard.tsx 607번째 줄의 "전체" 버튼 클래스를 확대:
   - `text-[10px]` → `text-xs` (10px → 12px)
   - `px-2 py-0.5` → `px-3 py-1.5` (패딩 증가)
   - `ml-1` → `ml-2` (좌측 마진 확대)
   - `rounded` → `rounded-md` (라운드 약간 확대)
