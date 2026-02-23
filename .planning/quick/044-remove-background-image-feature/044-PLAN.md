---
phase: quick-044
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/ui/GlobalBackground.tsx        # DELETE
  - lib/settings.ts                           # DELETE
  - public/bg/bg.jpeg                         # DELETE
  - app/layout.tsx                            # Remove GlobalBackground import + usage
  - app/globals.css                           # Remove .has-bg-image CSS block (lines 106-131)
  - components/game/SettingsModal.tsx          # Remove UI settings section + imports
autonomous: true

must_haves:
  truths:
    - "배경 이미지가 어떤 페이지에서도 표시되지 않는다"
    - "설정 모달에 배경 이미지 토글이 없다"
    - "빌드 에러 없이 정상 빌드된다"
  artifacts:
    - path: "components/ui/GlobalBackground.tsx"
      provides: "DELETED"
    - path: "lib/settings.ts"
      provides: "DELETED"
    - path: "public/bg/bg.jpeg"
      provides: "DELETED"
  key_links: []
---

<objective>
배경 이미지 표시 기능을 완전히 제거한다 (quick-040에서 추가된 기능).

Purpose: 더 이상 사용하지 않는 배경 이미지 기능의 모든 코드, 에셋, CSS를 정리한다.
Output: 배경 이미지 관련 코드가 없는 깨끗한 코드베이스.
</objective>

<context>
@.planning/STATE.md
@components/ui/GlobalBackground.tsx — 삭제 대상
@lib/settings.ts — 삭제 대상 (배경 이미지 전용, 다른 곳에서 사용 안 함)
@app/layout.tsx — GlobalBackground import/사용 제거
@app/globals.css — .has-bg-image CSS 블록 제거 (lines 106-131)
@components/game/SettingsModal.tsx — UI 설정 섹션 및 관련 import 제거
</context>

<tasks>

<task type="auto">
  <name>Task 1: 배경 이미지 관련 파일 삭제 및 참조 제거</name>
  <files>
    components/ui/GlobalBackground.tsx
    lib/settings.ts
    public/bg/bg.jpeg
    app/layout.tsx
    app/globals.css
    components/game/SettingsModal.tsx
  </files>
  <action>
1. **파일 삭제** (3개):
   - `components/ui/GlobalBackground.tsx` — 전체 삭제
   - `lib/settings.ts` — 전체 삭제 (이 파일은 배경 이미지 전용. getUISettings, updateUISetting은 SettingsModal과 GlobalBackground에서만 import됨)
   - `public/bg/bg.jpeg` — 전체 삭제

2. **app/layout.tsx** 수정:
   - line 4: `import GlobalBackground from '@/components/ui/GlobalBackground';` 삭제
   - line 62: `<GlobalBackground />` 삭제

3. **app/globals.css** 수정:
   - lines 106-131 삭제: `/* Glassmorphism for Background Image */` 주석부터 `.has-bg-image .bg-overlay` 블록 끝까지 (총 26줄)
   - 주의: lines 6-8의 `--bg-card-rgb`, `--bg-surface-rgb`, `--bg-dark-rgb` CSS 변수 정의는 유지 (lines 10-12에서 기본 색상 정의에 사용됨)

4. **components/game/SettingsModal.tsx** 수정:
   - line 4: import에서 `Image as ImageIcon` 제거 → `{ Settings, RotateCcw, LogOut, X }` 만 남김
   - line 7: `import { getUISettings, updateUISetting } from '@/lib/settings';` 삭제
   - line 26: `const [uiSettings, setUiSettings] = useState(getUISettings());` 삭제
   - lines 123-157: `{/* UI 설정 */}` 섹션 전체 삭제 (배경 이미지 토글 UI 블록)
  </action>
  <verify>
    - `npx tsc --noEmit` 타입 에러 없음
    - `npx next build` 빌드 성공
    - `grep -r "GlobalBackground\|showBgImage\|has-bg-image\|lib/settings" --include="*.ts" --include="*.tsx" --include="*.css" app/ components/ lib/` 결과 없음 (planning 폴더 제외)
  </verify>
  <done>
    - GlobalBackground 컴포넌트, settings.ts, bg.jpeg 파일이 삭제됨
    - layout.tsx에서 GlobalBackground 참조 없음
    - globals.css에서 .has-bg-image 관련 CSS 없음
    - SettingsModal에서 배경 이미지 토글 UI 없음
    - 빌드 성공
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` — 타입 에러 없음
- `npx next build` — 빌드 성공
- 삭제 대상 파일 3개가 파일시스템에 존재하지 않음
- 코드베이스에 `showBgImage`, `GlobalBackground`, `has-bg-image`, `lib/settings` 참조 없음
</verification>

<success_criteria>
배경 이미지 기능이 완전히 제거되고 빌드가 성공한다.
</success_criteria>

<output>
After completion, create `.planning/quick/044-remove-background-image-feature/044-SUMMARY.md`
</output>
