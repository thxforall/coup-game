import { NextRequest, NextResponse } from 'next/server';
import { listRoomIds, getRoom, deleteRoom, isRoomStale } from '@/lib/firebase';

// 한 번에 삭제할 최대 방 수 (Firebase REST API 부하 방지)
const MAX_DELETE_PER_RUN = 50;

export async function GET(req: NextRequest) {
  // Vercel Cron 인증: CRON_SECRET이 설정된 경우 검증
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const deleted: string[] = [];
  let checked = 0;

  try {
    const roomIds = await listRoomIds();
    checked = roomIds.length;

    for (const roomId of roomIds) {
      if (deleted.length >= MAX_DELETE_PER_RUN) break;

      const room = await getRoom(roomId);

      // 상태를 읽을 수 없는 좀비 방 삭제
      if (!room) {
        console.log(`[cleanup] Deleting zombie room (no state): ${roomId}`);
        await deleteRoom(roomId);
        deleted.push(roomId);
        continue;
      }

      if (isRoomStale(room.state)) {
        console.log(`[cleanup] Deleting stale room: ${roomId} (phase=${room.state.phase})`);
        await deleteRoom(roomId);
        deleted.push(roomId);
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
