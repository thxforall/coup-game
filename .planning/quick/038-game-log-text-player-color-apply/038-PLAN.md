---
phase: quick
plan: 038
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/EventLog.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "이벤트 로그에서 플레이어 이름이 해당 플레이어의 고유 색상으로 표시된다"
    - "구조화된 로그(StructuredLogEntry)와 일반 로그(plain) 모두에서 컬러가 적용된다"
    - "채팅 로그의 기존 플레이어 컬러 기능은 그대로 유지된다"
  artifacts:
    - path: "components/game/EventLog.tsx"
      provides: "플레이어 이름 컬러 적용 로직"
    - path: "components/game/GameBoard.tsx"
      provides: "EventLog에 players prop 전달"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "components/game/EventLog.tsx"
      via: "players prop"
    - from: "components/game/EventLog.tsx"
      to: "lib/game/player-colors.ts"
      via: "getPlayerColor(playerId)"
---

<objective>
이벤트 로그의 플레이어 이름에 고유 색상을 적용한다.

Purpose: 현재 로그 메시지는 단색(이벤트 타입별 색상)으로만 표시되어 누가 행동했는지 시각적으로 구분이 어렵다. 플레이어 이름에 고유 색상을 입히면 게임 흐름 파악이 훨씬 쉬워진다.
Output: EventLog 컴포넌트에서 플레이어 이름이 각자의 고유 색상으로 렌더링됨.
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/EventLog.tsx
@components/game/GameBoard.tsx
@lib/game/player-colors.ts
@lib/game/types.ts (LogEntry, Player interfaces)
</context>

<tasks>

<task type="auto">
  <name>Task 1: EventLog에 players prop 추가 및 플레이어 이름 컬러링 헬퍼 구현</name>
  <files>components/game/EventLog.tsx, components/game/GameBoard.tsx</files>
  <action>
1. **EventLog Props 확장**: `Props` 인터페이스에 `players?: Player[]` 추가 (import Player from types).

2. **이름 컬러링 헬퍼 함수 구현**: EventLog 내부에 `colorizePlayerNames` 함수를 만든다.
   - 입력: `message: string`, `players: Player[]`
   - 로직: players 배열에서 각 플레이어의 name을 찾아서, message 내에서 해당 name이 포함된 부분을 `<span style={{ color: getPlayerColor(player.id) }}>` 으로 감싼 React 노드 배열을 반환한다.
   - 반환: `React.ReactNode[]` (텍스트와 컬러 span의 혼합 배열)
   - 주의: 플레이어 이름이 다른 이름의 부분 문자열일 수 있으므로, 이름 길이가 긴 것부터 먼저 매칭한다 (예: "홍길동" vs "홍길").
   - players가 빈 배열이거나 undefined이면 원본 message를 그대로 반환.

3. **StructuredLogEntry에 적용**:
   - `StructuredLogEntry` 컴포넌트에 `players` prop 추가.
   - `entry.message` 텍스트를 직접 렌더링하던 부분을 `colorizePlayerNames(entry.message, players)` 호출로 교체.
   - 기존 이벤트 타입별 색상(text-gold, text-contessa 등)은 아이콘과 기본 텍스트에 유지하되, 플레이어 이름 부분만 inline style로 오버라이드.

4. **Plain 로그에도 적용**:
   - `mergedPlain` 렌더링 부분(line ~198)에서 `item.text`를 직접 렌더링하던 부분을 `colorizePlayerNames(item.text, players)` 호출로 교체.

5. **GameBoard에서 players 전달**:
   - GameBoard.tsx에서 `<EventLog>` 호출 2곳(모바일 바텀시트용 line ~551, 데스크톱용 line ~562)에 `players={state.players}` prop 추가.

구현 시 주의사항:
- `getPlayerColor`는 이미 import 되어 있음 (line 6).
- ChatLogEntry의 기존 플레이어 컬러 로직은 변경하지 않음.
- `colorizePlayerNames`에서 매칭이 없으면 원본 문자열을 그대로 반환하여 성능 영향 최소화.
- memo wrapping 유지.
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npx next build` 빌드 성공 (또는 dev 서버 에러 없음)
    - 게임 실행 시 이벤트 로그에서 플레이어 이름이 각자 고유 색상으로 표시됨
  </verify>
  <done>
    - StructuredLogEntry와 plain 로그 모두에서 플레이어 이름이 getPlayerColor에 의한 고유 색상으로 렌더링됨
    - 나머지 로그 텍스트는 기존 이벤트 타입별 색상 유지
    - 채팅 로그의 기존 동작 변경 없음
    - 타입 에러 및 빌드 에러 없음
  </done>
</task>

</tasks>

<verification>
- TypeScript 컴파일 성공: `npx tsc --noEmit`
- 빌드 성공: `npx next build`
- 시각적 확인: 게임 진행 시 이벤트 로그의 플레이어 이름에 고유 색상 적용 확인
</verification>

<success_criteria>
- 이벤트 로그 텍스트에서 플레이어 이름이 해당 플레이어의 고유 색상(PLAYER_AVATAR_COLORS 기반)으로 표시됨
- 구조화된 로그와 일반 텍스트 로그 모두 적용됨
- 기존 이벤트 타입별 색상 체계와 채팅 로그 색상 기능에 영향 없음
</success_criteria>

<output>
After completion, create `.planning/quick/038-game-log-text-player-color-apply/038-SUMMARY.md`
</output>
