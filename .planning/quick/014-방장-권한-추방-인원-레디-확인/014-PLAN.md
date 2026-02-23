---
phase: quick-014
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/kick/route.ts
  - app/api/game/ready/route.ts
  - components/game/WaitingRoom.tsx
  - app/game/[roomId]/page.tsx
autonomous: true

must_haves:
  truths:
    - "방장이 대기실에서 다른 플레이어를 추방할 수 있다"
    - "추방된 플레이어는 메인 화면으로 이동한다"
    - "플레이어가 준비 완료 토글을 할 수 있다"
    - "방장이 각 플레이어의 준비 상태를 확인할 수 있다"
  artifacts:
    - path: "app/api/game/kick/route.ts"
      provides: "추방 API 엔드포인트"
      exports: ["POST"]
    - path: "app/api/game/ready/route.ts"
      provides: "레디 토글 API 엔드포인트"
      exports: ["POST"]
    - path: "components/game/WaitingRoom.tsx"
      provides: "추방 버튼 + 레디 토글 UI"
  key_links:
    - from: "components/game/WaitingRoom.tsx"
      to: "/api/game/kick"
      via: "fetch POST on kick button click"
      pattern: "fetch.*api/game/kick"
    - from: "components/game/WaitingRoom.tsx"
      to: "/api/game/ready"
      via: "fetch POST on ready toggle"
      pattern: "fetch.*api/game/ready"
---

<objective>
방장(호스트) 권한으로 대기실에서 플레이어 추방 기능과, 모든 플레이어의 준비(레디) 상태 토글 및 표시 기능을 추가한다.

Purpose: 방장이 게임 시작 전 방 관리를 할 수 있고, 플레이어들이 준비 상태를 표시하여 게임 시작 준비가 되었음을 알릴 수 있다.
Output: kick/ready API 라우트 2개 + WaitingRoom UI 업데이트
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@lib/game/types.ts (Player.isReady 이미 존재, FilteredPlayer.isReady 이미 존재)
@lib/firebase.ts (getRoom, updateRoomWithViews 패턴)
@lib/game/filter.ts (filterStateForPlayer)
@app/api/game/join/route.ts (API 패턴 참고 - newPlayer에 isReady: false 이미 설정)
@app/api/game/start/route.ts (방장 권한 체크 패턴: state.players[0].id === playerId)
@components/game/WaitingRoom.tsx (현재 UI)
@app/game/[roomId]/page.tsx (GamePage - handleStart 등 콜백 패턴)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 추방(kick) + 레디(ready) API 라우트 생성</name>
  <files>
    app/api/game/kick/route.ts
    app/api/game/ready/route.ts
  </files>
  <action>
**kick API (`app/api/game/kick/route.ts`):**
- POST 엔드포인트, body: `{ roomId, playerId, targetId }`
- 검증: 방이 존재하고 phase === 'waiting'
- 검증: playerId === state.players[0].id (방장만 추방 가능)
- 검증: targetId !== playerId (자기 자신 추방 불가)
- 검증: targetId가 players에 존재
- state.players에서 targetId 제거, log에 `${targetName}이(가) 추방되었습니다` 추가
- updateRoomWithViews 호출 (추방된 플레이어의 view도 삭제해야 하므로, views에서 targetId 제외)
- 추방된 플레이어의 view 노드 삭제: Firebase REST API로 `game_rooms/${roomId}/views/${targetId}.json`에 DELETE 요청
- 성공 시 200 반환

**ready API (`app/api/game/ready/route.ts`):**
- POST 엔드포인트, body: `{ roomId, playerId }`
- 검증: 방이 존재하고 phase === 'waiting'
- 검증: playerId가 players에 존재
- 해당 플레이어의 isReady를 토글 (true <-> false)
- updateRoomWithViews 호출
- 성공 시 200 반환

두 라우트 모두 기존 join/start 라우트의 에러 핸들링 패턴을 따른다 (try-catch, NextResponse.json).
  </action>
  <verify>
TypeScript 컴파일 에러 없음: `npx tsc --noEmit`
  </verify>
  <done>
kick API: 방장만 호출 가능, 타겟 플레이어 제거 후 views 갱신 + 추방 플레이어 view 삭제.
ready API: 플레이어 isReady 토글 후 views 갱신.
  </done>
</task>

<task type="auto">
  <name>Task 2: WaitingRoom UI - 추방 버튼 + 레디 토글 + 레디 상태 표시</name>
  <files>
    components/game/WaitingRoom.tsx
    app/game/[roomId]/page.tsx
  </files>
  <action>
**WaitingRoom.tsx Props 추가:**
- `onKick: (targetId: string) => void` 콜백 추가
- `onReady: () => void` 콜백 추가

**플레이어 목록 각 항목에 추가 (li 내부):**
1. 레디 상태 표시: isReady인 플레이어에게 체크 아이콘(lucide `CheckCircle2`) + 초록색 표시. 미준비 상태는 회색 원형(`Circle`).
   - 위치: 플레이어 이름 오른쪽, 호스트/나 뱃지 앞에
   - 방장(index 0)은 레디 상태 표시하지 않음 (방장은 항상 준비 완료로 간주)
2. 추방 버튼: 방장 시점에서만 보이고, 자기 자신(방장)에게는 표시하지 않음
   - lucide `X` 아이콘, 빨간색 호버, 작은 크기 (w-7 h-7)
   - 위치: 각 플레이어 항목 맨 오른쪽
   - 클릭 시 확인 다이얼로그: `window.confirm(`${p.name}을(를) 추방하시겠습니까?`)`
   - 확인 후 `onKick(p.id)` 호출

**레디 버튼 (게임 시작 버튼 영역):**
- 방장이 아닌 플레이어: 기존 "방장이 게임을 시작할 때까지..." 텍스트를 레디 토글 버튼으로 교체
- 준비 안됨 상태: "준비 완료" 버튼 (btn-ghost 스타일, 테두리)
- 준비됨 상태: "준비 취소" 버튼 (btn-gold 스타일, 강조)
- 현재 플레이어의 isReady 값은 `state.players.find(p => p.id === playerId)?.isReady`로 확인

**방장 게임 시작 버튼 강화:**
- 기존 최소 2명 조건에 추가: 방장 제외 모든 플레이어가 isReady === true여야 활성화
- disabled 조건: `state.players.length < 2 || state.players.slice(1).some(p => !p.isReady)`
- 버튼 텍스트: 2명 미만이면 "최소 2명 필요", 미준비 플레이어 있으면 "모두 준비 대기 중", 모두 준비면 "게임 시작"

**GamePage (page.tsx) 콜백 추가:**
- `handleKick` 함수: fetch POST to `/api/game/kick` with `{ roomId, playerId, targetId }`
- `handleReady` 함수: fetch POST to `/api/game/ready` with `{ roomId, playerId }`
- WaitingRoom에 `onKick={handleKick}` `onReady={handleReady}` props 전달

**추방된 플레이어 처리 (GamePage):**
- state 구독 콜백에서, 현재 playerId가 state.players에 없으면 추방된 것으로 판단
- 이 경우 `router.push('/')` 로 메인 화면으로 이동 + alert('방에서 추방되었습니다')
- 이 체크는 state가 업데이트될 때마다 실행 (useEffect 또는 subscribeToRoom 콜백 내부)
  </action>
  <verify>
- `npx tsc --noEmit` 에러 없음
- `npm run build` 성공
- 브라우저에서 대기실 접속 시:
  1. 방장 시점: 다른 플레이어 옆에 X(추방) 버튼 표시, 게임 시작 버튼에 레디 조건 반영
  2. 일반 플레이어 시점: 준비 완료/취소 토글 버튼 표시
  3. 레디 상태가 체크 아이콘으로 실시간 반영
  </verify>
  <done>
- 방장이 X 버튼으로 플레이어 추방 가능, 추방된 플레이어는 메인 화면으로 리다이렉트
- 일반 플레이어가 준비 완료/취소 토글 가능
- 모든 플레이어의 레디 상태가 아이콘으로 표시
- 방장 제외 모두 준비 완료 시에만 게임 시작 버튼 활성화
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. 기능 점검 (수동):
   - 2개 브라우저 탭으로 같은 방 입장
   - 일반 플레이어가 "준비 완료" 클릭 -> 방장 화면에서 체크 아이콘 표시 확인
   - 방장이 추방 버튼 클릭 -> 확인 다이얼로그 -> 추방된 플레이어 메인 이동 확인
   - 모두 준비 완료 시 게임 시작 버튼 활성화 확인
</verification>

<success_criteria>
- kick API: 방장만 추방 가능, 추방 후 views 정리 및 실시간 반영
- ready API: isReady 토글 동작, 실시간 반영
- WaitingRoom UI: 추방 버튼(방장만), 레디 토글(일반 플레이어), 레디 상태 아이콘 표시
- 게임 시작 조건: 최소 2명 + 방장 제외 전원 준비 완료
- 추방된 플레이어 자동 리다이렉트
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/014-방장-권한-추방-인원-레디-확인/014-SUMMARY.md`
</output>
