import { NextRequest, NextResponse } from 'next/server';
import { listRoomIds, deleteRoom } from '@/lib/firebase';

// Cleanup thresholds (ms)
const GAME_OVER_TTL = 30 * 60 * 1000;       // 30분: game_over 방치
const WAITING_TTL = 2 * 60 * 60 * 1000;      // 2시간: waiting 방치
const ABSOLUTE_TTL = 24 * 60 * 60 * 1000;    // 24시간: 어떤 상태든 최대 수명

// 한 번에 삭제할 최대 방 수 (Firebase REST API 부하 방지)
const MAX_DELETE_PER_RUN = 50;

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

interface RoomState {
  phase?: string;
  createdAt?: number;
  updatedAt?: number;
  players?: unknown[];
}

async function getRoomState(roomId: string): Promise<RoomState | null> {
  if (!DB_URL) return null;
  const res = await fetch(
    `${DB_URL}/game_rooms/${roomId}/state.json`,
    { cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data as RoomState | null;
}

export async function GET(req: NextRequest) {
  // Vercel Cron 인증: CRON_SECRET이 설정된 경우 검증
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = Date.now();
  const deleted: string[] = [];
  let checked = 0;

  try {
    const roomIds = await listRoomIds();
    checked = roomIds.length;

    for (const roomId of roomIds) {
      if (deleted.length >= MAX_DELETE_PER_RUN) break;

      const state = await getRoomState(roomId);

      // 상태를 읽을 수 없는 좀비 방 삭제
      if (!state) {
        console.log(`[cleanup] Deleting zombie room (no state): ${roomId}`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }

      const { phase, createdAt, updatedAt } = state;

      // 타임스탬프 없는 레거시 방 (구버전 방) 삭제
      if (!createdAt && !updatedAt) {
        console.log(`[cleanup] Deleting legacy room (no timestamps): ${roomId}`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }

      const lastActivity = updatedAt ?? createdAt ?? 0;
      const created = createdAt ?? lastActivity;

      // 24시간 초과 방 (어떤 상태든 절대 최대 수명)
      if (now - created > ABSOLUTE_TTL) {
        console.log(`[cleanup] Deleting room exceeded 24h TTL: ${roomId} (phase=${phase})`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }

      // game_over 상태에서 30분 이상 방치
      if (phase === 'game_over' && now - lastActivity > GAME_OVER_TTL) {
        console.log(`[cleanup] Deleting stale game_over room: ${roomId} (idle=${Math.round((now - lastActivity) / 60000)}m)`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }

      // waiting 상태에서 2시간 이상 방치
      if (phase === 'waiting' && now - lastActivity > WAITING_TTL) {
        console.log(`[cleanup] Deleting stale waiting room: ${roomId} (idle=${Math.round((now - lastActivity) / 60000)}m)`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cleanup] Error during room cleanup:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const kept = checked - deleted.length;
  console.log(`[cleanup] Done: checked=${checked}, deleted=${deleted.length}, kept=${kept}`);

  return NextResponse.json({ deleted, checked, kept });
}
