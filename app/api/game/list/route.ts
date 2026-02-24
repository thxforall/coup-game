import { NextResponse } from 'next/server';
import { listRoomIds, getRoom } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

const PLAYING_PHASES = new Set([
  'action',
  'awaiting_response',
  'awaiting_block_response',
  'lose_influence',
  'exchange_select',
  'examine_select',
]);

interface RoomListItem {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameMode: string;
  createdAt: number;
  status: 'waiting' | 'playing';
  alivePlayers?: number;
}

export async function GET() {
  try {
    const roomIds = await listRoomIds();

    const waitingRooms: RoomListItem[] = [];
    const playingRooms: RoomListItem[] = [];

    // Fetch rooms in parallel, limit to first 60 candidates to allow filling both buckets
    const candidates = roomIds.slice(0, 60);
    const results = await Promise.all(
      candidates.map((id) => getRoom(id).catch(() => null))
    );

    for (let i = 0; i < candidates.length; i++) {
      const room = results[i];
      if (!room) continue;

      const { state } = room;

      if (state.phase === 'waiting') {
        if (waitingRooms.length >= 20) continue;
        waitingRooms.push({
          roomId: candidates[i],
          hostName: state.players[0]?.name ?? '???',
          playerCount: state.players.length,
          maxPlayers: 6,
          gameMode: state.gameMode ?? 'standard',
          createdAt: state.createdAt ?? 0,
          status: 'waiting',
        });
      } else if (PLAYING_PHASES.has(state.phase)) {
        if (playingRooms.length >= 10) continue;
        playingRooms.push({
          roomId: candidates[i],
          hostName: state.players[0]?.name ?? '???',
          playerCount: state.players.length,
          maxPlayers: 6,
          gameMode: state.gameMode ?? 'standard',
          createdAt: state.createdAt ?? 0,
          status: 'playing',
          alivePlayers: state.players.filter((p) => p.isAlive).length,
        });
      }
      // game_over: skip (끝난 게임은 표시하지 않음)
    }

    // Sort each group by createdAt descending (newest first)
    waitingRooms.sort((a, b) => b.createdAt - a.createdAt);
    playingRooms.sort((a, b) => b.createdAt - a.createdAt);

    // waiting 방 먼저, 그 다음 playing 방
    const rooms = [...waitingRooms, ...playingRooms];

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('[LIST ROOMS ERROR]', error);
    return NextResponse.json([], { status: 200 });
  }
}
