# Quick-057: 종교개혁(Reformation) 확장판 지원

## 목표
쿠 보드게임 확장판 "종교개혁" 룰을 추가하여 방 설정에서 확장판 옵션을 선택할 수 있게 한다.

## 종교개혁 확장판 룰 요약

### 1. 진영(Allegiance) 시스템
- 플레이어가 **충성파(Loyalist)** 또는 **개혁파(Reformist)** 진영으로 나뉨
- 시작 시 첫 번째 플레이어가 진영 선택, 이후 시계방향으로 교대 배정
- **같은 진영 플레이어에게는 쿠데타/암살/갈취/해외원조 차단 불가** (모두 같은 진영이면 제한 해제)

### 2. 재무부(Treasury Reserve)
- 중앙에 재무부 카드 배치, 전향 시 코인이 재무부에 쌓임
- 재무부 코인은 횡령(Embezzlement)으로 가져올 수 있음

### 3. 새로운 액션
- **전향(Conversion)**: 자기 진영 변경 1코인 / 타인 진영 변경 2코인 (재무부에 납부)
- **횡령(Embezzlement)**: 재무부 코인 전부 가져옴 (공작 능력, 도전 가능)

### 4. 인퀴지터(Inquisitor) — 대사 대체 옵션
- **교환**: 덱에서 카드 1장 뽑아 선택적 교환 (대사와 다르게 1장만)
- **심문(Examine)**: 상대 비공개 카드 1장 확인 → 돌려주거나 덱 교체 강제
- **대응**: 갈취 차단 (대사와 동일)

### 5. 대규모 인원 지원 (7-10인)
- 7-8인: 캐릭터당 4장 (20장 덱)
- 9-10인: 캐릭터당 5장 (25장 덱)

---

## 구현 계획 — Quick Task 분할

### Wave 1: 타입 시스템 + 엔진 기반 (Quick-057)

**파일 수정:**
- `lib/game/types.ts` — 타입 확장
- `lib/game/engine.ts` — 게임 엔진 확장
- `lib/game/filter.ts` — 상태 필터링 확장

**타입 변경:**
```typescript
// GameMode 확장
type GameMode = 'standard' | 'guess' | 'reformation';

// 새 캐릭터 추가
type Character = 'Duke' | 'Contessa' | 'Captain' | 'Assassin' | 'Ambassador' | 'Inquisitor';

// 진영 타입
type Allegiance = 'loyalist' | 'reformist';

// 새 액션 추가
type ActionType = ... | 'conversion' | 'embezzlement' | 'examine';

// Player 확장
interface Player {
  ...existing
  allegiance?: Allegiance; // reformation 모드에서만 사용
}

// GameState 확장
interface GameState {
  ...existing
  treasury?: number; // 재무부 코인
  useInquisitor?: boolean; // 인퀴지터 사용 여부 (방 옵션)
}

// 새 게임 phase
type GamePhase = ... | 'examine_select'; // 인퀴지터 심문 카드 확인/교체 선택
```

**엔진 변경:**
1. `initGame()` — reformation 모드일 때:
   - 진영 교대 배정
   - treasury 0으로 초기화
   - useInquisitor 시 Ambassador → Inquisitor 덱 교체
   - 7+ 인원 시 덱 크기 조정

2. `processAction()` — 새 액션 추가:
   - `conversion`: 진영 변경 (코인 → 재무부)
   - `embezzlement`: 재무부 코인 가져오기 (도전 가능, Duke 능력)
   - `exchange` (인퀴지터): 1장만 뽑기
   - `examine`: 상대 카드 확인 (새 phase 필요)

3. 대상 지정 제한 검증:
   - 같은 진영 공격 차단 (모두 동일 진영이면 허용)

4. `resolveChallenge()` — 인퀴지터 케이스 추가

5. 새 함수: `processExamineSelect()` — 심문 결과 처리

### Wave 2: 방 설정 UI + 로비 (Quick-058)

**파일 수정:**
- `app/page.tsx` — 로비 게임 모드 선택에 종교개혁 추가
- `app/api/game/create/route.ts` — reformation 모드 + useInquisitor 옵션 전달
- `components/game/WaitingRoom.tsx` — 확장판 배지 + 옵션 표시

**구현:**
1. 로비 방 만들기에 "Reformation" 모드 버튼 추가
2. Reformation 선택 시 서브옵션:
   - 인퀴지터 사용 여부 토글 (기본: 사용)
3. WaitingRoom에 확장판 정보 배지 표시
4. 방 목록에 Reformation 모드 표시

### Wave 3: 게임 보드 UI (Quick-059)

**파일 수정:**
- `components/game/ActionPanel.tsx` — 전향/횡령 버튼 추가
- `components/game/GameBoard.tsx` — 재무부 표시 + 진영 표시
- `components/game/PlayerArea.tsx` / 관련 — 진영 색상/뱃지
- `components/game/TargetSelectModal.tsx` — 같은 진영 공격 제한 표시
- `components/game/ExchangeModal.tsx` — 인퀴지터 1장 교환 대응
- 새 컴포넌트: `ExamineModal.tsx` — 심문 UI

**구현:**
1. ActionPanel에 reformation 전용 액션 버튼
2. 재무부 코인 표시 UI (게임 보드 상단)
3. 플레이어 진영 표시 (색상 테두리 or 아이콘)
4. 전향 대상 선택 모달
5. 심문 결과 확인/교체 선택 모달
6. 같은 진영 대상 비활성화 처리

### Wave 4: 게임 규칙 + 로그 (Quick-060)

**파일 수정:**
- `components/game/GameRulesModal.tsx` — 종교개혁 룰 탭 추가
- `app/page.tsx` — 로비 규칙 섹션 확장판 추가
- 로그 메시지 한국어 추가

---

## 의존성 관계

```
Wave 1 (타입+엔진) → Wave 2 (방 설정) → Wave 3 (게임 UI) → Wave 4 (규칙/로그)
```

Wave 1이 완료되어야 나머지 진행 가능.

## 핵심 설계 결정

1. **GameMode 확장 vs 별도 옵션**: `gameMode: 'reformation'`으로 통합 (기존 standard/guess 패턴 유지)
2. **인퀴지터는 서브옵션**: `useInquisitor: boolean` — reformation 모드에서만 활성화
3. **진영은 Player 필드**: `allegiance?: Allegiance` — standard 모드에서는 undefined
4. **재무부는 GameState 필드**: `treasury?: number` — standard 모드에서는 undefined
5. **기존 코드 영향 최소화**: 모든 확장 필드는 optional, standard 모드는 변경 없음

## 검증 기준

- [ ] standard/guess 모드 기존 동작 변경 없음 (regression 없음)
- [ ] reformation 모드 진영 배정 정상 작동
- [ ] 같은 진영 공격 제한 정상 작동
- [ ] 전향 액션 코인 → 재무부 이동 정상
- [ ] 횡령 도전 가능 + 공작 능력 확인
- [ ] 인퀴지터 교환(1장) + 심문 정상 작동
- [ ] 7-10인 덱 크기 자동 조정
- [ ] 모든 UI에서 진영 정보 표시
- [ ] 게임 로그에 확장판 액션 한국어 메시지 정상 출력
