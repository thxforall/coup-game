import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom, updateRoomWithViews } from '@/lib/firebase';
import { removePlayer } from '@/lib/game/engine';
import { GameState, FilteredGameState } from '@/lib/game/types';
import { filterStateForPlayer } from '@/lib/game/filter';

function buildViews(state: GameState) {
  const views: Record<string, FilteredGameState> = {};
  for (const p of state.players) {
    views[p.id] = filterStateForPlayer(state, p.id);
  }
  return views;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, playerId } = body;

  if (!roomId || !playerId) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  const { state } = room;

  // game_over: 별도 처리 없이 200 반환
  if (state.phase === 'game_over') {
    return NextResponse.json({ ok: true });
  }

  // waiting: 플레이어를 players 배열에서 제거
  if (state.phase === 'waiting') {
    const updatedState: GameState = {
      ...state,
      players: state.players.filter((p) => p.id !== playerId),
    };
    await updateRoom(roomId, updatedState);
    return NextResponse.json({ ok: true });
  }

  // 게임 진행 중: removePlayer로 카드 공개 + 탈락 처리
  try {
    const newState = removePlayer(state, playerId);
    await updateRoomWithViews(roomId, newState, buildViews(newState));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '오류' },
      { status: 400 }
    );
  }
}
