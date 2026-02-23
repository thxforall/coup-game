import {
  GameState,
  FilteredGameState,
  FilteredPlayer,
  FilteredPendingAction,
  MaskedCard,
} from './types';

/**
 * 특정 플레이어 시점으로 GameState를 필터링
 * - 본인 카드: 완전 노출 (Card[])
 * - 상대 카드: revealed=false이면 character=null (MaskedCard[])
 * - deck: 제거
 * - exchangeCards: 본인 exchange일 때만 포함
 */
export function filterStateForPlayer(
  state: GameState,
  playerId: string
): FilteredGameState {
  const players: FilteredPlayer[] = state.players.map((p) => {
    if (p.id === playerId) {
      // 본인: 카드 완전 노출
      return {
        id: p.id,
        name: p.name,
        coins: p.coins,
        cards: p.cards,
        isAlive: p.isAlive,
        isReady: p.isReady,
      };
    }
    // 상대: 비공개 카드 마스킹
    const maskedCards: MaskedCard[] = p.cards.map((c) => ({
      revealed: c.revealed,
      character: c.revealed ? c.character : null,
    }));
    return {
      id: p.id,
      name: p.name,
      coins: p.coins,
      cards: maskedCards,
      isAlive: p.isAlive,
      isReady: p.isReady,
    };
  });

  let pendingAction: FilteredPendingAction | null = null;
  if (state.pendingAction) {
    const pa = state.pendingAction;
    pendingAction = {
      type: pa.type,
      actorId: pa.actorId,
      targetId: pa.targetId,
      responses: pa.responses,
      blockerId: pa.blockerId,
      blockerCharacter: pa.blockerCharacter,
      losingPlayerId: pa.losingPlayerId,
    };
    // exchangeCards: 본인 exchange일 때만 포함
    if (pa.exchangeCards && pa.actorId === playerId) {
      pendingAction.exchangeCards = pa.exchangeCards;
    }
  }

  return {
    players,
    currentTurnId: state.currentTurnId,
    phase: state.phase,
    pendingAction,
    log: state.log,
    ...(state.winnerId !== undefined && { winnerId: state.winnerId }),
  };
}
