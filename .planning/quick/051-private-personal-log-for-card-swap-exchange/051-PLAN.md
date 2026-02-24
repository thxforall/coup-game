---
phase: quick
plan: 051
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/game/types.ts
  - lib/game/engine.ts
  - lib/game/filter.ts
  - components/game/EventLog.tsx
autonomous: true

must_haves:
  truths:
    - "도전 실패로 카드 교체 시 본인만 '(캐릭터)이 덱으로 돌아가고 새 카드를 받았습니다' 로그를 볼 수 있다"
    - "블록 도전 실패로 카드 교체 시 블로커 본인만 교체 로그를 볼 수 있다"
    - "대사 교환 완료 시 본인만 선택한 카드 내역 로그를 볼 수 있다"
    - "다른 플레이어에게는 위 개인 로그가 보이지 않는다"
  artifacts:
    - path: "lib/game/types.ts"
      provides: "LogEntry.visibleTo optional field"
      contains: "visibleTo"
    - path: "lib/game/filter.ts"
      provides: "structuredLog filtering by visibleTo"
      contains: "visibleTo"
    - path: "lib/game/engine.ts"
      provides: "Private log entries for card swap and exchange"
      contains: "visibleTo"
  key_links:
    - from: "lib/game/engine.ts"
      to: "lib/game/types.ts"
      via: "LogEntry with visibleTo field"
      pattern: "visibleTo"
    - from: "lib/game/filter.ts"
      to: "lib/game/types.ts"
      via: "Filter structuredLog entries by visibleTo"
      pattern: "visibleTo"
---

<objective>
개인 로그 시스템 추가: 도전 실패 카드 교체, 블록 도전 실패 카드 교체, 대사 교환 시 본인만 볼 수 있는 비공개 로그를 추가한다.

Purpose: 현재 카드 교체/교환 시 어떤 카드가 오갔는지 아무에게도 보이지 않아 본인도 혼란스럽다. 본인에게만 상세 정보를 보여줘서 UX를 개선한다.
Output: visibleTo 필드가 있는 LogEntry를 engine에서 생성하고, filter에서 플레이어별 필터링하여 클라이언트에 전달.
</objective>

<context>
@lib/game/types.ts
@lib/game/engine.ts
@lib/game/filter.ts
@components/game/EventLog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: LogEntry 타입에 visibleTo 추가 + filter.ts에서 structuredLog 필터링</name>
  <files>lib/game/types.ts, lib/game/filter.ts</files>
  <action>
1. `lib/game/types.ts` — LogEntry 인터페이스에 optional 필드 추가:
   ```ts
   visibleTo?: string; // 특정 플레이어만 볼 수 있는 로그 (playerId). 없으면 전체 공개.
   ```

2. `lib/game/filter.ts` — filterStateForPlayer 함수에서 structuredLog 필터링 추가:
   - 기존: `structuredLog`를 그대로 전달
   - 변경: `structuredLog` 배열을 filter하여 `visibleTo`가 없거나 `visibleTo === playerId`인 항목만 포함
   - `log` (string[])는 변경하지 않음 — 비공개 로그는 structuredLog에만 추가하고 log[]에는 추가하지 않음

   구체적으로 filterStateForPlayer 함수의 return 블록에서:
   ```ts
   ...(state.structuredLog && {
     structuredLog: state.structuredLog.filter(
       (entry) => !entry.visibleTo || entry.visibleTo === playerId
     ),
   }),
   ```
  </action>
  <verify>
  - `npx tsc --noEmit` 타입 에러 없음
  - filter.ts에서 visibleTo 필터링 로직이 존재하는지 grep 확인
  </verify>
  <done>LogEntry에 visibleTo 필드 존재, filterStateForPlayer가 visibleTo 기준으로 structuredLog를 필터링</done>
</task>

<task type="auto">
  <name>Task 2: engine.ts에서 3가지 시나리오에 비공개 로그 추가</name>
  <files>lib/game/engine.ts</files>
  <action>
addLog 함수를 수정하지 않고, 직접 structuredLog에 비공개 LogEntry를 push하는 헬퍼 함수를 추가한다.

1. **헬퍼 함수 추가** (addLog 함수 바로 아래):
   ```ts
   function addPrivateLog(state: GameState, playerId: string, msg: string, entry?: Omit<LogEntry, 'message' | 'timestamp' | 'visibleTo'>): GameState {
     const logEntry: LogEntry = {
       ...(entry ?? { type: 'action_resolved' as LogEntryType }),
       message: msg,
       timestamp: Date.now(),
       visibleTo: playerId,
     };
     return {
       ...state,
       structuredLog: [...(state.structuredLog ?? []), logEntry],
       // log[] (string[])에는 추가하지 않음 — 비공개이므로
     };
   }
   ```

2. **시나리오 A: resolveChallenge 함수 — 도전 실패 시 행동자 카드 교체** (line ~500 부근)
   - 행동자가 진짜 카드를 가지고 있어서 도전 실패한 경우
   - `s = addLog(...)` 직후 (기존 "도전 실패!" 로그 다음)에 비공개 로그 추가:
   ```ts
   s = addPrivateLog(s, pending.actorId,
     `${CHARACTER_NAMES[requiredChar]}이(가) 덱으로 돌아가고 새 카드를 받았습니다`,
     { type: 'challenge_fail', actorId: pending.actorId }
   );
   ```

3. **시나리오 B: processBlockResponse 함수 — 블록 도전 실패 시 블로커 카드 교체** (line ~393 부근)
   - 블로커가 진짜 카드를 가지고 있어서 도전 실패한 경우
   - `s = addLog(...)` 직후 (기존 "도전 실패!" 로그 다음)에 비공개 로그 추가:
   ```ts
   s = addPrivateLog(s, pending.blockerId!,
     `${CHARACTER_NAMES[pending.blockerCharacter!]}이(가) 덱으로 돌아가고 새 카드를 받았습니다`,
     { type: 'block_challenge_fail', actorId: pending.blockerId }
   );
   ```

4. **시나리오 C: processExchangeSelect 함수 — 대사 교환 완료** (line ~872 부근)
   - `s = addLog(...)` (기존 "카드를 교환했습니다" 로그) 직후에 비공개 로그 추가:
   - allOptions와 keptChars를 활용하여 상세 로그:
   ```ts
   const allOptionNames = allOptions.map(c => CHARACTER_NAMES[c]).join(', ');
   const keptNames = keptChars.map(c => CHARACTER_NAMES[c]).join(', ');
   s = addPrivateLog(s, actorId,
     `교환: [${allOptionNames}] 중 ${keptNames}을(를) 선택했습니다`,
     { type: 'exchange_complete', actorId }
   );
   ```

**주의:** addPrivateLog는 log[] (string배열)에는 추가하지 않는다. structuredLog에만 추가하므로 기존 string log 기반 렌더링에 영향 없음.
  </action>
  <verify>
  - `npx tsc --noEmit` 타입 에러 없음
  - grep으로 addPrivateLog 호출이 3곳에 존재하는지 확인
  - grep으로 visibleTo가 engine.ts에 존재하는지 확인
  </verify>
  <done>
  - resolveChallenge에서 도전 실패 시 행동자에게 카드 교체 비공개 로그 생성
  - processBlockResponse에서 블록 도전 실패 시 블로커에게 카드 교체 비공개 로그 생성
  - processExchangeSelect에서 교환 완료 시 행동자에게 선택 상세 비공개 로그 생성
  - 다른 플레이어의 filtered state에는 해당 로그가 포함되지 않음
  </done>
</task>

<task type="auto">
  <name>Task 3: EventLog 컴포넌트에 비공개 로그 시각적 구분 (선택적 개선)</name>
  <files>components/game/EventLog.tsx</files>
  <action>
비공개 로그가 일반 로그와 시각적으로 구분되도록 미미한 스타일링을 추가한다.

1. LogEntry 타입에 visibleTo가 추가되었으므로 별도 import 변경 불필요 (이미 LogEntry를 사용 중).

2. StructuredLogEntry 컴포넌트에서 `entry.visibleTo`가 존재하면 italic + 약간 다른 스타일 적용:
   - entry.visibleTo가 있으면 메시지 앞에 "🔒 " 아이콘(Lock) 추가하거나, 텍스트를 italic으로 표시
   - 간단한 방법: visibleTo가 있으면 message 앞에 Eye 아이콘 추가 (lucide-react의 Eye 또는 EyeOff 사용)

   구체적으로:
   ```tsx
   import { Eye } from 'lucide-react';
   // StructuredLogEntry 내부:
   const isPrivate = !!entry.visibleTo;
   // Icon 선택 시 isPrivate이면 Eye 아이콘으로 override
   const FinalIcon = isPrivate ? Eye : Icon;
   // color도 isPrivate이면 'text-ambassador/70' (보라색 계열, 개인 정보 느낌)
   const finalColor = isPrivate ? 'text-ambassador/70' : color;
   ```

   그리고 메시지 텍스트에 italic 적용:
   ```tsx
   <span className={`font-mono text-[10px] leading-relaxed ${finalColor} ${isPrivate ? 'italic' : ''}`}>
   ```
  </action>
  <verify>
  - `npx tsc --noEmit` 타입 에러 없음
  - EventLog.tsx에서 visibleTo 또는 isPrivate 관련 코드가 존재하는지 확인
  </verify>
  <done>비공개 로그가 Eye 아이콘 + italic + ambassador 색상으로 시각적으로 구분됨</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — 전체 타입체크 통과
2. 비공개 로그 흐름 확인:
   - engine.ts에서 addPrivateLog로 visibleTo가 설정된 LogEntry 생성
   - filter.ts에서 visibleTo !== playerId인 항목 제거
   - EventLog에서 비공개 로그 시각적 구분 렌더링
</verification>

<success_criteria>
- LogEntry에 visibleTo 필드 존재
- 도전 실패/블록 도전 실패/교환 완료 시 비공개 로그가 structuredLog에 추가됨
- filterStateForPlayer가 visibleTo 기준으로 로그 필터링
- 비공개 로그는 해당 플레이어의 EventLog에서만 시각적으로 구분되어 표시
- 타입체크 통과
</success_criteria>
