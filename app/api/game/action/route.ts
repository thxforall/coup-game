import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/firebase';
import {
  processAction,
  processResponse,
  processBlockResponse,
  processLoseInfluence,
  processExchangeSelect,
} from '@/lib/game/engine';
import { ActionType, Character, ResponseType } from '@/lib/game/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, playerId, action } = body;
  if (!roomId || !playerId || !action) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });

  let state = room.state;

  try {
    switch (action.type) {
      case 'income': case 'foreignAid': case 'coup':
      case 'tax': case 'assassinate': case 'steal': case 'exchange': {
        if (state.currentTurnId !== playerId) return NextResponse.json({ error: '당신의 턴이 아닙니다' }, { status: 403 });
        state = processAction(state, playerId, { type: action.type as ActionType, targetId: action.targetId });
        break;
      }
      case 'respond': {
        if (state.phase === 'awaiting_response') {
          state = processResponse(state, playerId, action.response as ResponseType, action.character as Character | undefined);
        } else if (state.phase === 'awaiting_block_response') {
          state = processBlockResponse(state, playerId, action.response as ResponseType);
        } else {
          return NextResponse.json({ error: '응답할 수 없는 단계' }, { status: 400 });
        }
        break;
      }
      case 'lose_influence': {
        if (state.phase !== 'lose_influence') return NextResponse.json({ error: '잘못된 단계' }, { status: 400 });
        if (state.pendingAction?.losingPlayerId !== playerId) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
        state = processLoseInfluence(state, playerId, action.cardIndex);
        break;
      }
      case 'exchange_select': {
        if (state.phase !== 'exchange_select') return NextResponse.json({ error: '잘못된 단계' }, { status: 400 });
        if (state.pendingAction?.actorId !== playerId) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
        state = processExchangeSelect(state, playerId, action.keptIndices);
        break;
      }
      default:
        return NextResponse.json({ error: `알 수 없는 액션: ${action.type}` }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 400 });
  }

  await updateRoom(roomId, state);
  return NextResponse.json({ ok: true });
}
