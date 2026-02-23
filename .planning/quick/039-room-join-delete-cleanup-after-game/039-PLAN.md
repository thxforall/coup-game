---
phase: quick-039
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/list/route.ts
  - app/api/game/join/route.ts
  - app/page.tsx
  - lib/firebase.ts
autonomous: true

must_haves:
  truths:
    - "로비에서 대기 중인 방 목록을 볼 수 있다"
    - "방 목록에서 방을 클릭하면 해당 방에 바로 입장한다"
    - "추방당한 플레이어가 같은 방에 재입장할 수 있다"
    - "game_over 방은 기존 30분 TTL cron으로 정리된다 (이미 동작 중)"
  artifacts:
    - path: "app/api/game/list/route.ts"
      provides: "GET endpoint returning waiting rooms"
    - path: "app/page.tsx"
      provides: "Room list UI in lobby"
    - path: "app/api/game/join/route.ts"
      provides: "Join without kickedPlayerIds block"
  key_links:
    - from: "app/page.tsx"
      to: "/api/game/list"
      via: "fetch on mount + polling"
      pattern: "fetch.*api/game/list"
    - from: "app/page.tsx"
      to: "/api/game/join"
      via: "click room -> join"
      pattern: "handleJoinRoom"
---

<objective>
로비에 대기 중인 방 목록 표시 + 추방 플레이어 재접속 허용

Purpose: 플레이어가 방 코드 없이도 대기 중인 방을 찾아 입장할 수 있게 하고, 추방된 플레이어의 재입장을 허용한다.
Output: 방 목록 API, 로비 UI 방 목록 탭, kickedPlayerIds 체크 제거
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/page.tsx (lobby page - add room list)
@app/api/game/join/route.ts (remove kicked check)
@lib/firebase.ts (listRoomIds, getRoom)
@lib/game/types.ts (GameState, GamePhase)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Room List API + 추방 재입장 허용</name>
  <files>
    app/api/game/list/route.ts
    app/api/game/join/route.ts
    lib/firebase.ts
  </files>
  <action>
1. **GET /api/game/list** 엔드포인트 생성 (`app/api/game/list/route.ts`):
   - `listRoomIds()`로 모든 방 ID 조회
   - 각 방을 `getRoom()`으로 로드
   - `phase === 'waiting'`인 방만 필터
   - 방별로 `{ roomId, hostName: players[0].name, playerCount: players.length, maxPlayers: 6, gameMode, createdAt }` 반환
   - 결과를 `createdAt` 내림차순 정렬 (최신 방 먼저)
   - 빈 배열이면 빈 배열 반환
   - 성능: 방이 많을 수 있으므로 최대 20개까지만 반환

2. **추방 플레이어 재입장 허용** (`app/api/game/join/route.ts`):
   - 19-21행의 `kickedPlayerIds` 체크 블록을 완전 제거
   - kickedPlayerIds는 GameState 타입에 남겨두되 (하위호환), join 시 체크하지 않음

3. **lib/firebase.ts** - `listRooms()` 헬퍼 추가 (선택):
   - 기존 `listRoomIds()`는 유지
   - list API에서 직접 listRoomIds + getRoom 조합으로 구현해도 무방
  </action>
  <verify>
    - `curl http://localhost:3000/api/game/list` -> 200 + JSON 배열 반환
    - 방 생성 후 list에 나타나는지 확인
    - 게임 중인 방은 목록에 안 나오는지 확인
    - TypeScript 컴파일 에러 없음: `npx tsc --noEmit`
  </verify>
  <done>
    - GET /api/game/list가 waiting 상태 방 목록 반환
    - kickedPlayerIds 체크가 제거되어 추방 플레이어 재입장 가능
  </done>
</task>

<task type="auto">
  <name>Task 2: 로비 방 목록 UI</name>
  <files>
    app/page.tsx
  </files>
  <action>
1. **로비 탭 확장**: 기존 `create | join` 탭에 `rooms` 탭 추가 (3탭: 방 만들기 | 방 참가 | 방 목록)
   - 탭 이름: `방 만들기`, `방 참가`, `방 목록`

2. **방 목록 탭 UI** (`tab === 'rooms'`):
   - 마운트 시 + 10초 폴링으로 `/api/game/list` fetch
   - 방 목록 카드: 각 방마다 카드 형태로 표시
     - 방장 이름, 플레이어 수 (`2/6`), 게임 모드 배지 (Standard/Guess)
     - 방 코드 작게 표시 (회색 monospace)
     - `입장` 버튼 (btn-gold 스타일)
   - 빈 상태: "대기 중인 방이 없습니다" 텍스트 + 방 만들기 유도
   - 입장 클릭 시: 닉네임 체크 -> `/api/game/join` POST -> `router.push(/game/{roomId})`
   - 기존 handleJoin 로직 재활용 (roomId를 joinCode 대신 직접 전달)

3. **스타일**: 기존 glass-panel, text-gold, bg-bg-surface 등 프로젝트 디자인 시스템 따름
   - 방 카드: `bg-bg-surface border border-border-subtle rounded-lg p-3`
   - 스크롤: 방 목록 영역 `max-h-[300px] overflow-y-auto`
   - 로딩: 스켈레톤이나 간단한 "로딩 중..." 텍스트

4. **상태 관리**: 새로운 state 추가
   - `rooms`: 방 목록 배열
   - `roomsLoading`: 로딩 상태
   - 폴링은 `tab === 'rooms'`일 때만 활성화 (useEffect cleanup으로 interval 정리)
  </action>
  <verify>
    - `npm run dev` 후 로비에서 "방 목록" 탭 클릭 -> 대기 중인 방 표시
    - 방 생성 후 다른 브라우저에서 방 목록에 나타나는지 확인
    - 방 목록에서 입장 클릭 -> 해당 방 WaitingRoom으로 이동
    - 빈 상태 UI 표시 확인
    - `npx tsc --noEmit` 통과
  </verify>
  <done>
    - 로비에 방 목록 탭이 추가되어 대기 중인 방을 브라우즈 가능
    - 방 클릭으로 코드 입력 없이 바로 입장
    - 10초 폴링으로 실시간에 가까운 방 목록 갱신
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. 수동 테스트: 방 생성 -> 방 목록에 표시 -> 다른 플레이어로 입장 -> 게임 시작 -> 방 목록에서 사라짐
4. game_over 방 정리는 기존 cron (`/api/cron/cleanup-rooms`)의 30분 TTL이 이미 처리 중 - 별도 작업 불필요
</verification>

<success_criteria>
- 로비에서 대기 중인 방 목록을 볼 수 있다
- 방 목록에서 클릭으로 바로 입장 가능
- 추방된 플레이어가 재입장 가능
- game_over 방은 기존 cron cleanup으로 30분 후 자동 삭제 (이미 구현됨)
</success_criteria>

<output>
After completion, create `.planning/quick/039-room-join-delete-cleanup-after-game/039-SUMMARY.md`
</output>
