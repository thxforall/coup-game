import {
  Character,
  ActionType,
  GameMode,
  GameState,
  Player,
  Card,
  PendingAction,
  ResponseType,
  CHARACTER_NAMES,
  ACTION_NAMES,
  BLOCK_CHARACTERS,
  ChallengeLoseContext,
  LogEntry,
  LogEntryType,
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

export function initGame(players: { id: string; name: string }[], gameMode?: string): GameState {
  const deck = shuffle([...ALL_CHARACTERS]);
  const mode: GameMode = gameMode === 'guess' ? 'guess' : 'standard';
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

  const firstPlayerIndex = Math.floor(Math.random() * gamePlayers.length);
  const firstPlayer = gamePlayers[firstPlayerIndex];

  const now = Date.now();
  const startMsg = mode === 'guess' ? '게임이 시작되었습니다! (추측 모드)' : '게임이 시작되었습니다!';
  const turnMsg = `--- ${firstPlayer.name}의 턴 ---`;

  return {
    players: gamePlayers,
    currentTurnId: firstPlayer.id,
    phase: 'action',
    deck,
    pendingAction: null,
    actionDeadline: Date.now() + 45000,
    log: [startMsg, turnMsg],
    structuredLog: [
      { type: 'game_start', message: startMsg, timestamp: now },
      { type: 'turn_start', message: turnMsg, actorId: firstPlayer.id, timestamp: now + 1 },
    ],
    gameMode: mode,
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

function addLog(state: GameState, msg: string, entry?: Omit<LogEntry, 'message' | 'timestamp'>): GameState {
  const newState = { ...state, log: [...state.log, msg] };
  if (entry) {
    const logEntry: LogEntry = { ...entry, message: msg, timestamp: Date.now() };
    newState.structuredLog = [...(state.structuredLog ?? []), logEntry];
  } else {
    newState.structuredLog = [...(state.structuredLog ?? []), { type: 'action_declared' as LogEntryType, message: msg, timestamp: Date.now() }];
  }
  return newState;
}

function addPrivateLog(state: GameState, playerId: string, msg: string, entry?: Omit<LogEntry, 'message' | 'timestamp' | 'visibleTo'>): GameState {
  const logEntry: LogEntry = {
    ...(entry ?? { type: 'action_resolved' as LogEntryType }),
    message: msg,
    timestamp: Date.now(),
    visibleTo: playerId,
  };
  return {
    ...state,
    structuredLog: [...(state.structuredLog ?? []), logEntry],
    // log[] (string[])에는 추가하지 않음 — 비공개이므로
  };
}

// 다음 살아있는 플레이어로 턴 이동
function nextTurn(state: GameState): GameState {
  const alive = getAlivePlayers(state);
  const idx = alive.findIndex((p) => p.id === state.currentTurnId);
  const next = alive[(idx + 1) % alive.length];
  const s = addLog(state, `--- ${next.name}의 턴 ---`, { type: 'turn_start', actorId: next.id });
  return { ...s, currentTurnId: next.id, phase: 'action', pendingAction: null, actionDeadline: Date.now() + 45000 };
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
  action: { type: ActionType; targetId?: string; guessedCharacter?: Character }
): GameState {
  const actor = getPlayer(state, actorId);
  const { type, targetId } = action;

  // 쿠데타 10코인 강제 체크
  if (actor.coins >= 10 && type !== 'coup') {
    throw new Error('코인이 10개 이상이면 쿠데타를 해야 합니다');
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
      if (!targetId) throw new Error('쿠데타: 대상이 필요합니다');
      if (actor.coins < 7) throw new Error('쿠데타: 코인 7개 필요');
      const target = getPlayer(s, targetId);

      // Guess 모드: 캐릭터 추측
      if (s.gameMode === 'guess') {
        const guessed = action.guessedCharacter;
        if (!guessed) throw new Error('추측 모드: 캐릭터를 선택해야 합니다');

        const updatedPlayers = s.players.map((p) =>
          p.id === actorId ? { ...p, coins: p.coins - 7 } : p
        );
        s = { ...s, players: updatedPlayers };

        if (hasCharacter(target, guessed)) {
          // 정답: 해당 카드 공개
          const cardIdx = target.cards.findIndex((c) => c.character === guessed && !c.revealed);
          const revealedPlayers = s.players.map((p) =>
            p.id === targetId ? revealCard(p, cardIdx) : p
          );
          s = addLog(
            { ...s, players: revealedPlayers },
            `${actor.name}이(가) ${target.name}에게 쿠데타! ${CHARACTER_NAMES[guessed]} 추측 성공!`
          );
          const updatedTarget = revealedPlayers.find((p) => p.id === targetId)!;
          if (!updatedTarget.isAlive) {
            s = addLog(s, `${target.name}이(가) 탈락했습니다`);
          }
          s = checkWinner(s);
          if (s.phase === 'game_over') return s;
          return nextTurn(s);
        } else {
          // 오답: 코인만 소모, 상대 카드 유지
          s = addLog(
            s,
            `${actor.name}이(가) ${target.name}에게 쿠데타! ${CHARACTER_NAMES[guessed]} 추측 실패... 코인만 잃었습니다`
          );
          return nextTurn(s);
        }
      }

      // Standard 모드: 기존 로직
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins - 7 } : p
      );
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
      const responses: Record<string, ResponseType | 'pending'> = {};
      others.forEach((p) => { responses[p.id] = 'pending'; });
      s = addLog(s, `${actor.name}이(가) 해외원조를 요청했습니다`);
      return {
        ...s,
        phase: 'awaiting_response',
        pendingAction: { type, actorId, responses, responseDeadline: Date.now() + 30000 },
      };
    }

    case 'tax':
    case 'assassinate':
    case 'steal':
    case 'exchange': {
      if ((type === 'assassinate' || type === 'steal') && !targetId) {
        throw new Error(`${type}: 대상이 필요합니다`);
      }
      if (type === 'steal' && targetId) {
        const stealTarget = getPlayer(s, targetId);
        if (stealTarget.coins === 0) {
          throw new Error('갈취: 대상의 코인이 0입니다');
        }
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
      const responses: Record<string, ResponseType | 'pending'> = {};
      others.forEach((p) => { responses[p.id] = 'pending'; });

      const logMsg = target
        ? `${actor.name}이(가) ${ACTION_NAMES[type]}을(를) ${target.name}에게 사용합니다`
        : `${actor.name}이(가) ${ACTION_NAMES[type]}을(를) 사용합니다`;

      s = addLog(s, logMsg);
      return {
        ...s,
        phase: 'awaiting_response',
        pendingAction: { type, actorId, targetId, responses, responseDeadline: Date.now() + 30000 },
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
    // steal/assassinate는 대상만 블록 가능
    if ((pending.type === 'steal' || pending.type === 'assassinate') && responderId !== pending.targetId) {
      throw new Error('이 행동은 대상만 막을 수 있습니다');
    }
    s = addLog(s, `${responder.name}이(가) ${CHARACTER_NAMES[blockCharacter]}으로 막습니다!`);

    // 블록 선언 후 다른 플레이어들이 그 블록에 도전 가능
    const others = getAlivePlayers(s).filter((p) => p.id !== responderId);
    const blockResponses: Record<string, ResponseType | 'pending'> = {};
    others.forEach((p) => { blockResponses[p.id] = 'pending'; });

    return {
      ...s,
      phase: 'awaiting_block_response',
      pendingAction: {
        ...pending,
        responses: blockResponses,
        blockerId: responderId,
        blockerCharacter: blockCharacter,
        responseDeadline: Date.now() + 30000,
      },
    };
  }

  // --- 패스 ---
  const updatedResponses = { ...pending.responses, [responderId]: 'pass' as ResponseType };
  s = { ...s, pendingAction: { ...pending, responses: updatedResponses } };

  // 모든 플레이어가 응답했는지 확인
  const allResponded = Object.values(updatedResponses).every((r) => r !== 'pending');
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
      // 블록이 사실 → 블로커 카드 교체 먼저, 도전자가 카드 잃음
      const newDeck = [...s.deck, pending.blockerCharacter!];
      const shuffledDeck = shuffle(newDeck);
      const newCard = shuffledDeck.pop()!;
      const updatedBlockerCards = blocker.cards.map((c) =>
        c.character === pending.blockerCharacter! && !c.revealed
          ? { ...c, character: newCard }
          : c
      );
      const updatedPlayers = s.players.map((p) =>
        p.id === pending.blockerId ? { ...p, cards: updatedBlockerCards } : p
      );
      s = addLog(
        { ...s, players: updatedPlayers, deck: shuffledDeck },
        `${responder.name}의 도전 실패! ${blocker.name}이(가) 진짜 ${CHARACTER_NAMES[pending.blockerCharacter!]}이었습니다`
      );
      s = addPrivateLog(s, pending.blockerId!,
        `${CHARACTER_NAMES[pending.blockerCharacter!]}이(가) 덱으로 돌아가고 새 카드를 받았습니다`,
        { type: 'block_challenge_fail', actorId: pending.blockerId }
      );

      // 도전자가 카드를 잃음 — 2장 이상이면 선택, 1장이면 자동 제거
      const challengerPlayer = getPlayer(s, responderId);
      if (getLiveCardCount(challengerPlayer) > 1) {
        s = checkWinner(s);
        if (s.phase === 'game_over') return s;
        return {
          ...s,
          phase: 'lose_influence',
          pendingAction: {
            ...s.pendingAction!,
            losingPlayerId: responderId,
            challengeLoseContext: { continuation: 'block_success_next_turn' },
          },
        };
      } else {
        // 카드 1장 남음 — 자동 제거
        const autoUpdated = s.players.map((p) =>
          p.id === responderId ? removeFirstLiveCard(p) : p
        );
        s = { ...s, players: autoUpdated };
        s = addLog(s, '블록 성공! 행동이 취소되었습니다');
        s = checkWinner(s);
        if (s.phase === 'game_over') return s;
        return nextTurn(s);
      }
    } else {
      // 블록이 거짓 → 블로커가 카드 잃음, 행동 진행
      s = addLog(
        s,
        `${responder.name}의 도전 성공! ${blocker.name}이(가) 거짓말이었습니다`
      );

      // 블로커가 카드를 잃음 — 2장 이상이면 선택, 1장이면 자동 제거
      const blockerPlayer = getPlayer(s, pending.blockerId);
      if (getLiveCardCount(blockerPlayer) > 1) {
        s = checkWinner(s);
        if (s.phase === 'game_over') return s;
        return {
          ...s,
          phase: 'lose_influence',
          pendingAction: {
            ...s.pendingAction!,
            losingPlayerId: pending.blockerId,
            challengeLoseContext: { continuation: 'execute_action' },
          },
        };
      } else {
        // 카드 1장 남음 — 자동 제거
        const autoUpdated = s.players.map((p) =>
          p.id === pending.blockerId ? removeFirstLiveCard(p) : p
        );
        s = { ...s, players: autoUpdated };
        s = checkWinner(s);
        if (s.phase === 'game_over') return s;
        return executeAction(s);
      }
    }
  }

  // 패스
  const updatedResponses = { ...pending.responses, [responderId]: 'pass' as ResponseType };
  s = { ...s, pendingAction: { ...pending, responses: updatedResponses } };

  const allResponded = Object.values(updatedResponses).every((r) => r !== 'pending');
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
    // 도전 실패: 행동자 카드 교체 먼저
    const newDeck = [...s.deck, requiredChar];
    const shuffled = shuffle(newDeck);
    const newCard = shuffled.pop()!;
    const updatedActorCards = actor.cards.map((c) => {
      if (c.character === requiredChar && !c.revealed) {
        return { ...c, character: newCard };
      }
      return c;
    });
    let updatedPlayers = s.players.map((p) =>
      p.id === pending.actorId ? { ...p, cards: updatedActorCards } : p
    );
    s = addLog(
      { ...s, players: updatedPlayers, deck: shuffled },
      `${challenger.name}의 도전 실패! ${actor.name}이(가) 진짜 ${CHARACTER_NAMES[requiredChar]}이었습니다`
    );
    s = addPrivateLog(s, pending.actorId,
      `${CHARACTER_NAMES[requiredChar]}이(가) 덱으로 돌아가고 새 카드를 받았습니다`,
      { type: 'challenge_fail', actorId: pending.actorId }
    );

    // 암살 도전 실패 시 2명 피해 예고 로그
    if (pending.type === 'assassinate') {
      s = addLog(s, `${challenger.name}이(가) 도전에 실패하여 카드를 잃고, ${getPlayer(s, pending.targetId!).name}도 암살됩니다!`, {
        type: 'challenge_fail',
        actorId: pending.actorId,
        targetId: pending.targetId,
      });
    }

    // 도전자가 카드를 잃음 — 2장 이상이면 선택, 1장이면 자동 제거
    const challengerPlayer = getPlayer(s, challengerId);
    if (getLiveCardCount(challengerPlayer) > 1) {
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      return {
        ...s,
        phase: 'lose_influence',
        pendingAction: {
          ...s.pendingAction!,
          losingPlayerId: challengerId,
          challengeLoseContext: { continuation: 'execute_action' },
        },
      };
    } else {
      updatedPlayers = s.players.map((p) =>
        p.id === challengerId ? removeFirstLiveCard(p) : p
      );
      s = { ...s, players: updatedPlayers };
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      return executeAction(s);
    }
  } else {
    // 도전 성공: 행동자가 카드 잃음, 행동 무효
    s = addLog(
      s,
      `${challenger.name}의 도전 성공! ${actor.name}이(가) 거짓말이었습니다`
    );

    // 행동자가 카드를 잃음 — 2장 이상이면 선택, 1장이면 자동 제거
    const actorPlayer = getPlayer(s, pending.actorId);
    if (getLiveCardCount(actorPlayer) > 1) {
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      return {
        ...s,
        phase: 'lose_influence',
        pendingAction: {
          ...s.pendingAction!,
          losingPlayerId: pending.actorId,
          challengeLoseContext: { continuation: 'next_turn' },
        },
      };
    } else {
      const updatedPlayers = s.players.map((p) =>
        p.id === pending.actorId ? removeFirstLiveCard(p) : p
      );
      s = { ...s, players: updatedPlayers };
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      return nextTurn(s);
    }
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
      s = addLog({ ...s, players: updatedPlayers }, `${actor.name}이(가) 해외원조를 받았습니다 (+2 코인)`);
      return nextTurn(s);
    }

    case 'tax': {
      const updatedPlayers = s.players.map((p) =>
        p.id === actorId ? { ...p, coins: p.coins + 3 } : p
      );
      s = addLog({ ...s, players: updatedPlayers }, `${actor.name}이(가) 세금을 징수했습니다 (+3 코인)`);
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
        `${actor.name}이(가) ${target.name}으로부터 ${stolen}코인을 갈취했습니다`
      );
      return nextTurn(s);
    }

    case 'assassinate': {
      if (!targetId) throw new Error('assassinate: targetId required');
      const target = getPlayer(s, targetId);
      // 블록 도전 실패로 이미 탈락한 경우 → 암살 스킵
      if (!target.isAlive) {
        return nextTurn(s);
      }
      s = addLog(s, `${actor.name}이(가) ${target.name}을 암살합니다`);
      // 대상이 카드 선택 (lose_influence)
      return {
        ...s,
        phase: 'lose_influence',
        pendingAction: { ...pending, losingPlayerId: targetId },
      };
    }

    case 'exchange': {
      // 덱에서 가용한 만큼만 뽑기 (최대 2장)
      const newDeck = [...s.deck];
      const drawCount = Math.min(2, newDeck.length);
      const drawnCards: Character[] = [];
      for (let i = 0; i < drawCount; i++) {
        drawnCards.push(newDeck.pop()!);
      }
      s = addLog(s, `${actor.name}이(가) 교환할 카드를 선택합니다`);
      return {
        ...s,
        deck: newDeck,
        phase: 'exchange_select',
        pendingAction: { ...pending, exchangeCards: drawnCards, exchangeDeadline: Date.now() + 45000 },
      };
    }

    default:
      throw new Error(`Cannot execute action: ${type}`);
  }
}

// ============================================================
// 타임아웃 해소: deadline 초과 시 pending 응답을 일괄 pass 처리
// ============================================================

export function resolveTimeouts(state: GameState): GameState {
  // 조건: awaiting_response 또는 awaiting_block_response phase이고 deadline 초과
  if (
    (state.phase !== 'awaiting_response' && state.phase !== 'awaiting_block_response') ||
    !state.pendingAction?.responseDeadline ||
    Date.now() <= state.pendingAction.responseDeadline
  ) {
    return state;
  }

  const pending = state.pendingAction;
  // 모든 pending 응답을 pass로 변경
  const updatedResponses = { ...pending.responses };
  let changed = false;
  for (const [pid, resp] of Object.entries(updatedResponses)) {
    if (resp === 'pending') {
      updatedResponses[pid] = 'pass';
      changed = true;
    }
  }

  if (!changed) return state;

  let s: GameState = {
    ...state,
    pendingAction: { ...pending, responses: updatedResponses },
  };

  if (state.phase === 'awaiting_response') {
    // 모든 응답이 pass → resolveAction (액션 실행)
    return resolveAction(s);
  } else {
    // awaiting_block_response: 모두 pass → 블록 확정, 행동 취소
    s = addLog(s, '블록이 확정되었습니다. 행동이 취소되었습니다');
    return nextTurn(s);
  }
}

// ============================================================
// 턴 액션 타임아웃 해소: 45초 내 액션 미선택 시 자동 소득/쿠데타
// ============================================================

export function resolveActionTimeout(state: GameState): GameState {
  if (
    state.phase !== 'action' ||
    !state.actionDeadline ||
    Date.now() <= state.actionDeadline
  ) {
    return state;
  }

  const player = getPlayer(state, state.currentTurnId);

  if (player.coins >= 10) {
    // 10코인 이상: 랜덤 생존 상대에게 자동 쿠데타
    const alive = getAlivePlayers(state).filter(p => p.id !== state.currentTurnId);
    const target = alive[Math.floor(Math.random() * alive.length)];
    const s = addLog(state, `${player.name}이(가) 시간 초과로 자동 쿠데타를 실행합니다`, {
      type: 'action_declared',
      actorId: player.id,
      targetId: target.id,
      action: 'coup',
    });
    return processAction(s, state.currentTurnId, { type: 'coup', targetId: target.id });
  } else {
    // 자동 소득
    const s = addLog(state, `${player.name}이(가) 시간 초과로 자동 소득을 받습니다`, {
      type: 'action_declared',
      actorId: player.id,
      action: 'income',
    });
    return processAction(s, state.currentTurnId, { type: 'income' });
  }
}

// ============================================================
// 교환 선택 타임아웃 해소: 45초 초과 시 기존 카드 유지
// ============================================================

export function resolveExchangeTimeout(state: GameState): GameState {
  if (
    state.phase !== 'exchange_select' ||
    !state.pendingAction?.exchangeDeadline ||
    Date.now() <= state.pendingAction.exchangeDeadline
  ) {
    return state;
  }

  // 타임아웃: 기존 보유 카드를 그대로 유지 (새 카드를 덱으로 반환)
  const actor = getPlayer(state, state.pendingAction.actorId);
  const liveCards = actor.cards.filter(c => !c.revealed);
  const keptIndices = liveCards.map((_, i) => i); // 기존 카드 인덱스들 (0부터 liveCount-1)
  const s = addLog(state, `${actor.name}이(가) 시간 초과로 기존 카드를 유지합니다`);
  return processExchangeSelect(s, actor.id, keptIndices);
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

  // 도전으로 인한 카드 잃기: continuation에 따라 분기
  const ctx = pending.challengeLoseContext;
  if (ctx) {
    // challengeLoseContext 제거 (다음 lose_influence에 영향 주지 않도록)
    const cleanPending = { ...s.pendingAction! };
    delete cleanPending.challengeLoseContext;
    delete cleanPending.losingPlayerId;
    s = { ...s, pendingAction: cleanPending };

    if (ctx.continuation === 'execute_action') {
      return executeAction(s);
    } else if (ctx.continuation === 'block_success_next_turn') {
      s = addLog(s, '블록 성공! 행동이 취소되었습니다');
      return nextTurn(s);
    } else {
      // 'next_turn'
      return nextTurn(s);
    }
  }

  return nextTurn(s);
}

// ============================================================
// 대사 교환 처리
// ============================================================

// ============================================================
// 플레이어 퇴장 처리 (게임 도중 나가기)
// ============================================================

export function removePlayer(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  if (!player.isAlive) return state; // 이미 탈락한 플레이어

  let s = state;

  // 모든 카드 공개
  const updatedPlayers = s.players.map((p) => {
    if (p.id !== playerId) return p;
    const revealedCards = p.cards.map((c) => ({ ...c, revealed: true }));
    return { ...p, cards: revealedCards, isAlive: false };
  });
  s = { ...s, players: updatedPlayers };

  s = addLog(s, `${player.name}이(가) 게임을 떠났습니다`);

  // pendingAction에 해당 플레이어가 관련되어 있으면 초기화
  if (s.pendingAction) {
    const pa = s.pendingAction;
    const isActor = pa.actorId === playerId;
    const isTarget = pa.targetId === playerId;
    const isBlocker = pa.blockerId === playerId;
    const isLoser = pa.losingPlayerId === playerId;
    const hasPendingResponse = pa.responses?.[playerId] === 'pending';

    if (isActor || isTarget || isBlocker || isLoser) {
      // 핵심 역할이 떠나면 pendingAction 무효화 + nextTurn
      s = { ...s, pendingAction: null };
      s = checkWinner(s);
      if (s.phase === 'game_over') return s;
      // 현재 턴이 떠나는 플레이어거나 actor였으면 다음 턴으로
      return nextTurn(s);
    }

    if (hasPendingResponse) {
      // 응답 대기 중인 플레이어가 떠남 → pass 처리
      const updatedResponses = { ...pa.responses, [playerId]: 'pass' as ResponseType };
      s = { ...s, pendingAction: { ...pa, responses: updatedResponses } };
      // 모두 응답했는지 확인
      const allResponded = Object.values(updatedResponses).every((r) => r !== 'pending');
      if (allResponded) {
        if (s.phase === 'awaiting_block_response') {
          s = addLog(s, '블록이 확정되었습니다. 행동이 취소되었습니다');
          s = checkWinner(s);
          if (s.phase === 'game_over') return s;
          return nextTurn(s);
        }
        // awaiting_response → resolve action
        s = checkWinner(s);
        if (s.phase === 'game_over') return s;
        // resolveAction은 private이므로 직접 처리하지 않고,
        // 여기서는 단순히 nextTurn으로 넘김 (안전한 처리)
        return nextTurn(s);
      }
    }
  }

  s = checkWinner(s);
  if (s.phase === 'game_over') return s;

  // 현재 턴이 떠나는 플레이어라면 다음 턴으로
  if (s.currentTurnId === playerId) {
    return nextTurn(s);
  }

  return s;
}

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
  const allOptionNames = allOptions.map(c => CHARACTER_NAMES[c]).join(', ');
  const keptNames = keptChars.map(c => CHARACTER_NAMES[c]).join(', ');
  s = addPrivateLog(s, actorId,
    `교환: [${allOptionNames}] 중 ${keptNames}을(를) 선택했습니다`,
    { type: 'exchange_complete', actorId }
  );
  return nextTurn(s);
}
