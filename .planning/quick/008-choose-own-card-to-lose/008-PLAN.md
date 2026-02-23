---
phase: quick
plan: 008
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - lib/game/engine.ts
  - lib/game/engine.test.ts
  - lib/game/filter.ts
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "도전 실패/성공 시 카드를 잃는 플레이어가 직접 어떤 카드를 잃을지 선택할 수 있다"
    - "카드 선택 후 원래 진행되어야 할 흐름(액션 실행 또는 다음 턴)이 정상 동작한다"
    - "카드가 1장만 남은 플레이어는 선택 없이 자동으로 해당 카드를 잃는다 (UX 최적화)"
    - "기존 쿠/암살의 lose_influence 흐름이 깨지지 않는다"
  artifacts:
    - path: "lib/game/types.ts"
      provides: "PendingAction에 challengeLoseContext 필드 추가"
      contains: "challengeLoseContext"
    - path: "lib/game/engine.ts"
      provides: "resolveChallenge, processBlockResponse에서 lose_influence 전환 로직"
      contains: "challenge_action_continues"
    - path: "lib/game/engine.test.ts"
      provides: "도전 시 카드 선택 시나리오 테스트"
      contains: "lose_influence.*challenge"
  key_links:
    - from: "lib/game/engine.ts (resolveChallenge)"
      to: "processLoseInfluence"
      via: "lose_influence phase transition with challengeLoseContext"
    - from: "lib/game/engine.ts (processLoseInfluence)"
      to: "executeAction or nextTurn"
      via: "challengeLoseContext.continuation field"
---

<objective>
도전(challenge) 실패/성공 및 블록 도전 실패/성공 시 카드를 잃는 플레이어가 자동으로 첫 번째 카드를 잃는 대신, 직접 어떤 카드를 잃을지 선택할 수 있도록 구현한다.

Purpose: 쿠 공식 룰에서는 카드를 잃을 때 항상 해당 플레이어가 선택하도록 되어 있다. 현재는 `removeFirstLiveCard`로 첫 번째 비공개 카드를 자동 제거하는데, 이를 기존 `lose_influence` 페이즈를 활용하여 유저 선택 방식으로 변경한다.

Output: 수정된 엔진 로직, 업데이트된 테스트, 정상 작동하는 카드 선택 UI
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/types.ts
@lib/game/engine.ts
@lib/game/engine.test.ts
@lib/game/filter.ts
@components/game/GameBoard.tsx
@components/game/CardSelectModal.tsx
@app/api/game/action/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 엔진 로직 수정 - removeFirstLiveCard를 lose_influence 전환으로 변경</name>
  <files>
    lib/game/types.ts
    lib/game/engine.ts
    lib/game/filter.ts
  </files>
  <action>
**1. types.ts - PendingAction에 challengeLoseContext 추가:**

```typescript
export interface ChallengeLoseContext {
  continuation: 'execute_action' | 'next_turn' | 'block_success_next_turn';
  // 원래의 pendingAction 정보를 보존 (특히 도전 성공 후 카드 교체가 이미 반영된 상태의 state를 기억)
}
```

`PendingAction` 인터페이스에 `challengeLoseContext?: ChallengeLoseContext` 필드를 추가한다.

`FilteredPendingAction`에도 동일하게 `challengeLoseContext` 필드를 추가한다 (클라이언트가 "도전으로 인한 카드 잃기"인지 구분할 수 있도록).

**2. engine.ts - resolveChallenge 함수 수정:**

현재 4곳의 `removeFirstLiveCard` 호출을 `lose_influence` 페이즈 전환으로 변경한다. 단, 카드가 1장만 남은 경우(getLiveCardCount === 1)에는 기존처럼 자동 제거하여 불필요한 UI 대기를 방지한다.

**resolveChallenge 함수 (line 369-423) 수정:**

Case A: 도전 실패 (actorHasCard === true) - 도전자가 카드 잃음
- 기존: `removeFirstLiveCard(challenger)` 후 바로 `executeAction(s)`
- 변경: challenger의 라이브 카드가 2장 이상이면 `lose_influence` 페이즈로 전환, `losingPlayerId: challengerId`, `challengeLoseContext: { continuation: 'execute_action' }` 설정. 카드가 1장이면 기존대로 자동 제거 후 `executeAction`.
- 중요: 행동자의 카드 교체(덱에 넣고 새 카드 뽑기)는 lose_influence 전환 전에 이미 완료되어야 한다.

Case B: 도전 성공 (actorHasCard === false) - 행동자가 카드 잃음
- 기존: `removeFirstLiveCard(actor)` 후 `nextTurn(s)`
- 변경: actor의 라이브 카드가 2장 이상이면 `lose_influence` 페이즈로 전환, `losingPlayerId: actorId`, `challengeLoseContext: { continuation: 'next_turn' }` 설정. 1장이면 기존대로 자동 제거.

**processBlockResponse 함수 (line 294-363) 수정:**

Case C: 블록 도전 실패 (blockerHasCard === true) - 도전자가 카드 잃음
- 기존: `removeFirstLiveCard(challenger)` 후 `nextTurn(s)` (블록 성공)
- 변경: 도전자의 라이브 카드가 2장 이상이면 `lose_influence` 전환, `challengeLoseContext: { continuation: 'block_success_next_turn' }`. 1장이면 자동 제거.

Case D: 블록 도전 성공 (blockerHasCard === false) - 블로커가 카드 잃음
- 기존: `removeFirstLiveCard(blocker)` 후 `executeAction(s)`
- 변경: 블로커의 라이브 카드가 2장 이상이면 `lose_influence` 전환, `challengeLoseContext: { continuation: 'execute_action' }`. 1장이면 자동 제거.
- 주의: 이미 탈락한 target에 대한 암살 실행 가드는 유지해야 함 (기존 `!target.isAlive` 체크).

**3. engine.ts - processLoseInfluence 함수 수정 (line 567-596):**

현재는 항상 `nextTurn(s)` 호출. `challengeLoseContext`가 있으면 해당 continuation에 따라 분기:
- `'execute_action'`: `executeAction(s)` 호출 (pendingAction 유지, challengeLoseContext 제거)
- `'next_turn'`: 기존대로 `nextTurn(s)` 호출
- `'block_success_next_turn'`: "블록 성공! 행동이 취소되었습니다" 로그 추가 후 `nextTurn(s)`

주의사항:
- `processLoseInfluence`에서 `challengeLoseContext`를 사용한 후 반드시 제거해야 한다 (다음 lose_influence에 영향 주지 않도록).
- `executeAction`이 다시 `lose_influence`를 반환할 수 있다 (예: 암살 실행 시 target이 카드 선택). 이 경우 `challengeLoseContext`가 없는 일반 `lose_influence`가 되어야 한다.
- `checkWinner`는 카드 잃은 후 반드시 호출하되, `game_over`이면 continuation 무시하고 바로 반환.

**4. filter.ts 수정:**

`filterStateForPlayer`에서 `challengeLoseContext`를 `FilteredPendingAction`에 포함시킨다. 이 필드는 민감 정보가 아니므로 모든 플레이어에게 노출 가능.

**하지 말 것:**
- `removeFirstLiveCard` 함수 자체를 삭제하지 말 것 (1장 남은 경우 계속 사용).
- `processAction`의 coup/assassinate 경로는 수정하지 말 것 (이미 lose_influence를 올바르게 사용 중).
- `resolveTimeouts` 로직은 수정하지 말 것.
  </action>
  <verify>
    1. `npx tsc --noEmit` 타입 에러 없음
    2. 기존 테스트 중 challenge 관련 테스트가 실패할 수 있음 (예상됨 - Task 2에서 수정)
  </verify>
  <done>
    - PendingAction에 challengeLoseContext 필드 존재
    - resolveChallenge에서 2장 이상 보유 플레이어는 lose_influence 전환
    - processBlockResponse에서 2장 이상 보유 플레이어는 lose_influence 전환
    - processLoseInfluence에서 challengeLoseContext에 따른 분기 동작
    - 1장 보유 플레이어는 기존대로 자동 제거
  </done>
</task>

<task type="auto">
  <name>Task 2: 테스트 업데이트 및 새 테스트 케이스 추가</name>
  <files>
    lib/game/engine.test.ts
  </files>
  <action>
**기존 테스트 수정:**

도전 관련 테스트들이 이제 `lose_influence` 페이즈를 거쳐야 하므로 수정 필요.

현재 테스트 패턴:
```typescript
s = processResponse(s, 'p2', 'challenge');
// 바로 결과 검증
```

수정된 패턴 (2장 카드 보유 시):
```typescript
s = processResponse(s, 'p2', 'challenge');
// lose_influence 페이즈 확인
expect(s.phase).toBe('lose_influence');
expect(s.pendingAction!.losingPlayerId).toBe('카드잃는플레이어');
// 카드 선택
s = processLoseInfluence(s, '카드잃는플레이어', 0); // 또는 원하는 인덱스
// 이후 결과 검증
```

**수정할 테스트들:**

1. `'tax 도전 성공 (블러프) → 행동자 카드 잃음, 행동 취소'` (line 228)
   - p1이 2장 보유 -> lose_influence 거쳐야 함
   - challenge 후 `s.phase === 'lose_influence'` 확인
   - `processLoseInfluence(s, 'p1', 선택인덱스)` 호출
   - 이후 action 취소 + 다음 턴 검증

2. `'tax 도전 실패 (진짜) → 도전자 카드 잃음, 행동 실행'` (line 250)
   - p2(도전자)가 2장 보유 -> lose_influence 거쳐야 함
   - challenge 후 lose_influence, losingPlayerId === 'p2'
   - processLoseInfluence 후 tax 실행됨 검증

3. `'assassinate 도전 성공 → 코인 비환불, 행동 취소'` (line 266)
   - p1이 2장 보유 -> lose_influence 거쳐야 함

4. `'steal 도전 실패 → 도전자 카드 잃음, 강탈 실행'` (line 290)
   - p2(도전자)가 2장 보유 -> lose_influence 거쳐야 함

5. `'exchange 도전 성공 → 교환 취소'` (line 304)
   - p1이 2장 보유 -> lose_influence 거쳐야 함

6. `'블로커가 진짜 → 도전자 카드 잃음, 블록 성공, 행동 취소'` (line 445)
   - p1(도전자)이 2장 보유 -> lose_influence 거쳐야 함

7. `'블로커가 블러프 → 블로커 카드 잃음, 행동 실행'` (line 461)
   - p2(블로커)가 2장 보유 -> lose_influence 거쳐야 함

8. `'연쇄: 암살 → Contessa 블록 → 블록 도전 성공 → 암살 실행'` (line 488)
   - p1(도전자)이 2장 보유 -> 도전 실패 시 lose_influence 거쳐야 함

9. `'연쇄: 암살 → Contessa 블록(블러프) → 블록 도전 → 암살 실행'` (line 511)
   - p2(블로커)가 2장 보유 -> lose_influence 거쳐야 함

10. `'도전 → 탈락 → 턴 스킵 복합'` (line 813)
    - p2 카드 1장만 남음 -> 자동 제거 (기존 로직), 수정 불필요

11. `'assassination double-loss guard'` (line 612)
    - p2 카드 1장만 남음 -> 자동 제거, 수정 불필요

**새로 추가할 테스트:**

```typescript
describe('도전 시 카드 선택 (lose_influence)', () => {
  test('도전 실패: 도전자가 2장 보유 시 선택할 카드를 고를 수 있다', () => {
    // p1이 진짜 Duke로 tax, p2가 도전
    // p2는 2장 보유 -> lose_influence
    // p2가 두 번째 카드(index 1)를 선택
    // 선택한 카드가 공개되고, 첫 번째 카드는 유지됨을 검증
  });

  test('도전 성공: 블러퍼가 2장 보유 시 원하는 카드를 잃을 수 있다', () => {
    // p1이 블러프 tax, p2가 도전 성공
    // p1이 lose_influence에서 원하는 카드 선택
    // 행동 취소 + 다음 턴 검증
  });

  test('블록 도전: 블로커가 진짜 → 도전자가 카드 선택', () => {
    // foreignAid -> block(Duke) -> challenge block
    // 도전 실패 -> 도전자가 lose_influence에서 카드 선택
    // 블록 성공 검증
  });

  test('블록 도전: 블로커가 블러프 → 블로커가 카드 선택 후 액션 실행', () => {
    // foreignAid -> block(Duke, 블러프) -> challenge block
    // 도전 성공 -> 블로커가 lose_influence에서 카드 선택
    // 원래 액션(foreignAid) 실행 검증
  });

  test('카드 1장 보유 시 자동 제거 (lose_influence 미전환)', () => {
    // 1장만 남은 플레이어가 도전에 실패
    // lose_influence 없이 즉시 카드 제거 + 탈락 처리
  });
});
```
  </action>
  <verify>
    `cd /Users/kiyeol/development/coup && npx jest lib/game/engine.test.ts --verbose` 모든 테스트 통과
  </verify>
  <done>
    - 기존 도전/블록 도전 테스트가 lose_influence 중간 단계를 포함하도록 수정됨
    - 카드 선택 관련 새 테스트 5개 이상 추가됨
    - 1장 보유 시 자동 제거 테스트 통과
    - 모든 기존 테스트 통과
  </done>
</task>

<task type="auto">
  <name>Task 3: UI 상태 메시지 및 CardSelectModal 컨텍스트 표시 개선</name>
  <files>
    components/game/GameBoard.tsx
  </files>
  <action>
현재 `CardSelectModal`은 항상 "카드를 잃어야 합니다" / "공개할 카드를 선택하세요"로 표시된다. `challengeLoseContext`가 있을 때 더 구체적인 상황 설명을 보여준다.

**GameBoard.tsx 수정:**

1. `mustLoseCard` 메모에서 `challengeLoseContext` 정보도 함께 추출:
```typescript
const loseCardContext = useMemo(() => {
    if (state.phase !== 'lose_influence' || state.pendingAction?.losingPlayerId !== playerId || !me) {
        return null;
    }
    return {
        challengeLoseContext: state.pendingAction?.challengeLoseContext ?? null,
    };
}, [state.phase, state.pendingAction?.losingPlayerId, state.pendingAction?.challengeLoseContext, playerId, me]);
```

2. `CardSelectModal` 호출부에서 `challengeLoseContext` 유무에 따라 title/subtitle 변경:
- `challengeLoseContext` 없음 (쿠/암살): 기존대로 "카드를 잃어야 합니다" / "공개할 카드를 선택하세요"
- `challengeLoseContext` 있음: "도전에 실패했습니다" (또는 "블러프가 들켰습니다") / "잃을 카드를 선택하세요"

구체적인 title/subtitle 매핑:
- `continuation === 'execute_action'` + losingPlayerId가 도전자: "도전 실패!" / "상대가 진짜였습니다. 잃을 카드를 선택하세요"
- `continuation === 'execute_action'` + losingPlayerId가 블로커: "블러프 발각!" / "잃을 카드를 선택하세요"
- `continuation === 'next_turn'`: "블러프 발각!" / "잃을 카드를 선택하세요"
- `continuation === 'block_success_next_turn'`: "도전 실패!" / "상대 블록이 진짜였습니다. 잃을 카드를 선택하세요"

3. 다른 플레이어들이 lose_influence 대기 중일 때의 메시지도 추가:
- `state.phase === 'lose_influence' && losingPlayerId !== playerId` 일 때 대기 메시지 표시
- "OOO이(가) 잃을 카드를 선택하고 있습니다..." 라는 대기 메시지를 턴 영역에 표시

**하지 말 것:**
- CardSelectModal 컴포넌트 자체의 구조를 변경하지 말 것 (props만으로 해결)
- 기존 쿠/암살 시의 title/subtitle을 변경하지 말 것
  </action>
  <verify>
    1. `npx tsc --noEmit` 타입 에러 없음
    2. `npm run build` 성공
    3. 브라우저에서 로컬 테스트: 도전 발생 시 카드 선택 모달이 적절한 메시지와 함께 표시되는지 확인
  </verify>
  <done>
    - 도전으로 인한 카드 잃기 시 상황에 맞는 title/subtitle이 CardSelectModal에 표시됨
    - 다른 플레이어가 카드 선택 중일 때 대기 메시지 표시됨
    - 기존 쿠/암살 lose_influence 경로의 메시지는 변경되지 않음
    - 빌드 성공
  </done>
</task>

</tasks>

<verification>
1. `npx jest lib/game/engine.test.ts --verbose` - 모든 테스트 통과 (기존 + 신규)
2. `npx tsc --noEmit` - 타입 에러 없음
3. `npm run build` - 빌드 성공
4. 시나리오 검증:
   - 쿠 시: 대상이 기존처럼 카드 선택 모달 확인 (변경 없음)
   - 암살 전원 패스 시: 대상이 기존처럼 카드 선택 모달 확인 (변경 없음)
   - tax 도전 실패 (도전자 2장): 도전자에게 카드 선택 모달 표시 -> 선택 후 tax 실행
   - tax 도전 성공 (행동자 블러프, 2장): 행동자에게 카드 선택 모달 -> 선택 후 다음 턴
   - 블록 도전 시: 동일한 패턴으로 모달 표시 -> 선택 후 올바른 continuation 실행
   - 1장 남은 플레이어 도전 실패/성공: 자동 제거, 모달 미표시
</verification>

<success_criteria>
- 도전/블록 도전에서 카드를 잃을 때 2장 이상 보유 플레이어가 직접 카드를 선택할 수 있다
- 1장 보유 플레이어는 자동 제거되어 불필요한 대기가 없다
- 카드 선택 후 원래 진행되어야 할 흐름(액션 실행 / 다음 턴 / 블록 확정)이 정확히 동작한다
- 기존 쿠/암살의 lose_influence 경로가 깨지지 않는다
- 모든 기존 + 신규 테스트 통과
- 빌드 성공
</success_criteria>

<output>
After completion, create `.planning/quick/008-choose-own-card-to-lose/008-SUMMARY.md`
</output>
