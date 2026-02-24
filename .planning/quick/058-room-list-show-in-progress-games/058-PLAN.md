---
phase: quick
plan: 058
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/game/list/route.ts
  - app/page.tsx
autonomous: true

must_haves:
  truths:
    - "방 목록 탭에서 대기 중인 방과 진행 중인 방 모두 표시된다"
    - "진행 중인 방은 '관전' 불가, 시각적으로 구분된다 (상태 배지)"
    - "진행 중인 방은 입장 버튼 대신 상태 표시만 된다"
  artifacts:
    - path: "app/api/game/list/route.ts"
      provides: "waiting + playing 방 목록 반환"
      contains: "status"
    - path: "app/page.tsx"
      provides: "방 상태별 UI 분기"
      contains: "진행 중"
  key_links:
    - from: "app/api/game/list/route.ts"
      to: "app/page.tsx"
      via: "RoomListItem.status field"
      pattern: "status.*waiting|playing"
---

<objective>
방 목록(rooms 탭)에서 진행 중인(playing) 방도 함께 표시하여 현재 활성 게임을 확인할 수 있게 한다.

Purpose: 로비에서 대기 중인 방만 보이면 서버가 비어보임. 진행 중인 방도 표시하면 활성도를 보여줌.
Output: API에서 playing 상태 방 포함 반환 + 로비 UI에서 상태별 분기 표시
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/game/list/route.ts
@app/page.tsx
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: API에 playing 상태 방 포함 + status 필드 추가</name>
  <files>app/api/game/list/route.ts</files>
  <action>
    RoomListItem 인터페이스에 `status: 'waiting' | 'playing'` 필드를 추가한다.

    현재 `if (state.phase !== 'waiting') continue;` 조건을 변경하여:
    - phase === 'waiting' -> status: 'waiting'으로 포함
    - phase === 'game_over'가 아닌 나머지 (action, awaiting_response, awaiting_block_response, lose_influence, exchange_select, examine_select) -> status: 'playing'으로 포함
    - phase === 'game_over' -> 제외 (끝난 게임은 표시하지 않음)

    playing 방에는 추가로 `alivePlayers` 필드를 포함 (state.players.filter(p => p.isAlive).length) 하여 현재 생존자 수를 보여줄 수 있게 한다.

    정렬 순서: waiting 방이 먼저, 그 다음 playing 방. 각 그룹 내에서는 createdAt 내림차순.
    최대 반환 수: waiting 20개 + playing 10개 = 최대 30개.
  </action>
  <verify>
    curl http://localhost:3000/api/game/list 로 응답에 status 필드가 포함되는지 확인.
    TypeScript 타입 에러 없는지 확인: npx tsc --noEmit
  </verify>
  <done>
    API가 waiting/playing 상태 방을 모두 반환하며, 각 방에 status 필드가 포함된다.
    game_over 방은 제외된다.
  </done>
</task>

<task type="auto">
  <name>Task 2: 로비 방 목록 UI에 진행 중 방 표시</name>
  <files>app/page.tsx</files>
  <action>
    RoomListItem 인터페이스에 `status: 'waiting' | 'playing'`과 `alivePlayers?: number` 필드를 추가한다.

    방 목록 렌더링에서 status에 따라 분기:

    1. 라벨 변경: "대기 중인 방" -> "방 목록" (waiting + playing 모두 포함하므로)

    2. waiting 방 (기존과 동일):
       - 게임모드 배지 옆에 초록색 "대기 중" 배지 표시
       - "입장" 버튼 유지

    3. playing 방:
       - 게임모드 배지 옆에 주황색/빨간색 "게임 중" 배지 표시
       - playerCount 대신 "생존 {alivePlayers}/{playerCount}" 표시
       - "입장" 버튼 대신 회색 "게임 중" 텍스트 표시 (버튼 없음)
       - 배경을 약간 어둡게 하여 시각적 구분 (opacity-60 등)

    4. 빈 상태 메시지: "대기 중인 방이 없습니다" -> "열려있는 방이 없습니다"

    스타일:
    - 대기 중 배지: `bg-emerald-500/20 text-emerald-300` 텍스트 "대기 중"
    - 게임 중 배지: `bg-orange-500/20 text-orange-300` 텍스트 "게임 중"
    - playing 방 컨테이너: 기존 스타일에 `opacity-70` 추가
  </action>
  <verify>
    npm run build 성공 확인.
    로비 페이지에서 방 목록 탭 클릭 시 대기 중/게임 중 방이 구분되어 표시되는지 확인.
  </verify>
  <done>
    방 목록에서 대기 중인 방은 입장 가능, 진행 중인 방은 상태 표시만 되며 시각적으로 구분된다.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. 로비 방 목록 탭에서 waiting/playing 방 모두 표시됨
4. playing 방은 입장 버튼 없이 "게임 중" 상태만 표시
</verification>

<success_criteria>
- API가 waiting + playing 방을 status 필드와 함께 반환
- 로비 UI에서 두 상태가 시각적으로 구분되어 표시
- 진행 중 방은 관전 불가 (입장 버튼 없음)
- 기존 대기 중 방 입장 기능 정상 동작
</success_criteria>

<output>
After completion, create `.planning/quick/058-room-list-show-in-progress-games/058-SUMMARY.md`
</output>
