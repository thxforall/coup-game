import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { Allegiance } from '@/lib/game/types';
import { filterStateForPlayer } from '@/lib/game/filter';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, allegiance } = await req.json();
    if (!roomId || !playerId || !allegiance) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    }

    if (allegiance !== 'loyalist' && allegiance !== 'reformist') {
      return NextResponse.json({ error: '유효하지 않은 진영입니다' }, { status: 400 });
    }

    const room = await getRoom(roomId.toUpperCase());
    if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

    const state = room.state;
    if (state.phase !== 'waiting') {
      return NextResponse.json({ error: '대기실에서만 진영을 변경할 수 있습니다' }, { status: 400 });
    }
    if (state.gameMode !== 'reformation') {
      return NextResponse.json({ error: '종교개혁 모드에서만 진영을 변경할 수 있습니다' }, { status: 400 });
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return NextResponse.json({ error: '플레이어를 찾을 수 없습니다' }, { status: 404 });
    }

    const updatedPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, allegiance: allegiance as Allegiance } : p
    );

    const newState = {
      ...state,
      players: updatedPlayers,
    };

    const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
    for (const p of newState.players) {
      views[p.id] = filterStateForPlayer(newState, p.id);
    }

    await updateRoomWithViews(roomId.toUpperCase(), newState, views);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ALLEGIANCE ERROR]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
