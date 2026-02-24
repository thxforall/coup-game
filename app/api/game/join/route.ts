import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { Allegiance, Player } from '@/lib/game/types';
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
    const maxPlayers = state.gameMode === 'reformation' ? 10 : 6;
    if (state.players.length >= maxPlayers) return NextResponse.json({ error: '방이 가득 찼습니다' }, { status: 400 });

    // 재입장 확인 (ID가 같으면 이름 상관없이 통과)
    if (state.players.some((p) => p.id === playerId)) {
      return NextResponse.json({ roomId }, { status: 200 });
    }

    // 중복 닉네임 확인
    if (state.players.some((p) => p.name === playerName)) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다' }, { status: 400 });
    }

    const allegiances: Allegiance[] = ['loyalist', 'reformist'];
    const newPlayer: Player = {
      id: playerId, name: playerName, coins: 2,
      cards: [], isAlive: true, isReady: false,
      ...(state.gameMode === 'reformation' && { allegiance: allegiances[state.players.length % 2] }),
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
