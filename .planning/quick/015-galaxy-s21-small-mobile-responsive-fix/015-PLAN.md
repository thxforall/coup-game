---
phase: quick-015
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
  - components/game/WaitingRoom.tsx
  - components/game/ExchangeModal.tsx
  - app/page.tsx
  - app/globals.css
autonomous: true

must_haves:
  truths:
    - "Galaxy S21 (360px) 에서 가로 스크롤 없이 전체 UI가 화면 안에 들어온다"
    - "360px에서 텍스트가 잘리지 않고 줄바꿈되거나 truncate 처리된다"
    - "360px에서 모달(ResponseModal, ExchangeModal, CardSelectModal)이 화면 밖으로 넘어가지 않는다"
    - "360px에서 상대 플레이어 카드 영역이 겹치지 않고 스크롤로 접근 가능하다"
    - "360px에서 액션 버튼이 터치 가능한 크기로 잘 보인다"
  artifacts:
    - path: "components/game/GameBoard.tsx"
      provides: "360px-safe layout with no overflow"
    - path: "components/game/PlayerArea.tsx"
      provides: "Compact player cards at 360px"
    - path: "components/game/ActionPanel.tsx"
      provides: "360px-friendly action button grid"
  key_links:
    - from: "app/globals.css"
      to: "all components"
      via: "CSS variables and base styles"
      pattern: "overflow|min-width|max-width"
---

<objective>
Galaxy S21 (360x800 CSS px) 등 소형 모바일에서 화면 잘림, 텍스트 오버플로우, 모달 넘침 문제를 수정한다.

Purpose: 360px 너비 디바이스에서 모든 UI가 가로 스크롤 없이 정상 표시되도록 보장
Output: 모든 주요 컴포넌트의 360px 대응 완료
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/game/GameBoard.tsx
@components/game/PlayerArea.tsx
@components/game/MyPlayerArea.tsx
@components/game/ActionPanel.tsx
@components/game/ResponseModal.tsx
@components/game/WaitingRoom.tsx
@components/game/ExchangeModal.tsx
@components/game/CardSelectModal.tsx
@app/page.tsx
@app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: 360px 레이아웃 오버플로우 수정 (GameBoard + PlayerArea + MyPlayerArea)</name>
  <files>
    components/game/GameBoard.tsx
    components/game/PlayerArea.tsx
    components/game/MyPlayerArea.tsx
    app/globals.css
  </files>
  <action>
Galaxy S21 (360px)에서 가로 넘침을 유발하는 모든 요소를 수정한다.

**GameBoard.tsx:**
- 헤더(line 356): `px-4` -> `px-2 sm:px-4`. 로고 "COUP" 텍스트 `text-lg` -> `text-base sm:text-lg`
- 상대방 플레이어 행(line 400): `px-2 sm:px-4` 유지하되, gap을 `gap-1 sm:gap-1.5` 로 줄여 360px에서 더 빽빽하게
- 모바일 컴팩트 로그(line 412): `px-3` -> `px-2 sm:px-3`
- 턴 영역(line 454): `p-3 sm:p-4` -> `p-2 sm:p-4`
- 내 플레이어 영역 wrapper(line 504): `p-2 sm:p-4` 유지 (이미 적절)
- 헤더 우측 아이콘들(line 377): `gap-0.5` 유지

**PlayerArea.tsx:**
- 컨테이너(line 179): `w-[96px]` -> `w-[84px] sm:w-auto`. 96px * 5명 = 480px > 360px이므로 축소 필요
- `p-1.5 sm:p-3` -> `p-1 sm:p-3` (패딩 1px 줄이기)
- PlayerBadge 이름(line 76): 이미 `truncate`이므로 OK
- FaceDownCard(line 109): `w-10` (40px) 유지 — 84px 카드 안에 2개 들어감
- RevealedCard(line 138): `w-10` (40px) 유지
- CoinBadge(line 93): `px-2` -> `px-1.5` 로 소폭 축소

**MyPlayerArea.tsx:**
- 헤더 행(line 167): `flex-wrap gap-1` 이미 있으나, "내 영향력" 라벨(line 171-175)이 360px에서 공간 차지. `hidden xs:inline` 또는 `hidden sm:inline` 처리. xs가 없으므로 미디어쿼리 없이 작은 화면에서는 숨기기: `<span className="font-mono text-xs uppercase tracking-widest hidden sm:inline" ...>내 영향력</span>`
- CharacterCard(line 94): `w-[68px] h-[97px] sm:w-[120px] sm:h-[170px]` -> `w-[60px] h-[86px] sm:w-[120px] sm:h-[170px]` (360px에서 2장 카드 + 패딩이 들어가도록)

**globals.css:**
- `html, body`에 `overflow-x: hidden` 추가하여 혹시 모를 가로 스크롤 차단 (안전장치)
- `@layer base` 안에 추가: `html { overflow-x: hidden; }`
  </action>
  <verify>
`npx next build` 성공 확인. 브라우저 DevTools에서 Galaxy S21 (360x800) 뷰포트로 전환하여 가로 스크롤바가 없고, 상대 플레이어 영역이 가로 스크롤로 접근 가능한지 확인.
  </verify>
  <done>
360px 뷰포트에서 GameBoard, PlayerArea, MyPlayerArea의 가로 넘침이 해결되고 모든 UI 요소가 화면 안에 표시된다.
  </done>
</task>

<task type="auto">
  <name>Task 2: 360px 액션패널 + 모달 + 로비 반응형 수정</name>
  <files>
    components/game/ActionPanel.tsx
    components/game/ResponseModal.tsx
    components/game/WaitingRoom.tsx
    components/game/ExchangeModal.tsx
    app/page.tsx
  </files>
  <action>
360px에서 액션 버튼, 모달, 로비 페이지의 오버플로우와 터치 문제를 수정한다.

**ActionPanel.tsx:**
- Row 1 그리드(line 214): `grid-cols-2 sm:grid-cols-3` 유지 — 360px에서 2열이면 약 170px씩으로 적절
- 버튼 설명 텍스트(line 254-256): `text-[10px]` 유지하되, 줄 수 제한: `line-clamp-2` 추가 (이미 row2에는 있으나 row1에는 없음)
- 대상 선택 버튼(line 164): `px-3 py-1.5` -> `px-2.5 py-1` 로 소폭 축소하여 360px에서 여러 명이 한 줄에 더 들어가도록

**ResponseModal.tsx:**
- 모달 컨테이너(line 175): `max-w-[480px]` -> `max-w-[480px]` 유지 (w-full이므로 360px에서 자동으로 360px - 32px = 328px)
- 상단 px-6(line 193, 240, 277, 341): `px-6` -> `px-4 sm:px-6` 로 축소. 360px에서 양쪽 24px*2 = 48px가 과다
- 도전 버튼 텍스트(line 355-357): `text-sm` 유지하되, 긴 한국어 텍스트가 2줄로 넘어갈 수 있음. `text-xs sm:text-sm` 으로 변경
- 블록 버튼 텍스트(line 366, 395): 마찬가지로 `text-xs sm:text-sm`
- 패스 버튼(line 405): 동일하게 `text-xs sm:text-sm`
- 내 카드 상태 영역(line 240-274): `px-6 pb-3` -> `px-4 sm:px-6 pb-3`. 카드 미니 이미지 + 텍스트가 2장일 때 넘칠 수 있으므로 `flex-wrap` 추가 (line 241): `gap-3` -> `gap-2 sm:gap-3`, `flex-wrap` 추가

**WaitingRoom.tsx:**
- glass-panel(line 47): `p-8` -> `p-5 sm:p-8`. 360px에서 양쪽 패딩 32px*2 = 64px가 과다
- 방 코드 텍스트(line 58): `text-5xl` -> `text-4xl sm:text-5xl` (5글자 코드가 360px에서 넘칠 수 있음)
- COUP 제목(line 51): `text-4xl` -> `text-3xl sm:text-4xl`
- 플레이어 리스트 항목(line 95): `gap-3` -> `gap-2 sm:gap-3`

**ExchangeModal.tsx:**
- 카드 크기(line 66): `width: '80px', height: '110px'` -> 인라인 스타일 대신 클래스로 `w-[70px] h-[98px] sm:w-[80px] sm:h-[110px]` 적용. 4장 카드(2 기존 + 2 새카드)일 때 80*4 + gap = 332px이므로 360px에서 빡빡. 70*4 + gap = 292px로 여유 확보
- flex-wrap(line 57): `gap-3` -> `gap-2 sm:gap-3` (이미 flex-wrap 있음)

**app/page.tsx (로비):**
- 로고 COUP(line 109): `text-5xl` -> `text-4xl sm:text-5xl`
- glass-panel(line 114): `p-8` -> `p-5 sm:p-8`
- 캐릭터 소개 아이콘(line 216): `gap-3 sm:gap-4` 유지 — flex-wrap 있으므로 OK
  </action>
  <verify>
`npx next build` 성공 확인. 브라우저 DevTools에서 360x800 뷰포트로:
1. 로비 페이지: 방 만들기/참가 탭이 정상 표시되고, 방 코드 입력란이 잘리지 않는지 확인
2. 대기실: 방 코드가 화면 안에 들어오는지 확인
3. 게임 중: 액션 버튼이 2열로 정상 표시되는지, 모달이 넘치지 않는지 확인
  </verify>
  <done>
360px 뷰포트에서 ActionPanel 버튼, ResponseModal, WaitingRoom, ExchangeModal, 로비 페이지가 가로 넘침 없이 정상 표시되고, 텍스트가 적절히 줄바꿈되며, 터치 가능한 크기를 유지한다.
  </done>
</task>

</tasks>

<verification>
1. `npx next build` 빌드 성공
2. Chrome DevTools > Device Toolbar > Galaxy S21/S20 (360x800) 에뮬레이션:
   - 로비 페이지: 가로 스크롤 없음, 모든 요소 화면 내
   - 대기실: 방 코드, 플레이어 목록, 시작 버튼 정상
   - 게임보드: 상대 플레이어 행 가로 스크롤, 내 카드 영역, 액션 패널 정상
   - 모달: ResponseModal, CardSelectModal, ExchangeModal 화면 내 표시
3. 기존 sm(640px+) 이상 레이아웃에 영향 없음 확인
</verification>

<success_criteria>
- Galaxy S21 (360px 너비)에서 수평 스크롤바가 나타나지 않음 (상대 플레이어 행 제외 - 의도적 가로 스크롤)
- 모든 텍스트가 잘리거나 겹치지 않음
- 모든 모달이 화면 안에 표시됨
- 640px+ 화면에서 기존 레이아웃 유지
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/015-galaxy-s21-small-mobile-responsive-fix/015-SUMMARY.md`
</output>
