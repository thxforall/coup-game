import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { initGame } from '@/lib/game/engine';
import { filterStateForPlayer } from '@/lib/game/filter';

export async function POST(req: NextRequest) {
  const { roomId, playerId } = await req.json();
  if (!roomId || !playerId) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  const state = room.state;
  if (state.phase !== 'game_over') {
    return NextResponse.json({ error: '게임이 끝나지 않았습니다' }, { status: 400 });
  }
  if (state.players[0].id !== playerId) {
    return NextResponse.json({ error: '방장만 재시작 가능' }, { status: 403 });
  }

  // 기존 모든 플레이어(탈락자 포함)로 새 게임 초기화
  const allPlayers = state.players.map((p) => ({ id: p.id, name: p.name }));
  const newState = initGame(allPlayers, state.gameMode);

  const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
  for (const p of newState.players) {
    views[p.id] = filterStateForPlayer(newState, p.id);
  }

  await updateRoomWithViews(roomId, newState, views);
  return NextResponse.json({ ok: true });
}
