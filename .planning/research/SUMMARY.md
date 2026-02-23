# Research Synthesis Summary

**작성일:** 2026-02-23
**소스:** FEATURES.md, ARCHITECTURE.md, STACK.md, PITFALLS.md

---

## 프로젝트 개요

Coup 온라인 멀티플레이어 보드게임. Next.js 14 + Firebase Realtime Database 기반.
2~6인 지원, 7개 액션(income, foreignAid, coup, tax, assassinate, steal, exchange),
챌린지/블록 시스템 포함. 현재 localStorage 기반 playerId 사용 (인증 없음).

---

## 현재 상태

- 핵심 게임 엔진 구현 완료 — 7개 액션, 챌린지/블록 체인, 카드 교체 로직
- 57개 unit test 통과 (Jest + ts-jest, `testEnvironment: node`)
- Firebase RTDB 실시간 동기화 동작 중 (`onValue` 구독)
- 19개 action x response x outcome 시나리오 매트릭스 정리 완료

### 주요 보안 문제

- **전체 GameState가 모든 클라이언트에 노출** — 상대 카드, 덱 순서 전부 DevTools에서 열람 가능
- **playerId가 클라이언트 생성** — 서버 인증 없이 localStorage 값을 신뢰, 위장 가능
- **동시 쓰기 race condition** — plain PATCH로 last-write-wins, 동시 응답 시 하나 유실
- **런타임 입력 검증 없음** — `as ActionType` 캐스팅만 사용, 악의적 payload에 취약

---

## 확인된 버그 (P1)

### 1. Target-only blocking 미적용
steal/assassinate의 block은 target만 가능하지만, 현재 엔진은 모든 alive player가 block 가능.
Contessa block도 제3자가 가능한 상태. foreignAid Duke block만 any player 허용이 정상.

### 2. Assassination double-loss guard 미구현
target이 Contessa 블러프로 block했다가 challenge에 패배 시:
- 1장 남은 target → challenge 패배로 탈락 → assassination이 또 실행되면 안 됨
- 2장 남은 target → challenge로 1장 잃고 → assassination으로 1장 더 잃어 탈락
현재 `processBlockResponse`에서 blocker 탈락 여부를 체크하지 않고 `executeAction` 호출.

### 3. Exchange deck size guard 없음
덱에 카드가 0~1장일 때 Ambassador exchange 시 `pop()`이 `undefined` 반환.
런타임 에러 발생 가능. `Math.min(deck.length, 2)` 가드 필요.

---

## 아키텍처 변경 계획

### 현재: 단일 shared state
```
Client → onValue(game_rooms/{roomId}) → 전체 GameState 수신
```

### 목표: Server-side filtering + per-player views
```
Server: processAction() → writeFullState(state/)
        → for each player: filterStateForPlayer() → writePlayerView(views/{playerId}/)
Client: onValue(game_rooms/{roomId}/views/{myPlayerId}) → FilteredGameState만 수신
```

핵심 신규 파일: `lib/game/filter.ts` — `filterStateForPlayer(state, playerId)` 함수
- 상대 카드: `revealed === false`이면 `character: null`로 마스킹
- deck: 클라이언트에 절대 노출하지 않음
- exchangeCards: 해당 플레이어의 exchange일 때만 포함

Firebase multi-path update로 master state + N개 player view를 단일 PATCH로 atomic 쓰기.

---

## 스택 추가사항

### 테스팅
| 추가 항목 | 용도 |
|-----------|------|
| `@testing-library/react` + `jest-dom` + `user-event` | React 컴포넌트 테스트 (jsdom 환경) |
| `jest-environment-jsdom` | 컴포넌트 테스트용 별도 Jest project 설정 |
| `@playwright/test` | E2E 멀티플레이어 테스트 (multi-context로 2인 시뮬레이션) |

### Firebase 로컬 개발
| 추가 항목 | 용도 |
|-----------|------|
| `firebase-tools` CLI | Firebase Emulator Suite (RTDB port 9000, UI port 4000) |
| `@firebase/rules-unit-testing` | Security Rules 단위 테스트 |
| `firebase-admin` | 서버 측 신뢰 쓰기 + transaction 지원 |

### 선택사항
- `zod`: API 입력 런타임 검증
- `msw`: 컴포넌트 테스트에서 API mock

### Jest 설정 분리
- `engine` project: `testEnvironment: node`, `lib/**/*.test.ts`
- `components` project: `testEnvironment: jsdom`, `components/**/*.test.tsx`

---

## 빌드 순서

```
Step 1: FilteredGameState 타입 정의
  └─ types.ts에 MaskedCard, FilteredGameState, FilteredPendingAction 추가
  └─ 의존성 없음

Step 2: filter.ts 구현 + 테스트
  └─ filterStateForPlayer() 함수 + filter.test.ts
  └─ 의존: Step 1

Step 3: API route 업데이트
  └─ 모든 updateRoom() 후 filterStateForPlayer() 호출
  └─ updatePlayerView() 추가 (firebase.ts)
  └─ 의존: Step 2

Step 4: Client subscription 변경
  └─ subscribeToRoom(roomId, playerId) → views/{playerId} 경로 구독
  └─ page.tsx에서 playerId 전달
  └─ 의존: Step 3

Step 5: Firebase Emulator 설정
  └─ firebase.json, database.rules.json, env 설정
  └─ connectDatabaseEmulator 연동
  └─ Step 1-4와 병렬 가능, Step 6 전에 완료 필요

Step 6: E2E 테스트
  └─ playwright.config.ts, tests/e2e/ 작성
  └─ 의존: Step 1-5 전체 완료
```

---

## MVP 체크리스트

### v1 — Game Completeness (출시 필수)
- [x] 7개 액션 정상 동작
- [x] 4개 character action challenge
- [x] Block + challenge-on-block (foreignAid, assassinate, steal)
- [x] 10+ 코인 강제 coup
- [x] 플레이어 탈락 + 승리 감지
- [ ] **BUG FIX:** target-only blocking (steal/assassinate)
- [ ] **BUG FIX:** assassination double-loss guard
- [ ] **BUG FIX:** exchange deck size guard
- [ ] **TEST:** Ambassador exchange with 1 live card
- [ ] **TEST:** 19개 시나리오 매트릭스 전체 커버리지

### v1.x — Validation 후 추가
- [ ] Action timer / auto-pass (30초 타임아웃)
- [ ] Player reconnect (Firebase presence)
- [ ] Rematch flow
- [ ] Private card visibility (server-side state projection)

### v2+ — 향후 고려
- [ ] Spectator mode
- [ ] In-game chat
- [ ] Game replay
- [ ] Tournament / ELO

---

## 주요 Pitfall 요약

| 위험도 | 항목 | 대응 |
|--------|------|------|
| CRITICAL | 전체 GameState 클라이언트 노출 | Per-player view 분리 (빌드 순서 Step 1-4) |
| CRITICAL | Race condition (동시 쓰기) | Firebase Admin SDK transaction 전환 |
| CRITICAL | playerId 위장 가능 | 서버 생성 토큰 또는 Firebase Anonymous Auth |
| HIGH | 입력 검증 없음 | Zod schema 적용 |
| MEDIUM | Blocker가 자기 block challenge UI 표시 | `pendingAction.responses[myPlayerId]` 존재 여부 체크 |
| MEDIUM | Log 배열 무한 증가 | 최근 50개로 제한 또는 별도 경로 분리 |
| LOW | 2인 게임 시작 코인 규칙 미적용 | 선공 1코인 규칙 구현 (공식 변형 규칙) |

---

## Anti-Pattern 금지 목록

1. **Client-side filtering** — display 숨김은 보안이 아님, 반드시 서버에서 필터링
2. **Firebase Security Rules로 field-level 숨김** — RTDB는 path-level만 지원
3. **Production Firebase로 테스트** — 반드시 emulator 사용
4. **Single BrowserContext로 멀티플레이어 테스트** — localStorage 공유 문제, context 분리 필수

---

*이 문서는 다음 구현 단계를 위한 작업 문서입니다. 상세 내용은 개별 research 파일을 참조하세요.*
