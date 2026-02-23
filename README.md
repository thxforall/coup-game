# Coup 온라인 보드게임 🃏

Next.js + Tailwind CSS + Supabase Realtime으로 만든 Coup 보드게임!

## 시작하기 전에

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 → 무료 계정 생성
2. **New Project** 클릭 → 프로젝트 이름 입력, 리전 선택 (Northeast Asia 권장)
3. 프로젝트 생성 완료 대기 (~2분)

### 2. DB 마이그레이션 실행

1. Supabase 대시보드 → **SQL Editor** 클릭
2. `migrations/001_create_game_rooms.sql` 파일 내용을 붙여넣기
3. **Run** 버튼 클릭

### 3. API 키 설정

1. Supabase 대시보드 → **Settings → API**
2. `Project URL`과 `anon public` 키 복사
3. 프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 값 입력:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. 의존성 설치 & 실행

```bash
npm install
npm run dev
```

→ `http://localhost:3000` 접속

## 게임 방법

1. 로비에서 닉네임 입력
2. **방 만들기** → 4자리 코드 생성
3. 친구에게 코드 공유 (각자 기기에서 접속)
4. 방장이 **게임 시작** 버튼 클릭
5. 즐기세요! 🎉

## Vercel 배포

1. [vercel.com](https://vercel.com) → GitHub 저장소 연결
2. **Environment Variables** 에 `.env.local`의 두 값 추가
3. Deploy!

## 캐릭터 및 액션

| 캐릭터 | 능력 | 차단 |
|--------|------|------|
| 👑 공작 (Duke) | 세금징수 +3 | 해외 원조 차단 |
| 🌹 백작부인 (Contessa) | - | 암살 차단 |
| ⚔️ 사령관 (Captain) | 갈취 | 갈취 차단 |
| 🗡️ 암살자 (Assassin) | 암살 (코인 3개) | - |
| 🕊️ 대사 (Ambassador) | 카드 교환 | 갈취 차단 |
