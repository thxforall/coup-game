---
phase: quick-017
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/QuickChat.tsx
  - components/game/ChatBubble.tsx
  - components/game/GameBoard.tsx
  - lib/firebase.client.ts
  - app/api/game/chat/route.ts
autonomous: true

must_haves:
  truths:
    - "플레이어가 6개 퀵챗 버튼 중 하나를 탭하면 즉시 전송된다"
    - "모든 플레이어가 실시간으로 채팅 메시지를 볼 수 있다"
    - "메시지가 3초 후 자동으로 사라진다"
    - "360px 모바일에서 퀵챗 버튼이 깨지지 않는다"
  artifacts:
    - path: "components/game/QuickChat.tsx"
      provides: "6개 퀵챗 버튼 UI + 전송 로직"
    - path: "components/game/ChatBubble.tsx"
      provides: "플레이어 이름 위에 뜨는 말풍선 표시"
    - path: "app/api/game/chat/route.ts"
      provides: "채팅 메시지를 Firebase RTDB에 저장하는 API"
  key_links:
    - from: "QuickChat.tsx"
      to: "/api/game/chat"
      via: "fetch POST on button click"
    - from: "ChatBubble.tsx"
      to: "firebase.client.ts"
      via: "onValue subscription to chat path"
---

<objective>
게임 중 플레이어들이 빠르게 소통할 수 있는 퀵챗 이모티콘/텍스트 버튼 6개를 구현한다.

Purpose: 게임의 사회적 상호작용을 강화하고 블러핑/심리전 재미를 높인다.
Output: 6개 퀵챗 버튼 + 실시간 말풍선 표시 + 자동 소멸
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameBoard.tsx (메인 게임 보드 - 퀵챗 버튼 배치 위치)
@components/game/PlayerArea.tsx (상대 플레이어 영역 - 말풍선 표시 위치)
@components/game/MyPlayerArea.tsx (내 플레이어 영역)
@components/game/GameToast.tsx (토스트 패턴 참고 - addToast/leaving 애니메이션)
@lib/firebase.client.ts (클라이언트 Firebase - onValue 구독 패턴)
@lib/firebase.ts (서버 Firebase - REST API 패턴)
@app/api/game/action/route.ts (API 라우트 패턴 참고)
@app/globals.css (디자인 토큰)
</context>

<tasks>

<task type="auto">
  <name>Task 1: 채팅 API + Firebase 구독 인프라</name>
  <files>
    app/api/game/chat/route.ts
    lib/firebase.client.ts
  </files>
  <action>
1. `app/api/game/chat/route.ts` 생성:
   - POST endpoint: `{ roomId, playerId, messageId }` 받음
   - messageId는 0-5 정수 (6개 프리셋 메시지 인덱스)
   - 프리셋 메시지 배열: `['드루와', '공작 업', 'ㅠㅠ', '넌 뒤졌다', '봐줘', '👍']`
   - Firebase REST API로 `game_rooms/{roomId}/chat` 경로에 저장
   - 데이터 구조: `{ playerId, messageId, timestamp: Date.now() }`
   - PATCH로 `game_rooms/{roomId}/chat/{uniqueKey}` 에 저장 (uniqueKey = `${playerId}_${Date.now()}`)
   - 스팸 방지: 같은 플레이어가 1초 이내 재전송 불가 (서버에서 체크 불필요, 클라이언트에서 처리)
   - 기존 `lib/firebase.ts`의 DB_URL, fetch 패턴 따라서 구현

2. `lib/firebase.client.ts`에 채팅 구독 함수 추가:
   - `subscribeToChatMessages(roomId, callback)` 함수 추가
   - `game_rooms/{roomId}/chat` 경로를 onValue로 구독
   - callback은 `Record<string, { playerId: string; messageId: number; timestamp: number }>` 형태로 전달
   - cleanup 시 unsubscribe 반환
   - `sendChatMessage(roomId, playerId, messageId)` 클라이언트 함수도 추가
     - 서버 API 대신 클라이언트 SDK로 직접 `set(ref(db, game_rooms/{roomId}/chat/{key}), data)` 사용
     - 이렇게 하면 API 라우트 없이도 실시간성이 더 좋음
     - key = `${playerId}_${Date.now()}`

** 최종 결정: 서버 API 라우트 대신 클라이언트 SDK 직접 사용.** 채팅은 게임 상태에 영향 없는 ephemeral 데이터이므로 서버 검증이 불필요하다. `app/api/game/chat/route.ts`는 생성하지 않는다.

`lib/firebase.client.ts`에 추가할 것:
```typescript
// Chat messages
export const CHAT_MESSAGES = ['드루와', '공작 업', 'ㅠㅠ', '넌 뒤졌다', '봐줘', '👍'] as const;

export interface ChatMessage {
  playerId: string;
  messageId: number;
  timestamp: number;
}

export function sendChatMessage(roomId: string, playerId: string, messageId: number): void {
  const db = getDb();
  const key = `${playerId}_${Date.now()}`;
  const chatRef = ref(db, `game_rooms/${roomId}/chat/${key}`);
  set(chatRef, { playerId, messageId, timestamp: Date.now() });
}

export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: Record<string, ChatMessage>) => void
): () => void {
  const db = getDb();
  const chatRef = ref(db, `game_rooms/${roomId}/chat`);
  return onValue(chatRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}
```
  </action>
  <verify>
    - TypeScript 컴파일 에러 없음: `npx tsc --noEmit`
    - firebase.client.ts에 sendChatMessage, subscribeToChatMessages, CHAT_MESSAGES 내보내기 확인
  </verify>
  <done>
    - sendChatMessage 함수가 Firebase RTDB `game_rooms/{roomId}/chat/{key}`에 메시지를 쓸 수 있다
    - subscribeToChatMessages 함수가 chat 경로를 실시간 구독한다
    - CHAT_MESSAGES 상수에 6개 프리셋 메시지가 정의되어 있다
  </done>
</task>

<task type="auto">
  <name>Task 2: QuickChat 버튼 + ChatBubble 말풍선 UI</name>
  <files>
    components/game/QuickChat.tsx
    components/game/ChatBubble.tsx
    components/game/GameBoard.tsx
    components/game/PlayerArea.tsx
    app/game/[roomId]/page.tsx
  </files>
  <action>
1. `components/game/QuickChat.tsx` 생성:
   - 6개 퀵챗 버튼을 가로 스크롤 가능한 행으로 표시
   - 버튼 배열: `[{id:0, label:'드루와', emoji:null}, {id:1, label:'공작 업', emoji:null}, {id:2, label:'ㅠㅠ', emoji:null}, {id:3, label:'넌 뒤졌다', emoji:null}, {id:4, label:'봐줘', emoji:null}, {id:5, label:'👍', emoji:'👍'}]`
   - Props: `{ roomId: string; playerId: string; disabled?: boolean }`
   - 버튼 클릭 시 `sendChatMessage(roomId, playerId, messageId)` 호출
   - 스팸 방지: 클릭 후 1.5초간 쿨다운 (버튼 비활성화 + opacity 표시)
   - 스타일:
     - 컨테이너: `flex gap-1.5 overflow-x-auto scrollbar-hide px-2`
     - 버튼: `flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border border-border-subtle bg-bg-surface text-text-secondary hover:bg-gold/20 hover:text-gold hover:border-gold/40 active:scale-95 transition-all`
     - 쿨다운 중: `opacity-50 pointer-events-none`
   - 360px에서 6개 버튼이 한 줄에 다 보이지 않을 수 있으므로 가로 스크롤 허용
   - 죽은 플레이어(isAlive=false)는 disabled로 처리

2. `components/game/ChatBubble.tsx` 생성:
   - Props: `{ message: string; playerName: string; leaving?: boolean }`
   - 플레이어 이름 위에 뜨는 말풍선 스타일
   - 스타일:
     - 컨테이너: absolute positioning (부모가 relative)
     - `bg-bg-dark/90 border border-gold/30 rounded-lg px-2 py-1 text-xs text-gold font-medium`
     - 아래 삼각형 포인터 (CSS :after pseudo-element)
     - 애니메이션: slide-up + fade-in 등장, fade-out 퇴장
   - CSS 애니메이션은 globals.css에 추가하지 않고 Tailwind animate 클래스 또는 inline keyframes 사용
     - 등장: `animate-[chatBubbleIn_0.3s_ease-out]`
     - 퇴장: `animate-[chatBubbleOut_0.3s_ease-in_forwards]`
     - @keyframes는 globals.css에 추가

3. `components/game/GameBoard.tsx` 수정:
   - import QuickChat, ChatBubble, subscribeToChatMessages, CHAT_MESSAGES
   - 채팅 구독 상태 관리:
     ```typescript
     const [chatBubbles, setChatBubbles] = useState<Map<string, {playerId:string; message:string; leaving:boolean}>>(new Map());
     ```
   - useEffect로 subscribeToChatMessages 구독:
     - 새 메시지가 들어오면 chatBubbles Map에 추가
     - 3초 후 leaving=true로 설정, 3.5초 후 제거
     - 같은 playerId의 이전 메시지는 교체 (한 플레이어당 최대 1개 말풍선)
     - 30초 이상 된 메시지(timestamp 기준)는 무시 (페이지 로드 시 과거 메시지 방지)
   - QuickChat 버튼 배치: MyPlayerArea 위, 턴 영역 아래에 위치
     - `{/* 퀵챗 버튼 */}` 주석과 함께 MyPlayerArea border-t div 바로 위에 배치
     - 게임 오버 시 숨김
   - ChatBubble 배치: PlayerArea 컴포넌트에 chatBubble prop 전달
     - others.map에서 각 플레이어의 chatBubbles 확인하여 PlayerArea에 전달

4. `components/game/PlayerArea.tsx` 수정:
   - Props에 `chatBubble?: { message: string; leaving: boolean }` 추가
   - PlayerArea 최상위 div에 `relative` 클래스 추가 (이미 있으면 유지)
   - chatBubble이 있으면 PlayerArea 위에 ChatBubble 렌더링:
     ```tsx
     {chatBubble && (
       <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
         <ChatBubble message={chatBubble.message} playerName="" leaving={chatBubble.leaving} />
       </div>
     )}
     ```

5. 내 채팅도 MyPlayerArea 위에 표시:
   - GameBoard에서 me의 chatBubble도 확인
   - MyPlayerArea 영역 위에 ChatBubble 조건부 렌더링

6. `app/globals.css`에 채팅 버블 애니메이션 keyframes 추가:
   ```css
   @keyframes chatBubbleIn {
     from { opacity: 0; transform: translateY(4px) scale(0.95); }
     to { opacity: 1; transform: translateY(0) scale(1); }
   }
   @keyframes chatBubbleOut {
     from { opacity: 1; transform: translateY(0) scale(1); }
     to { opacity: 0; transform: translateY(-4px) scale(0.9); }
   }
   ```

7. 오래된 채팅 데이터 정리:
   - subscribeToChatMessages의 callback에서 30초 이상 된 메시지는 클라이언트 SDK로 삭제 (remove)
   - 이를 통해 Firebase에 채팅 데이터가 무한히 쌓이지 않도록 방지
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npm run build` (또는 `npx next build`) 빌드 성공
    - 로컬에서 게임 실행 후:
      1. 퀵챗 버튼 6개가 하단에 표시되는지 확인
      2. 버튼 클릭 시 해당 플레이어 위에 말풍선이 뜨는지 확인
      3. 3초 후 말풍선이 사라지는지 확인
      4. 360px 뷰포트에서 버튼이 가로 스크롤로 접근 가능한지 확인
  </verify>
  <done>
    - 6개 퀵챗 버튼이 게임 화면 하단(MyPlayerArea 위)에 표시된다
    - 버튼 클릭 시 Firebase RTDB에 메시지가 저장되고 모든 플레이어에게 실시간 전달된다
    - 메시지가 해당 플레이어 이름 위에 말풍선으로 3초간 표시 후 자동 소멸된다
    - 1.5초 쿨다운으로 스팸이 방지된다
    - 360px 모바일에서 가로 스크롤로 모든 버튼에 접근 가능하다
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- 타입 체크 통과
2. `npm run build` -- 빌드 성공
3. 실제 게임에서 2명 이상 접속하여 퀵챗 전송/수신 확인
4. 모바일 360px에서 레이아웃 깨짐 없음
</verification>

<success_criteria>
- 6개 프리셋 퀵챗 버튼이 게임 중 표시된다
- 버튼 클릭으로 메시지가 실시간 전송/수신된다
- 말풍선이 플레이어 위에 표시되고 3초 후 자동 소멸된다
- 스팸 방지 쿨다운이 작동한다
- 360px+ 모바일 반응형이 유지된다
</success_criteria>

<output>
After completion, create `.planning/quick/017-realtime-chat-emoji-textbox-6/017-SUMMARY.md`
</output>
