---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameBoard.tsx
  - components/game/PlayerArea.tsx
  - components/game/MyPlayerArea.tsx
  - components/game/ActionPanel.tsx
  - components/game/ResponseModal.tsx
  - components/game/CardSelectModal.tsx
  - components/game/ExchangeModal.tsx
  - components/game/EventLog.tsx
  - components/game/GameToast.tsx
  - lib/firebase.client.ts
autonomous: true

must_haves:
  truths:
    - "GameBoard 자식 컴포넌트가 관련 props 변경 시에만 리렌더링된다"
    - "모달 컴포넌트(Response, CardSelect, Exchange)가 dynamic import로 코드 스플릿된다"
    - "Firebase 클라이언트가 ES module import를 사용하고 게임 시작 후 state 구독이 해제된다"
    - "빌드가 에러 없이 성공하고 기존 기능이 그대로 동작한다"
  artifacts:
    - path: "components/game/PlayerArea.tsx"
      provides: "React.memo 래핑된 상대방 플레이어 컴포넌트"
    - path: "components/game/EventLog.tsx"
      provides: "React.memo 래핑된 이벤트 로그"
    - path: "lib/firebase.client.ts"
      provides: "ES module import + 스마트 구독 관리"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "ResponseModal, CardSelectModal, ExchangeModal"
      via: "next/dynamic"
      pattern: "dynamic\\(.*import"
---

<objective>
Coup 보드게임 웹앱의 렌더링 성능, 번들 사이즈, Firebase 실시간 동기화를 종합 최적화한다.

Purpose: 게임 중 불필요한 리렌더링 제거로 UI 반응성 개선, 모달 코드 스플릿으로 초기 로딩 감소, Firebase 구독 최적화로 불필요한 데이터 전송 제거.
Output: 최적화된 컴포넌트 + Firebase 클라이언트 코드
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx
@components/game/PlayerArea.tsx
@components/game/MyPlayerArea.tsx
@components/game/ActionPanel.tsx
@components/game/ResponseModal.tsx
@components/game/CardSelectModal.tsx
@components/game/ExchangeModal.tsx
@components/game/EventLog.tsx
@components/game/GameToast.tsx
@lib/firebase.client.ts
@app/game/[roomId]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: React.memo + useCallback 렌더링 최적화</name>
  <files>
    components/game/PlayerArea.tsx
    components/game/MyPlayerArea.tsx
    components/game/ActionPanel.tsx
    components/game/EventLog.tsx
    components/game/GameToast.tsx
    components/game/ResponseModal.tsx
    components/game/CardSelectModal.tsx
    components/game/ExchangeModal.tsx
    components/game/GameBoard.tsx
  </files>
  <action>
    모든 자식 컴포넌트에 React.memo를 적용하고, GameBoard에서 파생 값들을 useMemo로 캐싱한다.

    1. **PlayerArea.tsx**: `export default React.memo(PlayerArea)` 래핑. props가 `player`와 `isCurrentTurn`뿐이므로 얕은 비교로 충분.

    2. **MyPlayerArea.tsx**: `React.memo` 래핑. player 객체 참조가 바뀔 때만 리렌더.

    3. **ActionPanel.tsx**: `React.memo` 래핑. 내부 `handleAction`은 이미 컴포넌트 내부에서 정의되므로 그대로 둬도 OK.

    4. **EventLog.tsx**: `React.memo` 래핑. log 배열 참조가 바뀔 때만 리렌더.

    5. **GameToast.tsx**: `React.memo` 래핑.

    6. **ResponseModal.tsx**: `React.memo` 래핑.

    7. **CardSelectModal.tsx**: `React.memo` 래핑.

    8. **ExchangeModal.tsx**: `React.memo` 래핑.

    9. **GameBoard.tsx**: 핵심 최적화:
       - `me`, `others`, `isMyTurn`, `currentPlayer` 계산을 `useMemo`로 감싼다.
       - `mustLoseCard`, `mustExchange`, `mustRespond` 조건도 `useMemo`로 감싼다.
       - 모달 3개(ResponseModal, CardSelectModal, ExchangeModal)를 `next/dynamic`으로 변경:
         ```tsx
         import dynamic from 'next/dynamic';
         const ResponseModal = dynamic(() => import('./ResponseModal'), { ssr: false });
         const CardSelectModal = dynamic(() => import('./CardSelectModal'), { ssr: false });
         const ExchangeModal = dynamic(() => import('./ExchangeModal'), { ssr: false });
         ```
       - 기존 정적 import 제거 (PlayerArea, MyPlayerArea, ActionPanel, EventLog, GameToast는 항상 렌더되므로 정적 유지).

    주의사항:
    - React.memo 래핑 시 `export default React.memo(function ComponentName(...) { ... })` 패턴 사용하지 말 것. 대신 함수 선언 후 `export default React.memo(ComponentName)` 패턴 사용 (디버깅 시 컴포넌트 이름 유지).
    - `useMemo` 의존성 배열에 `state` 전체가 아닌 필요한 개별 필드만 넣을 것.
    - dynamic import 시 `{ ssr: false }` 필수 (모달은 클라이언트 전용).
  </action>
  <verify>
    `yarn build` (또는 `npm run build`) 성공 확인. 빌드 출력에서 chunk 분리 확인 (ResponseModal, CardSelectModal, ExchangeModal이 별도 chunk로 나뉘어야 함).
  </verify>
  <done>
    - 8개 자식 컴포넌트에 React.memo 적용 완료
    - GameBoard에서 6개 파생 값이 useMemo로 캐싱됨
    - 3개 모달이 dynamic import로 코드 스플릿됨
    - 빌드 성공
  </done>
</task>

<task type="auto">
  <name>Task 2: Firebase 클라이언트 최적화</name>
  <files>
    lib/firebase.client.ts
  </files>
  <action>
    Firebase 클라이언트의 3가지 문제를 수정한다:

    1. **require() -> ES module import 변환** (tree-shaking 활성화):
       ```typescript
       import { initializeApp, getApps } from 'firebase/app';
       import { getDatabase, ref, onValue, get } from 'firebase/database';
       ```
       기존 `require()` 호출과 eslint-disable 주석 제거.

    2. **스마트 구독 관리 - state 구독 조건부 해제**:
       `subscribeToRoom`에서 현재 views + state 이중 구독이 항상 활성 상태.
       게임이 시작되면 (phase !== 'waiting') state 구독이 불필요.
       수정 방안: state 구독의 콜백에서 phase가 'waiting'이 아닌 데이터가 오면 state 구독을 자체 해제한다.
       ```typescript
       let stateUnsubbed = false;
       const unsubState = onValue(stateRef, (snapshot) => {
         if (snapshot.exists()) {
           const val = snapshot.val();
           if (val.phase === 'waiting') {
             callback(val);
           } else {
             // 게임 시작 후 state 구독 해제 (views가 우선)
             if (!stateUnsubbed) {
               stateUnsubbed = true;
               unsubState();
             }
           }
         }
       });
       ```
       반환하는 cleanup 함수에서도 이미 해제된 경우를 처리:
       ```typescript
       return () => {
         unsubView();
         if (!stateUnsubbed) unsubState();
       };
       ```

    3. **구독 에러 핸들링**: onValue의 두 번째 인자로 에러 콜백 추가:
       ```typescript
       const unsubView = onValue(viewRef, (snapshot) => { ... }, (error) => {
         console.error('[Firebase] view subscription error:', error);
       });
       ```

    주의사항:
    - `'use client'` 디렉티브 유지
    - FilteredGameState import 유지
    - getRoom 함수는 변경하지 않음 (REST get은 이미 잘 동작)
    - onValue의 타입 캐스팅을 제거하고 Firebase SDK의 DataSnapshot 타입 사용 (ES module import 시 자동으로 타입 제공됨)
  </action>
  <verify>
    `yarn build` 성공. `.next/static/chunks` 디렉토리에서 firebase 관련 chunk 크기가 이전보다 작아졌는지 확인 (tree-shaking 효과). `yarn lint` 통과.
  </verify>
  <done>
    - require() -> ES module import 변환 완료
    - 게임 시작 후 state 구독 자동 해제
    - 구독 에러 핸들링 추가
    - 빌드 + 린트 통과
  </done>
</task>

</tasks>

<verification>
1. `npm run build` 성공 (타입 에러, 빌드 에러 없음)
2. `npm run lint` 통과
3. 빌드 출력에서 모달 컴포넌트가 별도 chunk로 분리됨 확인
4. 기존 테스트가 있다면 `npm test` 통과 확인
</verification>

<success_criteria>
- 모든 게임 UI 컴포넌트에 React.memo 적용
- GameBoard의 파생 계산이 useMemo로 캐싱됨
- 3개 모달이 dynamic import로 코드 스플릿됨
- Firebase SDK가 ES module import 사용 (tree-shaking 가능)
- Firebase state 구독이 게임 시작 후 자동 해제됨
- 빌드 + 린트 성공, 기존 기능 정상 동작
</success_criteria>

<output>
After completion, create `.planning/quick/001-comprehensive-optimization/001-SUMMARY.md`
</output>
