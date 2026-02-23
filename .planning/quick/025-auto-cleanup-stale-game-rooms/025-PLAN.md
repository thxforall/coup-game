---
phase: quick
plan: 025
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - lib/firebase.ts
  - app/api/game/create/route.ts
  - app/api/game/action/route.ts
  - app/api/game/start/route.ts
  - app/api/game/restart/route.ts
  - app/api/cron/cleanup-rooms/route.ts
  - vercel.json
autonomous: true

must_haves:
  truths:
    - "game_over 상태에서 30분 이상 방치된 방은 자동 삭제된다"
    - "모든 플레이어가 오프라인인 방은 1시간 후 자동 삭제된다"
    - "waiting 상태에서 2시간 이상 방치된 방은 자동 삭제된다"
    - "활성 게임 중인 방은 삭제되지 않는다 (단, 24시간 초과 시 삭제)"
  artifacts:
    - path: "app/api/cron/cleanup-rooms/route.ts"
      provides: "Cron endpoint that scans and deletes stale rooms"
    - path: "vercel.json"
      provides: "Vercel cron schedule configuration"
  key_links:
    - from: "vercel.json"
      to: "app/api/cron/cleanup-rooms/route.ts"
      via: "Vercel cron job invocation"
    - from: "app/api/game/create/route.ts"
      to: "GameState.createdAt"
      via: "Timestamp set on room creation"
---

<objective>
게임 방 자동 정리(cleanup) 기능 구현. 현재 게임 방이 Firebase RTDB에 영구적으로 남아있는 문제를 해결한다.

Purpose: Firebase RTDB 데이터 비대화 방지 및 로비에 유령 방이 남는 문제 해결
Output: Vercel Cron으로 매 10분마다 실행되는 cleanup API + 방 생성 시 타임스탬프 기록
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/firebase.ts (서버 Firebase REST API - getRoom, createRoom, updateRoom, updateRoomWithViews)
@lib/game/types.ts (GameState 타입 정의 - createdAt/updatedAt 필드 없음)
@app/api/game/create/route.ts (방 생성 API - initialState에 타임스탬프 없음)
@lib/firebase.client.ts (클라이언트 Firebase SDK - presence 시스템 참조)
</context>

<tasks>

<task type="auto">
  <name>Task 1: GameState에 타임스탬프 추가 + 방 생성/업데이트 시 기록</name>
  <files>
    lib/game/types.ts
    lib/firebase.ts
    app/api/game/create/route.ts
    app/api/game/action/route.ts
    app/api/game/start/route.ts
    app/api/game/restart/route.ts
  </files>
  <action>
1. `lib/game/types.ts`의 `GameState` 인터페이스에 optional 필드 추가:
   - `createdAt?: number` (방 생성 시간, Unix ms)
   - `updatedAt?: number` (마지막 활동 시간, Unix ms)
   이들을 optional로 두어 기존 방과의 호환성 유지.

2. `app/api/game/create/route.ts`에서 `initialState`에 `createdAt: Date.now()`, `updatedAt: Date.now()` 추가.

3. `lib/firebase.ts`의 `updateRoom`과 `updateRoomWithViews` 함수에서 state를 쓰기 직전 `state.updatedAt = Date.now()` 자동 설정. 이렇게 하면 모든 게임 액션이 자동으로 updatedAt를 갱신한다.

4. `app/api/game/start/route.ts`와 `app/api/game/restart/route.ts`에서도 updatedAt가 자동으로 갱신되는지 확인 (updateRoom/updateRoomWithViews 사용 시 자동 적용).

주의: FilteredGameState나 클라이언트에 createdAt/updatedAt를 노출할 필요 없음. 서버 내부용 메타데이터.
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npm run build` 성공
    - 방 생성 후 Firebase RTDB에서 state.createdAt, state.updatedAt 필드 존재 확인 (수동 테스트)
  </verify>
  <done>
    - GameState에 createdAt, updatedAt 필드 존재
    - 방 생성 시 두 필드 모두 설정됨
    - 모든 state 업데이트 시 updatedAt가 자동 갱신됨
  </done>
</task>

<task type="auto">
  <name>Task 2: Cron cleanup API + Vercel cron 설정</name>
  <files>
    app/api/cron/cleanup-rooms/route.ts
    vercel.json
  </files>
  <action>
1. `app/api/cron/cleanup-rooms/route.ts` 생성:
   - GET 핸들러 (Vercel Cron은 GET 호출)
   - `CRON_SECRET` 환경변수로 인증: `req.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET`. CRON_SECRET이 설정되지 않은 경우에도 동작하되, 설정된 경우 인증 필수 (Vercel은 자동으로 CRON_SECRET 헤더 전송).
   - Firebase REST API로 `game_rooms.json?shallow=true`를 조회하여 모든 room ID 목록 획득
   - 각 room에 대해 `game_rooms/{roomId}/state.json`을 조회하여 phase, updatedAt, createdAt, players를 확인
   - 삭제 기준 (OR 조건):
     a) `phase === 'game_over'` AND `updatedAt`로부터 30분 경과
     b) `phase === 'waiting'` AND `updatedAt`로부터 2시간 경과
     c) `createdAt`로부터 24시간 경과 (어떤 상태든 최대 수명)
     d) `updatedAt`가 없는 방 (레거시): `createdAt`도 없으면 삭제 대상 (이전에 생성된 좀비 방)
   - 삭제: `game_rooms/{roomId}.json`에 DELETE 요청 (state, views, presence, chat 모두 삭제)
   - 응답: `{ deleted: string[], checked: number, kept: number }` JSON 반환
   - console.log로 삭제된 방 ID와 사유 기록

2. `vercel.json` 생성:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-rooms",
      "schedule": "*/10 * * * *"
    }
  ]
}
```
매 10분마다 실행.

3. `lib/firebase.ts`에 `deleteRoom` 함수 추가:
```typescript
export async function deleteRoom(roomId: string): Promise<void> {
  const res = await fetch(roomUrl(roomId), { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete room: ${res.status} ${text}`);
  }
}
```

4. `lib/firebase.ts`에 `listRoomIds` 함수 추가:
```typescript
export async function listRoomIds(): Promise<string[]> {
  const res = await fetch(`${DB_URL}/game_rooms.json?shallow=true`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data) return [];
  return Object.keys(data);
}
```

주의:
- Vercel Hobby 플랜은 cron이 하루 1회만 가능. Pro 플랜이 아니라면 `schedule`을 `"0 * * * *"` (매 시간)이나 `"0 0 * * *"` (매일)로 조정 필요. 일단 10분으로 설정하되, 주석으로 Hobby 플랜 제한 언급.
- Firebase REST shallow query는 대량의 방이 있어도 ID만 반환하므로 효율적.
- 방 삭제 시 rate limiting 고려: 한 번에 최대 50개까지만 삭제 (Firebase REST API 부하 방지).
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npm run build` 성공
    - `curl http://localhost:3000/api/cron/cleanup-rooms` 로컬 테스트 시 200 응답 + JSON 형태 확인
    - vercel.json이 유효한 JSON인지 확인
  </verify>
  <done>
    - /api/cron/cleanup-rooms GET 엔드포인트 동작
    - game_over 30분, waiting 2시간, 전체 24시간 기준으로 방 삭제
    - 레거시 방(타임스탬프 없는 방) 자동 삭제
    - vercel.json cron 설정 완료
    - deleteRoom, listRoomIds 함수가 lib/firebase.ts에 존재
  </done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 로컬에서 방 생성 -> Firebase에서 createdAt/updatedAt 필드 확인
3. 로컬에서 cleanup API 호출 -> 정상 응답 확인
4. 기존 게임 플로우(생성 -> 참가 -> 시작 -> 액션 -> 종료) 정상 동작 확인
</verification>

<success_criteria>
- GameState에 createdAt/updatedAt 타임스탬프가 자동 기록됨
- Cron API가 stale 방을 기준에 따라 삭제함
- 기존 기능에 영향 없음 (타입 호환, 빌드 성공)
- Vercel 배포 시 cron job이 자동 등록됨
</success_criteria>

<output>
After completion, create `.planning/quick/025-auto-cleanup-stale-game-rooms/025-SUMMARY.md`
</output>
