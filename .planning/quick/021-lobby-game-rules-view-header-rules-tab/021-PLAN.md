---
phase: quick-021
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameRulesModal.tsx
  - components/game/WaitingRoom.tsx
  - components/game/GameBoard.tsx
autonomous: true
must_haves:
  truths:
    - "로비(WaitingRoom)에서 게임 룰 버튼을 눌러 전체 규칙을 볼 수 있다"
    - "게임 중 헤더에서 게임 룰 아이콘을 눌러 규칙을 볼 수 있다"
    - "게임 룰 모달에서 기본 규칙, 캐릭터별 능력, 액션 설명이 모두 표시된다"
  artifacts:
    - path: "components/game/GameRulesModal.tsx"
      provides: "게임 규칙 모달 컴포넌트"
    - path: "components/game/WaitingRoom.tsx"
      provides: "로비에 규칙 보기 버튼 추가"
    - path: "components/game/GameBoard.tsx"
      provides: "헤더에 규칙 보기 아이콘 추가"
  key_links:
    - from: "WaitingRoom.tsx"
      to: "GameRulesModal.tsx"
      via: "useState toggle + dynamic import"
    - from: "GameBoard.tsx"
      to: "GameRulesModal.tsx"
      via: "useState toggle + dynamic import"
---

<objective>
로비(WaitingRoom)와 게임 중(GameBoard 헤더) 모두에서 게임 규칙을 볼 수 있는 GameRulesModal 추가.

Purpose: 신규 플레이어가 게임 규칙을 쉽게 참고할 수 있게 하고, 게임 중에도 룰 확인 가능하게 함.
Output: GameRulesModal 컴포넌트 + WaitingRoom/GameBoard에서 열기 버튼.
</objective>

<context>
@components/game/WaitingRoom.tsx
@components/game/GameBoard.tsx
@components/game/EventLog.tsx
@components/game/CardInfoModal.tsx (캐릭터 정보 참고 - CHARACTER_INFO 데이터)
@lib/game/types.ts (Character, ActionType, CHARACTER_NAMES, ACTION_NAMES, BLOCK_CHARACTERS)
</context>

<tasks>

<task type="auto">
  <name>Task 1: GameRulesModal 컴포넌트 생성</name>
  <files>components/game/GameRulesModal.tsx</files>
  <action>
새 파일 `components/game/GameRulesModal.tsx` 생성. 풀스크린 모달 (기존 CardInfoModal과 유사한 스타일).

구조:
- Props: `{ onClose: () => void }`
- 배경: `fixed inset-0 bg-black/70 backdrop-blur-sm z-50` (CardInfoModal과 동일)
- 내부 패널: `glass-panel` 스타일, `max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl`
- 헤더: "게임 규칙" 제목 + X 닫기 버튼 (sticky top)
- lucide-react 아이콘: BookOpen (헤더), X (닫기)

내용 섹션 (모두 한국어):

1. **기본 규칙** 섹션
   - 각 플레이어는 카드 2장, 코인 2개로 시작
   - 마지막까지 살아남는 플레이어가 승리
   - 카드 2장 모두 공개되면 탈락
   - 10코인 이상이면 반드시 쿠데타를 해야 함
   - 블러프: 가지고 있지 않은 캐릭터의 능력을 사용 가능, 도전당하면 카드를 잃음

2. **일반 액션** 섹션 (누구나 사용 가능)
   - 소득: +1 코인 (막기/도전 불가)
   - 외국 원조: +2 코인 (공작이 막을 수 있음)
   - 쿠데타: 7코인 지불, 대상 카드 1장 제거 (막기/도전 불가)

3. **캐릭터 능력** 섹션 (카드별 능력)
   - 공작(Duke): 세금징수 +3코인, 외국 원조 차단
   - 암살자(Assassin): 3코인으로 암살
   - 사령관(Captain): 갈취 (상대 코인 2개), 갈취 차단
   - 대사(Ambassador): 교환 (덱에서 카드 교체), 갈취 차단
   - 백작부인(Contessa): 암살 차단
   각 캐릭터는 CardInfoModal의 CHAR_COLOR 색상 스타일 재사용 (violet, red, blue, slate, emerald)

4. **도전 & 블록** 섹션
   - 도전: 상대가 블러프인지 확인. 블러프면 상대 카드 잃음, 진짜면 도전자 카드 잃음
   - 블록: 해당 캐릭터를 가졌다고 주장하여 액션 차단. 블록에도 도전 가능

스타일: 각 섹션은 `bg-bg-surface/50 rounded-lg p-3 space-y-2` 카드 형태.
텍스트: `text-xs` 또는 `text-sm`, `text-text-secondary` 기본, 강조는 `text-text-primary` 또는 `text-gold`.
섹션 제목: `text-sm font-bold text-text-primary`.
  </action>
  <verify>TypeScript 컴파일 에러 없음: `npx tsc --noEmit --pretty 2>&1 | head -30`</verify>
  <done>GameRulesModal.tsx가 존재하고 4개 섹션(기본 규칙, 일반 액션, 캐릭터 능력, 도전&블록)이 모두 포함됨</done>
</task>

<task type="auto">
  <name>Task 2: WaitingRoom에 규칙 보기 버튼 추가</name>
  <files>components/game/WaitingRoom.tsx</files>
  <action>
WaitingRoom.tsx 수정:

1. `useState`에 `showRules` 상태 추가
2. `dynamic(() => import('./GameRulesModal'), { ssr: false })` 로 lazy import
3. 게임 시작/준비 버튼 아래에 "게임 규칙" 버튼 추가:
   - 위치: 시작/준비 버튼 바로 아래, `mt-3`
   - 스타일: `btn-ghost w-full py-2.5 flex items-center justify-center gap-2 text-sm border border-border-subtle`
   - 아이콘: `BookOpen` (lucide-react), size={16}
   - 텍스트: "게임 규칙"
   - onClick: `() => setShowRules(true)`
4. `{showRules && <GameRulesModal onClose={() => setShowRules(false)} />}` 렌더

import 추가: `BookOpen` from lucide-react, `dynamic` from next/dynamic.
  </action>
  <verify>`npx tsc --noEmit --pretty 2>&1 | head -30` 에러 없음</verify>
  <done>WaitingRoom에서 "게임 규칙" 버튼 클릭 시 GameRulesModal이 열림</done>
</task>

<task type="auto">
  <name>Task 3: GameBoard 헤더에 규칙 아이콘 추가</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
GameBoard.tsx 수정:

1. `showRules` useState 추가
2. dynamic import 추가: `const GameRulesModal = dynamic(() => import('./GameRulesModal'), { ssr: false });`
3. 헤더 우측 아이콘 영역 (`{/* 우: BGM + 로그 토글(모바일) + 설정 아이콘 */}` 부분):
   - BgmPlayer 다음, 모바일 로그 토글 버튼 앞에 규칙 버튼 추가
   - 스타일: 기존 설정 버튼과 동일한 패턴 (`p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors`)
   - 아이콘: `BookOpen` (lucide-react), `className="w-5 h-5"`
   - aria-label: "게임 규칙"
   - onClick: `() => setShowRules(true)`
4. 모달 렌더 위치: 설정 모달 바로 아래 (파일 끝부분, 다른 모달들 근처)
   `{showRules && <GameRulesModal onClose={() => setShowRules(false)} />}`

import 추가: `BookOpen` from lucide-react (기존 lucide import 라인에 추가).
  </action>
  <verify>`npx tsc --noEmit --pretty 2>&1 | head -30` 에러 없음. `npm run build 2>&1 | tail -5` 빌드 성공.</verify>
  <done>게임 중 헤더에서 BookOpen 아이콘 클릭 시 GameRulesModal이 열리고, 기존 기능(로그, 설정, BGM)에 영향 없음</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. 로비 화면: 게임 규칙 버튼 표시, 클릭 시 모달 오픈, 4개 섹션 표시, X로 닫기
4. 게임 화면: 헤더에 BookOpen 아이콘 표시, 클릭 시 모달 오픈, 닫기 후 게임 정상 진행
</verification>

<success_criteria>
- GameRulesModal 컴포넌트가 4개 규칙 섹션을 포함하고 정상 렌더됨
- WaitingRoom에서 "게임 규칙" 버튼으로 모달 열기/닫기 동작
- GameBoard 헤더에서 BookOpen 아이콘으로 모달 열기/닫기 동작
- 빌드 성공, 타입 에러 없음
</success_criteria>
