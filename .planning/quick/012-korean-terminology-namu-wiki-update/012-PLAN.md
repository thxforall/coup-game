---
phase: quick-012
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - components/game/ActionPanel.tsx
  - components/game/ResponseModal.tsx
  - components/game/CardInfoModal.tsx
  - components/game/GameBoard.tsx
  - components/game/WaitingRoom.tsx
  - lib/game/engine.ts
  - lib/game/scenarios.test.ts
  - lib/game/full-game-scenario.test.ts
  - app/page.tsx
  - README.md
autonomous: true

must_haves:
  truths:
    - "게임 UI에서 '외국 원조'로 표시됨 (기존 '외국 원조' 이미 맞음, ActionPanel label 유지)"
    - "게임 UI에서 '쿠데타'로 표시됨 (기존 '쿠' 버튼 레이블 → '쿠데타')"
    - "게임 UI에서 '세금징수'로 표시됨 (기존 '세금' → '세금징수')"
    - "게임 UI에서 '갈취'로 표시됨 (기존 '강탈' → '갈취')"
    - "ACTION_NAMES 상수가 나무위키 용어와 일치함"
    - "엔진 로그 메시지가 나무위키 용어를 사용함"
    - "README 캐릭터 테이블이 나무위키 용어를 사용함"
  artifacts:
    - path: "lib/game/types.ts"
      provides: "ACTION_NAMES 상수 업데이트"
      contains: "쿠데타\|세금징수\|갈취"
    - path: "components/game/ActionPanel.tsx"
      provides: "액션 버튼 레이블 업데이트"
      contains: "쿠데타\|세금징수\|갈취"
    - path: "lib/game/engine.ts"
      provides: "엔진 로그 메시지 업데이트"
      contains: "쿠데타\|갈취"
  key_links:
    - from: "lib/game/types.ts ACTION_NAMES"
      to: "components consuming ACTION_NAMES"
      via: "export const ACTION_NAMES"
      pattern: "ACTION_NAMES"
---

<objective>
나무위키 쿠(보드게임) 페이지 기준으로 한국어 게임 용어를 전체 코드베이스에서 통일한다.

Purpose: 한국 보드게임 커뮤니티 표준 용어를 사용하여 신규 플레이어의 게임 이해도를 높인다.
Output: 모든 UI 텍스트, 엔진 로그, 테스트 설명, README가 나무위키 표준 용어를 사용한다.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/Users/kiyeol/development/coup/lib/game/types.ts
@/Users/kiyeol/development/coup/components/game/ActionPanel.tsx
@/Users/kiyeol/development/coup/components/game/ResponseModal.tsx
@/Users/kiyeol/development/coup/components/game/CardInfoModal.tsx
@/Users/kiyeol/development/coup/components/game/GameBoard.tsx
@/Users/kiyeol/development/coup/components/game/WaitingRoom.tsx
@/Users/kiyeol/development/coup/lib/game/engine.ts
@/Users/kiyeol/development/coup/lib/game/scenarios.test.ts
@/Users/kiyeol/development/coup/lib/game/full-game-scenario.test.ts
@/Users/kiyeol/development/coup/app/page.tsx
@/Users/kiyeol/development/coup/README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 핵심 타입 및 컴포넌트 용어 통일</name>
  <files>
    lib/game/types.ts
    components/game/ActionPanel.tsx
    components/game/ResponseModal.tsx
    components/game/CardInfoModal.tsx
    components/game/WaitingRoom.tsx
    app/page.tsx
  </files>
  <action>
    다음 4가지 변경을 각 파일에 적용한다. 코드 식별자(ActionType 값, 변수명 등)는 변경하지 않고 한국어 표시 텍스트만 변경한다.

    **변경 규칙:**
    - 강탈 → 갈취 (steal 액션의 한국어 이름)
    - 세금 → 세금징수 (tax 액션의 한국어 이름, '세금징수'로 표시)
    - 쿠 → 쿠데타 (coup 액션의 한국어 이름)
    - 외국 원조는 이미 맞으므로 유지

    **lib/game/types.ts:**
    - ACTION_NAMES 상수 (line ~141-148):
      - `coup: '쿠'` → `coup: '쿠데타'`
      - `tax: '세금'` → `tax: '세금징수'`
      - `steal: '강탈'` → `steal: '갈취'`
    - 주석 내 한국어 설명도 동일하게 수정:
      - line 12: `// 쿠: 코인 7개...` → `// 쿠데타: 코인 7개...`
      - line 13: `// 세금: 코인 +3...` → `// 세금징수: 코인 +3...`
      - line 15: `// 강탈: 상대 코인...` → `// 갈취: 상대 코인...`
      - line 51: `// 대상이 있는 액션 (쿠, 암살, 강탈)` → `// 대상이 있는 액션 (쿠데타, 암살, 갈취)`
      - line 58: `// guess 모드: 쿠 시 추측 캐릭터` → `// guess 모드: 쿠데타 시 추측 캐릭터`

    **components/game/ActionPanel.tsx:**
    - ACTION_BUTTONS 배열:
      - coup label: `'쿠'` → `'쿠데타'`
      - coup desc: `'코인 7개, 상대 카드 무조건 제거'` 유지 (이미 적절)
      - tax label: `'세금'` → `'세금징수'`
      - steal label: `'강탈'` → `'갈취'`
      - steal desc: `'상대 코인 2개 탈취 (사령관)'` → `'상대 코인 2개 갈취 (사령관)'`
    - 대상 선택 안내 텍스트 (line ~157): `대상 선택 (강탈·암살·쿠에 필요)` → `대상 선택 (갈취·암살·쿠데타에 필요)`
    - 쿠 추측 캐릭터 안내 (line ~189): `쿠 추측 캐릭터 선택` → `쿠데타 추측 캐릭터 선택`
    - 주석 (line ~214): `Row 1: 소득 / 외국 원조 / 쿠` → `Row 1: 소득 / 외국 원조 / 쿠데타`
    - 주석 (line ~268): `Row 2: 세금 / 암살 / 강탈 / 교환` → `Row 2: 세금징수 / 암살 / 갈취 / 교환`
    - mustCoup 안내 메시지: `반드시 쿠를 해야 합니다` → `반드시 쿠데타를 해야 합니다`

    **components/game/ResponseModal.tsx:**
    - `'강탈'` → `'갈취'` (모든 출현, 약 8곳)
    - `'외국 원조'` 텍스트는 그대로 유지

    **components/game/CardInfoModal.tsx:**
    - `action: '세금 💰'` → `action: '세금징수 💰'`
    - `action: '강탈 ⚔️'` → `action: '갈취 ⚔️'`
    - `blocks: '강탈 차단 🛡️'` → `blocks: '갈취 차단 🛡️'` (사령관, 대사 각각)
    - 관련 desc 텍스트에서 `강탈` → `갈취` 모두 변경

    **components/game/WaitingRoom.tsx:**
    - `Guess 모드 — 쿠 시 카드 추측` → `Guess 모드 — 쿠데타 시 카드 추측`

    **app/page.tsx:**
    - `쿠 시 카드 추측` → `쿠데타 시 카드 추측`
  </action>
  <verify>
    ```bash
    cd /Users/kiyeol/development/coup
    # 강탈이 남아있는지 확인 (없어야 함)
    grep -rn "강탈" components/ app/ lib/game/types.ts
    # 세금징수가 들어갔는지 확인
    grep -rn "세금징수" components/ app/ lib/game/types.ts
    # 쿠데타가 들어갔는지 확인
    grep -rn "쿠데타" components/ app/ lib/game/types.ts
    # 갈취가 들어갔는지 확인
    grep -rn "갈취" components/ app/ lib/game/types.ts
    ```
  </verify>
  <done>
    - ACTION_NAMES에 coup='쿠데타', tax='세금징수', steal='갈취'
    - ActionPanel 버튼 레이블이 나무위키 용어와 일치
    - ResponseModal, CardInfoModal에서 '강탈' 미사용
    - WaitingRoom, app/page.tsx에서 '쿠데타' 사용
  </done>
</task>

<task type="auto">
  <name>Task 2: 엔진 로그, 테스트 설명, README 용어 통일</name>
  <files>
    lib/game/engine.ts
    lib/game/scenarios.test.ts
    lib/game/full-game-scenario.test.ts
    README.md
  </files>
  <action>
    엔진 로그 메시지, 테스트 설명 문자열, README를 나무위키 용어로 통일한다. 테스트 로직(assertion, 실제 action type 값)은 건드리지 않고 설명/주석/로그 문자열만 변경한다.

    **lib/game/engine.ts:**
    - 주석 `// 쿠 10코인 강제 체크` → `// 쿠데타 10코인 강제 체크`
    - 에러 메시지 `'쿠: 대상이 필요합니다'` → `'쿠데타: 대상이 필요합니다'`
    - 에러 메시지 `'쿠: 코인 7개 필요'` → `'쿠데타: 코인 7개 필요'`
    - 로그 `에게 쿠! ${CHARACTER_NAMES[guessed]} 추측 성공!` → `에게 쿠데타! ${CHARACTER_NAMES[guessed]} 추측 성공!` (2곳)
    - 로그 `에게 쿠! ${CHARACTER_NAMES[guessed]} 추측 실패` → `에게 쿠데타! ${CHARACTER_NAMES[guessed]} 추측 실패`
    - 로그 `강탈했습니다` → `갈취했습니다`
    - 로그에 `외국 원조` 관련: 이미 '외국 원조'로 올바르게 되어 있으므로 유지
    - `세금을 걷었습니다` → `세금을 징수했습니다` (세금징수 용어 반영)

    **lib/game/scenarios.test.ts 및 full-game-scenario.test.ts:**
    - test/describe 문자열에서 `강탈` → `갈취`
    - test/describe 문자열에서 `쿠` → `쿠데타` (단, `쿠(Coup)`, `쿠(보드게임)` 등 게임 명칭은 유지)
    - test/describe 문자열에서 `세금` → `세금징수` (단 '세금 징수'처럼 이미 다른 표현이면 '세금징수'로 붙임)
    - 주석에서도 동일하게 적용
    - 실제 코드 로직 (`type: 'steal'`, `type: 'tax'` 등 ActionType 값)은 변경하지 않는다

    **README.md:**
    - 캐릭터 테이블:
      - `세금 +3` → `세금징수 +3`
      - `강탈` → `갈취` (사령관 능력, 차단 설명)
      - `외국 원조 차단` → `해외 원조 차단` (나무위키 기준 '해외 원조')
    - 나머지 내용은 변경하지 않음

    변경 후 TypeScript 타입체크 실행:
    ```bash
    cd /Users/kiyeol/development/coup && npx tsc --noEmit 2>&1 | head -30
    ```
  </action>
  <verify>
    ```bash
    cd /Users/kiyeol/development/coup
    # 엔진에 '강탈'이 남아있는지 확인
    grep -n "강탈\|세금을 걷\|\b쿠!\b" lib/game/engine.ts
    # README 확인
    grep -n "강탈\|세금 +3\|외국 원조 차단" README.md
    # 타입체크
    npx tsc --noEmit 2>&1 | head -20
    ```
  </verify>
  <done>
    - engine.ts 로그 메시지에 '갈취', '세금징수', '쿠데타' 사용
    - 테스트 설명 문자열이 나무위키 용어 반영
    - README 캐릭터 테이블이 갈취/세금징수/해외 원조 사용
    - `npx tsc --noEmit` 에러 없음
  </done>
</task>

</tasks>

<verification>
두 태스크 완료 후:

```bash
cd /Users/kiyeol/development/coup

# 1. 구버전 용어 잔존 여부 확인 (결과 없어야 정상)
echo "=== 강탈 잔존 확인 ==="
grep -rn "강탈" lib/game/types.ts components/ app/page.tsx lib/game/engine.ts README.md

echo "=== '쿠' 단독 사용 잔존 확인 (쿠데타/쿠(보드게임) 제외) ==="
grep -rn "label: '쿠'\|: '쿠'\b" components/ lib/

echo "=== 세금징수 적용 확인 ==="
grep -rn "세금징수" lib/game/types.ts components/ lib/game/engine.ts README.md

# 2. 타입체크
npx tsc --noEmit 2>&1 | head -30

# 3. 테스트 실행
npm test 2>&1 | tail -20
```
</verification>

<success_criteria>
- '강탈'이 모든 표시 텍스트에서 제거되고 '갈취'로 대체됨
- '쿠' 버튼/메시지가 '쿠데타'로 표시됨 (ActionType 코드 식별자 'coup'은 유지)
- '세금'이 '세금징수'로 표시됨 (ActionType 코드 식별자 'tax'는 유지)
- README가 나무위키 표준 용어 사용
- `npx tsc --noEmit` 통과
- `npm test` 통과
</success_criteria>

<output>
작업 완료 후 `.planning/quick/012-korean-terminology-namu-wiki-update/012-SUMMARY.md` 생성:
- 변경된 파일 목록
- 각 파일에서 변경된 항목 수
- 나무위키 용어 적용 완료 확인
</output>
```
