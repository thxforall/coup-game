---
phase: quick-027
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameBoard.tsx
  - components/game/EventLog.tsx
  - components/game/PlayerArea.tsx
  - components/game/ActionPanel.tsx
  - components/game/ConfirmModal.tsx
autonomous: true

must_haves:
  truths:
    - "퀵챗 메시지가 이벤트 로그 영역과 모바일 컴팩트 로그에 표시된다"
    - "플레이어 머리 위 말풍선이 더 이상 뜨지 않는다"
    - "확인 모달의 확인 버튼에 아이콘과 명확한 레이블이 표시된다"
  artifacts:
    - path: "components/game/EventLog.tsx"
      provides: "채팅 메시지 로그 항목 렌더링"
    - path: "components/game/ConfirmModal.tsx"
      provides: "아이콘 지원 확인 버튼"
---

<objective>
퀵챗 메시지를 플레이어 말풍선에서 이벤트 로그 영역으로 이동하고, 확인 모달의 확인 버튼 가독성을 개선한다.

Purpose: 말풍선이 작은 화면에서 가려지거나 놓치기 쉬워 로그에 통합. 확인 모달의 짧은 레이블("소득", "암살")만으로는 어떤 행동인지 불명확.
Output: 채팅이 로그에 표시되고, 확인 버튼에 아이콘+서술형 레이블이 달린 UX
</objective>

<context>
@components/game/GameBoard.tsx
@components/game/EventLog.tsx
@components/game/PlayerArea.tsx
@components/game/ActionPanel.tsx
@components/game/ConfirmModal.tsx
@components/game/ChatBubble.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: 퀵챗을 이벤트 로그에 통합, 말풍선 제거</name>
  <files>
    components/game/GameBoard.tsx
    components/game/EventLog.tsx
    components/game/PlayerArea.tsx
  </files>
  <action>
**GameBoard.tsx 변경:**
1. chatBubbles Map state, chatTimersRef, showChatBubble 헬퍼 전체 제거
2. 대신 chatLogs state 추가: `useState<{playerName: string; message: string; timestamp: number}[]>([])` 형태의 배열
3. showChatBubble 대신 addChatLog 헬퍼 생성:
   - playerName을 state.players에서 찾아서 기록
   - chatLogs 배열에 push (최대 50개 유지, 오래된 것 제거)
4. subscribeToChatMessages 콜백에서 addChatLog 호출 (내 메시지 낙관적 UI도 동일)
5. handleChatSend에서도 addChatLog 호출
6. EventLog에 chatLogs prop 전달
7. PlayerArea에서 chatBubble prop 제거 (others.map 부분)
8. 하단 내 플레이어 영역의 ChatBubble 렌더링 제거 (chatBubbles.has(playerId) 블록)
9. 모바일 컴팩트 로그 영역(lg:hidden, 최근 3개 표시)에도 채팅 로그를 통합하여 표시:
   - 게임 로그와 채팅 로그를 timestamp 기준 병합하여 최근 3개 표시
   - 채팅은 `💬 {playerName}: {message}` 형식, text-cyan-400 색상

**EventLog.tsx 변경:**
1. Props에 chatLogs 추가: `chatLogs?: {playerName: string; message: string; timestamp: number}[]`
2. structuredLog 사용 시: chatLogs를 structuredLog와 timestamp 기준 병합하여 시간순 표시
3. 채팅 로그 항목 스타일: `💬 {playerName}: {message}` 형식
   - 색상: text-cyan-400 (게임 로그와 구분)
   - 폰트: 동일한 font-mono text-[10px]
   - 배경 없음 (hover:bg-bg-surface는 유지)
4. 일반 log(string[]) 모드에서는 chatLogs를 별도 섹션으로 아래쪽에 끼워넣기 (timestamp 기준 정렬)

**PlayerArea.tsx 변경:**
1. Props에서 chatBubble 제거
2. chatBubble 관련 렌더링 코드 제거 (absolute -top-9 블록)
3. ChatBubble import 제거
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npm run build` 성공
    - PlayerArea에 chatBubble prop이 없음을 grep으로 확인
  </verify>
  <done>퀵챗 메시지가 이벤트 로그에 시간순으로 표시되고, 플레이어 위 말풍선은 완전히 제거됨</done>
</task>

<task type="auto">
  <name>Task 2: 확인 모달 버튼 가독성 개선</name>
  <files>
    components/game/ActionPanel.tsx
    components/game/ConfirmModal.tsx
  </files>
  <action>
**ConfirmModal.tsx 변경:**
1. Props에 `confirmIcon?: React.ElementType` 추가
2. 확인 버튼 내부에 아이콘 렌더링: `{ConfirmIcon && <ConfirmIcon size={16} className="inline mr-1" />}`
3. 확인 버튼 텍스트 앞에 아이콘이 오도록 배치

**ActionPanel.tsx의 getConfirmInfo 변경:**
1. 반환 타입에 `icon: React.ElementType` 추가
2. 각 액션별 아이콘과 더 서술적 레이블:
   - income: icon=Coins, label='소득 받기'
   - foreignAid: icon=Handshake, label='원조 받기'
   - tax: icon=Crown, label='세금 징수하기'
   - exchange: icon=Repeat, label='카드 교환하기'
   - steal: icon=Anchor, label='{target.name} 갈취하기'
   - assassinate: icon=Crosshair, label='{target.name} 암살하기'
   - coup: icon=Zap, label='{target.name} 쿠데타'
3. ConfirmModal 호출 시 confirmIcon prop 전달:
   ```tsx
   <ConfirmModal
     ...
     confirmIcon={confirmInfo.icon}
   />
   ```
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npm run build` 성공
  </verify>
  <done>확인 모달의 확인 버튼에 액션 아이콘이 표시되고, "소득 받기", "철수 암살하기" 등 서술형 레이블로 어떤 행동인지 명확히 알 수 있음</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` 통과
- `npm run build` 성공
- ChatBubble import가 GameBoard.tsx와 PlayerArea.tsx에서 제거됨 확인
- ConfirmModal에 confirmIcon prop이 추가됨 확인
</verification>

<success_criteria>
1. 퀵챗 메시지가 이벤트 로그(데스크톱)와 컴팩트 로그(모바일) 모두에 표시된다
2. 플레이어 위 말풍선이 완전히 제거되었다
3. 확인 모달 버튼에 아이콘 + 서술형 레이블이 표시된다
4. 빌드 에러 없음
</success_criteria>
