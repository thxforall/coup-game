import {
  Character,
  ActionType,
  GameState,
  Player,
  Card,
  PendingAction,
  ResponseType,
  CHARACTER_NAMES,
  ACTION_NAMES,
  BLOCK_CHARACTERS,
} from './types';

// ============================================================
// 덱 유틸리티
// ============================================================

const ALL_CHARACTERS: Character[] = [
  'Duke', 'Duke', 'Duke',
  'Contessa', 'Contessa', 'Contessa',
  'Captain', 'Captain', 'Captain',
  'Assassin', 'Assassin', 'Assassin',
  'Ambassador', 'Ambassador', 'Ambassador',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// 게임 초기화
// ============================================================

export function initGame(players: { id: string; name: string }[]): GameState {
  const deck = shuffle([...ALL_CHARACTERS]);
  const gamePlayers: Player[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    coins: 2,
    cards: [
      { character: deck.pop()!, revealed: false },
      { character: deck.pop()!, revealed: false },
    ],
    isAlive: true,
    isReady: false,
  }));

  return {
    players: gamePlayers,
    currentTurnId: gamePlayers[0].id,
    phase: 'action',
    deck,
    pendingAction: null,
    log: ['게임이 시작되었습니다!'],
  };
}

// ============================================================
// 헬퍼 함수
// ============================================================

export function getPlayer(state: GameState, id: string): Player {
  const p = state.players.find((p) => p.id === id);
  if (!p) throw new Error(`Player ${id} not found`);
  return p;
}

export function getAlivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.isAlive);
}

function getLiveCardCount(player: Player): number {
  return player.cards.filter((c) => !c.revealed).length;
}

function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [...state.log, msg] };
}

// 다음 살아있는 플레이어로 턴 이동
function nextTurn(state: GameState): GameState {
  const alive = getAlivePlayers(state);
  const idx = alive.findIndex((p) => p.id === state.currentTurnId);
  const next = alive[(idx + 1) % alive.length];
  return { ...state, currentTurnId: next.id, phase: 'action', pendingAction: null };
}

// 특정 플레이어가 캐릭터 카드(비공개)를 보유 중인지 확인
function hasCharacter(player: Player, character: Character): boolean {
  return player.cards.some((c) => c.character === character && !c.revealed);
}

// 카드 1장 잃기 (인덱스 지정)
function revealCard(player: Player, cardIndex: number): Player {
  const cards = [...player.cards];
  cards[cardIndex] = { ...cards[cardIndex], revealed: true };
  const liveCount = cards.filter((c) => !c.revealed).length;
  return { ...player, cards, isAlive: liveCount > 0 };
}

// 도전 성공 처리: 거짓말쟁이가 카드 1장 잃음
function removeFirstLiveCard(player: Player): Player {
  const idx = player.cards.findIndex((c) => !c.revealed);
  if (idx === -1) return player;
  return revealCard(player, idx);
}

// 승자 확인
function checkWinner(state: GameState): GameState {
  const alive = getAlivePlayers(state);
  if (alive.length === 1) {
    return {
      ...state,
      phase: 'game_over',
      winnerId: alive[0].id,
      log: [...state.log, `🏆 ${alive[0].name}이(가) 승리했습니다!`],
    };
  }
  return state;
}

// ============================================================
// 액션 처리 Phase 1: 액션 선언
// ============================================================

export function processAction(
  state: GameState,
  actorId: string,
  action: { type: ActionType; targetId?: string }
): GameState {
  const actor = getPlayer(state, actorId);
  const { type, targetId } = action;

  // 쿠 10코인 강제 체크
  if (actor.coins >= 10 && type !== 'coup') {
    throw new Error('코인이 10개 이상이면 쿠를 해야 합니다');
  }

  let s = state;

  switch (type) {
    case 'income': {
      // 즉시 처리: 도전/블록 불가
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins + 1 } : p
      );
      s = addLog({ ...s, players: updatedPlayers }, `${actor.name}이(가) 소득을 취했습니다 (+1 코인)`);
      return nextTurn(s);
    }

    case 'coup': {
      if (!targetId) throw new Error('쿠: 대상이 필요합니다');
      if (actor.coins < 7) throw new Error('쿠: 코인 7개 필요');
      // 코인 차감, 상대방 카드 잃기 단계로 진입
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins - 7 } : p
      );
      const target = getPlayer(s, targetId);
      s = addLog(
        { ...s, players: updatedPlayers },
        `${actor.name}이(가) ${target.name}에게 쿠를 선언했습니다!`
      );
      s = {
        ...s,
        phase: 'lose_influence',
        pendingAction: { type, actorId, targetId, responses: {}, losingPlayerId: targetId },
      };
      return s;
    }

    case 'foreignAid': {
      // 공작이 블록 가능 — 다른 플레이어 응답 대기
      const others = getAlivePlayers(s).filter((p) => p.id !== actorId);
      const responses: Record<string, ResponseType | null> = {};
      others.forEach((p) => { responses[p.id] = null; });
      s = addLog(s, `${actor.name}이(가) 외국 원조를 요청했습니다`);
      return {
        ...s,
        phase: 'awaiting_response',
        pendingAction: { type, actorId, responses },
      };
    }

    case 'tax':
    case 'assassinate':
    case 'steal':
    case 'exchange': {
      if ((type === 'assassinate' || type === 'steal') && !targetId) {
        throw new Error(`${type}: 대상이 필요합니다`);
      }
      if (type === 'assassinate') {
        if (actor.coins < 3) throw new Error('암살: 코인 3개 필요');
        const updatedPlayers = s.players.map((p) =>
          p.id === actorId ? { ...p, coins: p.coins - 3 } : p
        );
        s = { ...s, players: updatedPlayers };
      }

      const target = targetId ? getPlayer(s, targetId) : undefined;
      const others = getAlivePlayers(s).filter((p) => p.id !== actorId);
      const responses: Record<string, ResponseType | null> = {};
      others.forEach((p) => { responses[p.id] = null; });

      const logMsg = target
        ? `${actor.name}이(가) ${ACTION_NAMES[type]}을(를) ${target.name}에게 사용합니다`
        : `${actor.name}이(가) ${ACTION_NAMES[type]}을(를) 사용합니다`;

      s = addLog(s, logMsg);
      return {
        ...s,
        phase: 'awaiting_response',
        pendingAction: { type, actorId, targetId, responses },
      };
    }

    default:
      throw new Error(`Unknown action: ${type}`);
  }
}

// ============================================================
// 액션 처리 Phase 2: 응답 (도전/블록/패스)
// ============================================================

export function processResponse(
  state: GameState,
  responderId: string,
  response: ResponseType,
  blockCharacter?: Character
): GameState {
  const pending = state.pendingAction;
  if (!pending) throw new Error('No pending action');

  const responder = getPlayer(state, responderId);
  let s = state;

  // --- 도전 ---
  if (response === 'challenge') {
    return resolveChallenge(s, responderId);
  }

  // --- 블록 ---
  if (response === 'block') {
    if (!blockCharacter) throw new Error('블록 시 캐릭터를 지정해야 합니다');
    const allowedBlockers = BLOCK_CHARACTERS[pending.type];
    if (!allowedBlockers || !allowedBlockers.includes(blockCharacter)) {
      throw new Error(`${CHARACTER_NAMES[blockCharacter]}은(는) 이 행동을 막을 수 없습니다`);
    }
    s = addLog(s, `${responder.name}이(가) ${CHARACTER_NAMES[blockCharacter]}으로 막습니다!`);

    // 블록 선언 후 다른 플레이어들이 그 블록에 도전 가능
    const others = getAlivePlayers(s).filter((p) => p.id !== responderId);
    const blockResponses: Record<string, ResponseType | null> = {};
    others.forEach((p) => { blockResponses[p.id] = null; });

    return {
      ...s,
      phase: 'awaiting_block_response',
      pendingAction: {
        ...pending,
        responses: blockResponses,
        blockerId: responderId,
        blockerCharacter: blockCharacter,
      },
    };
  }

  // --- 패스 ---
  const updatedResponses = { ...pending.responses, [responderId]: 'pass' as ResponseType };
  s = { ...s, pendingAction: { ...pending, responses: updatedResponses } };

  // 모든 플레이어가 응답했는지 확인
  const allResponded = Object.values(updatedResponses).every((r) => r !== null);
  if (allResponded) {
    return resolveAction(s);
  }
  return s;
}

// ============================================================
// 블록에 대한 응답 처리
// ============================================================

export function processBlockResponse(
  state: GameState,
  responderId: string,
  response: ResponseType
): GameState {
  const pending = state.pendingAction;
  if (!pending || !pending.blockerId) throw new Error('No pending block');

  let s = state;
  const responder = getPlayer(s, responderId);

  if (response === 'challenge') {
    // 블록에 도전: 블로커가 실제로 그 캐릭터를 가지고 있는지 확인
    const blocker = getPlayer(s, pending.blockerId);
    const blockerHasCard = hasCharacter(blocker, pending.blockerCharacter!);

    if (blockerHasCard) {
      // 블록이 사실 → 도전자가 카드 잃음, 블로커 카드 교체
      const newDeck = [...s.deck, pending.blockerCharacter!];
      const shuffledDeck = shuffle(newDeck);
      const newCard = shuffledDeck.pop()!;
      const updatedBlockerCards = blocker.cards.map((c) =>
        c.character === pending.blockerCharacter! && !c.revealed
          ? { ...c, character: newCard }
          : c
      );
      let updatedPlayers = s.players.map((p) =>
        p.id === pending.blockerId ? { ...p, cards: updatedBlockerCards } : p
      );
      // 도전자 카드 잃음
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === responderId ? removeFirstLiveCard(p) : p
      );
      s = addLog(
        { ...s, players: updatedPlayers, deck: shuffledDeck },
        `${responder.name}의 도전 실패! ${blocker.name}이(가) 진짜 ${CHARACTER_NAMES[pending.blockerCharacter!]}이었습니다`
      );
      // 블록 성공 → 액션 무효, 다음 턴
      s = addLog(s, '블록 성공! 행동이 취소되었습니다');
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      return nextTurn(s);
    } else {
      // 블록이 거짓 → 블로커가 카드 잃음, 행동 진행
      let updatedPlayers = s.players.map((p) =>
        p.id === pending.blockerId ? removeFirstLiveCard(p) : p
      );
      s = addLog(
        { ...s, players: updatedPlayers },
        `${responder.name}의 도전 성공! ${blocker.name}이(가) 블러프였습니다`
      );
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      // 행동 진행
      return executeAction(s);
    }
  }

  // 패스
  const updatedResponses = { ...pending.responses, [responderId]: 'pass' as ResponseType };
  s = { ...s, pendingAction: { ...pending, responses: updatedResponses } };

  const allResponded = Object.values(updatedResponses).every((r) => r !== null);
  if (allResponded) {
    // 모두 패스 → 블록 성공, 액션 무효
    s = addLog(s, '블록이 확정되었습니다. 행동이 취소되었습니다');
    return nextTurn(s);
  }
  return s;
}

// ============================================================
// 도전 처리
// ============================================================

function resolveChallenge(state: GameState, challengerId: string): GameState {
  const pending = state.pendingAction!;
  const actor = getPlayer(state, pending.actorId);
  const challenger = getPlayer(state, challengerId);

  // 행동에 필요한 캐릭터 확인
  const requiredChar = getRequiredCharacter(pending.type);
  if (!requiredChar) {
    throw new Error('이 행동은 도전할 수 없습니다');
  }

  const actorHasCard = hasCharacter(actor, requiredChar);
  let s = state;

  if (actorHasCard) {
    // 도전 실패: 도전자가 카드 잃음, 행동자는 카드 교체
    const newDeck = [...s.deck, requiredChar];
    const shuffled = shuffle(newDeck);
    const newCard = shuffled.pop()!;
    const updatedActorCards = actor.cards.map((c, i) => {
      if (c.character === requiredChar && !c.revealed) {
        return { ...c, character: newCard };
      }
      return c;
    });
    let updatedPlayers = s.players.map((p) =>
      p.id === pending.actorId ? { ...p, cards: updatedActorCards } : p
    );
    updatedPlayers = updatedPlayers.map((p) =>
      p.id === challengerId ? removeFirstLiveCard(p) : p
    );
    s = addLog(
      { ...s, players: updatedPlayers, deck: shuffled },
      `${challenger.name}의 도전 실패! ${actor.name}이(가) 진짜 ${CHARACTER_NAMES[requiredChar]}이었습니다`
    );
    s = checkWinner(s);
    if (s.phase === 'game_over') return s;
    // 행동 실행
    return executeAction(s);
  } else {
    // 도전 성공: 행동자가 카드 잃음, 행동 무효
    let updatedPlayers = s.players.map((p) =>
      p.id === pending.actorId ? removeFirstLiveCard(p) : p
    );
    s = addLog(
      { ...s, players: updatedPlayers },
      `${challenger.name}의 도전 성공! ${actor.name}이(가) 블러프였습니다`
    );

    // 암살의 경우 코인 환불 안함 (공식 룰)
    s = checkWinner(s);
    if (s.phase === 'game_over') return s;
    return nextTurn(s);
  }
}

function getRequiredCharacter(actionType: ActionType): Character | null {
  const map: Partial<Record<ActionType, Character>> = {
    tax: 'Duke',
    assassinate: 'Assassin',
    steal: 'Captain',
    exchange: 'Ambassador',
  };
  return map[actionType] ?? null;
}

// ============================================================
// 응답 수집 완료 후 액션 실행
// ============================================================

function resolveAction(state: GameState): GameState {
  // 모든 플레이어가 패스한 경우
  return executeAction(state);
}

function executeAction(state: GameState): GameState {
  const pending = state.pendingAction!;
  const { type, actorId, targetId } = pending;
  const actor = getPlayer(state, actorId);
  let s = state;

  switch (type) {
    case 'foreignAid': {
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins + 2 } : p
      );
      s = addLog({ ...s, players: updatedPlayers }, `${actor.name}이(가) 외국 원조를 받았습니다 (+2 코인)`);
      return nextTurn(s);
    }

    case 'tax': {
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins + 3 } : p
      );
      s = addLog({ ...s, players: updatedPlayers }, `${actor.name}이(가) 세금을 걷었습니다 (+3 코인)`);
      return nextTurn(s);
    }

    case 'steal': {
      if (!targetId) throw new Error('steal: targetId required');
      const target = getPlayer(s, targetId);
      const stolen = Math.min(target.coins, 2);
      const updatedPlayers = s.players.map((p) => {
        if (p.id === actorId) return { ...p, coins: p.coins + stolen };
        if (p.id === targetId) return { ...p, coins: p.coins - stolen };
        return p;
      });
      s = addLog(
        { ...s, players: updatedPlayers },
        `${actor.name}이(가) ${target.name}으로부터 ${stolen}코인을 강탈했습니다`
      );
      return nextTurn(s);
    }

    case 'assassinate': {
      if (!targetId) throw new Error('assassinate: targetId required');
      const target = getPlayer(s, targetId);
      s = addLog(s, `${actor.name}이(가) ${target.name}을 암살합니다`);
      // 대상이 카드 선택 (lose_influence)
      return {
        ...s,
        phase: 'lose_influence',
        pendingAction: { ...pending, losingPlayerId: targetId },
      };
    }

    case 'exchange': {
      // 덱에서 2장 뽑기
      const newDeck = [...s.deck];
      const card1 = newDeck.pop()!;
      const card2 = newDeck.pop()!;
      s = addLog(s, `${actor.name}이(가) 교환할 카드를 선택합니다`);
      return {
        ...s,
        deck: newDeck,
        phase: 'exchange_select',
        pendingAction: { ...pending, exchangeCards: [card1, card2] },
      };
    }

    default:
      throw new Error(`Cannot execute action: ${type}`);
  }
}

// ============================================================
// 카드 잃기 처리
// ============================================================

export function processLoseInfluence(
  state: GameState,
  playerId: string,
  cardIndex: number
): GameState {
  const pending = state.pendingAction;
  if (!pending) throw new Error('No pending action');

  let s = state;
  const player = getPlayer(s, playerId);

  // 카드 공개
  const updatedPlayers = s.players.map((p) =>
    p.id === playerId ? revealCard(p, cardIndex) : p
  );
  const updatedPlayer = updatedPlayers.find((p) => p.id === playerId)!;

  s = addLog(
    { ...s, players: updatedPlayers },
    `${player.name}이(가) ${CHARACTER_NAMES[player.cards[cardIndex].character]}을(를) 잃었습니다`
  );

  if (!updatedPlayer.isAlive) {
    s = addLog(s, `${player.name}이(가) 탈락했습니다`);
  }

  s = checkWinner(s);
  if (s.phase === 'game_over') return s;
  return nextTurn(s);
}

// ============================================================
// 대사 교환 처리
// ============================================================

export function processExchangeSelect(
  state: GameState,
  actorId: string,
  keptIndices: number[] // 유지할 카드의 인덱스 (합쳐진 배열 기준)
): GameState {
  const pending = state.pendingAction;
  if (!pending || !pending.exchangeCards) throw new Error('No exchange pending');

  const actor = getPlayer(state, actorId);
  const liveCards = actor.cards.filter((c) => !c.revealed);
  const allOptions = [...liveCards.map((c) => c.character), ...pending.exchangeCards];

  // keptIndices로 유지할 카드 선택
  const keptChars = keptIndices.map((i) => allOptions[i]);
  const returnChars = allOptions.filter((_, i) => !keptIndices.includes(i));

  const newDeck = shuffle([...state.deck, ...returnChars]);

  // 플레이어 카드 업데이트
  let keptIdx = 0;
  const newCards = actor.cards.map((c) => {
    if (!c.revealed) {
      return { ...c, character: keptChars[keptIdx++] };
    }
    return c;
  });

  const updatedPlayers = state.players.map((p) =>
    p.id === actorId ? { ...p, cards: newCards } : p
  );

  let s = addLog(
    { ...state, players: updatedPlayers, deck: newDeck },
    `${actor.name}이(가) 카드를 교환했습니다`
  );
  return nextTurn(s);
}
