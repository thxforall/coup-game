import { NextRequest, NextResponse } from 'next/server';
import { getRoom, deleteRoom } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId } = await req.json();
    if (!roomId || !playerId) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    }

    const room = await getRoom(roomId.toUpperCase());
    if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

    const state = room.state;
    
    // 방장만 삭제 가능
    if (state.players[0]?.id !== playerId) {
      return NextResponse.json({ error: '방장만 방을 삭제할 수 있습니다' }, { status: 403 });
    }

    await deleteRoom(roomId.toUpperCase());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE ROOM ERROR]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
