import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/firebase';
import { initGame } from '@/lib/game/engine';

export async function POST(req: NextRequest) {
  const { roomId, playerId } = await req.json();
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  const state = room.state;
  if (state.phase !== 'waiting') return NextResponse.json({ error: '이미 시작됨' }, { status: 400 });
  if (state.players.length < 2) return NextResponse.json({ error: '최소 2명 필요' }, { status: 400 });
  if (state.players[0].id !== playerId) return NextResponse.json({ error: '방장만 시작 가능' }, { status: 403 });

  const newState = initGame(state.players.map((p) => ({ id: p.id, name: p.name })));
  await updateRoom(roomId, newState);
  return NextResponse.json({ ok: true });
}
