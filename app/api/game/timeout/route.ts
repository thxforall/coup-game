import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { resolveTimeouts, resolveActionTimeout } from '@/lib/game/engine';
import { filterStateForPlayer } from '@/lib/game/filter';
import type { GameState, FilteredGameState } from '@/lib/game/types';

function buildViews(state: GameState) {
  const views: Record<string, FilteredGameState> = {};
  for (const p of state.players) {
    views[p.id] = filterStateForPlayer(state, p.id);
  }
  return views;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId } = body;
  if (!roomId) {
    return NextResponse.json({ error: 'roomId 필수' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  const original = room.state;
  const resolved = resolveTimeouts(original);
  const resolved2 = resolveActionTimeout(resolved);

  // state가 변경되지 않았으면 DB 쓰기 생략
  if (resolved2 === original) {
    return NextResponse.json({ ok: true, changed: false });
  }

  await updateRoomWithViews(roomId, resolved2, buildViews(resolved2));
  return NextResponse.json({ ok: true, changed: true });
}
