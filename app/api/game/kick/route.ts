import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { filterStateForPlayer } from '@/lib/game/filter';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, targetId } = await req.json();
    if (!roomId || !playerId || !targetId) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
    }

    const room = await getRoom(roomId.toUpperCase());
    if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

    const state = room.state;
    if (state.phase !== 'waiting') {
      return NextResponse.json({ error: '대기실에서만 추방할 수 있습니다' }, { status: 400 });
    }

    // 방장만 추방 가능
    if (state.players[0]?.id !== playerId) {
      return NextResponse.json({ error: '방장만 추방할 수 있습니다' }, { status: 403 });
    }

    // 자기 자신 추방 불가
    if (targetId === playerId) {
      return NextResponse.json({ error: '자신을 추방할 수 없습니다' }, { status: 400 });
    }

    const targetPlayer = state.players.find((p) => p.id === targetId);
    if (!targetPlayer) {
      return NextResponse.json({ error: '플레이어를 찾을 수 없습니다' }, { status: 404 });
    }

    const newState = {
      ...state,
      players: state.players.filter((p) => p.id !== targetId),
      kickedPlayerIds: [...(state.kickedPlayerIds ?? []), targetId],
      log: [...state.log, `${targetPlayer.name}이(가) 추방되었습니다`],
    };

    // 남은 플레이어들의 views 업데이트 (targetId 제외)
    const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
    for (const p of newState.players) {
      views[p.id] = filterStateForPlayer(newState, p.id);
    }

    await updateRoomWithViews(roomId.toUpperCase(), newState, views);

    // 추방된 플레이어의 view 노드 삭제
    if (DB_URL) {
      await fetch(`${DB_URL}/game_rooms/${roomId.toUpperCase()}/views/${targetId}.json`, {
        method: 'DELETE',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[KICK ERROR]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
