import { filterStateForPlayer } from './filter';
import { GameState, Player, Character } from './types';

function createTestState(): GameState {
  const players: Player[] = [
    {
      id: 'p1', name: 'Alice', coins: 5,
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
        { character: 'Contessa', revealed: true },
      ],
      isAlive: true, isReady: true,
    },
    {
      id: 'p3', name: 'Charlie', coins: 0,
      cards: [
        { character: 'Ambassador', revealed: true },
        { character: 'Duke', revealed: true },
      ],
      isAlive: false, isReady: true,
    },
  ];

  return {
    players,
    currentTurnId: 'p1',
    phase: 'action',
    deck: ['Captain', 'Contessa', 'Ambassador'],
    pendingAction: null,
    log: ['게임이 시작되었습니다!'],
  };
}

describe('filterStateForPlayer', () => {
  test('본인 카드는 완전 노출', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');

    const me = filtered.players.find(p => p.id === 'p1')!;
    expect(me.cards).toHaveLength(2);
    expect(me.cards[0]).toEqual({ character: 'Duke', revealed: false });
    expect(me.cards[1]).toEqual({ character: 'Captain', revealed: false });
  });

  test('상대 비공개 카드의 character는 null', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');

    const bob = filtered.players.find(p => p.id === 'p2')!;
    // 첫 번째 카드: 비공개 → character null
    expect(bob.cards[0]).toEqual({ revealed: false, character: null });
    // 두 번째 카드: 공개됨 → character 표시
    expect(bob.cards[1]).toEqual({ revealed: true, character: 'Contessa' });
  });

  test('상대 공개 카드의 character는 표시', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');

    const charlie = filtered.players.find(p => p.id === 'p3')!;
    expect(charlie.cards[0]).toEqual({ revealed: true, character: 'Ambassador' });
    expect(charlie.cards[1]).toEqual({ revealed: true, character: 'Duke' });
  });

  test('deck은 포함되지 않음', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');

    expect((filtered as Record<string, unknown>).deck).toBeUndefined();
  });

  test('exchangeCards: 본인 exchange일 때만 접근 가능', () => {
    const state: GameState = {
      ...createTestState(),
      phase: 'exchange_select',
      pendingAction: {
        type: 'exchange',
        actorId: 'p1',
        responses: {},
        exchangeCards: ['Assassin', 'Ambassador'],
      },
    };

    // p1 (exchange 행위자) → exchangeCards 포함
    const filteredForP1 = filterStateForPlayer(state, 'p1');
    expect(filteredForP1.pendingAction!.exchangeCards).toEqual(['Assassin', 'Ambassador']);

    // p2 (비행위자) → exchangeCards 미포함
    const filteredForP2 = filterStateForPlayer(state, 'p2');
    expect(filteredForP2.pendingAction!.exchangeCards).toBeUndefined();
  });

  test('pendingAction이 null이면 그대로 null', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');
    expect(filtered.pendingAction).toBeNull();
  });

  test('winnerId가 있으면 포함', () => {
    const state: GameState = {
      ...createTestState(),
      phase: 'game_over',
      winnerId: 'p1',
    };
    const filtered = filterStateForPlayer(state, 'p2');
    expect(filtered.winnerId).toBe('p1');
  });

  test('handles undefined cards from Firebase (empty array dropped)', () => {
    const state: GameState = {
      ...createTestState(),
      players: createTestState().players.map(p => ({
        ...p,
        cards: undefined as any,  // Firebase drops empty arrays
      })),
    };
    // Should not throw
    const result = filterStateForPlayer(state, 'p1');
    // Self: gets empty cards array
    expect(result.players.find(p => p.id === 'p1')!.cards).toEqual([]);
    // Others: get empty masked cards array
    expect(result.players.find(p => p.id === 'p2')!.cards).toEqual([]);
    expect(result.players.find(p => p.id === 'p3')!.cards).toEqual([]);
  });

  test('코인, isAlive 등 기본 정보 보존', () => {
    const state = createTestState();
    const filtered = filterStateForPlayer(state, 'p1');

    expect(filtered.players).toHaveLength(3);
    expect(filtered.currentTurnId).toBe('p1');
    expect(filtered.phase).toBe('action');
    expect(filtered.log).toEqual(['게임이 시작되었습니다!']);

    const bob = filtered.players.find(p => p.id === 'p2')!;
    expect(bob.coins).toBe(2);
    expect(bob.isAlive).toBe(true);

    const charlie = filtered.players.find(p => p.id === 'p3')!;
    expect(charlie.isAlive).toBe(false);
  });
});
