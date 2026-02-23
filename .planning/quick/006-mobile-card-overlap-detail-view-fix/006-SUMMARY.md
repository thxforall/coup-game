# Quick-006: 모바일 카드 겹침 및 카드 상세보기 잘림 수정

## Changes

| File | Change |
|------|--------|
| `components/game/PlayerArea.tsx` | 카드 크기 w-14 h-20 → w-11 h-16 (모바일), 블록 min-w → 고정 w-[110px], gap-2 → gap-1 |
| `components/game/MyPlayerArea.tsx` | 카드 크기 w-[90px] h-[128px] → w-[80px] h-[114px] (모바일) |
| `components/game/CardInfoModal.tsx` | 모바일 바텀시트 패턴 (items-end), 이미지 h-48 → h-36, max-h-[90vh] + overflow-y-auto |

## Commit

- `25f9bff`: fix(quick-006): 모바일 카드 겹침 및 카드 상세보기 잘림 수정
