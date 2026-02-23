import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/supabase';
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
  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  let state = room.state;

  try {
    switch (action.type) {
      // 턴 액션 (소득, 외국 원조, 쿠, 세금, 암살, 강탈, 교환)
      case 'income':
      case 'foreignAid':
      case 'coup':
      case 'tax':
      case 'assassinate':
      case 'steal':
      case 'exchange': {
        if (state.currentTurnId !== playerId) {
          return NextResponse.json({ error: '당신의 턴이 아닙니다' }, { status: 403 });
        }
        state = processAction(state, playerId, {
          type: action.type as ActionType,
          targetId: action.targetId,
        });
        break;
      }

      // 도전/블록/패스 (awaiting_response 단계)
      case 'respond': {
        if (state.phase === 'awaiting_response') {
          state = processResponse(
            state,
            playerId,
            action.response as ResponseType,
            action.character as Character | undefined
          );
        } else if (state.phase === 'awaiting_block_response') {
          state = processBlockResponse(state, playerId, action.response as ResponseType);
        } else {
          return NextResponse.json({ error: '응답할 수 없는 단계입니다' }, { status: 400 });
        }
        break;
      }

      // 카드 잃기
      case 'lose_influence': {
        if (state.phase !== 'lose_influence') {
          return NextResponse.json({ error: '카드를 잃을 단계가 아닙니다' }, { status: 400 });
        }
        if (state.pendingAction?.losingPlayerId !== playerId) {
          return NextResponse.json({ error: '당신이 카드를 잃어야 하는 상황이 아닙니다' }, { status: 403 });
        }
        state = processLoseInfluence(state, playerId, action.cardIndex);
        break;
      }

      // 대사 교환 카드 선택
      case 'exchange_select': {
        if (state.phase !== 'exchange_select') {
          return NextResponse.json({ error: '교환 단계가 아닙니다' }, { status: 400 });
        }
        if (state.pendingAction?.actorId !== playerId) {
          return NextResponse.json({ error: '당신의 교환 차례가 아닙니다' }, { status: 403 });
        }
        state = processExchangeSelect(state, playerId, action.keptIndices);
        break;
      }

      default:
        return NextResponse.json({ error: `알 수 없는 액션: ${action.type}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await updateRoom(roomId, state);
  return NextResponse.json({ ok: true });
}
