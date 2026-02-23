import { NextRequest, NextResponse } from 'next/server';
import { getRoom } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const playerId = req.nextUrl.searchParams.get('playerId');

  if (!roomId || !playerId) {
    return NextResponse.json({ error: 'roomId와 playerId가 필요합니다' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ active: false, phase: null });
  }

  const { state } = room;
  const isPlayer = state.players.some((p) => p.id === playerId);

  if (!isPlayer) {
    return NextResponse.json({ active: false, phase: state.phase });
  }

  return NextResponse.json({ active: true, phase: state.phase });
}
