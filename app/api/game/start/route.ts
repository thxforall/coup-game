import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { initGame } from '@/lib/game/engine';
import { filterStateForPlayer } from '@/lib/game/filter';

export async function POST(req: NextRequest) {
  const { roomId, playerId } = await req.json();
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  const state = room.state;
  if (state.phase !== 'waiting') return NextResponse.json({ error: '이미 시작됨' }, { status: 400 });
  if (state.players.length < 2) return NextResponse.json({ error: '최소 2명 필요' }, { status: 400 });
  if (state.players[0].id !== playerId) return NextResponse.json({ error: '방장만 시작 가능' }, { status: 403 });

  const newState = initGame(
    state.players.map((p) => ({ id: p.id, name: p.name, allegiance: p.allegiance })),
    state.gameMode,
    { useInquisitor: state.useInquisitor }
  );

  const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
  for (const p of newState.players) {
    views[p.id] = filterStateForPlayer(newState, p.id);
  }

  await updateRoomWithViews(roomId, newState, views);
  return NextResponse.json({ ok: true });
}
