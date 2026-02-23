---
quick: "034"
title: "QuickChat 자유 텍스트 입력 (10자 제한)"
type: execute
files_modified:
  - lib/firebase.client.ts
  - components/game/QuickChat.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "프리셋 버튼 옆에 텍스트 입력 필드가 보인다"
    - "10자 초과 입력이 불가능하다"
    - "자유 텍스트 전송 시 상대방에게 말풍선/로그로 표시된다"
    - "프리셋 + 자유입력 합산 턴당 3회 제한이 동작한다"
    - "1.5초 쿨다운이 자유입력에도 적용된다"
  artifacts:
    - path: "lib/firebase.client.ts"
      provides: "ChatMessage.text 필드, sendChatTextMessage 함수"
    - path: "components/game/QuickChat.tsx"
      provides: "자유 텍스트 input + 전송 버튼 UI"
    - path: "components/game/GameBoard.tsx"
      provides: "자유 텍스트 메시지 수신 및 chatLog 연동"
  key_links:
    - from: "QuickChat.tsx"
      to: "firebase.client.ts"
      via: "sendChatTextMessage 호출"
    - from: "GameBoard.tsx"
      to: "firebase.client.ts"
      via: "subscribeToChatMessages에서 text 필드 읽기"
---

<objective>
QuickChat 컴포넌트에 10자 이하 자유 텍스트 입력 필드를 추가한다.
기존 프리셋 버튼과 동일한 쿨다운/횟수 제한을 공유하며, Firebase를 통해 실시간 전송된다.

Purpose: 프리셋만으로는 표현할 수 없는 짧은 메시지를 주고받을 수 있게 한다.
Output: 자유 텍스트 입력이 가능한 QuickChat, Firebase 전송/수신 로직, EventLog 표시
</objective>

<context>
@components/game/QuickChat.tsx
@components/game/GameBoard.tsx
@lib/firebase.client.ts
@components/game/EventLog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Firebase ChatMessage에 text 필드 추가 및 전송 함수 생성</name>
  <files>lib/firebase.client.ts</files>
  <action>
1. ChatMessage 인터페이스에 optional `text` 필드 추가:
   ```ts
   export interface ChatMessage {
     playerId: string;
     messageId: number;  // 프리셋: 0-6 인덱스, 자유텍스트: -1
     text?: string;      // 자유 텍스트 (messageId === -1일 때)
     timestamp: number;
   }
   ```

2. 자유 텍스트 전송 함수 추가:
   ```ts
   export function sendChatTextMessage(roomId: string, playerId: string, text: string): void {
     const db = getDb();
     const key = `${playerId}_${Date.now()}`;
     const chatRef = ref(db, `game_rooms/${roomId}/chat/${key}`);
     set(chatRef, { playerId, messageId: -1, text, timestamp: Date.now() });
     cleanupOldChatMessages(roomId);
   }
   ```
   - messageId를 -1로 설정하여 프리셋과 구분
   - 기존 sendChatMessage는 변경하지 않음 (하위 호환)
  </action>
  <verify>TypeScript 컴파일 에러 없음: `npx tsc --noEmit`</verify>
  <done>ChatMessage에 text 필드 존재, sendChatTextMessage 함수가 export됨</done>
</task>

<task type="auto">
  <name>Task 2: QuickChat에 자유 텍스트 입력 UI 추가</name>
  <files>components/game/QuickChat.tsx</files>
  <action>
1. Props 인터페이스에 onSendText 콜백 추가:
   ```ts
   onSend?: (messageId: number) => void;
   onSendText?: (text: string) => void;  // 자유 텍스트 낙관적 UI용
   ```

2. import에 sendChatTextMessage 추가

3. 컴포넌트 내부에 텍스트 입력 상태 추가:
   ```ts
   const [inputText, setInputText] = useState('');
   ```

4. 텍스트 전송 핸들러 추가 (기존 handleClick과 동일한 쿨다운/카운트 로직 공유):
   ```ts
   const handleTextSend = useCallback(() => {
     const trimmed = inputText.trim();
     if (!trimmed || disabled) return;
     if (chatCountRef.current >= maxChats) return;
     const now = Date.now();
     if (now < cooldownUntilRef.current) return;

     onSendText?.(trimmed);
     sendChatTextMessage(roomId, playerId, trimmed);
     cooldownUntilRef.current = now + COOLDOWN_MS;
     chatCountRef.current += 1;
     setInputText('');
     if (chatCountRef.current >= maxChats) {
       setLimitReached(true);
     }
   }, [inputText, roomId, playerId, disabled, maxChats, onSendText]);
   ```

5. turnId 변경 시 inputText도 리셋 (기존 useEffect에 추가):
   ```ts
   useEffect(() => {
     chatCountRef.current = 0;
     setLimitReached(false);
     setInputText('');
   }, [turnId]);
   ```

6. 프리셋 버튼들 뒤에 (limitReached 텍스트 앞에) 인라인 입력 필드 추가:
   - 컨테이너: `flex-shrink-0 flex items-center gap-1`
   - input: `w-20 px-2 py-1 rounded-full text-xs bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/40`
     - maxLength={10}
     - placeholder="자유입력"
     - value={inputText}, onChange로 setInputText
     - onKeyDown에서 Enter 시 handleTextSend 호출
     - disabled={isDisabled}
   - 전송 버튼: `px-2 py-1 rounded-full text-xs font-medium border`
     - 텍스트가 비어있거나 isDisabled면 opacity-50 pointer-events-none
     - 텍스트가 있으면 gold 컬러 스타일 (hover:bg-gold/20 등)
     - onClick으로 handleTextSend
     - 라벨: 화살표 아이콘 또는 간단히 ">" 문자

7. 모바일 대응: input의 w-20은 고정폭으로 스크롤 영역 안에서 자연스럽게 동작.
   기존 overflow-x-auto scrollbar-hide가 처리.
  </action>
  <verify>
- `npx tsc --noEmit` 통과
- 브라우저에서 QuickChat 영역에 input 필드 표시 확인
- 10자 초과 입력 불가 확인
- Enter 또는 전송 버튼 클릭으로 메시지 전송 확인
- 프리셋 2회 사용 후 자유입력 1회 사용 시 제한 도달 확인
  </verify>
  <done>
- 프리셋 버튼 옆에 텍스트 input과 전송 버튼이 렌더링됨
- maxLength=10으로 10자 제한
- 프리셋과 합산 3회 제한, 1.5초 쿨다운 공유
  </done>
</task>

<task type="auto">
  <name>Task 3: GameBoard에서 자유 텍스트 수신 및 표시 연동</name>
  <files>components/game/GameBoard.tsx</files>
  <action>
1. handleChatSend 콜백 아래에 handleChatTextSend 콜백 추가 (낙관적 UI):
   ```ts
   const handleChatTextSend = useCallback((text: string) => {
     addChatLog(playerId, text);
   }, [playerId, addChatLog]);
   ```

2. subscribeToChatMessages 콜백에서 msg.text 처리 추가:
   현재 코드:
   ```ts
   const message = CHAT_MESSAGES[msg.messageId] ?? '';
   if (!message) return;
   ```
   변경:
   ```ts
   const message = msg.messageId === -1 ? (msg.text ?? '') : (CHAT_MESSAGES[msg.messageId] ?? '');
   if (!message) return;
   ```
   - messageId가 -1이면 text 필드를 사용
   - 기존 프리셋 메시지 동작은 그대로 유지

3. QuickChat 컴포넌트에 onSendText prop 전달:
   ```tsx
   <QuickChat
     roomId={roomId}
     playerId={playerId}
     disabled={...}
     turnId={...}
     onSend={handleChatSend}
     onSendText={handleChatTextSend}
   />
   ```

4. handleChatSend (프리셋) 내부의 CHAT_MESSAGES 조회 로직은 변경 없음.
   handleChatTextSend가 별도로 text를 직접 addChatLog에 전달.
  </action>
  <verify>
- `npx tsc --noEmit` 통과
- 자유 텍스트 전송 시 내 EventLog에 즉시 표시 (낙관적 UI)
- 상대방 화면의 EventLog에도 자유 텍스트 메시지 표시
- 프리셋 메시지가 여전히 정상 동작
  </verify>
  <done>
- 자유 텍스트가 EventLog chatLogs에 표시됨
- 내 메시지는 낙관적 UI로 즉시 표시
- 상대 메시지는 Firebase 구독으로 수신하여 표시
- 기존 프리셋 메시지 동작 유지
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - 타입 에러 없음
2. `npm run build` - 빌드 성공
3. 기능 테스트:
   - 프리셋 버튼 7개 + 자유입력 필드가 동시에 보임
   - 자유입력에 10자까지만 입력 가능
   - 프리셋 1회 + 자유입력 2회 = 3회 후 모두 비활성화
   - 자유입력 후 1.5초 이내 프리셋 클릭 불가 (쿨다운 공유)
   - 자유 텍스트가 EventLog에 채팅으로 표시
   - 상대 플레이어 화면에도 자유 텍스트 표시
</verification>

<success_criteria>
- 프리셋 버튼과 자유 텍스트 입력이 QuickChat 영역에 공존
- 10자 제한 동작
- 프리셋 + 자유입력 합산 턴당 3회 제한
- 쿨다운 1.5초 공유
- Firebase를 통한 실시간 전송/수신
- EventLog에 자유 텍스트 메시지 표시
</success_criteria>

<output>
After completion, create `.planning/quick/034-quickchat-free-text-input-10char/034-SUMMARY.md`
</output>
