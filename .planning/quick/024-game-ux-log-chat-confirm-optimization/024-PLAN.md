---
phase: quick-024
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - lib/game/engine.ts
  - components/game/EventLog.tsx
  - components/game/GameBoard.tsx
  - components/game/QuickChat.tsx
  - components/game/ActionPanel.tsx
  - components/game/ConfirmModal.tsx
autonomous: true
---

<objective>
게임 UX 4가지 개선: (1) 턴 시작 로그 + 중요 로그 색상, (2) 퀵챗 버그 수정 + 최적화, (3) 낙관적 UI + 챗 3회 제한, (4) 행동 확인 모달

Purpose: 게임 플레이 경험 품질 향상 - 로그 가독성, 채팅 안정성, 조작 실수 방지
Output: 개선된 EventLog, 안정적 QuickChat, 확인 모달이 있는 ActionPanel
</objective>

<context>
@components/game/EventLog.tsx
@components/game/QuickChat.tsx
@components/game/ChatBubble.tsx
@components/game/ActionPanel.tsx
@components/game/GameBoard.tsx
@lib/firebase.client.ts
@lib/game/engine.ts
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 턴 시작 로그 + 중요 로그 색상 구분</name>
  <files>
    lib/game/types.ts
    lib/game/engine.ts
    components/game/EventLog.tsx
  </files>
  <action>
  1. **types.ts**: LogEntryType에 `'turn_start'` 추가

  2. **engine.ts**: `nextTurn()` 함수에서 턴 전환 시 로그 추가
     - `nextTurn()` 함수 (line ~101)에서 `return` 전에 addLog 호출:
       `addLog(state, '--- ${nextPlayer.name}의 턴 ---', { type: 'turn_start', actorId: next.id })`
     - 구분선 형태로 가독성 확보

  3. **EventLog.tsx**: LOG_TYPE_CONFIG에 turn_start 추가
     - `turn_start: { color: 'text-gold', icon: Zap }` (또는 적합한 아이콘)
     - StructuredLogEntry에서 turn_start 타입일 때 상단에 얇은 구분선(border-t) 추가하여 시각적 분리
     - 기존 getLogColor 함수에 '턴' 키워드 매칭 추가 (fallback용)

  중요: engine.ts의 nextTurn 함수 구조를 확인 후 정확한 위치에 삽입. `nextTurn`은 `{ ...state, currentTurnId: next.id, phase: 'action', pendingAction: null }` 반환하므로, 반환 전에 addLog 적용.
  </action>
  <verify>
  - `npm run build` 타입 에러 없음
  - EventLog에서 turn_start 로그가 구분선과 함께 표시되는지 확인
  </verify>
  <done>
  - 매 턴 시작마다 "--- {이름}의 턴 ---" 로그가 구분선과 함께 표시됨
  - turn_start 로그는 gold 색상으로 시각적 구분
  </done>
</task>

<task type="auto">
  <name>Task 2: 퀵챗 수신 버그 확인 + 낙관적 UI + 3회 제한</name>
  <files>
    components/game/GameBoard.tsx
    components/game/QuickChat.tsx
    lib/firebase.client.ts
  </files>
  <action>
  **퀵챗 수신 버그 점검:**
  현재 uncommitted 변경으로 `subscribeToChatMessages`가 `onChildAdded` + `startAt(Date.now() - 10_000)`으로 변경됨. 이 방식은 구독 시점 기준 10초 이내 메시지만 수신하므로 정상 동작해야 함.

  BUT: `onChildAdded`는 쿼리 결과에 이미 존재하는 child도 처음 한 번 콜백을 호출함. 이로 인해 구독 시작 시 10초 이내 과거 메시지가 한꺼번에 표시될 수 있음.
  - **수정**: `subscribeToChatMessages`에서 구독 시작 시점의 timestamp를 기록하고, 콜백에서 `msg.timestamp < subscribeTs`인 경우 초기 로드된 기존 메시지는 무시하도록 필터링 추가. 또는 startAt을 `Date.now()`로 변경 (현재 시점 이후만).

  **낙관적 UI (내 채팅 즉시 표시):**
  - GameBoard.tsx에서 `subscribeToChatMessages` 콜백 내에 `msg.playerId === playerId` 체크하여 내 메시지는 구독에서 무시 (중복 방지)
  - QuickChat에서 `sendChatMessage` 호출 시 부모(GameBoard)에 콜백으로 `{ playerId, messageId }` 전달
  - GameBoard에서 QuickChat에 `onSend` prop 추가, 호출 시 즉시 chatBubbles에 내 말풍선 추가 (Firebase 왕복 없이)
  - 이렇게 하면 내 메시지는 즉시, 남의 메시지는 Firebase 통해 수신

  **3회 제한 (턴당 또는 라운드당):**
  - QuickChat에 `chatCountRef = useRef(0)` 추가, 턴 변경 시 리셋
  - `maxChats` prop (기본값 3) 추가
  - `chatCountRef.current >= maxChats`이면 버튼 disabled + "채팅 {maxChats}회 제한" 메시지 표시
  - 턴 변경 감지: QuickChat에 `turnId` prop 추가, useEffect에서 turnId 변경 시 카운트 리셋

  QuickChat props 변경:
  ```
  interface Props {
    roomId: string;
    playerId: string;
    disabled?: boolean;
    turnId?: string;      // 추가: 턴 변경 감지용
    maxChats?: number;    // 추가: 턴당 채팅 제한 (기본 3)
    onSend?: (messageId: number) => void;  // 추가: 낙관적 UI 콜백
  }
  ```

  GameBoard에서 QuickChat 사용:
  ```tsx
  <QuickChat
    roomId={roomId}
    playerId={playerId}
    disabled={!me.isAlive}
    turnId={state.currentTurnId}
    onSend={(messageId) => {
      // 낙관적 UI: 즉시 내 말풍선 표시
      const message = CHAT_MESSAGES[messageId] ?? '';
      if (!message) return;
      // 기존 타이머 취소 + 즉시 표시 (동일 로직)
      ...
    }}
  />
  ```
  </action>
  <verify>
  - `npm run build` 성공
  - 내 채팅 클릭 시 즉시 말풍선 표시 (네트워크 지연 없이)
  - 다른 유저 채팅도 정상 수신
  - 4번째 채팅 시도 시 버튼 비활성화
  - 턴 변경 시 카운트 리셋
  </verify>
  <done>
  - 내 채팅: 클릭 즉시 말풍선 (낙관적 UI)
  - 상대 채팅: Firebase onChildAdded로 수신
  - 턴당 3회 제한, 턴 변경 시 리셋
  - 구독 시작 시 과거 메시지 중복 표시 없음
  </done>
</task>

<task type="auto">
  <name>Task 3: 행동 확인 모달 (쿠데타/암살 등 비용 행동)</name>
  <files>
    components/game/ConfirmModal.tsx
    components/game/ActionPanel.tsx
  </files>
  <action>
  1. **ConfirmModal.tsx 생성**: 간단한 확인 모달 컴포넌트
     - Props: `{ title: string; message: string; confirmLabel: string; confirmColor?: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }`
     - 디자인: 기존 게임 모달 스타일 (glass-panel, dark overlay, animate-slide-up)
     - 확인/취소 버튼, 확인 버튼은 confirmColor 스타일 적용
     - memo 래핑

  2. **ActionPanel.tsx 수정**: 비용이 있는 행동(쿠데타 7코인, 암살 3코인)에 확인 단계 추가
     - `confirmAction` state 추가: `{ type: ActionType; targetId?: string; guessChar?: Character } | null`
     - `handleAction` 호출 전에 특정 조건에서 확인 모달 표시:
       - **쿠데타 (cost 7)**: 대상 선택 후 → 확인 모달 표시 "정말 {target}에게 쿠데타를 하시겠습니까? (7코인 소모)"
       - **암살 (cost 3)**: 대상 선택 후 → 확인 모달 표시 "정말 {target}를 암살하시겠습니까? (3코인 소모)"
       - **소득, 외국 원조, 세금징수, 갈취, 교환**: 확인 없이 즉시 실행 (빠른 진행)
     - 확인 모달에서 "확인" 클릭 시 실제 `handleAction` 실행
     - 확인 모달에서 "취소" 클릭 시 `confirmAction = null`로 리셋

     구체적 수정:
     - `handleActionButtonClick`에서 needsTarget=false인 비용 행동은 없으므로 (소득/외국원조/세금/교환은 비용 없거나 needsTarget=false), target 선택 완료 시점에서 확인 모달 트리거
     - `handleTargetSelect`에서 non-guess 쿠데타/암살의 경우 바로 onAction 호출 대신 `setConfirmAction({ type, targetId })` 설정
     - guess 모드 쿠데타는 캐릭터 선택 후 "쿠데타 확인" 버튼에서 확인 모달 트리거

     주의: 기존 flow를 깨지 않도록. 확인 모달은 ActionPanel 내부에서 렌더링.
  </action>
  <verify>
  - `npm run build` 성공
  - 쿠데타 선택 → 대상 선택 → 확인 모달 표시 → 확인 시 실행, 취소 시 대상 선택으로 복귀
  - 암살 선택 → 대상 선택 → 확인 모달 표시 → 확인 시 실행
  - 소득/외국원조/세금/갈취/교환은 확인 없이 즉시 실행
  </verify>
  <done>
  - 쿠데타, 암살 행동에 확인 모달 표시
  - 확인 시 실행, 취소 시 이전 단계로 복귀
  - 비용 없는 행동은 확인 없이 즉시 실행
  - ConfirmModal 컴포넌트가 게임 디자인 시스템과 일관된 스타일
  </done>
</task>

</tasks>

<verification>
- `npm run build` 전체 빌드 성공
- `npm test` (있다면) 기존 테스트 통과
- 게임 로그에 턴 구분선 표시 확인
- 채팅 송수신 정상 동작
- 확인 모달 동작 확인
</verification>

<success_criteria>
1. EventLog에 턴 시작마다 구분선 + 플레이어명 표시, 중요 이벤트(도전/블록/탈락) 색상 구분 유지
2. 퀵챗: 내 메시지 즉시 표시(낙관적 UI), 상대 메시지 정상 수신, 턴당 3회 제한
3. 쿠데타/암살 행동 시 확인 모달로 실수 방지
4. 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/024-game-ux-log-chat-confirm-optimization/024-SUMMARY.md`
</output>
