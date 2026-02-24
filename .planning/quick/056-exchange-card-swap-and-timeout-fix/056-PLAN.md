---
phase: quick-056
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/ExchangeModal.tsx
  - lib/game/engine.ts
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "ExchangeModal에서 카드 1장 선택된 상태에서 다른 카드 클릭 시 기존 선택 해제 + 새 카드 선택"
    - "2장 선택 가능 시 2장 모두 선택된 상태에서 새 카드 클릭 시 마지막 선택이 교체됨"
    - "exchange_select 단계에서 타임아웃이 작동하여 시간 초과 시 자동으로 기존 카드 유지"
  artifacts:
    - path: "components/game/ExchangeModal.tsx"
      provides: "개선된 카드 선택 toggle 로직"
    - path: "lib/game/engine.ts"
      provides: "resolveExchangeTimeout 함수"
    - path: "components/game/GameBoard.tsx"
      provides: "exchange_select 단계 타임아웃 폴링 + ExchangeModal 타이머 표시"
  key_links:
    - from: "lib/game/engine.ts"
      to: "exchange_select phase"
      via: "exchangeDeadline in pendingAction"
      pattern: "exchangeDeadline.*Date\\.now"
    - from: "components/game/GameBoard.tsx"
      to: "fireTimeout"
      via: "exchange_select phase를 타임아웃 폴링 조건에 포함"
      pattern: "exchange_select"
---

<objective>
ExchangeModal 카드 선택 UX 개선 및 대사 교환 단계 타임아웃 버그 수정.

Purpose: 카드 교환 시 불편한 선택 해제 동작 개선 + exchange_select 단계에서 무한 대기 방지
Output: 자연스러운 카드 교체 선택 UX + 45초 타임아웃 후 기존 카드 자동 유지
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/ExchangeModal.tsx
@lib/game/engine.ts
@lib/game/types.ts
@components/game/GameBoard.tsx
@app/api/game/timeout/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: ExchangeModal 카드 선택 UX 개선 (swap 방식)</name>
  <files>components/game/ExchangeModal.tsx</files>
  <action>
    ExchangeModal의 `toggle` 함수 로직을 변경한다.

    현재 동작 (line 40-46):
    - 이미 선택된 카드 클릭 -> 선택 해제
    - 미선택 카드 클릭 -> liveCount에 도달하면 무시 (`if (prev.length >= liveCount) return prev`)

    변경할 동작:
    - 이미 선택된 카드 클릭 -> 선택 해제 (동일)
    - 미선택 카드 클릭 + 아직 여유 있음 -> 추가 선택 (동일)
    - 미선택 카드 클릭 + 이미 liveCount에 도달 -> 가장 마지막에 선택한 카드를 제거하고 새 카드를 추가
      즉, `if (prev.length >= liveCount) return [...prev.slice(0, -1), i];`

    이렇게 하면:
    - 1장 선택 시: 다른 카드 클릭하면 바로 교체
    - 2장 선택 시: 마지막 선택이 새 클릭으로 교체

    추가로, 선택된 카드에 선택 순서 표시 배지를 추가하면 UX가 명확해진다.
    isSelected인 카드에 작은 원형 배지로 선택 순서(1, 2)를 표시한다.
    `selected.indexOf(i) + 1` 값을 사용.
  </action>
  <verify>TypeScript 컴파일 에러 없음: `npx tsc --noEmit`</verify>
  <done>카드 최대 선택 시 새 카드 클릭하면 마지막 선택이 교체되고, 선택 순서 배지가 표시됨</done>
</task>

<task type="auto">
  <name>Task 2: exchange_select 단계 타임아웃 적용 (서버 + 클라이언트)</name>
  <files>lib/game/types.ts, lib/game/engine.ts, app/api/game/timeout/route.ts, components/game/GameBoard.tsx</files>
  <action>
    **A. 타입 추가 (types.ts)**
    PendingAction 인터페이스에 `exchangeDeadline?: number` 필드 추가 (line 57 근처).
    FilteredPendingAction에도 동일하게 추가.

    **B. engine.ts - exchange_select 진입 시 deadline 설정**
    line 677-682 영역, `phase: 'exchange_select'` 설정하는 곳에서:
    ```typescript
    pendingAction: { ...pending, exchangeCards: drawnCards, exchangeDeadline: Date.now() + 45000 },
    ```

    **C. engine.ts - resolveExchangeTimeout 함수 추가**
    `resolveActionTimeout` 아래에 새 함수 `resolveExchangeTimeout` 추가:
    ```typescript
    export function resolveExchangeTimeout(state: GameState): GameState {
      if (
        state.phase !== 'exchange_select' ||
        !state.pendingAction?.exchangeDeadline ||
        Date.now() <= state.pendingAction.exchangeDeadline
      ) {
        return state;
      }
      // 타임아웃: 기존 보유 카드를 그대로 유지 (새 카드를 덱으로 반환)
      const actor = getPlayer(state, state.pendingAction.actorId);
      const liveCards = actor.cards.filter(c => !c.revealed);
      const keptIndices = liveCards.map((_, i) => i); // 기존 카드 인덱스들 (0부터 liveCount-1)
      const s = addLog(state, `${actor.name}이(가) 시간 초과로 기존 카드를 유지합니다`);
      return processExchangeSelect(s, actor.id, keptIndices);
    }
    ```
    `processExchangeSelect`와 `getPlayer`, `addLog`는 이미 engine.ts 내부에 있으므로 임포트 불필요.

    **D. timeout route에 resolveExchangeTimeout 호출 추가**
    `app/api/game/timeout/route.ts`에서:
    - import에 `resolveExchangeTimeout` 추가
    - line 29 근처, `resolveActionTimeout` 호출 이후에 `resolveExchangeTimeout`도 체이닝:
    ```typescript
    const resolved3 = resolveExchangeTimeout(resolved2);
    ```
    - `resolved2`를 `resolved3`으로 변경하여 비교 및 저장.

    **E. GameBoard.tsx - exchange_select 단계 타임아웃 폴링 추가**
    line 284-310의 타임아웃 useEffect에서:
    - `isExchangePhase` 조건 추가: `state.phase === 'exchange_select' && !!state.pendingAction?.exchangeDeadline`
    - deadline 계산에 exchangeDeadline 포함:
      ```typescript
      const isExchangePhase = state.phase === 'exchange_select' && !!state.pendingAction?.exchangeDeadline;
      const deadline = isActionPhase ? state.actionDeadline
        : isExchangePhase ? state.pendingAction?.exchangeDeadline
        : state.pendingAction?.responseDeadline;
      ```
    - line 298 조건에 `isExchangePhase` 추가: `if ((!isAwaitingPhase && !isActionPhase && !isExchangePhase) || ...)`
    - useEffect deps에 `state.pendingAction?.exchangeDeadline` 추가

    **F. GameBoard.tsx - ExchangeModal에 타이머 표시**
    ExchangeModal에 `exchangeDeadline` prop을 전달하고, ExchangeModal 내부에서 ActionPanel과 동일한 방식의 카운트다운 타이머 바를 상단에 표시한다.

    ExchangeModal의 Props에 `exchangeDeadline?: number` 추가.
    ExchangeModal 내부에 useState + useEffect로 remainingMs 계산 (ActionPanel line 116-128 패턴 참고).
    "유지할 카드 N장을 선택하세요" 텍스트 위에 타이머 바 렌더링.

    GameBoard에서 ExchangeModal 렌더링 시 (line 756-760):
    ```tsx
    <ExchangeModal
      player={me}
      exchangeCards={exchangeCardsMemo}
      onSelect={handleExchangeSelect}
      exchangeDeadline={state.pendingAction?.exchangeDeadline}
    />
    ```
  </action>
  <verify>
    1. `npx tsc --noEmit` 통과
    2. `npm test` 통과 (기존 exchange 테스트 깨지지 않음)
  </verify>
  <done>
    exchange_select 단계 진입 시 45초 deadline이 설정되고, 시간 초과 시 기존 카드 유지로 자동 처리되며, ExchangeModal에 카운트다운 타이머가 표시됨
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 타입 에러 없음
2. `npm test` — 기존 테스트 모두 통과
3. ExchangeModal toggle 로직이 swap 방식으로 동작
4. exchange_select 단계에서 deadline이 설정되고 timeout route에서 처리됨
</verification>

<success_criteria>
- ExchangeModal에서 최대 선택 도달 시 새 카드 클릭하면 마지막 선택이 교체됨
- exchange_select 단계 진입 시 pendingAction.exchangeDeadline이 45초로 설정됨
- 타임아웃 시 기존 카드 유지로 자동 처리 (resolveExchangeTimeout)
- 클라이언트에서 exchange_select 타임아웃 폴링이 작동함
- ExchangeModal에 카운트다운 타이머 바가 표시됨
</success_criteria>

<output>
After completion, create `.planning/quick/056-exchange-card-swap-and-timeout-fix/056-SUMMARY.md`
</output>
