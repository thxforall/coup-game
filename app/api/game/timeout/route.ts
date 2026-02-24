import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { resolveTimeouts, resolveActionTimeout, resolveExchangeTimeout } from '@/lib/game/engine';
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
  const resolved3 = resolveExchangeTimeout(resolved2);

  // state가 변경되지 않았으면 DB 쓰기 생략
  if (resolved3 === original) {
    return NextResponse.json({ ok: true, changed: false });
  }

  await updateRoomWithViews(roomId, resolved3, buildViews(resolved3));
  return NextResponse.json({ ok: true, changed: true });
}
