---
phase: quick
plan: 062
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/firebase.client.ts
autonomous: true

must_haves:
  truths:
    - "게임 진행 중 방이 삭제되면 다른 플레이어가 자동으로 로비로 리다이렉트된다"
  artifacts:
    - path: "lib/firebase.client.ts"
      provides: "viewRef 삭제 감지 콜백"
      contains: "onRoomDeleted"
  key_links:
    - from: "lib/firebase.client.ts viewRef onValue"
      to: "onRoomDeleted callback"
      via: "else branch when !snapshot.exists()"
      pattern: "onRoomDeleted"
---

<objective>
게임 진행 중(phase !== 'waiting') 호스트가 방을 삭제하면 다른 플레이어가 리다이렉트되지 않는 버그 수정.

Purpose: 게임 시작 후 stateRef 구독이 해제되어 방 삭제 감지가 불가능해지는 문제 해결
Output: viewRef 콜백에 삭제 감지 else 브랜치 추가
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/firebase.client.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: viewRef onValue 콜백에 방 삭제 감지 else 브랜치 추가</name>
  <files>lib/firebase.client.ts</files>
  <action>
    `subscribeToRoom` 함수의 `viewRef` `onValue` 콜백 (현재 line 47-57)에서:

    현재 코드:
    ```
    if (snapshot.exists()) {
      callback(snapshot.val() as FilteredGameState);
    }
    ```

    수정 후:
    ```
    if (snapshot.exists()) {
      callback(snapshot.val() as FilteredGameState);
    } else {
      // 게임 중 방 삭제 감지 (stateRef는 게임 시작 후 unsubscribe되므로 viewRef에서 처리)
      onRoomDeleted?.();
    }
    ```

    이유: 게임 시작 후 `stateRef` 구독이 해제(line 74-77)되므로, 방 삭제 시 `stateRef`의 `onRoomDeleted` 콜백이 호출되지 않는다. `viewRef`는 게임 내내 유지되므로 여기서 삭제를 감지해야 한다.

    주의: `viewRef`는 `views/{playerId}` 경로를 구독하므로, 방 전체가 삭제되면 이 snapshot도 존재하지 않게 되어 else 브랜치가 실행된다. 초기 로드 시 views가 아직 없는 경우는 stateRef 구독이 fallback으로 처리하므로 문제없다.
  </action>
  <verify>
    1. `npx tsc --noEmit` 타입 체크 통과
    2. 코드 리뷰: viewRef 콜백에 else 브랜치가 onRoomDeleted를 호출하는지 확인
  </verify>
  <done>viewRef onValue 콜백에 else 브랜치가 추가되어, 게임 진행 중 방 삭제 시 onRoomDeleted 콜백이 호출된다</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` 통과
- `subscribeToRoom` 함수에서 viewRef와 stateRef 모두 방 삭제 시 onRoomDeleted를 호출하는지 확인
</verification>

<success_criteria>
- viewRef onValue 콜백에 else 브랜치 존재
- else 브랜치에서 onRoomDeleted?.() 호출
- 타입 체크 통과
</success_criteria>

<output>
After completion, create `.planning/quick/062-fix-room-delete-in-game/062-SUMMARY.md`
</output>
