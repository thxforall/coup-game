---
phase: quick
plan: 007
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/engine.ts
  - app/api/game/action/route.ts
  - app/api/game/timeout/route.ts
  - components/game/GameBoard.tsx
  - components/game/ResponseModal.tsx
autonomous: true

must_haves:
  truths:
    - "타임아웃(30초) 후 모든 pending 응답이 자동으로 pass 처리된다"
    - "플레이어가 브라우저를 닫아도 타임아웃 후 게임이 진행된다"
    - "타이머 UI가 정상적으로 카운트다운되고 0에서 자동 pass가 발생한다"
  artifacts:
    - path: "app/api/game/timeout/route.ts"
      provides: "서버 사이드 타임아웃 해소 전용 API 엔드포인트"
      exports: ["POST"]
    - path: "lib/game/engine.ts"
      provides: "resolveTimeouts 함수 - deadline 지난 pending 응답을 일괄 pass 처리"
      exports: ["resolveTimeouts"]
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "/api/game/timeout"
      via: "클라이언트 폴링 (타이머 만료 감지 시 서버에 timeout 해소 요청)"
      pattern: "fetch.*api/game/timeout"
    - from: "app/api/game/timeout/route.ts"
      to: "lib/game/engine.ts#resolveTimeouts"
      via: "서버에서 deadline 초과 확인 후 자동 pass 처리"
      pattern: "resolveTimeouts"
---

<objective>
액션 타임아웃 자동 pass 버그를 수정한다.

현재 문제:
1. 타임아웃 auto-pass가 클라이언트(ResponseModal)에서만 동작하므로, 해당 모달을 보고 있는 플레이어에게만 적용됨
2. 플레이어가 브라우저를 닫거나 비활성 상태이면, 해당 플레이어의 응답이 영원히 'pending'으로 남아 게임이 멈춤
3. 서버 사이드에 타임아웃 강제 처리 로직이 전혀 없음

해결 방향:
- 서버에 `resolveTimeouts` 엔진 함수 추가: responseDeadline이 지난 pending 응답을 모두 pass로 처리
- 전용 `/api/game/timeout` 엔드포인트 추가
- 기존 `/api/game/action` 에서도 매 요청마다 타임아웃 체크 (방어적)
- 클라이언트(GameBoard)에서 타이머 만료 감지 시 timeout API 호출 (폴링)
- 기존 ResponseModal의 클라이언트 auto-pass는 유지 (즉각 반응용, 보조적)

Output: 서버 사이드 타임아웃 해소 + 클라이언트 폴링으로 안정적인 자동 pass 처리
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/engine.ts
@lib/game/types.ts
@app/api/game/action/route.ts
@components/game/GameBoard.tsx
@components/game/ResponseModal.tsx
@lib/firebase.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 서버 사이드 타임아웃 해소 엔진 함수 + timeout API 엔드포인트</name>
  <files>
    lib/game/engine.ts
    app/api/game/timeout/route.ts
    app/api/game/action/route.ts
  </files>
  <action>
1. `lib/game/engine.ts`에 `resolveTimeouts` 함수 추가 (export):
   - 시그니처: `export function resolveTimeouts(state: GameState): GameState`
   - 조건: `state.phase`가 `'awaiting_response'` 또는 `'awaiting_block_response'`이고, `state.pendingAction?.responseDeadline`이 존재하며, `Date.now() > responseDeadline`일 때
   - 동작: `pendingAction.responses`에서 아직 `'pending'`인 모든 응답을 `'pass'`로 변경
   - 모든 응답이 pass로 변경된 후:
     - `awaiting_response` phase인 경우: `resolveAction(state)` 호출 (기존 private 함수 - export 불필요, resolveTimeouts 내에서 직접 호출)
     - `awaiting_block_response` phase인 경우: 블록 확정 처리 (모두 pass = 블록 성공, addLog 후 nextTurn)
   - 조건 불충족 시: state 그대로 반환 (no-op)
   - 주의: `resolveAction`과 `nextTurn`은 이미 engine.ts 내부에 있으므로 그대로 사용. `addLog`도 마찬가지.

2. `app/api/game/timeout/route.ts` 새로 생성:
   - POST 엔드포인트, body에서 `{ roomId }` 받음
   - getRoom으로 현재 state 읽기
   - `resolveTimeouts(state)` 호출
   - state가 변경되었으면 (phase가 변경됨 or pendingAction이 변경됨) `updateRoomWithViews` 호출
   - state가 동일하면 `{ ok: true, changed: false }` 반환 (불필요한 DB 쓰기 방지)
   - 변경 시 `{ ok: true, changed: true }` 반환

3. `app/api/game/action/route.ts` 수정:
   - 액션 처리 전, state를 읽은 직후에 `resolveTimeouts(state)` 방어적 호출 추가
   - 이 호출 결과를 state에 할당한 뒤 나머지 기존 로직 진행
   - import에 `resolveTimeouts` 추가
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - engine.ts에서 `resolveTimeouts` export 확인
    - timeout route.ts 파일 존재 및 POST handler export 확인
  </verify>
  <done>
    - resolveTimeouts가 deadline 초과 시 모든 pending 응답을 pass 처리하고 적절한 다음 단계(resolveAction 또는 블록 확정)를 실행
    - /api/game/timeout POST가 정상 동작
    - /api/game/action이 매 요청마다 방어적 타임아웃 체크 수행
  </done>
</task>

<task type="auto">
  <name>Task 2: 클라이언트 타임아웃 폴링 + ResponseModal 안정화</name>
  <files>
    components/game/GameBoard.tsx
    components/game/ResponseModal.tsx
  </files>
  <action>
1. `components/game/GameBoard.tsx` - WaitingResponseIndicator 또는 GameBoard 본체에 타임아웃 폴링 추가:
   - GameBoard 컴포넌트 내부에 useEffect 추가
   - 조건: `state.phase`가 `'awaiting_response'` 또는 `'awaiting_block_response'`이고, `state.pendingAction?.responseDeadline` 존재
   - 동작: deadline이 지나면 (Date.now() > responseDeadline) `/api/game/timeout`에 POST 요청 전송
   - 중복 요청 방지: useRef로 `timeoutRequested` 플래그 관리. phase나 responseDeadline이 변경되면 플래그 리셋
   - 타이밍: deadline 초과 후 500ms~1초 지연 후 요청 (클라이언트 auto-pass가 먼저 동작할 여유 제공)
   - 실패 시 2초 후 1회 재시도
   - 이 폴링은 모든 플레이어(actor 포함)가 수행하므로, 누군가의 브라우저가 살아있으면 timeout이 해소됨

2. `components/game/ResponseModal.tsx` - 기존 auto-pass 로직 안정화:
   - 기존 useEffect (line 49-53)는 유지하되, 이중 호출 방지를 위해 `useRef`로 `autoPassSent` 플래그 추가
   - `autoPassSent.current`가 true이면 handleResponse 호출 스킵
   - `remainingMs <= 0 && !loading && !autoPassSent.current` 조건으로 변경
   - handleResponse('pass') 호출 직전에 `autoPassSent.current = true` 설정
   - `pending.responseDeadline`이 변경되면 (새 라운드) `autoPassSent.current = false`로 리셋
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - ResponseModal에서 autoPassSent ref가 존재하고 올바르게 초기화/리셋되는지 코드 확인
    - GameBoard에서 timeout fetch 호출이 존재하고 중복 방지 로직이 있는지 코드 확인
  </verify>
  <done>
    - 타이머 만료 시 클라이언트가 서버에 timeout 해소 요청을 보냄
    - ResponseModal의 auto-pass가 중복 호출 없이 안정적으로 동작
    - 모든 플레이어가 브라우저를 닫아도, 한 명이라도 접속 중이면 timeout이 해소됨
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 전체 타입 체크 통과
2. 수동 테스트 시나리오:
   - 2인 게임에서 한 플레이어가 foreignAid 선언 -> 다른 플레이어가 30초 동안 무응답 -> 30초 후 자동 pass -> foreignAid 성공 처리
   - 2인 게임에서 한 플레이어가 tax 선언 -> 다른 플레이어가 브라우저 탭 닫기 -> 30초 후 자동 pass -> tax 성공 처리
</verification>

<success_criteria>
- responseDeadline 초과 시 서버 사이드에서 pending 응답이 자동 pass 처리됨
- 클라이언트가 비활성이어도 다른 클라이언트의 폴링으로 timeout이 해소됨
- 기존 ResponseModal의 즉각 auto-pass도 안정적으로 동작
- 타입 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/007-fix-action-timeout-auto-pass-bug/007-SUMMARY.md`
</output>
