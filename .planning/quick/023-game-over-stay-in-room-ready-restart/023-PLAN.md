---
phase: quick
plan: "023"
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/check/route.ts
  - app/api/game/restart/route.ts
  - app/game/[roomId]/page.tsx
  - components/game/GameBoard.tsx
  - lib/firebase.client.ts
autonomous: true

must_haves:
  truths:
    - "Game over 후 새로고침해도 로비로 튕기지 않고 방에 남는다"
    - "Game over 후 방장이 '다시 시작' 누르면 모든 플레이어가 대기실로 돌아간다"
    - "비방장 플레이어도 game over 화면에서 '대기 중' 상태를 확인할 수 있다"
    - "대기실에서 레디 후 방장이 다시 게임을 시작할 수 있다"
  artifacts:
    - path: "app/api/game/check/route.ts"
      provides: "game_over를 active로 처리"
    - path: "components/game/GameBoard.tsx"
      provides: "모든 플레이어용 game over 화면 (방장 대기 안내)"
  key_links:
    - from: "app/api/game/check/route.ts"
      to: "app/page.tsx"
      via: "check API가 game_over 시 active:true 반환 -> 로비 재접속 시 방으로 리다이렉트"
    - from: "lib/firebase.client.ts"
      to: "app/game/[roomId]/page.tsx"
      via: "subscribeToRoom이 restart 후 waiting phase를 다시 수신"
---

<objective>
게임 완료(game_over) 후 로비로 돌아가는 대신 방에 머물러 있다가, 방장이 재시작하면 대기실로 돌아가서 레디 후 다시 게임을 시작할 수 있게 수정한다.

Purpose: 현재 game_over 시 재접속하면 "게임이 이미 시작되어 입장 불가" 또는 로비로 튕기는 문제 해결. 연속 게임 플레이 UX 개선.
Output: game_over -> 대기실 -> 재시작까지 끊김 없는 흐름
</objective>

<context>
@.planning/STATE.md
@app/api/game/check/route.ts
@app/api/game/restart/route.ts
@app/game/[roomId]/page.tsx
@components/game/GameBoard.tsx
@lib/firebase.client.ts
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: check API + subscribeToRoom 수정 (game_over 시 방 유지 + restart 후 waiting 수신)</name>
  <files>
    app/api/game/check/route.ts
    lib/firebase.client.ts
  </files>
  <action>
1. **app/api/game/check/route.ts**: `game_over` phase일 때도 `active: true`를 반환하도록 수정.
   - 현재: `if (!isPlayer || state.phase === 'game_over')` -> active: false
   - 변경: `if (!isPlayer)` -> active: false (game_over 조건 제거)
   - 이렇게 하면 게임 종료 후 새로고침해도 로비 대신 방 페이지로 리다이렉트됨

2. **lib/firebase.client.ts** `subscribeToRoom` 함수: state 구독 해제 로직 수정.
   - 현재 문제: 게임 시작 시 state 구독을 해제하고 views만 구독. restart API가 phase를 'waiting'으로 되돌려도 state 구독이 이미 해제되어 WaitingRoom으로 전환되지 않음.
   - 해결: restart API는 이미 `updateRoomWithViews`를 호출하므로 views/{playerId}에도 phase:'waiting' 상태가 기록됨. 따라서 views 구독만으로도 waiting 상태를 수신할 수 있음. state 구독 해제 로직은 그대로 유지해도 됨.
   - 확인: views 구독의 onValue 콜백에서 phase가 변경되면(game_over -> waiting) 정상적으로 setState가 호출되는지 검증. `subscribeToRoom`의 viewRef onValue 콜백은 단순히 callback(snapshot.val())이므로 문제없음.
   - 결론: firebase.client.ts는 수정 불필요할 수 있음. restart API가 views를 업데이트하므로 views 구독으로 충분. 단, 만약 views가 없는 경우(waiting 단계에서는 state만 존재할 수 있음)를 대비하여, stateRef 구독 해제 후 다시 구독하는 로직이 필요할 수 있음.
   - **핵심 수정**: `subscribeToRoom`에서 stateRef 구독을 한 번 해제한 후에는 다시 구독하지 않는 문제. restart 시 views에 waiting 상태가 들어가므로 viewRef 구독으로 수신 가능한지 확인하고, 만약 안 되면 state 구독을 해제하지 않도록 변경 (단, waiting일 때만 callback 호출).

   **실제 수정 방안**: state 구독을 영구 해제하지 말고, phase가 'waiting'이 아닌 경우 callback을 호출하지 않는 방식으로 변경. 즉 `stateUnsubbed = true; unsubState();` 부분을 제거하고, state 구독은 유지하되 `val.phase === 'waiting'`일 때만 callback 호출하는 현재 조건을 유지.
  </action>
  <verify>
    - `npm run build` 성공
    - check API에서 game_over phase일 때 `{ active: true, phase: 'game_over' }` 반환 확인
  </verify>
  <done>
    - game_over 상태에서 새로고침 시 로비로 튕기지 않고 방 페이지에 남음
    - restart 후 phase가 waiting으로 변경되면 모든 클라이언트가 WaitingRoom 렌더링
  </done>
</task>

<task type="auto">
  <name>Task 2: game over 화면 개선 (전체 플레이어 대상 재시작 대기 UX)</name>
  <files>
    components/game/GameBoard.tsx
  </files>
  <action>
Game over 화면(GameBoard.tsx 314행~380행)을 모든 플레이어에게 유용하도록 개선:

1. **비방장 플레이어에게 "방장이 다시 시작할 때까지 대기" 안내 표시**
   - 현재: 비방장은 "로비로 돌아가기" 버튼만 보임
   - 변경: "다시 시작" 버튼 위치에 "방장의 재시작을 기다리는 중..." 텍스트 + 회전 애니메이션 아이콘 표시
   - "로비로 돌아가기" 버튼은 유지 (방을 완전히 떠나고 싶은 경우)

2. **방장용 "다시 시작" 버튼 유지** (현재 코드 그대로)
   - `state.players[0]?.id === playerId && onRestart` 조건으로 방장에게만 표시

3. **"로비로 돌아가기" 버튼 텍스트를 "방 나가기"로 변경** (의미를 명확히)
   - 방에 남는 것이 기본이므로, "로비로 돌아가기"보다 "방 나가기"가 더 정확

4. **비방장에게도 onRestart 접근은 막되, 방장이 재시작하면 자동으로 대기실 전환되는 점을 안내**
   - 별도 로직 불필요 - Task 1의 subscribeToRoom 수정으로 자동 전환됨
  </action>
  <verify>
    - `npm run build` 성공
    - 게임 오버 화면에서 방장: "다시 시작" + "방 나가기" 버튼 표시
    - 게임 오버 화면에서 비방장: "재시작 대기 중" 안내 + "방 나가기" 버튼 표시
  </verify>
  <done>
    - 모든 플레이어가 game over 후 방에 남아 재시작을 기다릴 수 있음
    - 방장이 재시작하면 전원 대기실(WaitingRoom)로 자동 전환
    - 원하는 플레이어는 "방 나가기"로 로비로 이동 가능
  </done>
</task>

</tasks>

<verification>
1. 게임 완료 후 새로고침 -> 로비가 아닌 game over 화면 유지
2. 방장이 "다시 시작" 클릭 -> 모든 플레이어 WaitingRoom 전환
3. WaitingRoom에서 레디 -> 방장이 게임 시작 -> 정상 게임 진행
4. 비방장이 "방 나가기" 클릭 -> 로비로 이동
5. `npm run build` 성공
</verification>

<success_criteria>
- game_over 후 새로고침 시 방 페이지 유지 (로비 튕김 없음)
- 방장 재시작 시 모든 플레이어 대기실 자동 전환
- 대기실에서 레디 + 게임 시작까지 끊김 없는 연속 플레이
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/023-game-over-stay-in-room-ready-restart/023-SUMMARY.md`
</output>
