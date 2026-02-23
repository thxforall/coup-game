---
phase: quick-042
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/leave/route.ts
  - components/game/SettingsModal.tsx
  - components/game/GameBoard.tsx
  - lib/game/engine.ts
autonomous: true

must_haves:
  truths:
    - "방 나가기 버튼 클릭 시 window.confirm 대신 인라인 확인 UI가 표시된다"
    - "게임 도중(phase !== waiting, game_over) 나갈 때 해당 플레이어의 카드가 모두 공개(revealed)된다"
    - "카드 공개 후 남은 플레이어가 1명이면 game_over로 전환된다"
    - "방 없애기 버튼도 window.confirm 대신 인라인 확인 UI로 변경된다"
  artifacts:
    - path: "app/api/game/leave/route.ts"
      provides: "플레이어 퇴장 API (카드 공개 + 탈락 처리 + 승자 확인)"
    - path: "components/game/SettingsModal.tsx"
      provides: "방 없애기 인라인 확인 UI (window.confirm 제거)"
    - path: "components/game/GameBoard.tsx"
      provides: "헤더 나가기 버튼 -> leave API 호출 + 인라인 확인"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "/api/game/leave"
      via: "fetch POST before clearActiveRoom + redirect"
    - from: "app/api/game/leave/route.ts"
      to: "lib/game/engine.ts"
      via: "removePlayer function"
---

<objective>
방 나가기 시 window.confirm/alert를 인라인 확인 UI로 교체하고, 게임 도중 퇴장 시 해당 플레이어의 카드를 모두 공개하여 남은 플레이어들에게 보여준다.

Purpose: UX 개선 (네이티브 alert 제거) + 게임 무결성 (중도 퇴장 시 카드 공개 및 승자 판정)
Output: leave API + 모달/인라인 확인 UI + 카드 공개 로직
</objective>

<context>
@components/game/SettingsModal.tsx - 현재 나가기/방 없애기 버튼 (window.confirm 사용)
@components/game/GameBoard.tsx - 헤더의 LogOut 버튼 (window.confirm 사용)
@components/game/ConfirmModal.tsx - 기존 확인 모달 (BottomSheet 기반, 재사용 가능)
@lib/game/engine.ts - revealCard, checkWinner, nextTurn, addLog 함수들
@lib/game/filter.ts - filterStateForPlayer (뷰 생성)
@app/api/game/action/route.ts - 기존 API 패턴 (getRoom, updateRoomWithViews, buildViews)
@lib/firebase.ts - getRoom, updateRoomWithViews, updateRoom
</context>

<tasks>

<task type="auto">
  <name>Task 1: Leave API 생성 + engine에 removePlayer 함수 추가</name>
  <files>
    app/api/game/leave/route.ts
    lib/game/engine.ts
  </files>
  <action>
    1. `lib/game/engine.ts`에 `removePlayer(state: GameState, playerId: string): GameState` export 함수 추가:
       - 해당 플레이어의 모든 카드를 revealed: true로 설정 (revealCard 재사용)
       - isAlive: false로 설정
       - addLog로 "{name}이(가) 게임을 떠났습니다" 로그 추가
       - 현재 턴이 떠나는 플레이어라면 nextTurn 호출
       - pendingAction에 해당 플레이어가 관련되어 있으면 pendingAction을 null로 초기화하고 nextTurn
       - checkWinner 호출하여 남은 생존자 1명이면 game_over 처리
       - 최종 state 반환

    2. `app/api/game/leave/route.ts` POST 엔드포인트 생성:
       - body: { roomId, playerId }
       - getRoom으로 방 조회
       - 게임 진행 중(phase !== 'waiting' && phase !== 'game_over')이면:
         - removePlayer 호출
         - buildViews(기존 action/route.ts 패턴 복사)로 뷰 생성
         - updateRoomWithViews로 저장
       - waiting 상태면: 플레이어를 players 배열에서 제거 후 updateRoom
       - game_over 상태면: 별도 처리 없이 200 반환 (클라이언트가 그냥 나감)
       - 200 반환

    action/route.ts의 buildViews 패턴을 그대로 따를 것:
    ```typescript
    function buildViews(state: GameState) {
      const views: Record<string, FilteredGameState> = {};
      for (const p of state.players) {
        views[p.id] = filterStateForPlayer(state, p.id);
      }
      return views;
    }
    ```
  </action>
  <verify>
    TypeScript 컴파일: `npx tsc --noEmit --pretty 2>&1 | head -30`
  </verify>
  <done>
    - /api/game/leave POST가 존재하고 roomId, playerId를 받아 처리
    - 게임 중 퇴장 시 해당 플레이어 카드가 모두 revealed되고 로그가 남음
    - 1명만 생존 시 game_over 전환
  </done>
</task>

<task type="auto">
  <name>Task 2: SettingsModal + GameBoard에서 window.confirm 제거, leave API 연동</name>
  <files>
    components/game/SettingsModal.tsx
    components/game/GameBoard.tsx
  </files>
  <action>
    **SettingsModal.tsx 변경:**

    1. "방 없애기" 버튼 (line 169-192)의 window.confirm을 인라인 확인 UI로 교체:
       - `showDeleteConfirm` state 추가 (showRestartConfirm 패턴 동일하게)
       - 버튼 클릭 시 setShowDeleteConfirm(true)
       - 확인 영역: 빨간색 border/bg 톤 (border-red-500/40, bg-red-500/5)
       - "정말 방을 없애시겠습니까? 모든 플레이어가 튕겨 나갑니다." 메시지
       - 확인/취소 버튼 (showRestartConfirm의 레이아웃 동일, 색상만 red 톤)

    2. "로비로 돌아가기" 확인 시(handleLeave 함수) leave API 호출 추가:
       - 기존: `clearActiveRoom(); window.location.href = '/';`
       - 변경: `await fetch('/api/game/leave', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({roomId, playerId}) }); clearActiveRoom(); window.location.href = '/';`
       - API 실패해도 나가기는 진행 (try-catch로 감싸되 catch에서도 clearActiveRoom + redirect)
       - handleLeave를 async로 변경

    **GameBoard.tsx 변경:**

    3. 헤더의 LogOut 버튼 (line 444-455)에서 window.confirm 제거:
       - `showLeaveConfirm` state 추가
       - LogOut 버튼 클릭 시 setShowLeaveConfirm(true)
       - ConfirmModal 컴포넌트 import하여 사용:
         ```tsx
         {showLeaveConfirm && (
           <ConfirmModal
             title="방 나가기"
             message="방에서 나가시겠습니까?"
             confirmLabel="나가기"
             confirmColor="var(--red, #ef4444)"
             confirmIcon={LogOut}
             onConfirm={async () => {
               try {
                 await fetch('/api/game/leave', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ roomId, playerId }),
                 });
               } catch {}
               clearActiveRoom();
               window.location.href = '/';
             }}
             onCancel={() => setShowLeaveConfirm(false)}
           />
         )}
         ```
       - ConfirmModal을 import 추가 (from './ConfirmModal')
       - game_over 화면의 "방 나가기" 버튼(line 362-367)도 동일하게 leave API 호출 추가 (단, game_over이므로 카드 공개는 불필요하지만 API가 알아서 처리)
  </action>
  <verify>
    1. `npx tsc --noEmit --pretty 2>&1 | head -30` - 타입 에러 없음
    2. `npm run build 2>&1 | tail -20` - 빌드 성공
  </verify>
  <done>
    - 모든 window.confirm / alert 호출이 제거됨
    - SettingsModal: 방 없애기가 인라인 확인 UI, 로비로 돌아가기가 leave API 호출
    - GameBoard 헤더: LogOut 버튼이 ConfirmModal 사용 + leave API 호출
    - 게임 중 나가면 서버에서 카드 공개 처리되어 남은 플레이어들에게 보임
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. window.confirm / window.alert 가 해당 파일에서 완전히 제거되었는지 grep 확인:
   `grep -n "window.confirm\|window.alert" components/game/SettingsModal.tsx components/game/GameBoard.tsx` - 결과 없어야 함
</verification>

<success_criteria>
- 나가기 버튼 클릭 시 모달/인라인 확인 UI 표시 (네이티브 alert/confirm 없음)
- 게임 도중 퇴장 시 해당 플레이어 카드가 모두 공개됨
- 퇴장으로 생존자 1명 남으면 승리 처리
- 빌드 성공, 타입 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/042-leave-room-modal-reveal-cards-on-midgame/042-SUMMARY.md`
</output>
