# Quick Task 048: 갈취 대상 코인 수 반영

## Problem
갈취(steal) 시 대상의 코인이 1개여도 UI에서 "2개 갈취"로 표시됨. 서버는 `Math.min(coins, 2)`로 올바르게 처리하지만 UI가 이를 반영하지 않음.

## Changes
1. **TargetSelectModal**: 코인 1개 대상에 "(1개만 갈취)" 힌트 텍스트 표시
2. **ActionPanel 확인 메시지**: 실제 갈취 금액(`Math.min(coins, 2)`) 반영
