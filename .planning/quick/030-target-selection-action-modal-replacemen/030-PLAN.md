---
phase: quick
plan: 030
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/TargetSelectModal.tsx
  - components/game/ActionPanel.tsx
autonomous: true

must_haves:
  truths:
    - "행동(갈취, 암살, 쿠데타) 선택 시 대상 선택이 모달 팝업으로 표시된다"
    - "모달에 선택한 행동의 아이콘, 이름, 설명, 코스트가 표시된다"
    - "모달에서 대상 플레이어를 선택하면 기존 ConfirmModal로 최종 확인된다"
    - "갈취 시 코인 0인 플레이어는 비활성 상태로 표시된다"
    - "guess 모드 쿠데타 시 캐릭터 선택 UI가 모달 안에 포함된다"
    - "모달 취소 시 행동 선택 화면으로 돌아간다"
  artifacts:
    - path: "components/game/TargetSelectModal.tsx"
      provides: "대상 선택 모달 컴포넌트"
    - path: "components/game/ActionPanel.tsx"
      provides: "인라인 대상 선택 UI를 모달 호출로 교체"
  key_links:
    - from: "components/game/ActionPanel.tsx"
      to: "components/game/TargetSelectModal.tsx"
      via: "pendingActionType state triggers modal render"
---

<objective>
ActionPanel에서 행동(갈취, 암살, 쿠데타) 선택 후 대상 플레이어를 선택하는 인라인 UI를 모달(팝업)로 대체한다.

Purpose: 현재 인라인 대상 선택 UI는 ActionPanel 전체를 대상 선택 화면으로 교체하여 액션 버튼이 사라지는 문제가 있다. 모달로 변경하면 UX가 일관되고 (ResponseModal, ConfirmModal 등과 동일한 패턴), 화면 전환이 자연스러워진다.

Output: TargetSelectModal.tsx 신규 컴포넌트 + ActionPanel.tsx 수정
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/ActionPanel.tsx
@components/game/ConfirmModal.tsx
@components/game/ResponseModal.tsx
@components/game/CardInfoModal.tsx
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: TargetSelectModal 컴포넌트 생성</name>
  <files>components/game/TargetSelectModal.tsx</files>
  <action>
새 모달 컴포넌트 `TargetSelectModal.tsx`를 생성한다. 기존 모달 패턴(ResponseModal, CardInfoModal)을 따른다.

**Props 인터페이스:**
```typescript
interface Props {
  actionDef: {
    type: ActionType;
    label: string;
    icon: React.ElementType;
    desc: string;
    cost?: number;
    claimedChar?: Character;
    variant: ButtonVariant;
  };
  aliveOthers: FilteredPlayer[];
  isGuessMode: boolean;
  loading: boolean;
  onSelectTarget: (targetId: string, guessChar?: Character) => void;
  onCancel: () => void;
}
```

**모달 레이아웃 (위에서 아래로):**
1. 오버레이: `fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4` (ResponseModal과 동일한 bottom-sheet 스타일)
2. 패널: `glass-panel max-w-[480px] w-full animate-slide-up` rounded-xl
3. 상단 헤더 영역:
   - 행동 아이콘 (원형 배경, variant 색상 사용 — ActionPanel의 VARIANT_TEXT_COLORS 참조)
   - 행동 이름 (label, 굵게)
   - 행동 설명 (desc, text-text-muted, 작은 글씨)
   - 코스트 표시 (cost가 있으면 코인 배지, ActionPanel 기존 코스트 배지 스타일 동일)
   - 주장 캐릭터 (claimedChar 있으면 CHARACTER_NAMES[claimedChar] 표시)
4. 대상 선택 영역:
   - "대상을 선택하세요" 라벨
   - 플레이어 버튼 리스트 (기존 ActionPanel의 target player buttons 스타일 그대로 사용)
   - 갈취 시 코인 0인 플레이어 비활성 (isStealNoCoins 로직 동일)
   - 선택된 플레이어 하이라이트 (variant 색상 border + 배경)
5. guess 모드 쿠데타 전용: targetId 선택 후 캐릭터 선택 UI 표시 (기존 ActionPanel의 guess mode UI 그대로 이동)
6. 하단 버튼:
   - 취소 버튼 (좌측, `border-border-subtle bg-bg-surface`)
   - 확인 버튼 (우측, variant 색상 배경) — 대상 미선택 시 disabled
   - guess 모드에서는 캐릭터도 선택해야 확인 버튼 활성화
7. 확인 클릭 시 `onSelectTarget(targetId, guessChar?)` 호출

**스타일 참고:**
- VARIANT_TEXT_COLORS, VARIANT_STYLES 등은 ActionPanel에서 export하거나 TargetSelectModal 내부에 필요한 것만 복사
- 일관성을 위해 ActionPanel의 ButtonVariant 타입과 색상 맵을 별도 상수 파일이 아니라 TargetSelectModal 내부에 필요한 subset만 복사하여 사용 (과도한 리팩토링 방지)
- `'use client'` + `memo` 적용
- ALL_CHARACTERS, GUESS_CHAR_ICONS, CHARACTER_NAMES 등은 ActionPanel에서 사용하는 것과 동일한 상수 사용

**주의:**
- 이 모달은 ConfirmModal을 대체하는 것이 아님. 대상 선택 후 onSelectTarget이 호출되면, ActionPanel에서 기존처럼 ConfirmModal을 띄워 최종 확인하는 흐름은 유지한다.
- 모달 바깥 클릭 시 onCancel 호출 (CardInfoModal 패턴 참조: 외부 div onClick={onCancel}, 내부 div onClick stopPropagation)
  </action>
  <verify>TypeScript 컴파일 에러 없음: `npx tsc --noEmit` 통과</verify>
  <done>TargetSelectModal.tsx가 존재하고, Props를 받아 모달 UI를 렌더링하며, 대상 선택 + guess 모드 캐릭터 선택 + 확인/취소 기능이 구현됨</done>
</task>

<task type="auto">
  <name>Task 2: ActionPanel에서 인라인 대상 선택을 TargetSelectModal로 교체</name>
  <files>components/game/ActionPanel.tsx</files>
  <action>
ActionPanel.tsx를 수정하여 인라인 대상 선택 UI를 TargetSelectModal로 교체한다.

**변경 사항:**

1. `import TargetSelectModal from './TargetSelectModal';` 추가

2. `handleActionButtonClick`에서 needsTarget=true일 때 기존처럼 `setPendingActionType(actionType)` 설정 (변경 없음)

3. **핵심 변경:** 기존 `if (pendingActionType && pendingActionDef)` 블록 (lines 262-388)의 인라인 대상 선택 UI 전체를 제거하고, 대신 기본 액션 버튼 뷰(lines 392-502) 위에 TargetSelectModal을 조건부 렌더링한다.

   변경 전: pendingActionType이 설정되면 early return으로 인라인 대상 선택 UI를 보여줌
   변경 후: pendingActionType이 설정되어도 기본 액션 버튼 뷰는 그대로 유지하고, 그 위에 TargetSelectModal 모달을 오버레이로 표시

4. TargetSelectModal의 `onSelectTarget` 핸들러:
   ```typescript
   const handleTargetSelected = (selectedTargetId: string, selectedGuessChar?: Character) => {
     // guess 모드 쿠데타인 경우
     if (pendingActionType === 'coup' && isGuessMode && selectedGuessChar) {
       setConfirmAction({ type: 'coup', targetId: selectedTargetId, guessChar: selectedGuessChar });
     } else {
       setConfirmAction({ type: pendingActionType!, targetId: selectedTargetId });
     }
     setTargetId(selectedTargetId);
     setPendingActionType(null); // 모달 닫기
   };
   ```

5. TargetSelectModal의 `onCancel` 핸들러: 기존 `handleCancelTargetSelection` 그대로 사용

6. **제거할 코드:**
   - lines 262-388의 전체 `if (pendingActionType && pendingActionDef) { return (...) }` 블록
   - `handleTargetSelect` 함수 (모달 내부에서 처리)
   - 더 이상 사용하지 않는 변수 정리 (pendingActionDef 등은 모달에 전달할 actionDef 구성에 사용하므로 유지 가능)

7. **기본 뷰 렌더링 구조 변경:**
   ```tsx
   return (
     <div className="space-y-3">
       {/* Target Select Modal */}
       {pendingActionType && pendingActionDef && (
         <TargetSelectModal
           actionDef={pendingActionDef}
           aliveOthers={aliveOthers}
           isGuessMode={isGuessMode}
           loading={loading}
           onSelectTarget={handleTargetSelected}
           onCancel={handleCancelTargetSelection}
         />
       )}
       {/* Confirm Modal */}
       {confirmModalNode}
       {/* 기존 액션 버튼 row1, row2 그대로 */}
       ...
     </div>
   );
   ```

**주의:**
- ConfirmModal 흐름은 기존과 완전히 동일하게 유지. TargetSelectModal에서 대상 선택 -> confirmAction 설정 -> ConfirmModal 표시 -> 최종 확인
- handleConfirmCancel에서 기존에 "대상 선택 모드를 유지"하던 로직 수정: ConfirmModal 취소 시 다시 TargetSelectModal을 열도록 `setPendingActionType`을 다시 설정하거나, 혹은 단순히 confirmAction만 null로 하고 pendingActionType은 유지하는 방식 검토. 현재 로직에서 handleConfirmCancel은 confirmAction만 null로 하므로, pendingActionType이 이미 null로 설정된 상태라 TargetSelectModal이 다시 뜨지 않음. 이를 해결하기 위해 handleTargetSelected에서 setPendingActionType(null)을 하지 말고, handleConfirm (최종 확인) 시에만 setPendingActionType(null)로 변경한다. 즉:
  - handleTargetSelected: pendingActionType 유지, confirmAction 설정
  - handleConfirm: pendingActionType null, confirmAction null (기존과 동일)
  - handleConfirmCancel: confirmAction null (pendingActionType은 유지되어 모달이 다시 보임)
  - 단, TargetSelectModal은 confirmAction이 설정된 동안에는 숨길 수 있음 (ConfirmModal이 위에 뜨므로 시각적으로 겹침 방지)
  - 렌더 조건을 `pendingActionType && pendingActionDef && !confirmAction`으로 설정하면 ConfirmModal과 동시에 뜨지 않음
  </action>
  <verify>
1. `npx tsc --noEmit` 통과
2. `npm run build` 성공
3. 브라우저에서 게임 진행: 갈취/암살/쿠데타 선택 시 모달 팝업으로 대상 선택 UI 표시 확인
4. 대상 선택 후 ConfirmModal 표시 확인
5. ConfirmModal 취소 시 다시 TargetSelectModal 표시 확인
6. 모달 바깥 클릭 시 취소 확인
7. guess 모드 쿠데타 시 캐릭터 선택 동작 확인
  </verify>
  <done>
- 인라인 대상 선택 UI가 완전히 제거되고 TargetSelectModal로 대체됨
- 행동 선택 -> 모달에서 대상 선택 -> ConfirmModal 최종 확인 흐름이 정상 동작
- 기존 모든 기능 유지: 갈취 0코인 차단, guess 모드 캐릭터 선택, 취소 등
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — TypeScript 에러 없음
2. `npm run build` — 빌드 성공
3. 수동 테스트: 갈취, 암살, 쿠데타 각각 선택 시 모달이 뜨고, 대상 선택 후 ConfirmModal로 최종 확인 가능
4. 수동 테스트: 모달 취소, ConfirmModal 취소 후 재선택 정상 동작
5. 수동 테스트: 10코인 이상일 때 쿠데타 강제 + 모달 정상 동작
</verification>

<success_criteria>
- 대상이 필요한 행동(갈취, 암살, 쿠데타) 선택 시 모달 팝업으로 대상 선택 UI가 표시된다
- 모달에 행동 아이콘, 이름, 설명, 코스트가 표시된다
- 대상 선택 -> ConfirmModal 확인 -> 행동 실행 흐름이 정상 동작한다
- 기존 기능(갈취 0코인 차단, guess 모드)이 모두 유지된다
- 빌드 성공, TypeScript 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/030-target-selection-action-modal-replacemen/030-SUMMARY.md`
</output>
