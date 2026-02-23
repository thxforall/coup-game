import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/firebase';
import { Player } from '@/lib/game/types';

export async function POST(req: NextRequest) {
  const { roomId, playerName, playerId } = await req.json();
  if (!roomId || !playerName || !playerId) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const room = await getRoom(roomId.toUpperCase());
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  const state = room.state;
  if (state.phase !== 'waiting') return NextResponse.json({ error: '게임이 이미 시작되었습니다' }, { status: 400 });
  if (state.players.length >= 6) return NextResponse.json({ error: '방이 가득 찼습니다' }, { status: 400 });
  if (state.players.find((p) => p.id === playerId)) return NextResponse.json({ roomId }, { status: 200 });

  const newPlayer: Player = {
    id: playerId, name: playerName, coins: 2,
    cards: [], isAlive: true, isReady: false,
  };

  await updateRoom(roomId.toUpperCase(), {
    ...state,
    players: [...state.players, newPlayer],
    log: [...state.log, `${playerName}이(가) 참가했습니다`],
  });

  return NextResponse.json({ roomId });
}
