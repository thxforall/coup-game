# Coup Online

## What This Is

Coup 보드게임의 온라인 멀티플레이어 버전. 2-6명이 각자 기기에서 접속해 실시간으로 한 판을 플레이할 수 있는 웹 앱. Next.js + Firebase Realtime Database 기반으로 핵심 게임 로직(7개 액션, 챌린지/블록)은 구현되어 있고, 이를 완성도 있게 다듬는 단계.

## Core Value

모든 게임 시나리오(액션, 챌린지, 블록, 코인)가 공식 룰대로 정확하게 동작하고, 실제 사람들이 한 판을 문제없이 완주할 수 있어야 한다.

## Requirements

### Validated

- ✓ 방 생성/참여/시작 (4자리 코드) — existing
- ✓ 7개 액션 구현 (income, foreignAid, coup, tax, assassinate, steal, exchange) — existing
- ✓ 챌린지/블록 시스템 기본 구조 — existing
- ✓ 실시간 상태 동기화 (Firebase Realtime DB) — existing
- ✓ 턴 기반 진행, 승자 판정 — existing
- ✓ 이벤트 로그 — existing
- ✓ 게임 UI 기본 구조 (GameBoard, 모달, 액션 패널) — existing

### Active

- [ ] 게임 룰 정확성 — 모든 시나리오(챌린지 성공/실패, 블록 챌린지, 카드 선택 등)가 공식 룰대로 동작
- [ ] 챌린지 시 카드 공개/선택 로직 정확성
- [ ] 챌린지/블록 프롬프트가 올바른 플레이어에게만 표시
- [ ] 보안 — 상대방 카드 노출 방지 (현재 전체 GameState가 클라이언트에 전달)
- [ ] 입력 유효성 검증 (API request body validation)
- [ ] 클라이언트 에러 핸들링 (sendAction 에러 처리)
- [ ] 로컬 테스트 환경 (Firebase 에뮬레이터 또는 목업)
- [ ] 시나리오 기반 E2E 테스트 (참고: seejohnrun/coup 레포)
- [ ] 엔진 테스트 커버리지 확장 (엣지 케이스)
- [ ] UX 개선 — 토스트, 연결 상태 표시, 애니메이션
- [ ] 2-6명 플레이어 지원 안정화 (리포메이션 규칙 포함)

### Out of Scope

- 채팅/음성 통화 — 핵심 게임플레이가 아님
- 게임 히스토리/통계 — v1 후 고려
- 소셜 로그인/회원가입 — 현재 닉네임+localStorage 방식 유지
- 모바일 앱 — 웹 브라우저 기반으로 충분
- AI 봇 — 멀티플레이어 완성 후 고려
- 관전 모드 — v1 후 고려

## Context

- 기존 코드베이스: Next.js 14 + Firebase Realtime DB, TypeScript 기반
- 게임 엔진 (`lib/game/engine.ts`, 585줄)은 순수 함수로 구현, 테스트 758줄 존재
- API 4개 엔드포인트 (create, join, start, action)
- 서버: Firebase REST API / 클라이언트: Firebase SDK (실시간 리스너)
- 참고 레포: https://github.com/seejohnrun/coup — 시나리오/상호작용 검증용
- 현재 보안 이슈: 전체 GameState가 브라우저에 노출 (상대 카드 포함), 클라이언트 생성 playerId
- 레이스 컨디션 가능성: 빠른 게임 시작 시 구독 타이밍 갭

## Constraints

- **Tech Stack**: Next.js 14 + Firebase Realtime Database — 변경 불가
- **Language**: TypeScript — 전체 코드베이스 통일
- **Game Rules**: 공식 Coup 룰 준수 (2-6명, 리포메이션 포함)
- **Testing**: Jest 기반, 시나리오 기반 테스트로 룰 정확성 검증
- **Local Dev**: Firebase 에뮬레이터 또는 목업으로 로컬 테스트 가능해야 함

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase Realtime DB 유지 | 이미 구현된 실시간 동기화, 전환 비용 높음 | — Pending |
| 서버 사이드 상태 필터링 | 상대 카드 노출 방지를 위해 플레이어별 뷰 필요 | — Pending |
| seejohnrun/coup 참고 | 시나리오/상호작용 검증 기준으로 활용 | — Pending |
| 로컬 테스트 환경 구축 | Firebase 의존 없이 개발/테스트 가능 | — Pending |

---
*Last updated: 2026-02-23 after initialization*
