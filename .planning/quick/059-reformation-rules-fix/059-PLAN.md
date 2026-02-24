---
phase: quick
plan: 059
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/engine.ts
  - lib/game/types.ts
  - lib/game/filter.ts
  - components/game/ExamineModal.tsx
  - components/game/ActionPanel.tsx
  - components/game/ResponseModal.tsx
  - components/game/GameBoard.tsx
  - app/api/game/action/route.ts
autonomous: true

must_haves:
  truths:
    - "횡령 도전 시 공작이 있으면 횡령 실패 (역도전 메커니즘)"
    - "심문 시 대상 플레이어가 보여줄 카드를 선택한다"
    - "공격 제한(같은 진영)이 쿠데타/암살/갈취 + 해외원조 블록에 올바르게 적용된다"
  artifacts:
    - path: "lib/game/engine.ts"
      provides: "역도전 횡령 로직 + 심문 대상 카드선택 로직"
    - path: "components/game/ExamineModal.tsx"
      provides: "대상 플레이어용 카드 선택 UI (심문)"
  key_links:
    - from: "engine.ts embezzlement challenge"
      to: "resolveChallenge"
      via: "역도전 분기 (공작 있으면 실패)"
    - from: "engine.ts examine executeAction"
      to: "examine_card_select phase"
      via: "대상이 카드 선택 후 심문관이 확인"
---

<objective>
종교개혁 확장판 룰 3가지 수정: (1) 횡령 역도전 메커니즘, (2) 심문관 카드선택 주체 변경, (3) 공격 제한 확인/수정.

진영 선택 UI는 이번 플랜에서 제외 (게임 플로우 대폭 변경 필요 — 별도 플랜).

Purpose: 원래 쿠 종교개혁 확장판 룰에 맞게 게임 엔진 수정
Output: 수정된 engine.ts + 관련 UI 컴포넌트
</objective>

<execution_context>
@.planning/quick/059-reformation-rules-fix/059-PLAN.md
</execution_context>

<context>
@lib/game/engine.ts
@lib/game/types.ts
@lib/game/filter.ts
@components/game/ExamineModal.tsx
@components/game/ActionPanel.tsx
@components/game/ResponseModal.tsx
@components/game/GameBoard.tsx
@app/api/game/action/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 횡령(Embezzlement) 역도전 메커니즘 구현</name>
  <files>
    lib/game/engine.ts
    components/game/ResponseModal.tsx
    components/game/ActionPanel.tsx
  </files>
  <action>
현재 횡령은 "공작 능력"으로 구현되어 도전 시 공작이 없으면 도전 성공이다.
원래 룰: 횡령은 "공작이 없다"고 선언하는 것. 도전 시 공작이 **있으면** 횡령 실패.

engine.ts 변경:

1. `getRequiredCharacter()` (line 704-715): embezzlement의 매핑을 'Duke'에서 제거하거나 null로 변경. 횡령은 일반 캐릭터 능력이 아니므로 requiredChar가 없다.

2. `resolveChallenge()` 함수에 횡령 특별 분기 추가:
   - 횡령 도전이 들어오면 역도전 로직 적용
   - `hasCharacter(actor, 'Duke')` 확인
   - **공작이 있으면**: 도전 성공 (횡령자가 거짓말 — 공작이 있는데 없다고 함)
     → 횡령자가 카드 1장 잃음 + 재무부 코인 돌려놓음 (횡령 무효)
     → 횡령자 공작 카드를 공개해야 할 수도 있으나, 원래 룰에서는 도전자가 공작을 보여줄 필요 없음
     → 실제로는: 횡령자의 공작이 밝혀지면 횡령자가 카드 잃음, 행동 취소
   - **공작이 없으면**: 도전 실패 (횡령자가 진짜 공작 없음)
     → 도전자가 카드 잃음 + 횡령 실행

   구체적 구현:
   ```typescript
   // resolveChallenge 함수 시작 부분에:
   if (pending.type === 'embezzlement') {
     return resolveEmbezzlementChallenge(s, challengerId);
   }
   ```

3. 새 함수 `resolveEmbezzlementChallenge(state, challengerId)` 추가:
   - actor가 Duke를 가지고 있는지 확인
   - Duke 있음 → 도전 성공: actor는 거짓말 (공작 있으면서 없다고 함)
     - actor 카드 잃음 (lose_influence phase, continuation: 'next_turn')
     - 횡령 무효 (재무부 코인은 아직 안 가져갔으므로 executeAction 안 함)
     - 로그: "{challenger} 도전 성공! {actor}가 공작을 가지고 있었습니다"
   - Duke 없음 → 도전 실패: actor가 진짜 공작 없음
     - challenger 카드 잃음 (lose_influence phase, continuation: 'execute_action')
     - 횡령 실행됨
     - 로그: "{challenger} 도전 실패! {actor}는 정말 공작이 없었습니다"
   - 주의: 역도전이므로 카드 교체(덱에 넣고 새로 뽑기) 로직은 없음. 단순히 카드 보유 여부만 확인.

4. ActionPanel.tsx: embezzlement의 desc를 "재무부 코인 횡령 (공작이 없다고 선언, 도전 가능)"으로 변경.
   claimedChar를 undefined로 변경 (공작 능력이 아님).

5. ResponseModal.tsx: embezzlement ACTION_CONTEXT 업데이트:
   - claimedRole: null (역할 주장이 아님)
   - effect: '공작이 없다고 선언하고 재무부 코인을 가져옵니다'
   - challengeInfo: '도전 시: 횡령자가 실제로 공작을 가지고 있으면 도전 성공 (횡령 무효, 횡령자 카드 잃음).\n공작이 없으면 도전 실패 (도전자 카드 잃음, 횡령 실행).'
   - passInfo: '패스하면 재무부 코인을 횡령합니다'
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 체크 통과
    - `npm run build` 빌드 성공
  </verify>
  <done>
    횡령 도전 시 공작 보유 여부에 따라 역방향으로 판정됨. 공작이 있으면 도전 성공(횡령 실패), 없으면 도전 실패(횡령 진행).
  </done>
</task>

<task type="auto">
  <name>Task 2: 심문관 카드선택 주체를 대상 플레이어로 변경</name>
  <files>
    lib/game/engine.ts
    lib/game/types.ts
    lib/game/filter.ts
    components/game/ExamineModal.tsx
    components/game/GameBoard.tsx
    app/api/game/action/route.ts
  </files>
  <action>
현재: 심문 시 랜덤으로 대상의 비공개 카드 1장을 선택 (engine.ts line 820-824)
원래 룰: 심문관이 지목하면 **대상 플레이어**가 보여줄 카드 1장을 선택

구현 변경:

1. types.ts: GamePhase에 `'examine_card_select'` 추가 (대상이 카드를 선택하는 단계)
   PendingAction에 `examineSelectPlayerId?: string` 추가 (심문에서 카드를 선택해야 하는 플레이어 ID)

2. engine.ts `executeAction` examine case 변경:
   - 랜덤 카드 선택 삭제
   - 대신 `examine_card_select` phase로 전환
   - pendingAction에 examineSelectPlayerId = targetId 설정
   - exchangeDeadline 설정 (45초 타임아웃)
   ```typescript
   case 'examine': {
     if (!targetId) throw new Error('examine: targetId required');
     const target = getPlayer(s, targetId);
     const liveCards = target.cards.filter((c) => !c.revealed);
     if (liveCards.length === 0) throw new Error('심문: 대상에 비공개 카드가 없습니다');

     s = addLog(s, `${actor.name}이(가) ${target.name}의 카드를 심문합니다`);

     // 카드가 1장이면 자동 선택
     if (liveCards.length === 1) {
       const liveIdx = target.cards.findIndex((c) => !c.revealed);
       const examinedCard = target.cards[liveIdx].character;
       s = addPrivateLog(s, actorId, `심문: ${target.name}의 카드는 ${CHARACTER_NAMES[examinedCard]}입니다`, ...);
       return { ...s, phase: 'examine_select', pendingAction: { ...pending, examinedCard, examinedCardIndex: liveIdx, exchangeDeadline: Date.now() + 45000 } };
     }

     // 카드 2장 이상 → 대상이 선택
     return { ...s, phase: 'examine_card_select', pendingAction: { ...pending, examineSelectPlayerId: targetId, exchangeDeadline: Date.now() + 45000 } };
   }
   ```

3. 새 함수 `processExamineCardSelect(state, targetPlayerId, cardIndex)` 추가:
   - 대상 플레이어가 보여줄 카드 인덱스 선택
   - 선택된 카드를 examinedCard/examinedCardIndex에 설정
   - 심문관에게 비공개 로그 추가
   - examine_select phase로 전환 (심문관이 돌려주기/교체 결정)
   - exchangeDeadline 갱신 (45초)

4. `resolveExamineTimeout` 수정: examine_card_select phase도 처리
   - 타임아웃 시 랜덤 카드 자동 선택 후 examine_select로 전환

5. filter.ts 수정:
   - examine_card_select phase에서 examineSelectPlayerId 전달
   - examinedCard는 이 단계에서는 아직 없으므로 노출 불필요

6. app/api/game/action/route.ts: 새 액션 타입 'examine_card_select' 핸들러 추가:
   ```typescript
   case 'examine_card_select': {
     if (state.phase !== 'examine_card_select') return error;
     if (state.pendingAction?.examineSelectPlayerId !== playerId) return error 403;
     state = processExamineCardSelect(state, playerId, action.cardIndex);
     break;
   }
   ```

7. types.ts GameAction에 `| { type: 'examine_card_select'; cardIndex: number }` 추가

8. ExamineModal.tsx 수정: 두 가지 모드로 동작
   - examine_card_select phase + 내가 대상(examineSelectPlayerId === playerId):
     → "심문관에게 보여줄 카드를 선택하세요" UI 표시
     → 내 비공개 카드 목록에서 1장 선택 → onAction({ type: 'examine_card_select', cardIndex })
   - examine_select phase + 내가 심문관(actorId === playerId):
     → 기존 UI (돌려주기/교체)

9. GameBoard.tsx: examine_card_select phase 모달 렌더링 추가:
   - 대상 플레이어에게 ExamineModal(카드 선택 모드) 표시
   - 심문관 및 다른 플레이어에게 "대기 중" 메시지 표시

10. FilteredPendingAction에 examineSelectPlayerId 추가, filter.ts에서 전달

주의: 심문관 타임아웃(examine_select)과 대상 타임아웃(examine_card_select)을 분리해서 처리.
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 체크 통과
    - `npm run build` 빌드 성공
  </verify>
  <done>
    심문 시 대상 플레이어가 보여줄 카드를 선택하는 UI가 표시되고, 선택 후 심문관이 돌려주기/교체를 결정한다. 카드 1장만 있으면 자동 선택.
  </done>
</task>

<task type="auto">
  <name>Task 3: 공격 제한 범위 확인 및 빌드 검증</name>
  <files>
    lib/game/engine.ts
  </files>
  <action>
현재 코드 확인 결과:
- engine.ts line 231-235: 쿠데타/암살/갈취에 canTargetPlayer 제한 적용 (OK)
- engine.ts line 447-451: 해외원조 블록에 같은 진영 제한 적용 (OK)

이 부분은 이미 올바르게 구현되어 있음을 확인. 추가 변경 불필요.

단, 확인할 점:
1. `canTargetPlayer`가 정확히 "같은 진영이면 공격 불가, 단 모든 생존자가 같은 진영이면 허용"인지 재확인 → line 170-182, 올바름.
2. 전향(conversion)은 같은 진영 제한 없음 (맞음 — 전향은 공격이 아님)

이 태스크에서는 최종 빌드 검증 수행:
- `npx tsc --noEmit` 실행
- `npm run build` 실행
- 에러 있으면 수정
  </action>
  <verify>
    - `npx tsc --noEmit` 통과
    - `npm run build` 성공
  </verify>
  <done>
    공격 제한이 원래 룰대로 올바르게 구현되어 있음을 확인. 전체 빌드 성공.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 타입 에러 없음
2. `npm run build` — 빌드 성공
3. 횡령 관련: getRequiredCharacter에서 embezzlement가 Duke를 반환하지 않음 (또는 역도전 분기가 우선 처리됨)
4. 심문 관련: examine_card_select phase가 types.ts GamePhase에 존재
5. 심문 관련: processExamineCardSelect가 engine.ts에서 export됨
</verification>

<success_criteria>
- 횡령 도전 시 역도전 로직 동작 (공작 있으면 도전 성공 = 횡령 실패)
- 심문 시 대상 플레이어가 카드 선택 UI를 볼 수 있음
- 심문 대상 카드 선택 후 심문관이 돌려주기/교체 결정 가능
- 공격 제한이 쿠데타/암살/갈취 + 해외원조 블록에 정확히 적용됨
- 빌드 및 타입 체크 통과
</success_criteria>

<output>
After completion, create `.planning/quick/059-reformation-rules-fix/059-SUMMARY.md`
</output>
