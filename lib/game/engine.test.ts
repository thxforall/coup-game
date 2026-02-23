import {
  initGame,
  processAction,
  processResponse,
  processBlockResponse,
  processLoseInfluence,
  processExchangeSelect,
  getPlayer,
  getAlivePlayers,
} from './engine';
import { GameState, Character, Player } from './types';

// ============================================================
// 테스트 헬퍼: 결정론적 게임 상태 생성
// ============================================================

function createTestState(overrides?: Partial<GameState>): GameState {
  const players: Player[] = [
    {
      id: 'p1', name: 'Alice', coins: 2,
      cards: [
        { character: 'Duke', revealed: false },
        { character: 'Captain', revealed: false },
      ],
      isAlive: true, isReady: true,
    },
    {
      id: 'p2', name: 'Bob', coins: 2,
      cards: [
        { character: 'Assassin', revealed: false },
        { character: 'Contessa', revealed: false },
      ],
      isAlive: true, isReady: true,
    },
    {
      id: 'p3', name: 'Charlie', coins: 2,
      cards: [
        { character: 'Ambassador', revealed: false },
        { character: 'Duke', revealed: false },
      ],
      isAlive: true, isReady: true,
    },
  ];

  return {
    players,
    currentTurnId: 'p1',
    phase: 'action',
    deck: ['Captain', 'Contessa', 'Ambassador', 'Assassin', 'Assassin', 'Contessa'],
    pendingAction: null,
    log: ['게임이 시작되었습니다!'],
    ...overrides,
  };
}

// 3인 게임 — 전원 패스 헬퍼
function allPass(state: GameState): GameState {
  const pending = state.pendingAction!;
  let s = state;
  for (const playerId of Object.keys(pending.responses)) {
    if (pending.responses[playerId] === 'pending') {
      if (s.phase === 'awaiting_response') {
        s = processResponse(s, playerId, 'pass');
      } else if (s.phase === 'awaiting_block_response') {
        s = processBlockResponse(s, playerId, 'pass');
      }
    }
  }
  return s;
}

// ============================================================
// 1. 기본 액션 테스트
// ============================================================

describe('기본 액션', () => {
  test('income: 코인 +1, 즉시 다음 턴', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'income' });

    const alice = getPlayer(result, 'p1');
    expect(alice.coins).toBe(3);
    expect(result.currentTurnId).toBe('p2'); // 다음 턴
    expect(result.phase).toBe('action');
    expect(result.pendingAction).toBeNull();
  });

  test('foreignAid: awaiting_response 단계 진입', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'foreignAid' });

    expect(result.phase).toBe('awaiting_response');
    expect(result.pendingAction!.type).toBe('foreignAid');
    expect(result.pendingAction!.actorId).toBe('p1');
    // 다른 플레이어들에게 응답 대기
    expect(result.pendingAction!.responses['p2']).toBe('pending');
    expect(result.pendingAction!.responses['p3']).toBe('pending');
    // 본인은 응답 대상이 아님
    expect(result.pendingAction!.responses['p1']).toBeUndefined();
  });

  test('foreignAid 전원 패스 → 코인 +2', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = allPass(s);

    const alice = getPlayer(s, 'p1');
    expect(alice.coins).toBe(4);
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p2');
  });

  test('coup: 코인 -7, lose_influence 단계', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 7 } : p
      ),
    });
    const result = processAction(state, 'p1', { type: 'coup', targetId: 'p2' });

    const alice = getPlayer(result, 'p1');
    expect(alice.coins).toBe(0);
    expect(result.phase).toBe('lose_influence');
    expect(result.pendingAction!.losingPlayerId).toBe('p2');
  });

  test('coup: 코인 부족 시 에러', () => {
    const state = createTestState(); // Alice has 2 coins
    expect(() =>
      processAction(state, 'p1', { type: 'coup', targetId: 'p2' })
    ).toThrow('코인 7개 필요');
  });

  test('tax: awaiting_response (도전 가능)', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'tax' });

    expect(result.phase).toBe('awaiting_response');
    expect(result.pendingAction!.type).toBe('tax');
  });

  test('tax 전원 패스 → 코인 +3', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'tax' });
    s = allPass(s);

    expect(getPlayer(s, 'p1').coins).toBe(5);
    expect(s.currentTurnId).toBe('p2');
  });

  test('steal: awaiting_response, 타겟 필요', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });

    expect(result.phase).toBe('awaiting_response');
    expect(result.pendingAction!.targetId).toBe('p2');
  });

  test('steal 전원 패스 → 타겟에서 코인 2 탈취', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = allPass(s);

    expect(getPlayer(s, 'p1').coins).toBe(4);
    expect(getPlayer(s, 'p2').coins).toBe(0);
  });

  test('steal: 대상 코인이 1이면 1개만 탈취', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p2' ? { ...p, coins: 1 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = allPass(s);

    expect(getPlayer(s, 'p1').coins).toBe(3);
    expect(getPlayer(s, 'p2').coins).toBe(0);
  });

  test('steal: 대상 코인이 0이면 0개 탈취', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p2' ? { ...p, coins: 0 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = allPass(s);

    expect(getPlayer(s, 'p1').coins).toBe(2);
    expect(getPlayer(s, 'p2').coins).toBe(0);
  });

  test('assassinate: 코인 -3, awaiting_response', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 5 } : p
      ),
    });
    const result = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });

    expect(getPlayer(result, 'p1').coins).toBe(2);
    expect(result.phase).toBe('awaiting_response');
    expect(result.pendingAction!.type).toBe('assassinate');
  });

  test('assassinate: 코인 부족 시 에러', () => {
    const state = createTestState(); // Alice has 2 coins
    expect(() =>
      processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' })
    ).toThrow('코인 3개 필요');
  });

  test('exchange: awaiting_response (도전 가능)', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'exchange' });

    expect(result.phase).toBe('awaiting_response');
    expect(result.pendingAction!.type).toBe('exchange');
  });
});

// ============================================================
// 2. 도전(Challenge) 시나리오
// ============================================================

describe('도전 (Challenge)', () => {
  test('tax 도전 성공 (블러프) → 행동자 카드 잃음, 행동 취소', () => {
    // p1이 Duke 없이 tax 선언 → 블러프
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1'
          ? { ...p, cards: [{ character: 'Captain' as Character, revealed: false }, { character: 'Ambassador' as Character, revealed: false }] }
          : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'tax' });
    s = processResponse(s, 'p2', 'challenge');

    // p1이 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    // p1이 카드 선택
    s = processLoseInfluence(s, 'p1', 0);

    // 행동자(p1) 카드 잃음
    const alice = getPlayer(s, 'p1');
    expect(alice.cards.some(c => c.revealed)).toBe(true);
    // 행동 취소 → 다음 턴
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p2');
    // Alice 코인 변동 없음 (tax가 실행 안 됨)
    expect(alice.coins).toBe(2);
  });

  test('tax 도전 실패 (진짜) → 도전자 카드 잃음, 행동 실행', () => {
    // p1이 진짜 Duke를 갖고 있음
    const state = createTestState(); // Alice has Duke
    let s = processAction(state, 'p1', { type: 'tax' });
    s = processResponse(s, 'p2', 'challenge');

    // p2가 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    // p2가 카드 선택
    s = processLoseInfluence(s, 'p2', 0);

    // 도전자(p2) 카드 잃음
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.some(c => c.revealed)).toBe(true);
    // 행동 실행 → Alice 코인 +3
    const alice = getPlayer(s, 'p1');
    expect(alice.coins).toBe(5);
    // 다음 턴
    expect(s.currentTurnId).toBe('p2');
  });

  test('assassinate 도전 성공 → 코인 비환불, 행동 취소', () => {
    // p1이 Assassin 없이 assassinate 선언 → 블러프
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1'
          ? { ...p, coins: 5, cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }] }
          : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    // 코인은 이미 -3 (선언 시점에 차감)
    expect(getPlayer(s, 'p1').coins).toBe(2);
    s = processResponse(s, 'p2', 'challenge');

    // p1이 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    // p1이 카드 선택
    s = processLoseInfluence(s, 'p1', 0);

    // 도전 성공 → 행동자 카드 잃음
    const alice = getPlayer(s, 'p1');
    expect(alice.cards.some(c => c.revealed)).toBe(true);
    // ⭐ 코인 환불 안 됨 (공식 룰)
    expect(alice.coins).toBe(2);
    // Bob은 안전
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.every(c => !c.revealed)).toBe(true);
  });

  test('steal 도전 실패 → 도전자 카드 잃음, 강탈 실행', () => {
    // p1이 진짜 Captain를 갖고 steal
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = processResponse(s, 'p2', 'challenge');

    // p2가 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    // p2가 카드 선택
    s = processLoseInfluence(s, 'p2', 0);

    // 도전 실패 → Bob 카드 잃음
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.some(c => c.revealed)).toBe(true);
    // 강탈 실행
    expect(getPlayer(s, 'p1').coins).toBe(4);
    expect(bob.coins).toBe(0);
  });

  test('exchange 도전 성공 → 교환 취소', () => {
    // p1이 Ambassador 없이 exchange 선언 → 블러프
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1'
          ? { ...p, cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }] }
          : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'exchange' });
    s = processResponse(s, 'p2', 'challenge');

    // p1이 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    s = processLoseInfluence(s, 'p1', 0);

    // 행동자 카드 잃음
    const alice = getPlayer(s, 'p1');
    expect(alice.cards.some(c => c.revealed)).toBe(true);
    // 교환 취소 → 다음 턴
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p2');
  });

  test('도전 불가능한 액션(income)에는 응답 없음', () => {
    const state = createTestState();
    const result = processAction(state, 'p1', { type: 'income' });
    // income은 즉시 처리되므로 pendingAction 없음
    expect(result.pendingAction).toBeNull();
    expect(result.phase).toBe('action');
  });
});

// ============================================================
// 3. 블록 (Block) 시나리오
// ============================================================

describe('블록 (Block)', () => {
  test('foreignAid + Duke 블록 → awaiting_block_response', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p2', 'block', 'Duke');

    expect(s.phase).toBe('awaiting_block_response');
    expect(s.pendingAction!.blockerId).toBe('p2');
    expect(s.pendingAction!.blockerCharacter).toBe('Duke');
  });

  test('foreignAid 블록 전원 패스 → 행동 취소', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p2', 'block', 'Duke');
    s = allPass(s);

    // 블록 확정 → 행동 취소, 다음 턴
    expect(getPlayer(s, 'p1').coins).toBe(2); // 코인 변동 없음
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p2');
  });

  test('assassinate + Contessa 블록 → awaiting_block_response', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 5 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    s = processResponse(s, 'p2', 'block', 'Contessa');

    expect(s.phase).toBe('awaiting_block_response');
    expect(s.pendingAction!.blockerCharacter).toBe('Contessa');
  });

  test('steal + Captain 블록', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = processResponse(s, 'p2', 'block', 'Captain');

    expect(s.phase).toBe('awaiting_block_response');
    expect(s.pendingAction!.blockerCharacter).toBe('Captain');
  });

  test('steal + Ambassador 블록', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    s = processResponse(s, 'p2', 'block', 'Ambassador');

    expect(s.phase).toBe('awaiting_block_response');
    expect(s.pendingAction!.blockerCharacter).toBe('Ambassador');
  });

  test('assassinate: 대상만 블록 가능 (제3자 블록 불가)', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 5 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    // p3(제3자)가 Contessa로 블록 시도 → 에러
    expect(() =>
      processResponse(s, 'p3', 'block', 'Contessa')
    ).toThrow('이 행동은 대상만 막을 수 있습니다');
  });

  test('steal: 대상만 블록 가능 (제3자 블록 불가)', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'steal', targetId: 'p2' });
    // p3(제3자)가 Captain으로 블록 시도 → 에러
    expect(() =>
      processResponse(s, 'p3', 'block', 'Captain')
    ).toThrow('이 행동은 대상만 막을 수 있습니다');
  });

  test('foreignAid: 아무나 Duke로 블록 가능', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    // p3(제3자)도 Duke로 블록 가능
    s = processResponse(s, 'p3', 'block', 'Duke');
    expect(s.phase).toBe('awaiting_block_response');
  });

  test('잘못된 캐릭터로 블록 시도 시 에러', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'tax' });
    // tax는 블록할 수 없음
    expect(() =>
      processResponse(s, 'p2', 'block', 'Duke')
    ).toThrow();
  });

  test('블러프 블록 가능: 실제 카드 없이도 블록 선언 가능', () => {
    // p2가 Duke가 없지만 foreignAid를 Duke로 블록
    const state = createTestState(); // p2 has Assassin/Contessa, no Duke
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    // 에러 없이 블록 가능 (블러핑)
    s = processResponse(s, 'p2', 'block', 'Duke');
    expect(s.phase).toBe('awaiting_block_response');
  });
});

// ============================================================
// 4. 블록 도전 (Block Challenge)
// ============================================================

describe('블록 도전 (Block Challenge)', () => {
  test('블로커가 진짜 → 도전자 카드 잃음, 블록 성공, 행동 취소', () => {
    // p3가 진짜 Duke로 foreignAid 블록
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p3', 'block', 'Duke'); // p3 has Duke
    // p1이 블록을 도전
    s = processBlockResponse(s, 'p1', 'challenge');

    // p1이 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    s = processLoseInfluence(s, 'p1', 0);

    // 블로커가 진짜 → 도전자(p1) 카드 잃음
    const alice = getPlayer(s, 'p1');
    expect(alice.cards.some(c => c.revealed)).toBe(true);
    // 블록 성공 → 행동 취소, 다음 턴
    expect(alice.coins).toBe(2); // foreignAid 안 받음
    expect(s.phase).toBe('action');
  });

  test('블로커가 블러프 → 블로커 카드 잃음, 행동 실행', () => {
    // p2가 Duke 없이 foreignAid 블록 (블러프)
    const state = createTestState(); // p2 has Assassin/Contessa
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p2', 'block', 'Duke');
    // p1이 블록을 도전
    s = processBlockResponse(s, 'p1', 'challenge');

    // p2가 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    s = processLoseInfluence(s, 'p2', 0);

    // 블로커(p2) 블러프 → 카드 잃음
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.some(c => c.revealed)).toBe(true);
    // 행동 실행 → Alice 코인 +2
    const alice = getPlayer(s, 'p1');
    expect(alice.coins).toBe(4);
  });

  test('블록 전원 패스 → 블록 확정, 행동 취소', () => {
    const state = createTestState();
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p2', 'block', 'Duke');
    // 전원 패스
    s = allPass(s);

    expect(s.phase).toBe('action');
    expect(getPlayer(s, 'p1').coins).toBe(2); // 안 받음
  });

  test('연쇄: 암살 → Contessa 블록 → 블록 도전 성공 → 암살 실행', () => {
    // p1이 암살 선언, p2가 Contessa로 블록 (진짜 가지고 있지만 p1이 도전하는 상황)
    // 이번에는 p2가 Contessa를 정말 가진 경우 → 도전 실패
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 5 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    // p2가 Contessa로 블록 (p2는 실제 Contessa를 가지고 있음)
    s = processResponse(s, 'p2', 'block', 'Contessa');
    expect(s.phase).toBe('awaiting_block_response');
    // p1이 블록에 도전 → 도전 실패 (p2가 진짜 Contessa)
    s = processBlockResponse(s, 'p1', 'challenge');

    // p1이 2장 보유 → lose_influence 전환
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    s = processLoseInfluence(s, 'p1', 0);

    // 도전 실패 → p1 카드 잃음
    const alice = getPlayer(s, 'p1');
    expect(alice.cards.some(c => c.revealed)).toBe(true);
    // 블록 성공 → 암살 취소 (p2 안전)
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.filter(c => !c.revealed).length).toBe(2);
  });

  test('연쇄: 암살 → Contessa 블록(블러프) → 블록 도전 → 암살 실행', () => {
    // p2가 Contessa 없이 블록 시도 (블러프)
    const state = createTestState({
      players: [
        {
          id: 'p1', name: 'Alice', coins: 5,
          cards: [{ character: 'Assassin' as Character, revealed: false }, { character: 'Duke' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p2', name: 'Bob', coins: 2,
          cards: [{ character: 'Captain' as Character, revealed: false }, { character: 'Ambassador' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p3', name: 'Charlie', coins: 2,
          cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
      ],
    });

    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    // p2가 Contessa로 블록 (블러프!)
    s = processResponse(s, 'p2', 'block', 'Contessa');
    // p1이 블록에 도전 → 도전 성공 (p2에게 Contessa 없음)
    s = processBlockResponse(s, 'p1', 'challenge');

    // p2가 2장 보유 → lose_influence 전환 (블록 도전 성공으로 카드 잃기)
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    s = processLoseInfluence(s, 'p2', 0);

    // 블로커(p2) 카드 잃음
    const bob = getPlayer(s, 'p2');
    expect(bob.cards.some(c => c.revealed)).toBe(true);
    // 암살 실행 → p2가 추가 카드 잃어야 함 (lose_influence, challengeLoseContext 없음)
    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
  });
});

// ============================================================
// 5. 도전 시 카드 선택 (lose_influence 경유)
// ============================================================

describe('도전 시 카드 선택 (lose_influence)', () => {
  test('도전 실패: 도전자가 2장 보유 시 선택할 카드를 고를 수 있다', () => {
    // p1이 진짜 Duke로 tax, p2가 도전 → 도전 실패
    // p2는 2장 보유 → lose_influence 전환
    const state = createTestState(); // p1 has Duke, p2 has Assassin/Contessa
    let s = processAction(state, 'p1', { type: 'tax' });
    s = processResponse(s, 'p2', 'challenge');

    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    expect(s.pendingAction!.challengeLoseContext?.continuation).toBe('execute_action');

    // p2가 두 번째 카드(index 1)를 선택
    s = processLoseInfluence(s, 'p2', 1);

    // 선택한 카드(index 1, Contessa)가 공개됨
    const bob = getPlayer(s, 'p2');
    expect(bob.cards[1].revealed).toBe(true);
    expect(bob.cards[0].revealed).toBe(false); // 첫 번째 카드는 유지
    // tax 실행됨
    expect(getPlayer(s, 'p1').coins).toBe(5);
    expect(s.phase).toBe('action');
  });

  test('도전 성공: 블러퍼가 2장 보유 시 원하는 카드를 잃을 수 있다', () => {
    // p1이 블러프 tax (Duke 없음), p2가 도전 성공
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1'
          ? { ...p, cards: [{ character: 'Captain' as Character, revealed: false }, { character: 'Ambassador' as Character, revealed: false }] }
          : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'tax' });
    s = processResponse(s, 'p2', 'challenge');

    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    expect(s.pendingAction!.challengeLoseContext?.continuation).toBe('next_turn');

    // p1이 첫 번째 카드 선택
    s = processLoseInfluence(s, 'p1', 0);

    const alice = getPlayer(s, 'p1');
    expect(alice.cards[0].revealed).toBe(true);
    // 행동 취소 → 다음 턴 (tax 실행 안 됨)
    expect(alice.coins).toBe(2);
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p2');
  });

  test('블록 도전: 블로커가 진짜 → 도전자가 카드 선택', () => {
    // foreignAid → p3가 Duke로 블록 (진짜) → p1이 블록 도전 → 도전 실패
    const state = createTestState(); // p3 has Duke
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p3', 'block', 'Duke');
    s = processBlockResponse(s, 'p1', 'challenge');

    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p1');
    expect(s.pendingAction!.challengeLoseContext?.continuation).toBe('block_success_next_turn');

    s = processLoseInfluence(s, 'p1', 0);

    // 블록 성공 → foreignAid 안 받음
    expect(getPlayer(s, 'p1').coins).toBe(2);
    expect(s.phase).toBe('action');
  });

  test('블록 도전: 블로커가 블러프 → 블로커가 카드 선택 후 액션 실행', () => {
    // foreignAid → p2가 Duke로 블록 (블러프) → p1이 블록 도전 → 도전 성공
    const state = createTestState(); // p2 has Assassin/Contessa, not Duke
    let s = processAction(state, 'p1', { type: 'foreignAid' });
    s = processResponse(s, 'p2', 'block', 'Duke');
    s = processBlockResponse(s, 'p1', 'challenge');

    expect(s.phase).toBe('lose_influence');
    expect(s.pendingAction!.losingPlayerId).toBe('p2');
    expect(s.pendingAction!.challengeLoseContext?.continuation).toBe('execute_action');

    s = processLoseInfluence(s, 'p2', 0);

    // foreignAid 실행됨
    expect(getPlayer(s, 'p1').coins).toBe(4);
    expect(s.phase).toBe('action');
  });

  test('카드 1장 보유 시 자동 제거 (lose_influence 미전환)', () => {
    // p2 카드 1장만 남은 상태에서 도전 실패 → 자동 제거, lose_influence 없음
    const state = createTestState({
      players: [
        {
          id: 'p1', name: 'Alice', coins: 2,
          cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p2', name: 'Bob', coins: 2,
          cards: [{ character: 'Assassin' as Character, revealed: true }, { character: 'Contessa' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p3', name: 'Charlie', coins: 2,
          cards: [{ character: 'Ambassador' as Character, revealed: false }, { character: 'Duke' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
      ],
    });

    let s = processAction(state, 'p1', { type: 'tax' });
    // p2가 도전 → 실패 → p2 마지막 카드 자동 제거 → 탈락
    s = processResponse(s, 'p2', 'challenge');

    // lose_influence 없이 바로 결과
    expect(s.phase).toBe('action');
    expect(getPlayer(s, 'p2').isAlive).toBe(false);
    // tax 실행됨
    expect(getPlayer(s, 'p1').coins).toBe(5);
  });
});

// ============================================================
// 6. 카드 잃기 + 대사 교환
// ============================================================

describe('카드 잃기 & 교환', () => {
  test('lose_influence: 카드 선택 후 공개, 다음 턴', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 7 } : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'coup', targetId: 'p2' });
    s = processLoseInfluence(s, 'p2', 0); // 첫 번째 카드 잃기

    const bob = getPlayer(s, 'p2');
    expect(bob.cards[0].revealed).toBe(true);
    expect(bob.isAlive).toBe(true); // 아직 1장 남음
    expect(s.phase).toBe('action');
  });

  test('마지막 카드 잃기 → 탈락', () => {
    // p2가 카드 1장만 남은 상태
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 7 } : p
      ).map(p =>
        p.id === 'p2'
          ? { ...p, cards: [{ character: 'Assassin' as Character, revealed: true }, { character: 'Contessa' as Character, revealed: false }] }
          : p
      ),
    });
    let s = processAction(state, 'p1', { type: 'coup', targetId: 'p2' });
    s = processLoseInfluence(s, 'p2', 1); // 마지막 카드

    const bob = getPlayer(s, 'p2');
    expect(bob.isAlive).toBe(false);
    expect(bob.cards.every(c => c.revealed)).toBe(true);
  });

  test('exchange: 전원 패스 → exchange_select, 카드 선택', () => {
    // p3가 Ambassador를 갖고 exchange
    const state = createTestState({ currentTurnId: 'p3' });
    let s = processAction(state, 'p3', { type: 'exchange' });
    s = allPass(s);

    expect(s.phase).toBe('exchange_select');
    expect(s.pendingAction!.exchangeCards).toHaveLength(2);

    // p3: 현재 2장 + 새 2장 = 4장 중 2장 선택
    const exchangeCards = s.pendingAction!.exchangeCards!;
    s = processExchangeSelect(s, 'p3', [0, 1]); // 기존 카드 유지

    const charlie = getPlayer(s, 'p3');
    expect(charlie.cards.filter(c => !c.revealed)).toHaveLength(2);
    expect(s.phase).toBe('action');
    expect(s.currentTurnId).toBe('p1');
  });
});

// ============================================================
// 7. 엣지 케이스
// ============================================================

describe('엣지 케이스', () => {
  test('assassination double-loss guard: 블록 도전 실패로 탈락한 target에 암살 미실행', () => {
    // p2가 카드 1장만 남은 상태에서 Contessa 블러프 블록 → 블록 도전 성공 → p2 탈락 → 암살 스킵
    const state = createTestState({
      players: [
        {
          id: 'p1', name: 'Alice', coins: 5,
          cards: [{ character: 'Assassin' as Character, revealed: false }, { character: 'Duke' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p2', name: 'Bob', coins: 2,
          cards: [{ character: 'Captain' as Character, revealed: true }, { character: 'Ambassador' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p3', name: 'Charlie', coins: 2,
          cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
      ],
    });

    let s = processAction(state, 'p1', { type: 'assassinate', targetId: 'p2' });
    // p2가 Contessa로 블록 (블러프! - Contessa 없음)
    s = processResponse(s, 'p2', 'block', 'Contessa');
    // p1이 블록에 도전 → 성공 → p2 마지막 카드 잃음 → 탈락
    s = processBlockResponse(s, 'p1', 'challenge');

    // p2는 이미 탈락
    const bob = getPlayer(s, 'p2');
    expect(bob.isAlive).toBe(false);
    // 암살은 실행되지 않아야 함 (lose_influence가 아닌 다음 턴으로)
    expect(s.phase).toBe('action');
    // p2 탈락이므로 p3로 건너뜀
    expect(s.currentTurnId).toBe('p3');
  });

  test('exchange: 덱이 비었을 때 에러 없이 처리', () => {
    const state = createTestState({
      currentTurnId: 'p3',
      deck: [], // 덱 비어있음
    });
    let s = processAction(state, 'p3', { type: 'exchange' });
    s = allPass(s);

    expect(s.phase).toBe('exchange_select');
    expect(s.pendingAction!.exchangeCards).toHaveLength(0);

    // 뽑은 카드가 없으므로 기존 카드만으로 선택
    s = processExchangeSelect(s, 'p3', [0, 1]);
    expect(s.phase).toBe('action');
  });

  test('exchange: 덱이 1장일 때 1장만 뽑기', () => {
    const state = createTestState({
      currentTurnId: 'p3',
      deck: ['Duke'], // 덱 1장
    });
    let s = processAction(state, 'p3', { type: 'exchange' });
    s = allPass(s);

    expect(s.phase).toBe('exchange_select');
    expect(s.pendingAction!.exchangeCards).toHaveLength(1);
  });

  test('10코인 이상 → 쿠 외 다른 액션 불가', () => {
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p1' ? { ...p, coins: 10 } : p
      ),
    });
    expect(() =>
      processAction(state, 'p1', { type: 'income' })
    ).toThrow('코인이 10개 이상이면 쿠데타를 해야 합니다');

    expect(() =>
      processAction(state, 'p1', { type: 'tax' })
    ).toThrow('코인이 10개 이상이면 쿠데타를 해야 합니다');

    // 쿠는 가능
    const result = processAction(state, 'p1', { type: 'coup', targetId: 'p2' });
    expect(result.phase).toBe('lose_influence');
  });

  test('플레이어 탈락 후 턴 스킵', () => {
    // p2가 탈락한 상태
    const state = createTestState({
      players: createTestState().players.map(p =>
        p.id === 'p2'
          ? { ...p, isAlive: false, cards: p.cards.map(c => ({ ...c, revealed: true })) }
          : p
      ),
    });
    const result = processAction(state, 'p1', { type: 'income' });
    // p2가 탈락이므로 p3로 건너뜀
    expect(result.currentTurnId).toBe('p3');
  });

  test('최후 1인 → game_over', () => {
    // p2, p3가 카드 1장씩만 남은 상태, p1이 p2에게 쿠
    const state = createTestState({
      players: [
        {
          id: 'p1', name: 'Alice', coins: 7,
          cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p2', name: 'Bob', coins: 0,
          cards: [{ character: 'Assassin' as Character, revealed: true }, { character: 'Contessa' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p3', name: 'Charlie', coins: 0,
          cards: [{ character: 'Ambassador' as Character, revealed: true }, { character: 'Duke' as Character, revealed: true }],
          isAlive: false, isReady: true,
        },
      ],
    });

    let s = processAction(state, 'p1', { type: 'coup', targetId: 'p2' });
    s = processLoseInfluence(s, 'p2', 1); // 마지막 카드

    expect(s.phase).toBe('game_over');
    expect(s.winnerId).toBe('p1');
  });

  test('타겟 없이 대상이 필요한 액션 사용 시 에러', () => {
    const state = createTestState();
    expect(() =>
      processAction(state, 'p1', { type: 'assassinate' })
    ).toThrow('대상이 필요합니다');

    expect(() =>
      processAction(state, 'p1', { type: 'steal' })
    ).toThrow('대상이 필요합니다');

    expect(() =>
      processAction(state, 'p1', { type: 'coup' })
    ).toThrow('대상이 필요합니다');
  });

  test('initGame: 올바른 초기 상태', () => {
    const state = initGame([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].coins).toBe(2);
    expect(state.players[0].cards).toHaveLength(2);
    expect(state.players[0].cards.every(c => !c.revealed)).toBe(true);
    expect(state.players[0].isAlive).toBe(true);
    expect(['a', 'b']).toContain(state.currentTurnId);
    expect(state.phase).toBe('action');
    expect(state.deck).toHaveLength(11); // 15 - 4장 (2명 × 2장)
    expect(state.log).toHaveLength(2);
    expect(state.log[1]).toMatch(/--- .+의 턴 ---/);
  });

  test('initGame 4인: 덱 잔량 7장', () => {
    const state = initGame([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D' },
    ]);
    expect(state.players).toHaveLength(4);
    expect(state.deck).toHaveLength(7); // 15 - 8
  });
});

// ============================================================
// 8. 복합 시나리오 (연속 턴 진행)
// ============================================================

describe('복합 시나리오', () => {
  test('전체 턴 순환: p1 → p2 → p3 → p1', () => {
    let s = createTestState();
    // p1 income
    s = processAction(s, 'p1', { type: 'income' });
    expect(s.currentTurnId).toBe('p2');
    // p2 income
    s = processAction(s, 'p2', { type: 'income' });
    expect(s.currentTurnId).toBe('p3');
    // p3 income
    s = processAction(s, 'p3', { type: 'income' });
    expect(s.currentTurnId).toBe('p1');
  });

  test('income 연속 → 코인 누적', () => {
    let s = createTestState();
    // 6턴 income (3명이 2바퀴)
    for (let turn = 0; turn < 6; turn++) {
      s = processAction(s, s.currentTurnId, { type: 'income' });
    }
    // 각 플레이어 = 2(초기) + 2(2회 income) = 4코인
    expect(getPlayer(s, 'p1').coins).toBe(4);
    expect(getPlayer(s, 'p2').coins).toBe(4);
    expect(getPlayer(s, 'p3').coins).toBe(4);
  });

  test('도전 → 탈락 → 턴 스킵 복합', () => {
    // p2 카드 1장만 남은 상태에서 도전 실패 → 탈락
    const state = createTestState({
      players: [
        {
          id: 'p1', name: 'Alice', coins: 2,
          cards: [{ character: 'Duke' as Character, revealed: false }, { character: 'Captain' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p2', name: 'Bob', coins: 2,
          cards: [{ character: 'Assassin' as Character, revealed: true }, { character: 'Contessa' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
        {
          id: 'p3', name: 'Charlie', coins: 2,
          cards: [{ character: 'Ambassador' as Character, revealed: false }, { character: 'Duke' as Character, revealed: false }],
          isAlive: true, isReady: true,
        },
      ],
    });

    // p1이 tax (진짜 Duke 보유)
    let s = processAction(state, 'p1', { type: 'tax' });
    // p2가 도전 → 실패 → p2 마지막 카드 잃음 → 탈락
    s = processResponse(s, 'p2', 'challenge');

    const bob = getPlayer(s, 'p2');
    expect(bob.isAlive).toBe(false);
    // tax 실행됨 → 코인 +3
    expect(getPlayer(s, 'p1').coins).toBe(5);
    // 다음 턴은 p3 (p2 스킵)
    expect(s.currentTurnId).toBe('p3');
  });
});
