---
phase: quick-045
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true

must_haves:
  truths:
    - "README.md 에 v0.5.0 릴리스 항목이 존재한다"
    - "새로 추가된 API 라우트(list, leave, delete)가 프로젝트 구조 섹션에 반영된다"
    - "새 컴포넌트(TargetSelectModal, BottomSheet/QuickChat, ConfirmModal, ChatBubble)가 구조 섹션에 반영된다"
    - "새 기능(로비 방 목록, 방 나가기, 플레이어 색상, 배경음악 볼륨 슬라이더 등)이 주요 기능 섹션에 반영된다"
    - "추방 정책이 실제 동작(재입장 허용)으로 정정된다"
  artifacts:
    - path: "README.md"
      provides: "최신 기능/구조를 반영한 프로젝트 문서"
---

<objective>
README.md 를 현재 코드베이스(quick-039 ~ quick-044 이후) 상태에 맞게 업데이트한다.

Purpose: 새 기여자나 사용자가 README 를 보면 실제 앱 기능과 구조를 정확히 파악할 수 있도록 한다.
Output: 업데이트된 README.md (기능 목록, 파일 트리, 릴리스 노트 포함)
</objective>

<execution_context>
@/Users/kiyeol/.claude-pers/get-shit-done/workflows/execute-plan.md
@/Users/kiyeol/.claude-pers/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/kiyeol/development/coup/README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: README.md 전체 업데이트</name>
  <files>/Users/kiyeol/development/coup/README.md</files>
  <action>
다음 변경사항을 README.md 에 적용한다.

**1. 주요 기능 섹션 업데이트**

기존 "추방 재접속 차단" 항목을 삭제하고 다음으로 교체:
- "추방 플레이어 재입장 허용 — 방장에게 추방된 이후에도 동일 방 재입장 가능"

아래 항목들을 추가/수정:

게임 플레이 항목 추가:
- "로비 방 목록 브라우저 — 활성 방 목록 실시간 조회, 코드 없이 원클릭 입장"
- "방 나가기 기능 — 게임 중/대기 중 언제든 방 퇴장 (진행 중 카드 공개)"
- "쿠데타 필수 버튼 하이라이트 — 코인 10개 이상 시 쿠데타 버튼 강조 표시"

UI/UX 항목 추가:
- "플레이어별 고유 색상 — 테두리, 채팅 버블, 게임 로그에 플레이어 컬러 일관 적용"
- "대상 선택 모달(TargetSelectModal) — 갈취·암살·쿠데타 시 전용 대상 선택 UI"
- "모바일 바텀시트 모달 — 퀵챗 등 모바일에서 하단 슬라이드업 시트 패턴"
- "자유 텍스트 퀵챗 — 최대 10자 자유 입력 메시지 지원"
- "준비 버튼 색상 구분 — 준비완료(초록), 준비취소(빨강)"

사운드 항목 수정:
- BGM 항목에 "BGM 볼륨 슬라이더 — 헤더 하단 실시간 볼륨 조절" 추가

**2. 프로젝트 구조 섹션 업데이트**

api/game/ 하위에 다음 추가:
```
│       ├── list/                 # 방 목록 조회
│       ├── leave/                # 방 나가기
│       └── delete/               # 방 삭제 (자동 정리)
```

기존 `check/` 항목 뒤에 위 세 항목 추가.

components/game/ 하위에 다음 추가:
```
│   ├── TargetSelectModal.tsx     # 대상 선택 모달
│   ├── ConfirmModal.tsx          # 확인 다이얼로그 모달
│   └── ChatBubble.tsx            # 채팅 버블 컴포넌트
```

lib/game/ 하위에 다음 추가:
```
│   │   └── player-colors.ts      # 플레이어 색상 매핑
```

public/ 하위에 다음 추가:
```
│   ├── bg/                       # 배경 이미지
│   └── profile/                  # 프로필 이미지
```

**3. 릴리스 노트 테이블에 v0.5.0 행 추가**

기존 v0.4.0 행 위에 삽입:
```
| [v0.5.0](./CHANGELOG.md#050--2026-02-24) | 2026-02-24 | 방 목록/나가기/삭제, 플레이어 색상, 퀵챗 자유입력, 바텀시트, 볼륨 슬라이더 |
```
  </action>
  <verify>
    파일이 정상적으로 수정되었는지 확인:
    ```bash
    grep -n "v0.5.0\|list/\|leave/\|delete/\|TargetSelectModal\|ChatBubble\|바텀시트" /Users/kiyeol/development/coup/README.md
    ```
    위 키워드들이 모두 출력되어야 함.
  </verify>
  <done>
    - README.md 에 v0.5.0 릴리스 행 존재
    - list/, leave/, delete/ API 라우트가 파일 트리에 반영됨
    - TargetSelectModal, ConfirmModal, ChatBubble 컴포넌트가 파일 트리에 반영됨
    - 플레이어 색상, 방 목록, 방 나가기, 바텀시트, 퀵챗 자유입력 기능이 주요 기능 섹션에 반영됨
    - 추방 정책 설명이 "재입장 허용"으로 수정됨
  </done>
</task>

</tasks>

<verification>
```bash
grep -c "v0.5.0" /Users/kiyeol/development/coup/README.md
grep -c "list/" /Users/kiyeol/development/coup/README.md
grep -c "TargetSelectModal" /Users/kiyeol/development/coup/README.md
```
각 명령이 1 이상을 반환해야 함.
</verification>

<success_criteria>
README.md 가 현재 코드베이스(quick-039~044 변경 포함)를 정확히 반영하며, 새 기여자가 파일 트리와 기능 목록만 보고 앱 구조를 파악할 수 있음.
</success_criteria>

<output>
완료 후 `.planning/quick/045-update-readme-md/045-SUMMARY.md` 생성
</output>
