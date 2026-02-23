-- ================================================
-- Coup 보드게임 DB 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- https://supabase.com/dashboard > SQL Editor
-- ================================================

-- 게임 룸 테이블
CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 오래된 방 자동 삭제 (24시간 이후)
-- (선택적: Supabase cron을 사용하려면 pg_cron 확장 필요)
-- DELETE FROM game_rooms WHERE created_at < now() - interval '24 hours';

-- RLS 활성화 (누구나 읽기/쓰기 가능 - 간단한 게임용)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_read" ON game_rooms
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert" ON game_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update" ON game_rooms
  FOR UPDATE USING (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
