import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoomWithViews } from '@/lib/firebase';
import { GameState } from '@/lib/game/types';
import { filterStateForPlayer } from '@/lib/game/filter';

export async function POST(req: NextRequest) {
  const { roomId, playerId, force } = await req.json();
  if (!roomId || !playerId) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  const state = room.state;

  // waiting 단계에서는 재시작 불가
  if (state.phase === 'waiting') {
    return NextResponse.json({ error: '게임이 시작되지 않았습니다' }, { status: 400 });
  }

  // 호스트 전용
  if (state.players[0].id !== playerId) {
    return NextResponse.json({ error: '방장만 재시작 가능' }, { status: 403 });
  }

  // 게임 진행 중인 경우 force 플래그 필요
  if (state.phase !== 'game_over' && !force) {
    return NextResponse.json(
      { error: '진행 중인 게임입니다. 강제 재시작하려면 확인하세요' },
      { status: 400 }
    );
  }

  // 대기실로 복귀 (모든 플레이어 리셋, 레디 초기화)
  const newState: GameState = {
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: 2,
      cards: [],
      isAlive: true,
      isReady: false,
    })),
    currentTurnId: state.players[0].id,
    phase: 'waiting',
    deck: [],
    pendingAction: null,
    log: ['게임이 재시작되었습니다. 준비를 눌러주세요!'],
    gameMode: state.gameMode,
  };

  const views: Record<string, import('@/lib/game/types').FilteredGameState> = {};
  for (const p of newState.players) {
    views[p.id] = filterStateForPlayer(newState, p.id);
  }

  await updateRoomWithViews(roomId, newState, views);
  return NextResponse.json({ ok: true });
}
