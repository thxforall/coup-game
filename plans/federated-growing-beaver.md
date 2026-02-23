# Coup 게임 엔진 버그 수정 + Server-Side State Filtering 구현 계획

## Context

현재 Coup 게임 엔진은 핵심 로직이 구현되어 있고 57개 테스트가 통과 중이지만, 3개의 P1 버그와 보안 문제(전체 GameState 클라이언트 노출)가 존재한다. 이 계획은 SUMMARY.md의 빌드 순서를 따라 버그 수정부터 server-side filtering까지 진행한다.

---

## Phase 1: P1 버그 수정 (engine.ts)

### Bug 1: Target-only blocking
**파일:** `lib/game/engine.ts` — `processResponse()` (line 248-271)
**문제:** steal/assassinate block 시 아무 플레이어나 block 가능. 공식 규칙은 target만 가능.
**수정:**
```typescript
// line 248 이후, blockCharacter 검증 후에 추가:
if ((pending.type === 'steal' || pending.type === 'assassinate') && responderId !== pending.targetId) {
  throw new Error('이 행동은 대상만 막을 수 있습니다');
}
```

### Bug 2: Assassination double-loss guard
**파일:** `lib/game/engine.ts` — `executeAction()` (line 478-487)
**문제:** blocker가 Contessa 블러프 실패로 탈락한 뒤에도 assassination이 진행됨.
**수정:** `executeAction`의 `assassinate` case에 target alive 체크 추가:
```typescript
case 'assassinate': {
  if (!targetId) throw new Error('assassinate: targetId required');
  const target = getPlayer(s, targetId);
  if (!target.isAlive) {
    // 이미 블록 도전 실패로 탈락한 경우
    return nextTurn(s);
  }
  // ... 기존 로직
}
```

### Bug 3: Exchange deck size guard
**파일:** `lib/game/engine.ts` — `executeAction()` (line 490-501)
**문제:** `deck.length < 2`일 때 `pop()`이 `undefined` 반환.
**수정:** 가용 카드 수만큼만 뽑기:
```typescript
case 'exchange': {
  const newDeck = [...s.deck];
  const drawCount = Math.min(2, newDeck.length);
  const drawnCards: Character[] = [];
  for (let i = 0; i < drawCount; i++) {
    drawnCards.push(newDeck.pop()!);
  }
  // exchangeCards에 drawnCards 저장, keptIndices 검증도 drawCount에 맞춤
}
```

### 테스트 추가 (engine.test.ts)
- target-only blocking: 제3자가 assassinate/steal block 시도 → Error throw 확인
- double-loss: 1카드 남은 target이 Contessa 블러프 실패 → 탈락 후 assassination 미실행
- deck guard: 덱 0~1장 상태에서 exchange → 에러 없이 처리
- 19개 시나리오 매트릭스 중 미커버 항목 추가

---

## Phase 2: FilteredGameState 타입 정의

**파일:** `lib/game/types.ts`
**추가 타입:**
```typescript
interface MaskedCard {
  revealed: boolean;
  character: Character | null;  // null when revealed === false
}

interface FilteredPlayer {
  id: string;
  name: string;
  coins: number;
  cards: Card[] | MaskedCard[];  // self: Card[], opponent: MaskedCard[]
  isAlive: boolean;
}

interface FilteredGameState {
  players: FilteredPlayer[];    // self는 full Card[], 상대는 MaskedCard[]
  currentTurnId: string;
  phase: GamePhase;
  pendingAction: FilteredPendingAction | null;
  log: string[];
  winnerId?: string;
  // deck 제외 — 클라이언트에 절대 노출 안함
}

interface FilteredPendingAction extends Omit<PendingAction, 'exchangeCards'> {
  exchangeCards?: Character[] | null;  // 본인 exchange일 때만 포함
}
```

---

## Phase 3: filter.ts 구현

**새 파일:** `lib/game/filter.ts`
- `filterStateForPlayer(state: GameState, playerId: string): FilteredGameState`
- 상대 카드: `revealed === false`이면 `character: null`
- deck: 제외
- exchangeCards: 본인 exchange일 때만 포함

**새 파일:** `lib/game/filter.test.ts`
- 본인 카드 완전 노출
- 상대 미공개 카드 character === null
- 상대 공개 카드 character 표시
- deck 미포함
- exchangeCards 본인만 접근

---

## Phase 4: API route + Firebase 업데이트

**파일:** `lib/firebase.ts`
- `updateRoomWithViews(roomId, state, views)` 추가 — multi-path PATCH로 state/ + views/{playerId} 동시 쓰기

**파일:** `app/api/game/action/route.ts`
- 모든 updateRoom 호출을 updateRoomWithViews로 교체
- processAction/processResponse/... 실행 후 filterStateForPlayer()로 N개 view 생성

**파일:** `app/api/game/start/route.ts`, `create/route.ts`, `join/route.ts`
- 동일하게 views 쓰기 추가

---

## Phase 5: Client subscription 변경

**파일:** `lib/firebase.client.ts`
- `subscribeToRoom(roomId, playerId, callback)` — `views/{playerId}` 경로 구독
- callback 타입: `FilteredGameState`

**파일:** `app/game/[roomId]/page.tsx`
- subscribeToRoom에 playerId 전달
- GameState → FilteredGameState 타입으로 전환
- 컴포넌트에 전달하는 state 타입 업데이트

**파일:** `components/game/GameBoard.tsx` 및 관련 컴포넌트
- FilteredGameState에 맞게 UI 로직 조정
- 상대 카드: `character === null`이면 '?' 표시 (이미 유사 로직 있을 수 있음)

---

## 빌드 순서 & 의존성

```
Phase 1: 버그 수정 (독립, 즉시 실행 가능)
    ↓
Phase 2: 타입 정의 (Phase 1과 병렬 가능)
    ↓
Phase 3: filter.ts (Phase 2 의존)
    ↓
Phase 4: API + Firebase (Phase 3 의존)
    ↓
Phase 5: Client (Phase 4 의존)
```

---

## 수정 대상 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `lib/game/engine.ts` | 수정 — 3개 버그 수정 |
| `lib/game/engine.test.ts` | 수정 — 버그 관련 테스트 추가 |
| `lib/game/types.ts` | 수정 — FilteredGameState 등 타입 추가 |
| `lib/game/filter.ts` | **신규** — filterStateForPlayer |
| `lib/game/filter.test.ts` | **신규** — filter 테스트 |
| `lib/firebase.ts` | 수정 — updateRoomWithViews 추가 |
| `lib/firebase.client.ts` | 수정 — playerId 기반 view 구독 |
| `app/api/game/action/route.ts` | 수정 — views 쓰기 추가 |
| `app/api/game/start/route.ts` | 수정 — views 쓰기 추가 |
| `app/api/game/create/route.ts` | 수정 — views 쓰기 추가 |
| `app/api/game/join/route.ts` | 수정 — views 쓰기 추가 |
| `app/game/[roomId]/page.tsx` | 수정 — FilteredGameState 사용 |
| `components/game/GameBoard.tsx` | 수정 — masked card 처리 |

---

## 검증 방법

1. **Phase 1 검증:** `npm test` — 기존 57개 + 신규 테스트 전부 통과
2. **Phase 3 검증:** `npm test` — filter.test.ts 통과
3. **Phase 4-5 검증:** `npm run dev`로 로컬 실행 → 2개 브라우저 탭에서 게임 플레이 → DevTools Network에서 views/{playerId} 응답 확인 → 상대 카드 character가 null인지 확인
4. **전체 빌드:** `npm run build` 성공 확인
