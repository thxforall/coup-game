---
phase: quick-061
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/game/GameRulesModal.tsx
autonomous: true

must_haves:
  truths:
    - "GameRulesModal 캐릭터 능력 섹션에서 각 캐릭터 옆에 카드 이미지 썸네일이 표시된다"
    - "카드 이미지 썸네일을 탭하면 CardInfoModal이 열려 상세 카드 정보를 볼 수 있다"
    - "Inquisitor 이미지가 없는 상태에서도 에러 없이 동작한다 (reformation 모드 미지원이므로 현재 표시 대상 아님)"
  artifacts:
    - path: "components/game/GameRulesModal.tsx"
      provides: "캐릭터 카드 이미지 썸네일 + CardInfoModal 연동"
  key_links:
    - from: "components/game/GameRulesModal.tsx"
      to: "components/game/CardInfoModal.tsx"
      via: "useState로 선택된 캐릭터 관리, CardInfoModal 렌더링"
      pattern: "CardInfoModal"
---

<objective>
GameRulesModal의 "캐릭터 능력" 섹션에 카드 이미지 썸네일을 추가하고, 탭하면 CardInfoModal로 상세 정보를 볼 수 있도록 개선한다.

Purpose: 플레이어가 규칙 모달에서 바로 카드 아트를 확인할 수 있어 게임 이해도를 높인다.
Output: 카드 이미지가 포함된 GameRulesModal 컴포넌트
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/game/GameRulesModal.tsx
@components/game/CardInfoModal.tsx
@lib/game/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: GameRulesModal 캐릭터 섹션에 카드 이미지 썸네일 + CardInfoModal 연동</name>
  <files>components/game/GameRulesModal.tsx</files>
  <action>
GameRulesModal.tsx를 수정하여 캐릭터 능력 섹션에 카드 이미지를 추가한다.

1. **Import 추가:**
   - `useState` from react
   - `Image` from next/image
   - `Character` type from `@/lib/game/types`
   - `CardInfoModal` from `@/components/game/CardInfoModal`

2. **CARD_IMAGES 매핑 추가** (CardInfoModal과 동일한 패턴):
   ```typescript
   const CARD_IMAGES: Record<string, string> = {
     Duke: '/cards/duke.jpg',
     Contessa: '/cards/contessa.jpg',
     Captain: '/cards/captain.jpg',
     Assassin: '/cards/assassin.jpg',
     Ambassador: '/cards/ambassador.jpg',
   };
   ```
   - Inquisitor는 이미지가 없고 현재 standard/guess 모드만 표시하므로 제외

3. **상태 추가:**
   - `const [selectedChar, setSelectedChar] = useState<Character | null>(null);`

4. **캐릭터 능력 섹션 레이아웃 변경:**
   각 캐릭터 항목을 기존 텍스트 옆에 카드 이미지 썸네일을 배치한다.

   각 캐릭터 div를 다음과 같은 구조로 변경:
   ```tsx
   <div className="flex items-start gap-3">
     <button
       onClick={() => setSelectedChar('Duke' as Character)}
       className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
     >
       <Image
         src={CARD_IMAGES.Duke}
         alt="공작"
         fill
         className="object-cover"
         sizes="48px"
       />
     </button>
     <div className="min-w-0">
       <span className={`font-bold ${CHAR_COLORS.Duke}`}>공작 (Duke)</span>
       <p className="text-text-secondary mt-0.5">세금징수 +3코인 / 해외원조 차단</p>
     </div>
   </div>
   ```
   - 썸네일 크기: w-12 h-16 (48x64px, 카드 비율 3:4)
   - button 태그로 감싸서 탭하면 setSelectedChar 호출
   - 5개 캐릭터 모두 동일 패턴 적용 (Duke, Assassin, Captain, Ambassador, Contessa)

5. **CardInfoModal 렌더링:**
   컴포넌트 return 최하단에 조건부 렌더링:
   ```tsx
   {selectedChar && (
     <CardInfoModal
       character={selectedChar}
       onClose={() => setSelectedChar(null)}
     />
   )}
   ```

6. **스타일 주의사항:**
   - 기존 dark theme (bg-bg-surface/50, text-text-secondary 등) 유지
   - 이미지 썸네일에 rounded + overflow-hidden으로 둥근 모서리
   - hover 시 border 밝아지는 효과로 클릭 가능함을 암시
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npx next lint` 린트 통과
    - 브라우저에서 GameRulesModal 열었을 때 캐릭터 섹션에 카드 썸네일 5개 표시
    - 썸네일 탭 시 CardInfoModal 열림
  </verify>
  <done>
    - GameRulesModal 캐릭터 능력 섹션에 5개 캐릭터 카드 이미지 썸네일이 텍스트 왼쪽에 표시됨
    - 각 썸네일 탭 시 해당 캐릭터의 CardInfoModal이 열림
    - CardInfoModal 닫기 시 규칙 모달로 복귀
    - 타입체크, 린트 통과
  </done>
</task>

</tasks>

<verification>
- TypeScript 컴파일 에러 없음
- ESLint 통과
- GameRulesModal에서 카드 이미지 5개 정상 렌더링
- 이미지 탭 -> CardInfoModal 열림 -> 닫기 -> 규칙 모달 복귀 정상 동작
</verification>

<success_criteria>
- GameRulesModal 캐릭터 능력 섹션에 각 캐릭터의 카드 이미지 썸네일이 표시된다
- 썸네일 탭 시 CardInfoModal이 열려 상세 카드 정보를 확인할 수 있다
- 기존 규칙 모달의 다른 섹션은 변경 없음
</success_criteria>

<output>
After completion, create `.planning/quick/061-game-rules-modal-card-image-view/061-SUMMARY.md`
</output>
