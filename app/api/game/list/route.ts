import { NextResponse } from 'next/server';
import { listRoomIds, getRoom } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

interface RoomListItem {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameMode: string;
  createdAt: number;
}

export async function GET() {
  try {
    const roomIds = await listRoomIds();

    const rooms: RoomListItem[] = [];

    // Fetch rooms in parallel, limit to first 30 candidates to avoid overload
    const candidates = roomIds.slice(0, 30);
    const results = await Promise.all(
      candidates.map((id) => getRoom(id).catch(() => null))
    );

    for (let i = 0; i < candidates.length; i++) {
      const room = results[i];
      if (!room) continue;

      const { state } = room;
      if (state.phase !== 'waiting') continue;

      rooms.push({
        roomId: candidates[i],
        hostName: state.players[0]?.name ?? '???',
        playerCount: state.players.length,
        maxPlayers: 6,
        gameMode: state.gameMode ?? 'standard',
        createdAt: state.createdAt ?? 0,
      });

      // Max 20 waiting rooms
      if (rooms.length >= 20) break;
    }

    // Sort by createdAt descending (newest first)
    rooms.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('[LIST ROOMS ERROR]', error);
    return NextResponse.json([], { status: 200 });
  }
}
