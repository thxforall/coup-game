---
phase: quick-053
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/WaitingRoom.tsx
  - components/ui/AlertModal.tsx
  - app/game/[roomId]/page.tsx
  - app/api/game/leave/route.ts
autonomous: true

must_haves:
  truths:
    - "window.confirm/alert 호출이 모두 스타일된 모달로 대체됨"
    - "자발적 퇴장 시 '방을 나갔습니다' 메시지 표시 (추방 아님)"
    - "닉네임 없이 /game/XXXX URL 직접 접속 시 로비 페이지로 리다이렉트"
  artifacts:
    - path: "components/ui/AlertModal.tsx"
      provides: "단일 버튼(확인) alert 모달 컴포넌트"
    - path: "components/game/WaitingRoom.tsx"
      provides: "window.confirm -> ConfirmModal 교체"
    - path: "app/game/[roomId]/page.tsx"
      provides: "추방/퇴장 구분 로직 + 닉네임 없는 접속 리다이렉트"
  key_links:
    - from: "app/game/[roomId]/page.tsx"
      to: "components/ui/AlertModal.tsx"
      via: "kicked/left 상태에 따른 AlertModal 표시"
---

<objective>
3가지 UX 개선: (1) window.alert/confirm을 스타일된 모달로 대체, (2) 자발적 퇴장 메시지를 "추방" 대신 "나감"으로 변경, (3) 닉네임 없이 게임 URL 직접 접속 시 로비로 리다이렉트

Purpose: 브라우저 기본 alert/confirm은 앱 분위기와 맞지 않고, 퇴장 메시지가 부정확하며, URL 직접 접속 시 잘못된 안내가 나오는 문제 해결
Output: AlertModal 컴포넌트 + WaitingRoom confirm 모달 교체 + GamePage 리다이렉트 로직
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/game/ConfirmModal.tsx (기존 확인 모달 - 패턴 참고)
@components/ui/BottomSheet.tsx (모달 베이스)
@components/game/WaitingRoom.tsx (window.confirm 4곳 교체 대상)
@app/game/[roomId]/page.tsx (alert + 리다이렉트 로직)
@app/api/game/leave/route.ts (leave API)
</context>

<tasks>

<task type="auto">
  <name>Task 1: AlertModal 생성 + WaitingRoom의 window.confirm/alert을 모달로 교체</name>
  <files>
    components/ui/AlertModal.tsx
    components/game/WaitingRoom.tsx
  </files>
  <action>
1. AlertModal.tsx 생성 (ConfirmModal 패턴 참고하되 버튼 1개 "확인"만):
   - BottomSheet 기반
   - Props: title, message, buttonLabel(기본 "확인"), buttonColor(optional), onClose
   - 아이콘은 AlertTriangle (기존 ConfirmModal과 동일 패턴)

2. WaitingRoom.tsx의 모든 window.confirm/window.alert를 모달로 교체:
   - state로 모달 상태 관리 (예: confirmAction: { type: 'kick'|'leave'|'delete', targetId?, targetName? } | null)
   - line 41: `window.confirm(\`${targetName}을(를) 추방하시겠습니까?\`)` -> ConfirmModal 사용
   - line 58: `window.confirm('방을 나가시겠습니까?')` -> ConfirmModal 사용
   - line 188: `window.confirm('방을 정말 없애시겠습니까?...')` -> ConfirmModal 사용
   - line 201: `alert('방 삭제에 실패했습니다.')` -> AlertModal 사용
   - line 233: `window.confirm('방을 나가시겠습니까?')` -> ConfirmModal 사용 (line 58과 동일 패턴)
   - 이미 ConfirmModal이 존재하므로 import하여 사용
  </action>
  <verify>
    - `grep -n "window.confirm\|window.alert\|alert(" components/game/WaitingRoom.tsx` 결과가 없어야 함
    - `npx tsc --noEmit` 타입 에러 없음
  </verify>
  <done>WaitingRoom 내 모든 window.alert/confirm이 스타일된 모달로 대체됨</done>
</task>

<task type="auto">
  <name>Task 2: 퇴장/추방 메시지 구분 + 닉네임 없는 URL 접속 리다이렉트</name>
  <files>
    app/game/[roomId]/page.tsx
    app/api/game/leave/route.ts
  </files>
  <action>
1. leave API에서 퇴장한 플레이어 로그 메시지 추가 (waiting phase):
   - 현재는 players 배열에서만 제거하고 로그가 없음
   - leave 시 `${player.name}이(가) 방을 나갔습니다` 로그 추가 (추방과 구분)

2. app/game/[roomId]/page.tsx의 구독 콜백(line 66-77)에서 추방/퇴장 구분:
   - 현재: 플레이어 목록에 없으면 무조건 `alert('방에서 추방되었습니다')`
   - 변경: `alert()` 대신 AlertModal state 사용하여 모달 표시
   - 추방과 자발적 퇴장 구분이 어려우므로 (Firebase realtime 구독 특성상 leave/kick 구분 불가),
     메시지를 중립적으로 변경: "방에서 나왔습니다" (추방이든 자발이든)
   - AlertModal 확인 클릭 시 `clearActiveRoom()` + `window.location.href = '/'`

3. 닉네임 없이 /game/XXXX URL 직접 접속 시 리다이렉트:
   - page.tsx에서 playerId로 방에 접속하면 players 목록에 없음 -> 현재는 "추방되었습니다"
   - 실제 문제: 로비에서 닉네임 입력 없이 URL로 바로 접속하면 join을 한 적이 없으므로 players에 없음
   - 해결: subscribeToRoom 콜백에서 players에 없을 때, 단순히 로비(`/`)로 리다이렉트
   - 리다이렉트 전 AlertModal 표시: "이 방에 참가하려면 로비에서 닉네임을 입력해주세요" + 확인 버튼 -> 로비 이동
   - 이 경우 로비 URL에 roomId를 쿼리 파라미터로 포함: `/?join=XXXX` (사용자가 바로 참가 가능하도록)
  </action>
  <verify>
    - `grep -n "window.alert\|alert(" app/game/[roomId]/page.tsx` 결과에 브라우저 기본 alert 없어야 함
    - `npx tsc --noEmit` 타입 에러 없음
    - 닉네임 없이 /game/XXXX 접속 시 "추방되었습니다" 메시지가 아닌 로비 리다이렉트 안내 표시
  </verify>
  <done>
    - 퇴장 시 "방에서 추방되었습니다" 대신 "방에서 나왔습니다" 또는 로비 리다이렉트 안내
    - 닉네임 없이 URL 접속 시 로비로 안내하는 AlertModal + /?join=XXXX 리다이렉트
    - 모든 alert()가 AlertModal로 교체
  </done>
</task>

</tasks>

<verification>
1. `grep -rn "window.confirm\|window.alert\|[^.]alert(" components/game/WaitingRoom.tsx app/game/[roomId]/page.tsx` -> 결과 없음
2. `npx tsc --noEmit` -> 에러 없음
3. `npm run build` -> 빌드 성공
</verification>

<success_criteria>
- window.alert/confirm 호출이 0개 (WaitingRoom + GamePage)
- AlertModal 컴포넌트가 BottomSheet 기반으로 동작
- 자발적 퇴장 시 "추방" 워딩 없음
- /game/XXXX 직접 접속 시 로비 리다이렉트 안내 모달 표시
- 타입체크 + 빌드 통과
</success_criteria>

<output>
After completion, create `.planning/quick/053-alert-modal-leave-message-nickname-redirect/053-SUMMARY.md`
</output>
