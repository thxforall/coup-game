---
phase: quick-060
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/allegiance/route.ts
  - lib/game/engine.ts
  - components/game/WaitingRoom.tsx
  - app/api/game/start/route.ts
  - app/game/[roomId]/page.tsx
autonomous: true

must_haves:
  truths:
    - "종교개혁 모드 대기실에서 각 플레이어 옆에 진영(충성파/개혁파) 배지가 표시된다"
    - "플레이어가 자신의 진영 배지를 클릭하면 충성파<->개혁파 토글된다"
    - "기본값은 교대 배정(현재 로직)이며, 플레이어가 원하면 변경 가능하다"
    - "게임 시작 시 대기실에서 선택한 진영이 그대로 게임에 반영된다"
    - "standard/guess 모드에서는 진영 선택 UI가 보이지 않는다"
  artifacts:
    - path: "app/api/game/allegiance/route.ts"
      provides: "진영 변경 API"
      exports: ["POST"]
    - path: "components/game/WaitingRoom.tsx"
      provides: "진영 선택 토글 UI"
    - path: "lib/game/engine.ts"
      provides: "initGame이 기존 allegiance를 받아 사용"
    - path: "app/api/game/start/route.ts"
      provides: "기존 allegiance를 initGame에 전달"
  key_links:
    - from: "components/game/WaitingRoom.tsx"
      to: "/api/game/allegiance"
      via: "fetch POST on allegiance badge click"
      pattern: "fetch.*api/game/allegiance"
    - from: "app/api/game/start/route.ts"
      to: "lib/game/engine.ts initGame"
      via: "players allegiance 전달"
      pattern: "allegiance"
---

<objective>
종교개혁 모드 대기실에서 플레이어가 자신의 진영(충성파/개혁파)을 직접 선택할 수 있도록 한다.

Purpose: 현재 자동 교대 배정(i % 2)을 플레이어 직접 선택 방식으로 변경하여 원래 보드게임 룰에 맞춤
Output: 진영 선택 API + WaitingRoom 진영 토글 UI + initGame allegiance 전달 로직
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/types.ts — Player.allegiance 타입 이미 정의됨 (Allegiance = 'loyalist' | 'reformist')
@lib/game/engine.ts — initGame() 현재 allegiances[i % 2] 자동 배정 (line 84)
@components/game/WaitingRoom.tsx — 대기실 UI (진영 선택 UI 추가 위치)
@app/api/game/start/route.ts — 게임 시작 API (allegiance 전달 필요)
@app/api/game/ready/route.ts — ready API 패턴 참고 (동일 구조로 allegiance API 생성)
@app/game/[roomId]/page.tsx — 게임 페이지 (onAllegiance 핸들러 추가)
@lib/game/filter.ts — filterStateForPlayer (waiting phase에서 allegiance 이미 전달됨, line 30)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 진영 선택 API + engine initGame 수정</name>
  <files>
    app/api/game/allegiance/route.ts
    lib/game/engine.ts
    app/api/game/start/route.ts
  </files>
  <action>
1. `app/api/game/allegiance/route.ts` 생성 — `/api/game/ready/route.ts` 패턴 그대로 따름:
   - POST body: `{ roomId, playerId, allegiance: 'loyalist' | 'reformist' }`
   - 검증: phase === 'waiting', gameMode === 'reformation', 플레이어 존재
   - state.players에서 해당 플레이어의 allegiance를 변경
   - updateRoomWithViews로 저장 (views 생성 포함)

2. `lib/game/engine.ts` initGame 시그니처 확장:
   - 기존: `players: { id: string; name: string }[]`
   - 변경: `players: { id: string; name: string; allegiance?: Allegiance }[]`
   - reformation 모드일 때: player에 allegiance가 있으면 그대로 사용, 없으면 기존 교대 배정(i % 2) 폴백
   - line 74~85 수정: `allegiance: p.allegiance ?? allegiances[i % 2]`

3. `app/api/game/start/route.ts` 수정:
   - initGame 호출 시 players에 allegiance 포함:
     ```
     state.players.map((p) => ({ id: p.id, name: p.name, allegiance: p.allegiance }))
     ```

4. 방 생성/참가 시 기본 진영 배정 필요:
   - 참가 시점에서 reformation 모드이면 기존 플레이어 수 기준으로 교대 배정 (기본값)
   - 이미 waiting phase에서 Player.allegiance 필드가 있으므로, create/join API에서 reformation일 때 allegiance를 설정해야 함
   - 하지만 create 시점에는 gameMode가 이미 설정됨 → create API에서 첫 플레이어에 'loyalist' 배정
   - join API에서 기존 플레이어 수 기반 교대 배정 (players.length % 2 === 0 ? 'loyalist' : 'reformist')
   - **주의:** create/join API는 이미 존재하므로 reformation 모드일 때만 allegiance 필드 추가하는 최소 수정

   create API (`app/api/game/create/route.ts`):
   - 플레이어 생성 시 reformation이면 `allegiance: 'loyalist'` 추가

   join API (`app/api/game/join/route.ts`):
   - 플레이어 추가 시 reformation이면 `allegiance: allegiances[existingPlayers.length % 2]` 추가
  </action>
  <verify>
    - TypeScript 빌드: `cd /Users/kiyeol/development/coup && npx tsc --noEmit`
    - allegiance API 존재 확인: `ls app/api/game/allegiance/route.ts`
  </verify>
  <done>
    - /api/game/allegiance POST가 플레이어 진영을 변경하고 Firebase에 저장
    - initGame이 players의 기존 allegiance를 우선 사용, 없으면 교대 배정 폴백
    - /api/game/start가 기존 allegiance를 initGame에 전달
    - create/join 시 reformation 모드면 기본 교대 진영 배정
  </done>
</task>

<task type="auto">
  <name>Task 2: WaitingRoom 진영 선택 토글 UI + 페이지 핸들러</name>
  <files>
    components/game/WaitingRoom.tsx
    app/game/[roomId]/page.tsx
  </files>
  <action>
1. `app/game/[roomId]/page.tsx`:
   - handleAllegiance 콜백 추가 (handleReady 패턴 동일):
     ```typescript
     const handleAllegiance = useCallback(async (allegiance: 'loyalist' | 'reformist') => {
       await fetch('/api/game/allegiance', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ roomId, playerId, allegiance }),
       });
     }, [roomId, playerId]);
     ```
   - WaitingRoom에 `onAllegiance={handleAllegiance}` prop 전달

2. `components/game/WaitingRoom.tsx`:
   - Props에 `onAllegiance: (allegiance: 'loyalist' | 'reformist') => void` 추가
   - 종교개혁 모드(`state.gameMode === 'reformation'`)일 때만 진영 선택 UI 표시
   - 플레이어 목록 각 항목에 진영 배지 추가 (플레이어 이름 오른쪽):
     - 충성파: `bg-blue-500/15 border-blue-500/40 text-blue-300` 배지 "충성파"
     - 개혁파: `bg-red-500/15 border-red-500/40 text-red-300` 배지 "개혁파"
   - 본인(p.id === playerId)의 배지만 클릭 가능 (cursor-pointer + hover 효과)
   - 클릭 시 현재 진영의 반대로 토글: onAllegiance(p.allegiance === 'loyalist' ? 'reformist' : 'loyalist')
   - 다른 플레이어의 배지는 표시만 (cursor-default, 클릭 불가)
   - 배지 위치: 이름과 ready 아이콘 사이, 기존 레이아웃 흐름 유지
   - 타인의 배지에는 호버 효과 없음, 본인 배지에만 `hover:opacity-80` + `cursor-pointer`
   - 아바타 원형 배경색도 진영에 따라 변경: 충성파 `bg-blue-500/20`, 개혁파 `bg-red-500/20` (reformation 모드일 때만)
  </action>
  <verify>
    - TypeScript 빌드: `cd /Users/kiyeol/development/coup && npx tsc --noEmit`
    - WaitingRoom에 allegiance 관련 코드 확인: `grep -n 'allegiance' components/game/WaitingRoom.tsx`
  </verify>
  <done>
    - 종교개혁 모드 대기실에서 각 플레이어 옆에 진영 배지(충성파/개혁파)가 표시됨
    - 본인 배지 클릭 시 진영이 토글됨 (API 호출 -> Firebase 업데이트 -> UI 반영)
    - standard/guess 모드에서는 진영 배지가 표시되지 않음
    - 게임 시작 시 선택된 진영이 그대로 반영됨
  </done>
</task>

</tasks>

<verification>
1. TypeScript 빌드 통과: `npx tsc --noEmit`
2. 종교개혁 모드 방 생성 -> 대기실에서 진영 배지 표시 확인
3. 본인 진영 배지 클릭 -> 충성파/개혁파 토글 확인
4. 게임 시작 -> 선택한 진영 그대로 반영 확인
5. standard 모드에서 진영 배지 미표시 확인
</verification>

<success_criteria>
- 종교개혁 모드 대기실: 플레이어별 진영 배지 표시 + 본인 토글 가능
- 기본값: 교대 배정 (join 순서 기반), 변경 가능
- 게임 시작 시 대기실 진영 -> 게임 진영 그대로 전달
- standard/guess 모드: 진영 UI 없음
- TypeScript 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/060-allegiance-selection-ui/060-SUMMARY.md`
</output>
