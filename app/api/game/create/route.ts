import { NextRequest, NextResponse } from 'next/server';
import { createRoom } from '@/lib/firebase';
import { GameMode, GameState, Player } from '@/lib/game/types';

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { playerName, playerId, gameMode, useInquisitor } = await req.json();
  if (!playerName || !playerId) {
    return NextResponse.json({ error: '이름과 플레이어 ID가 필요합니다' }, { status: 400 });
  }

  const roomId = generateRoomId();

  const initialPlayer: Player = {
    id: playerId, name: playerName, coins: 2,
    cards: [], isAlive: true, isReady: false,
  };

  const mode: GameMode = gameMode === 'reformation' ? 'reformation' : gameMode === 'guess' ? 'guess' : 'standard';

  const now = Date.now();
  const initialState: GameState = {
    players: [initialPlayer],
    currentTurnId: playerId,
    phase: 'waiting',
    deck: [],
    pendingAction: null,
    log: [`${playerName}이(가) 방을 만들었습니다`],
    gameMode: mode,
    ...(mode === 'reformation' && { treasury: 0, useInquisitor: useInquisitor !== false }),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createRoom(roomId, initialState);
    return NextResponse.json({ roomId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CREATE ROOM ERROR]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
