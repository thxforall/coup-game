# Quick Task 048 Summary

## 갈취 대상 코인 수 반영

### Changes
- `components/game/TargetSelectModal.tsx`: 코인 1개 대상에 "(1개만 갈취)" 힌트 표시
- `components/game/ActionPanel.tsx`: 확인 메시지에 실제 갈취 금액 반영 (`Math.min(coins, 2)`)

### Commit
656c929
