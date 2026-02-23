import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { Player } from '@/lib/game/types';
import { filterStateForPlayer } from '@/lib/game/filter';

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerName, playerId } = await req.json();
    if (!roomId || !playerName || !playerId) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    }

    const room = await getRoom(roomId.toUpperCase());
    if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

    const state = room.state;
    if (state.phase !== 'waiting') return NextResponse.json({ error: '게임이 이미 시작되었습니다' }, { status: 400 });
    if (state.players.length >= 6) return NextResponse.json({ error: '방이 가득 찼습니다' }, { status: 400 });
    if (state.kickedPlayerIds?.includes(playerId)) {
      return NextResponse.json({ error: '추방된 방에는 다시 참가할 수 없습니다' }, { status: 403 });
    }
    if (state.players.find((p) => p.id === playerId)) return NextResponse.json({ roomId }, { status: 200 });

    const newPlayer: Player = {
      id: playerId, name: playerName, coins: 2,
      cards: [], isAlive: true, isReady: false,
    };

    const newState = {
      ...state,
      players: [...state.players, newPlayer],
      log: [...state.log, `${playerName}이(가) 참가했습니다`],
    };

    const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
    for (const p of newState.players) {
      views[p.id] = filterStateForPlayer(newState, p.id);
    }

    await updateRoomWithViews(roomId.toUpperCase(), newState, views);
    return NextResponse.json({ roomId });
  } catch (error) {
    console.error('[JOIN ERROR]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
