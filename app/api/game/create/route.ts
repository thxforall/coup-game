import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GameState, Player } from '@/lib/game/types';

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { playerName, playerId } = await req.json();

  if (!playerName || !playerId) {
    return NextResponse.json({ error: '이름과 플레이어 ID가 필요합니다' }, { status: 400 });
  }

  // 고유한 방 코드 생성
  let roomId = generateRoomId();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await supabase.from('game_rooms').select('id').eq('id', roomId).single();
    if (!data) break;
    roomId = generateRoomId();
    attempts++;
  }

  const initialPlayer: Player = {
    id: playerId,
    name: playerName,
    coins: 2,
    cards: [],
    isAlive: true,
    isReady: false,
  };

  const initialState: GameState = {
    players: [initialPlayer],
    currentTurnId: playerId,
    phase: 'waiting',
    deck: [],
    pendingAction: null,
    log: [`${playerName}이(가) 방을 만들었습니다`],
  };

  const { error } = await supabase.from('game_rooms').insert({ id: roomId, state: initialState });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roomId });
}
