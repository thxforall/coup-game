---
quick: "035"
title: "QuickChat inline to BottomSheet modal"
type: execute
files_modified:
  - components/game/QuickChat.tsx
  - components/game/GameBoard.tsx
autonomous: true

must_haves:
  truths:
    - "QuickChat no longer renders inline in the game board"
    - "A chat button (MessageCircle icon) appears near MyPlayerArea"
    - "Tapping the chat button opens a BottomSheet modal with preset buttons and free text input"
    - "Sending a message keeps the modal open for consecutive chatting"
    - "Closing the modal via backdrop/ESC works correctly"
    - "Chat limit per turn still enforced inside the modal"
  artifacts:
    - path: "components/game/QuickChat.tsx"
      provides: "BottomSheet-wrapped chat modal with open/close state"
    - path: "components/game/GameBoard.tsx"
      provides: "Chat toggle button instead of inline QuickChat"
  key_links:
    - from: "GameBoard.tsx"
      to: "QuickChat.tsx"
      via: "state: showQuickChat boolean, passed as isOpen prop"
---

<objective>
QuickChat을 인라인 렌더링에서 BottomSheet 모달 방식으로 전환한다. GameBoard에서 인라인 QuickChat 대신 MessageCircle 아이콘 버튼을 표시하고, 클릭 시 BottomSheet 안에 QuickChat UI를 보여준다.

Purpose: 모바일에서 인라인 퀵챗이 차지하는 세로 공간을 절약하고, 채팅 UI를 모달로 분리하여 게임 보드 가시성을 높인다.
Output: 수정된 QuickChat.tsx (BottomSheet 래핑), 수정된 GameBoard.tsx (토글 버튼)
</objective>

<context>
@components/game/QuickChat.tsx
@components/game/GameBoard.tsx
@components/ui/BottomSheet.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: QuickChat을 BottomSheet 모달로 래핑 + GameBoard 토글 버튼 추가</name>
  <files>
    components/game/QuickChat.tsx
    components/game/GameBoard.tsx
  </files>
  <action>
**QuickChat.tsx 수정:**

1. Props에 `isOpen: boolean`과 `onClose: () => void` 추가
2. BottomSheet import 추가: `import BottomSheet from '@/components/ui/BottomSheet';`
3. 컴포넌트 return을 조건부 렌더로 변경:
   - `if (!isOpen) return null;`
   - BottomSheet로 기존 UI를 감싸기
   - BottomSheet props: `onClose={onClose}`, `mobileMaxHeight="50vh"`
4. BottomSheet 내부 구조:
   - 상단에 헤더: `<div className="px-4 pt-3 pb-2 text-sm font-medium text-text-secondary">빠른 채팅</div>`
   - 기존 프리셋 버튼들을 flex-wrap 레이아웃으로 변경 (모달 안에서는 가로 스크롤보다 wrap이 자연스러움)
     - 기존: `flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-1.5 items-center`
     - 변경: `flex flex-wrap gap-2 px-4 py-2`
   - 자유 텍스트 입력은 별도 줄로 분리: `<div className="px-4 pb-4 pt-2 flex items-center gap-2">`
     - input width를 flex-1로 확장 (기존 w-20 제거)
     - 전송 버튼 유지
   - 제한 도달 메시지는 하단에 center 정렬

**GameBoard.tsx 수정:**

1. `useState` import에 `showQuickChat` 상태 추가 (기존 useState import 활용)
2. `MessageCircle` 아이콘 lucide-react import에 추가
3. 기존 QuickChat 인라인 렌더 영역 (line 617-627) 교체:
   - `<div className="relative">...</div>` 블록을 채팅 버튼으로 대체
   - 버튼 위치: MyPlayerArea `<div className="p-2 sm:p-4">` 내부, MyPlayerArea 옆에 배치
   - 구현: border-t 영역에서 QuickChat div를 제거하고, 대신 MyPlayerArea 영역에 플로팅 버튼 배치

   ```
   {/* 내 플레이어 영역 (하단) */}
   {me && (
     <div className="flex-shrink-0 border-t border-border-subtle bg-bg-card">
       <div className="p-2 sm:p-4 relative">
         <MyPlayerArea player={me as Player} />
         {/* 퀵챗 열기 버튼 */}
         {me.isAlive && (
           <button
             onClick={() => setShowQuickChat(true)}
             className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 rounded-full bg-bg-surface border border-border-subtle text-text-secondary hover:text-gold hover:border-gold/40 transition-colors"
             aria-label="빠른 채팅"
           >
             <MessageCircle size={16} />
           </button>
         )}
       </div>
       <QuickChat
         roomId={roomId}
         playerId={playerId}
         disabled={!me.isAlive}
         turnId={state.currentTurnId}
         onSend={handleChatSend}
         onSendText={handleChatTextSend}
         isOpen={showQuickChat}
         onClose={() => setShowQuickChat(false)}
       />
     </div>
   )}
   ```

주의사항:
- QuickChat의 memo()는 유지한다. isOpen이 false일 때 null 반환하므로 성능 문제 없음.
- turnId 변경 시 chatCountRef 리셋 로직은 기존 그대로 유지 (모달 열림 상태와 무관).
- 전송 후 모달은 닫지 않는다 (연속 채팅 가능).
  </action>
  <verify>
    1. `npx tsc --noEmit` 타입 에러 없음
    2. `npx next lint` 린트 통과
    3. 브라우저에서 게임 보드 하단에 MessageCircle 버튼 표시 확인
    4. 버튼 클릭 시 BottomSheet 모달로 프리셋 + 자유입력 표시 확인
    5. 메시지 전송 후 모달이 닫히지 않고 유지되는지 확인
  </verify>
  <done>
    - 인라인 QuickChat이 제거되고 MessageCircle 아이콘 버튼이 MyPlayerArea 우상단에 표시됨
    - 버튼 클릭 시 BottomSheet 모달 내에 프리셋 버튼(flex-wrap) + 자유입력이 렌더됨
    - 전송 후 모달 유지, backdrop/ESC로 닫기 동작
    - 턴당 채팅 제한 기존대로 동작
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 타입 체크 통과
2. `npx next lint` — 린트 통과
3. 게임 진입 후 하단 내 플레이어 영역에 채팅 아이콘 버튼 표시
4. 버튼 탭 -> BottomSheet 열림 -> 프리셋 버튼 + 자유입력 렌더
5. 프리셋 클릭 또는 자유입력 전송 -> 채팅 전송됨, 모달 유지
6. 배경 클릭 또는 ESC -> 모달 닫힘
7. 사망한 플레이어는 채팅 버튼 미표시
</verification>

<success_criteria>
- QuickChat이 인라인이 아닌 BottomSheet 모달로만 접근 가능
- MessageCircle 버튼이 MyPlayerArea 근처에 위치
- 모달 내에서 연속 채팅 가능 (전송 후 닫히지 않음)
- 기존 쿨다운/턴당 제한 로직 정상 동작
</success_criteria>

<output>
After completion, create `.planning/quick/035-quickchat-modal-bottomsheet/035-SUMMARY.md`
</output>
