---
phase: quick
plan: 033
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/player-colors.ts
  - components/game/PlayerArea.tsx
  - components/game/EventLog.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "채팅 로그에서 각 플레이어 이름이 고유 색상으로 표시된다"
    - "모바일 컴팩트 로그에서도 동일한 플레이어 색상이 적용된다"
    - "플레이어 아바타 색상과 채팅 색상이 동일하다 (같은 playerId -> 같은 색상)"
  artifacts:
    - path: "lib/game/player-colors.ts"
      provides: "Shared PLAYER_AVATAR_COLORS array and getPlayerColor helper"
      exports: ["PLAYER_AVATAR_COLORS", "getPlayerColor"]
    - path: "components/game/EventLog.tsx"
      provides: "ChatLogEntry with per-player color"
      contains: "getPlayerColor"
    - path: "components/game/GameBoard.tsx"
      provides: "chatLogs state with playerId, mobile compact log with player color"
      contains: "playerId"
  key_links:
    - from: "components/game/GameBoard.tsx"
      to: "components/game/EventLog.tsx"
      via: "chatLogs prop now includes playerId"
      pattern: "playerId"
    - from: "components/game/EventLog.tsx"
      to: "lib/game/player-colors.ts"
      via: "import getPlayerColor"
      pattern: "getPlayerColor"
---

<objective>
플레이어별 고유 색상을 채팅 로그와 모바일 컴팩트 로그에 적용하여, PlayerArea 아바타 색상과 채팅 이름 색상이 통일되도록 한다.

Purpose: 멀티플레이어 채팅에서 누가 말한 건지 색상으로 즉시 구분 가능하게 만든다.
Output: 공유 색상 유틸리티 + 채팅 로그 플레이어 색상 표시
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/game/player-colors.ts (new file)
@components/game/PlayerArea.tsx (PLAYER_AVATAR_COLORS 추출)
@components/game/EventLog.tsx (ChatLogEntry 색상 변경)
@components/game/GameBoard.tsx (chatLogs에 playerId 추가, 모바일 컴팩트 로그 색상)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 공유 색상 유틸리티 추출 + PlayerArea 리팩토링</name>
  <files>
    lib/game/player-colors.ts
    components/game/PlayerArea.tsx
  </files>
  <action>
    1. `lib/game/player-colors.ts` 새 파일 생성:
       - `PLAYER_AVATAR_COLORS` 배열을 PlayerArea.tsx에서 그대로 복사 (6개 색상)
       - `getPlayerColor(playerId: string): string` 헬퍼 함수 export
         - PlayerArea.tsx line 198-199와 동일한 charCode sum 로직 사용:
           `playerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)`
         - `PLAYER_AVATAR_COLORS[index % PLAYER_AVATAR_COLORS.length]` 반환
       - playerId가 빈 문자열이면 첫 번째 색상 반환

    2. `components/game/PlayerArea.tsx` 수정:
       - `PLAYER_AVATAR_COLORS` 로컬 선언 제거
       - `import { PLAYER_AVATAR_COLORS } from '@/lib/game/player-colors'` 추가
       - 기존 playerIndex 계산 로직은 유지 (이미 동일한 로직)
  </action>
  <verify>
    `npx tsc --noEmit` 타입 에러 없음
  </verify>
  <done>
    - lib/game/player-colors.ts가 PLAYER_AVATAR_COLORS와 getPlayerColor를 export
    - PlayerArea.tsx가 공유 모듈에서 import하여 동일하게 동작
  </done>
</task>

<task type="auto">
  <name>Task 2: chatLogs에 playerId 추가 + EventLog/GameBoard 채팅 색상 적용</name>
  <files>
    components/game/EventLog.tsx
    components/game/GameBoard.tsx
  </files>
  <action>
    1. `components/game/GameBoard.tsx` 수정:
       - chatLogs state 타입에 `playerId` 필드 추가:
         `{ playerName: string; message: string; timestamp: number; playerId: string }`
       - `addChatLog` 함수에서 playerId를 chatLog 객체에 포함:
         `{ playerName, message, timestamp: Date.now(), playerId: senderPlayerId }`
       - 모바일 컴팩트 로그 (line ~454 chatParts) 에서 playerId도 전달:
         chatParts 매핑에 `playerId: c.playerId` 추가
       - 모바일 컴팩트 로그 렌더링 (line ~466-474):
         - `import { getPlayerColor } from '@/lib/game/player-colors'` 추가
         - chat item 렌더링에서 hardcoded `text-cyan-400` 대신 inline style 사용:
           `<span style={{ color: getPlayerColor(item.playerId) }}>` 로 playerName 부분만 색상 적용
         - 구조: `<span style={color}>playerName</span>: <span class="text-text-muted">message</span>` 형태
         - 단, isLatest일 때는 text-gold 유지 (최신 메시지 하이라이트)

    2. `components/game/EventLog.tsx` 수정:
       - ChatLogItem interface에 `playerId: string` 추가 (optional `playerId?: string`로 하여 하위호환)
       - `import { getPlayerColor } from '@/lib/game/player-colors'` 추가
       - ChatLogEntry 컴포넌트 수정:
         - playerId가 있으면 `getPlayerColor(item.playerId)` 로 inline style color 적용
         - 적용 대상: playerName 텍스트만 (메시지 본문은 text-text-muted)
         - 구조 변경: 현재 `{item.playerName}: {item.message}` 한 span ->
           `<span style={{ color: getPlayerColor(item.playerId!) }}>{item.playerName}</span>: <span className="text-text-muted">{item.message}</span>` 두 span으로 분리
         - MessageCircle 아이콘 색상도 playerColor로 변경
         - isLatest일 때: playerName은 여전히 playerColor 유지, message는 text-gold
  </action>
  <verify>
    `npx tsc --noEmit` 타입 에러 없음, `npm run build` 성공
  </verify>
  <done>
    - 채팅 메시지에서 플레이어 이름이 해당 플레이어의 아바타 색상으로 표시됨
    - 모바일 컴팩트 로그에서도 동일한 색상 적용
    - 메시지 본문은 muted 색상으로 구분됨
    - 최신 메시지 하이라이트(gold) 기능 유지
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. PlayerArea의 아바타 색상 계산과 채팅 색상 계산이 동일한 함수(getPlayerColor) 사용 확인
</verification>

<success_criteria>
- 채팅 로그에서 각 플레이어 이름이 고유 색상으로 표시
- 모바일 컴팩트 로그에서도 동일 색상 적용
- PlayerArea 아바타 색상과 채팅 이름 색상이 동일한 playerId에 대해 일치
- 빌드 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/033-player-color-chat-log-profile/033-SUMMARY.md`
</output>
