---
phase: quick
plan: 050
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/WaitingRoom.tsx
  - lib/firebase.client.ts
autonomous: true

must_haves:
  truths:
    - "비방장 플레이어가 대기실에서 '방 나가기' 버튼을 눌러 방을 나갈 수 있다"
    - "방장이 방을 삭제하면 모든 다른 플레이어가 자동으로 로비로 이동된다"
  artifacts:
    - path: "components/game/WaitingRoom.tsx"
      provides: "비방장 플레이어용 방 나가기 버튼"
      contains: "handleLeave"
    - path: "lib/firebase.client.ts"
      provides: "방 삭제 시 null snapshot 감지 -> 콜백"
  key_links:
    - from: "components/game/WaitingRoom.tsx"
      to: "/api/game/leave"
      via: "fetch POST on button click"
      pattern: "fetch.*api/game/leave"
    - from: "lib/firebase.client.ts"
      to: "app/game/[roomId]/page.tsx"
      via: "onRoomDeleted callback triggers redirect"
---

<objective>
대기실(WaitingRoom)에서 (1) 비방장 플레이어가 방을 나갈 수 있고 (2) 방장이 방 삭제 시 다른 플레이어가 자동 로비 이동되도록 구현.

Purpose: 대기실에서 참가자가 자유롭게 나갈 수 있어야 하며, 방 삭제 시 잔류 플레이어가 빈 화면에 갇히지 않아야 한다.
Output: 수정된 WaitingRoom.tsx, firebase.client.ts
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/WaitingRoom.tsx
@lib/firebase.client.ts
@app/game/[roomId]/page.tsx
@app/api/game/leave/route.ts
@app/api/game/delete/route.ts
@components/game/SettingsModal.tsx (방 나가기/삭제 패턴 참고)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 비방장 대기실 "방 나가기" 버튼 + 방 삭제 시 자동 리다이렉트</name>
  <files>
    components/game/WaitingRoom.tsx
    lib/firebase.client.ts
    app/game/[roomId]/page.tsx
  </files>
  <action>
**WaitingRoom.tsx 수정:**

1. Props 인터페이스에 `onLeave: () => void` 추가.

2. 비방장 플레이어(isHost === false) 영역에 "방 나가기" 버튼 추가:
   - 현재 비방장은 "준비 완료/준비 취소" 버튼만 있음 (line 209-228).
   - 준비 버튼 아래에 "방 나가기" 버튼 추가. `LogOut` 아이콘 + "방 나가기" 텍스트.
   - 스타일: `btn-ghost w-full py-2.5 flex items-center justify-center gap-2 text-sm border border-border-subtle mt-3 text-text-secondary hover:text-red-400 hover:border-red-500/30`
   - `window.confirm('방을 나가시겠습니까?')` 후 `onLeave()` 호출.

3. 상단 "로비로" 버튼(line 56-63)도 `onLeave()` 호출하도록 수정:
   - 현재: `clearActiveRoom(); window.location.href = '/';` (leave API 호출 안함)
   - 변경: `window.confirm('방을 나가시겠습니까?')` 후 `onLeave()` 호출
   - 방장도 비방장도 동일하게 onLeave 호출 (방장의 경우 page.tsx에서 leave API 호출 -> 서버가 players에서 제거)

**app/game/[roomId]/page.tsx 수정:**

1. `handleLeave` 콜백 추가 (SettingsModal.tsx의 handleLeave 패턴 참조):
   ```typescript
   const handleLeave = useCallback(async () => {
     try {
       await fetch('/api/game/leave', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ roomId, playerId }),
       });
     } catch {
       // API 실패해도 나가기는 진행
     }
     clearActiveRoom();
     window.location.href = '/';
   }, [roomId, playerId]);
   ```

2. WaitingRoom 컴포넌트에 `onLeave={handleLeave}` prop 전달.

**lib/firebase.client.ts - subscribeToRoom 수정:**

1. `subscribeToRoom` 함수 시그니처에 `onRoomDeleted?: () => void` 옵션 파라미터 추가:
   ```typescript
   export function subscribeToRoom(
     roomId: string,
     playerId: string,
     callback: (state: FilteredGameState) => void,
     onRoomDeleted?: () => void
   ): () => void
   ```

2. `stateRef` onValue 콜백에서 `snapshot.exists()` === false일 때 `onRoomDeleted?.()` 호출:
   - 현재 line 66: `if (snapshot.exists()) { ... }` - else 분기가 없음
   - 추가: `else { onRoomDeleted?.(); }`

3. `viewRef` onValue 콜백에도 동일 처리 (views도 삭제됨):
   - 단, stateRef의 else에서만 호출하면 충분 (waiting 단계에서는 stateRef 구독 중이므로)

**app/game/[roomId]/page.tsx - 방 삭제 감지:**

1. `subscribeToRoom` 호출 시 4번째 인자로 onRoomDeleted 콜백 전달:
   ```typescript
   const unsubscribe = subscribeToRoom(roomId, playerId, (newState) => {
     // ... existing logic
   }, () => {
     // 방이 삭제됨
     clearActiveRoom();
     window.location.href = '/';
   });
   ```
  </action>
  <verify>
    1. `npx tsc --noEmit` 타입 체크 통과
    2. `npm run build` 빌드 성공
    3. 수동 확인: 비방장 대기실 화면에 "방 나가기" 버튼 표시 확인
  </verify>
  <done>
    - 비방장 플레이어가 대기실에서 "방 나가기" 버튼으로 방을 나갈 수 있다
    - "로비로" 헤더 버튼 클릭 시 leave API를 호출한 후 로비로 이동한다
    - 방장이 방을 삭제하면 다른 플레이어가 자동으로 로비로 리다이렉트된다
  </done>
</task>

</tasks>

<verification>
1. 타입 체크: `npx tsc --noEmit`
2. 빌드: `npm run build`
3. 비방장 대기실에 "방 나가기" 버튼 존재
4. 방 삭제 시 Firebase snapshot null -> 자동 리다이렉트 로직 존재
</verification>

<success_criteria>
- 비방장 플레이어 대기실에 "방 나가기" 버튼이 표시되고 클릭 시 leave API 호출 후 로비 이동
- 상단 "로비로" 버튼도 leave API 호출
- 방장 방 삭제 시 다른 플레이어 자동 로비 이동 (Firebase snapshot null 감지)
- 타입 체크 및 빌드 통과
</success_criteria>

<output>
After completion, create `.planning/quick/050-waiting-room-delete-leave/050-SUMMARY.md`
</output>
