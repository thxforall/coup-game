# Design Update Plan: .pen 디자인 스펙 기반 UI 리뉴얼

## Context

현재 Coup 게임 UI는 모바일 전용 레이아웃으로 구현되어 있고, 이모지 기반 아이콘과 이미지 기반 카드를 혼용하고 있다. `.pen` 디자인 파일에 데스크톱(1440x900) 레이아웃과 새로운 디자인 시스템(Lucide 아이콘, Sora/Space Mono 폰트, 새로운 컬러 토큰, 아이콘 기반 카드 컴포넌트)이 정의되어 있으므로, 이에 맞춰 UI를 업데이트한다.

## 주요 변경사항 요약

| 영역 | 현재 | 변경 후 (.pen 기준) |
|------|------|---------------------|
| 레이아웃 | 모바일 단일 컬럼 | 데스크톱 3영역 (Header + OpponentsRow + CenterArea + MyPlayerArea) |
| 폰트 | Noto Sans KR | Sora (제목/UI) + Space Mono (레이블/수치) |
| 아이콘 | 이모지 | Lucide React 아이콘 |
| 컬러 | slate/violet Tailwind | 커스텀 다크 테마 (#0D0D0D, #1A1A1A, #C8A960 등) |
| 카드 (공통) | 내 카드=이미지, 상대=이모지 | **모두 이미지 통일** (jpg 에셋 활용) |
| 상대 뒷면 | 이모지 🂠 | FaceDownCard 컴포넌트 (그라디언트 + shield 아이콘) |
| 액션 버튼 | 이모지 + 그리드 | Lucide 아이콘 + 캐릭터 색상 테두리 버튼 |
| 코인 표시 | amber 원형 배열 | CoinBadge (pill 형태, #F1C40F) |
| 플레이어 표시 | 텍스트 | PlayerBadge (아바타 원형 + 이름) |

---

## Step 1: 의존성 추가 및 폰트 설정

**파일:** `package.json`, `app/layout.tsx`, `app/globals.css`

- `lucide-react` 패키지 설치
- Google Fonts에서 Sora, Space Mono 추가 (next/font/google 사용)
- globals.css에 새 CSS 변수 추가:
  ```css
  :root {
    --bg-dark: #0D0D0D;
    --bg-card: #1A1A1A;
    --bg-surface: #252525;
    --border-subtle: #333333;
    --text-primary: #F0F0F0;
    --text-secondary: #999999;
    --text-muted: #666666;
    --gold: #C8A960;
    --gold-dark: #8B7340;
    --gold-light: #E8D5A0;
    --coin-color: #F1C40F;
    --red: #C0392B;
    --red-light: #E74C3C;
    --duke-color: #8E44AD;
    --assassin-color: #2C3E50;
    --captain-color: #2980B9;
    --ambassador-color: #27AE60;
    --contessa-color: #C0392B;
  }
  ```

## Step 2: Tailwind 컬러 설정 업데이트

**파일:** `tailwind.config.ts`

- 커스텀 컬러를 CSS 변수 기반으로 확장
- 캐릭터 색상을 .pen 값으로 업데이트 (duke: #8E44AD, captain: #2980B9 등)

## Step 3: GameBoard.tsx - 데스크톱 레이아웃 구조 변경

**파일:** `components/game/GameBoard.tsx`

현재 단일 컬럼 → .pen 기준 레이아웃:
```
┌─────────────────────────────────┐
│           Header (56px)          │
├─────────────────────────────────┤
│      OpponentsRow (상단 가로)     │
├──────────┬──────────────────────┤
│ GameLog  │    TurnArea          │
│ (320px)  │  (YOUR TURN +        │
│          │   ActionGrid)        │
├──────────┴──────────────────────┤
│       MyPlayerArea (하단)        │
└─────────────────────────────────┘
```

- Header: 로고(Skull+COUP) | 중앙 정보(턴/덱/재물) | 설정 아이콘
- OpponentsRow: 상대 플레이어 카드들을 가로 배치
- CenterArea: GameLog(좌 320px) + TurnArea(우 flex-1)
- MyPlayerArea: 내 정보 + 내 카드 (가로 배치)

## Step 4: PlayerArea.tsx - 상대 플레이어 컴포넌트 리디자인

**파일:** `components/game/PlayerArea.tsx`

- 이모지 → Lucide 아이콘으로 교체
- PlayerBadge: 원형 아바타(이니셜) + 이름
- CoinBadge: pill 형태 (#F1C40F 테두리)
- **뒷면 카드**: FaceDownCard - 그라디언트(#1A1A1A→#2A2A2A) + Shield 아이콘 + "COUP" 텍스트
- **공개된 카드**: 이미지(`/cards/*.jpg`) 사용 + opacity 40% + grayscale + "Eliminated" 텍스트
- 카드 크기: 80×112px

## Step 5: MyPlayerArea.tsx - 내 카드 영역 리디자인

**파일:** `components/game/MyPlayerArea.tsx`

- **카드는 이미지(`/cards/*.jpg`) 그대로 유지**
- 카드 크기: 120×170px, rounded-lg, 캐릭터 색상 border
- 카드 하단 오버레이: 캐릭터명 (Sora font)
- 골드 테두리 PlayerBadge + CoinBadge
- "Your Influence" 레이블 (Space Mono)
- 코인 표시를 amber 원형 배열 → CoinBadge pill 형태로 변경

## Step 6: ActionPanel.tsx - 액션 버튼 리디자인

**파일:** `components/game/ActionPanel.tsx`

- 이모지 → Lucide 아이콘
- ActionButton: bg-surface + border-subtle (일반 액션)
- 캐릭터 전용 액션: 캐릭터 색상 배경(20% opacity) + 색상 테두리
  - Tax: duke-color (crown 아이콘)
  - Assassinate: assassin-color (crosshair 아이콘)
  - Steal: captain-color (anchor 아이콘)
  - Exchange: ambassador-color (repeat 아이콘)
- GoldButton: Coup 전용 ($gold 배경, zap 아이콘)
- 2열 배치: Row1(Income, Foreign Aid, Coup) + Row2(Tax, Assassinate, Steal, Exchange)

## Step 7: ResponseModal.tsx - 챌린지/블록 모달 리디자인

**파일:** `components/game/ResponseModal.tsx`

- .pen의 Challenge/Block Modal 디자인 적용
- 모달 패널: bg-card, radius-lg, 480px width
- 상단: 경고 아이콘(원형) + 타이틀 + 서브타이틀
- 타이머: 아이콘 + 텍스트 + 프로그래스 바 ($gold)
- Challenge 버튼: red-light 테두리 + 배경
- Allow 버튼: bg-surface + border-subtle
- Lucide 아이콘: triangle-alert, x, check, timer

## Step 8: EventLog.tsx - 게임 로그 리디자인

**파일:** `components/game/EventLog.tsx`

- 좌측 사이드바 형태 (320px width, fill height)
- 헤더: scroll-text 아이콘 + "Game Log" 레이블 (Sora)
- 로그 항목: Space Mono 10px, 컬러 코딩
- 이모지 → Lucide 아이콘 (또는 텍스트만)

## Step 9: WaitingRoom.tsx - 로비 화면 리디자인

**파일:** `components/game/WaitingRoom.tsx` 및 `app/page.tsx`

- .pen의 Lobby Screen 디자인 적용
- LobbyCard: 520px, bg-card, radius-lg
- 로고: Skull 아이콘 + "COUP" (Sora 40px, gold)
- 태그라인: "Bluff. Deceive. Survive." (Space Mono)
- 이름 입력: bg-surface + border-subtle
- 플레이어 수 선택: 가로 버튼 (2~6)
- 시작 버튼: gold 배경 + Play 아이콘
- 하단: THE COURT 캐릭터 미리보기 (5개 원형 아이콘)

## Step 10: CardSelectModal, ExchangeModal 업데이트

**파일:** `components/game/CardSelectModal.tsx`, `components/game/ExchangeModal.tsx`

- **카드 이미지는 유지**, 스타일링만 .pen 디자인 토큰으로 업데이트
- 모달 배경/테두리/폰트를 새 디자인 시스템에 맞춤

---

## 캐릭터-아이콘 매핑 (Lucide)

| 캐릭터 | Lucide 아이콘 | 색상 |
|--------|-------------|------|
| Duke | Crown | #8E44AD |
| Assassin | Crosshair | #2C3E50 |
| Captain | Anchor | #2980B9 |
| Ambassador | Repeat | #27AE60 |
| Contessa | Shield | #C0392B |

---

## 검증 방법

1. `yarn dev`로 로컬 서버 실행 후 데스크톱 브라우저에서 확인
2. 로비 화면 → 게임 화면 전체 플로우 테스트
3. 모바일 뷰포트에서도 레이아웃 깨지지 않는지 확인
4. `yarn build`로 빌드 성공 확인
5. 타입 에러 없는지 확인
