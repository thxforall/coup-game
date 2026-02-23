# BoardGamesDen 분석 기반 Coup 개선 계획

## Context
BoardGamesDen.com의 Coup 구현을 분석한 결과, 우리 게임 엔진(7개 액션, 챌린지/블록, 필터링)은 완벽하지만 UX 레이어에서 5가지 부족한 점을 발견. Firebase onValue 리스너로 이미 실시간 푸시가 동작하므로 WebSocket 마이그레이션은 불필요.

---

## Phase 1: 재접속 (Reconnection)

**목표**: 브라우저 새로고침/재방문 시 자동으로 게임방 복귀

### 변경 파일
| 파일 | 변경 |
|------|------|
| `lib/storage.ts` | `getActiveRoom()`, `setActiveRoom(roomId)`, `clearActiveRoom()` 추가 |
| `app/api/game/check/route.ts` | **신규** - GET ?roomId&playerId → { active, phase } |
| `app/page.tsx` | 로비 마운트 시 activeRoom 확인, 있으면 자동 리다이렉트 |
| `app/game/[roomId]/page.tsx` | 마운트 시 `setActiveRoom(roomId)` 호출 |
| `components/game/GameBoard.tsx` | game_over/로비이동 시 `clearActiveRoom()` |

### 핵심 로직
```
로비 진입 → getActiveRoom() 확인
  ├── 있으면 → /api/game/check로 유효성 확인
  │   ├── active=true → router.push(/game/{roomId})
  │   └── active=false → clearActiveRoom(), 로비 표시
  └── 없으면 → 일반 로비
```

---

## Phase 2: Game Restart

**목표**: game_over 후 같은 멤버로 재시작

### 변경 파일
| 파일 | 변경 |
|------|------|
| `app/api/game/restart/route.ts` | **신규** - POST {roomId, playerId} → initGame(기존 플레이어) |
| `app/game/[roomId]/page.tsx` | handleRestart 콜백 추가, isHost 계산 |
| `components/game/GameBoard.tsx` | game_over 화면에 "다시 시작" 버튼 (방장만) |

### 핵심 로직
- 기존 `/api/game/start` 패턴 그대로 복제
- `state.players` 전체(탈락자 포함) 새 게임으로 재초기화
- `gameMode` 유지

---

## Phase 3: Guess Variation 모드

**목표**: 쿠데타 시 상대 카드를 추측하는 변형 룰

### 룰
- **맞추면**: 해당 카드 즉시 제거 (쿠데타와 동일 효과)
- **틀리면**: 7코인만 소모, 상대 카드 유지 (영향력 안 잃음!)

### 변경 파일
| 파일 | 변경 |
|------|------|
| `lib/game/types.ts` | `GameMode` 타입, `gameMode` 필드(GameState), `guessedCharacter` 필드(PendingAction) |
| `lib/game/engine.ts` | `initGame(players, gameMode)`, coup 케이스에 guess 분기 |
| `lib/game/filter.ts` | `gameMode`, `guessedCharacter` 패스스루 |
| `app/api/game/create/route.ts` | `gameMode` 파라미터 수신/저장 |
| `app/api/game/start/route.ts` | `state.gameMode`을 `initGame`에 전달 |
| `app/api/game/action/route.ts` | coup 액션에 `guessedCharacter` 전달 |
| `app/page.tsx` | 방 만들기에 모드 선택 UI (Standard/Guess) |
| `components/game/WaitingRoom.tsx` | 모드 뱃지 표시 |
| `components/game/ActionPanel.tsx` | guess 모드 coup 시 캐릭터 선택 UI 추가 |

### engine.ts 핵심 분기 (coup 케이스)
```
coup 액션 수신
├── gameMode === 'guess'
│   ├── guessedCharacter 필수 검증
│   ├── target에 해당 캐릭터 있음? (hasCharacter)
│   │   ├── YES → 해당 카드 reveal, 탈락 체크, nextTurn
│   │   └── NO → 7코인 소모만, nextTurn (카드 안 잃음!)
│   └── 로그 추가
└── gameMode === 'standard' (기존 로직 그대로)
```

---

## Phase 4: 구조화된 게임 로그

**목표**: `log: string[]` → `structuredLog: LogEntry[]` 병행 운영

### 변경 파일
| 파일 | 변경 |
|------|------|
| `lib/game/types.ts` | `LogEntryType`, `LogEntry` 인터페이스, `structuredLog` 필드 |
| `lib/game/engine.ts` | `addStructuredLog()` 헬퍼, 기존 `addLog` 호출을 점진적 교체 |
| `lib/game/filter.ts` | `structuredLog` 패스스루 |
| `components/game/EventLog.tsx` | structuredLog 기반 리치 렌더링 (아이콘, 색상) |

### LogEntry 타입
```typescript
type LogEntryType =
  | 'game_start' | 'action_declared' | 'action_resolved'
  | 'challenge_success' | 'challenge_fail'
  | 'block_declared' | 'block_confirmed'
  | 'block_challenge_success' | 'block_challenge_fail'
  | 'lose_influence' | 'player_eliminated'
  | 'exchange_complete' | 'game_over';

interface LogEntry {
  type: LogEntryType;
  timestamp: number;
  actorId?: string;
  targetId?: string;
  action?: ActionType;
  character?: Character;
  message: string;  // 기존 string 로그 호환
}
```

### 호환성
- `log: string[]`은 유지 (기존 게임 호환)
- `structuredLog` 없으면 `log`로 폴백
- `addStructuredLog`가 양쪽 모두 기록

---

## Phase 5: 접속 상태 표시

**목표**: 플레이어 온라인/오프라인 실시간 표시

### 변경 파일
| 파일 | 변경 |
|------|------|
| `lib/firebase.client.ts` | `setupPresence()`, `subscribeToPresence()` - Firebase onDisconnect 활용 |
| `app/game/[roomId]/page.tsx` | presence 셋업 + 구독, 하위 컴포넌트에 전달 |
| `components/game/PlayerArea.tsx` | 초록/빨간 점 온라인 표시 |
| `components/game/WaitingRoom.tsx` | 플레이어 목록에 접속 상태 표시 |

### Firebase 구조
```
game_rooms/{roomId}/presence/{playerId}: { online: true, lastSeen: timestamp }
```
- `.info/connected` + `onDisconnect`로 자동 관리

---

## 구현 순서

```
Phase 1 (재접속)       → 저위험, 엔진 변경 없음
Phase 2 (재시작)       → 저위험, /start 패턴 복제
Phase 3 (Guess 모드)   → 중위험, 엔진 + UI 변경
Phase 4 (구조화 로그)  → 저위험, 점진적 마이그레이션
Phase 5 (접속 상태)    → 저위험, 클라이언트 전용
```

## 테스트 계획

| Phase | 테스트 |
|-------|--------|
| 1 | storage 함수 단위 테스트, /api/game/check 통합 테스트 |
| 2 | /api/game/restart 통합 테스트 (방장 검증, game_over 검증) |
| 3 | engine.test.ts: guess 정답/오답, 표준모드 불변, guessedCharacter 미전달 에러 |
| 4 | engine.test.ts: structuredLog 생성 확인, filter.test.ts: 패스스루 |
| 5 | 수동 테스트 (Firebase presence 자동화 어려움) |

## 호환성

모든 변경은 **추가적(additive)**이며 기존 게임방에 영향 없음:
- `gameMode` 없으면 `'standard'` 기본값
- `structuredLog` 없으면 `log` 폴백
- `presence` 없으면 상태 표시 안 함
- 마이그레이션 스크립트 불필요
