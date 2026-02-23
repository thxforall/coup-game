---
phase: quick
plan: 005
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameBoard.tsx
  - components/game/GameToast.tsx
autonomous: true

must_haves:
  truths:
    - "모바일에서 최근 게임 로그 2-3줄이 항상 보인다"
    - "모바일에서 새 로그 추가 시 토스트 알림이 표시된다 (기존에 토스트 안 뜨던 일반 액션도 포함)"
    - "데스크톱 레이아웃은 기존과 동일하다 (좌측 사이드바 EventLog)"
    - "모바일 로그 토글 버튼은 여전히 전체 로그 오버레이를 열 수 있다"
  artifacts:
    - path: "components/game/GameBoard.tsx"
      provides: "모바일 컴팩트 로그 섹션 (always visible)"
    - path: "components/game/GameToast.tsx"
      provides: "모든 새 로그에 대한 토스트 (모바일 전용 확장)"
  key_links:
    - from: "GameBoard.tsx"
      to: "EventLog.tsx"
      via: "모바일 컴팩트 뷰 - 마지막 2-3개 로그만 표시"
    - from: "GameToast.tsx"
      to: "state.log"
      via: "새 로그 감지 시 action 타입 토스트 추가"
---

<objective>
EventLog를 모바일에서 기본으로 보이게 하고, 새 로그 추가 시 토스트 알림을 띄운다.

Purpose: quick-004에서 모바일 화면 잘림 해결을 위해 EventLog를 숨겼지만, 유저가 게임 진행 상황을 놓치는 문제 발생. 컴팩트하게 항상 보여주고, 새 이벤트는 토스트로도 알려준다.
Output: 모바일에서 최근 로그가 항상 보이고, 새 로그마다 토스트가 뜨는 GameBoard
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx
@components/game/EventLog.tsx
@components/game/GameToast.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: 모바일 컴팩트 로그 섹션 추가 (GameBoard.tsx)</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
GameBoard.tsx에서 모바일용 컴팩트 EventLog 영역을 추가한다.

현재 구조:
- 데스크톱: `hidden lg:block w-80` 사이드바에 EventLog 전체 표시
- 모바일: EventLog 완전히 숨김, 헤더의 토글 버튼으로 오버레이 열기

변경:
1. 상대방 플레이어 행(`others.map`) 아래, 중앙 영역(`flex-1 flex flex-col lg:flex-row`) 위에 모바일 전용 컴팩트 로그 섹션을 추가한다.
2. 이 섹션은 `lg:hidden`으로 데스크톱에서는 숨긴다.
3. 마지막 3개 로그만 표시한다: `state.log.slice(-3)`
4. 스타일: 배경 `bg-bg-card/80`, border-b, px-3 py-2, 각 로그는 font-mono text-[10px], getLogColor 함수를 import하여 색상 적용.
   - getLogColor를 EventLog.tsx에서 export해야 한다면, EventLog.tsx에서 named export로 변경.
   - 또는 간단하게 text-text-muted 단일색으로 처리 (더 깔끔).
5. 컴팩트 로그 섹션 우측에 작은 "전체 보기" 텍스트 버튼 추가 -> setShowMobileLog(true) 호출.
6. 높이는 고정하지 않고 내용만큼만 차지하되, flex-shrink-0으로 줄어들지 않게.

주의: 기존 모바일 오버레이 로그 (showMobileLog 토글)는 유지한다. 헤더의 ScrollText 버튼도 유지.
주의: 데스크톱의 좌측 사이드바 EventLog는 변경하지 않는다.
  </action>
  <verify>
- `npm run build` 성공
- 모바일 뷰포트(Chrome DevTools 390px)에서 최근 로그 3줄이 상대방 카드 아래에 항상 보이는지 확인
- 데스크톱에서는 컴팩트 섹션이 보이지 않고, 기존 좌측 사이드바만 보이는지 확인
- "전체 보기" 클릭 시 기존 오버레이가 열리는지 확인
  </verify>
  <done>모바일에서 최근 3개 로그가 상대방 영역 아래에 항상 표시되고, 데스크톱 레이아웃은 변경 없음</done>
</task>

<task type="auto">
  <name>Task 2: 모바일에서 모든 새 로그에 대한 토스트 알림 (GameToast.tsx)</name>
  <files>components/game/GameToast.tsx</files>
  <action>
GameToast.tsx에서 현재 토스트가 뜨지 않는 일반 액션 로그에도 토스트를 추가한다.

현재 상태:
- 도전 성공/실패, 블록, 카드 잃음, 승리에만 토스트가 뜬다.
- "X이(가) 소득을 가져갑니다", "X이(가) 외국 원조를 시도합니다" 등 일반 로그는 토스트가 없다.

변경:
1. useEffect 내 새 로그 분석 루프에서 기존 if-else 체인의 마지막에 else 블록을 추가한다.
2. else 블록에서: 해당 로그가 기존 카테고리(도전/블록/카드잃음/승리)에 해당하지 않는 일반 로그이면 `addToast(entry, 'action')` 호출.
3. 이미 TYPE_STYLES에 'action' 타입이 정의되어 있으므로 스타일 추가 불필요.

주의: 모든 로그에 토스트를 띄우면 과할 수 있으므로 다음 조건 추가:
- 토스트 최대 동시 표시 개수를 3개로 유지 (현재 slice(-2)를 slice(-3)으로 변경하거나 그대로 유지).
- 토스트 지속 시간을 일반 action 타입은 2초로 줄인다 (기존 2.5초 -> 2초). addToast에 duration 파라미터를 추가하거나, type이 'action'일 때 setTimeout을 2000/2500으로 조정.

실제 코드:
- addToast 함수에 optional duration 파라미터 추가: `const addToast = (message: string, type: ToastItem['type'], duration = 2500) => { ... }`
- setTimeout에서 duration 사용: fadeout은 `duration`, 제거는 `duration + 500`
- 일반 액션 토스트 호출: `addToast(entry, 'action', 2000)`
  </action>
  <verify>
- `npm run build` 성공
- 게임 플레이 중 "소득", "외국 원조" 등 일반 액션 시 토스트가 뜨는지 확인
- 도전/블록 등 기존 토스트도 정상 동작하는지 확인
- 토스트가 너무 많이 쌓이지 않고 자연스럽게 사라지는지 확인
  </verify>
  <done>모든 새 게임 로그에 대해 토스트 알림이 표시되며, 일반 액션은 2초, 중요 이벤트는 2.5초 후 사라짐</done>
</task>

</tasks>

<verification>
1. `npm run build` 성공
2. 모바일 뷰포트에서:
   - 최근 로그 3줄이 항상 보인다
   - 새 로그 추가 시 토스트가 뜬다
   - "전체 보기"로 전체 로그 오버레이를 열 수 있다
3. 데스크톱에서:
   - 좌측 사이드바 EventLog가 기존과 동일하게 표시된다
   - 컴팩트 로그 섹션이 보이지 않는다
</verification>

<success_criteria>
- 모바일에서 최근 게임 로그가 항상 보임
- 모바일에서 새 이벤트마다 토스트 알림 표시
- 데스크톱 레이아웃 변경 없음
- 빌드 성공
</success_criteria>

<output>
After completion, create `.planning/quick/005-eventlog-default-visible-mobile-notify/005-SUMMARY.md`
</output>
