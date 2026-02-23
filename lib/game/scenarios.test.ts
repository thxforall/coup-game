import { GameScenario } from './test-helpers';
import { Character } from './types';

// ============================================================
// Reusable player setups
// ============================================================

// p1 has no Duke - bluff for tax
const BLUFFER_TAX = () => [
  { id: 'p1', name: 'Alice', cards: ['Captain', 'Ambassador'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Duke', 'Duke'] as [Character, Character] },
];

// p1 has Duke - truthful for tax
const TRUTHFUL_TAX = () => [
  { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
];

// p1 has Captain - truthful for steal
const TRUTHFUL_STEAL = () => [
  { id: 'p1', name: 'Alice', cards: ['Captain', 'Duke'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
];

// p1 has no Captain - bluff for steal
const BLUFFER_STEAL = () => [
  { id: 'p1', name: 'Alice', cards: ['Duke', 'Ambassador'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Captain', 'Duke'] as [Character, Character] },
];

// p1 has Assassin + 5 coins, p2 has Contessa
const ASSASSIN_SETUP = () => [
  { id: 'p1', name: 'Alice', coins: 5, cards: ['Assassin', 'Duke'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Contessa', 'Captain'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
];

// p1 bluffs assassinate (no Assassin)
const BLUFFER_ASSASSIN = () => [
  { id: 'p1', name: 'Alice', coins: 5, cards: ['Duke', 'Captain'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
];

// p1 has Ambassador - truthful for exchange
const TRUTHFUL_EXCHANGE = () => [
  { id: 'p1', name: 'Alice', cards: ['Ambassador', 'Duke'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Captain', 'Duke'] as [Character, Character] },
];

// p1 has no Ambassador - bluff for exchange
const BLUFFER_EXCHANGE = () => [
  { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] as [Character, Character] },
  { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
];

// ============================================================
// 1. Uncontested Actions
// ============================================================

describe('Scenario: Uncontested Actions', () => {
  test('income -> +1 coin -> next turn', () => {
    GameScenario.create({ players: TRUTHFUL_TAX() })
      .action('p1', { type: 'income' })
      .expectPhase('action')
      .expectCoins('p1', 3)
      .expectCurrentTurn('p2');
  });

  test('foreignAid -> all pass -> +2 coins -> next turn', () => {
    GameScenario.create({ players: TRUTHFUL_TAX() })
      .action('p1', { type: 'foreignAid' })
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 4)
      .expectCurrentTurn('p2');
  });

  test('tax -> all pass -> +3 coins -> next turn', () => {
    GameScenario.create({ players: TRUTHFUL_TAX() })
      .action('p1', { type: 'tax' })
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 5)
      .expectCurrentTurn('p2');
  });

  test('steal -> all pass -> coins transferred -> next turn', () => {
    GameScenario.create({ players: TRUTHFUL_STEAL() })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 4)
      .expectCoins('p2', 0)
      .expectCurrentTurn('p2');
  });

  test('assassinate -> all pass -> lose_influence -> card revealed -> next turn', () => {
    GameScenario.create({ players: ASSASSIN_SETUP() })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p1', 2) // -3 coins on declaration
      .allPass()
      .expectPhase('lose_influence')
      .loseInfluence('p2', 0)
      .expectCards('p2', 1)
      .expectPhase('action')
      .expectCurrentTurn('p2');
  });

  test('exchange -> all pass -> exchange_select -> cards chosen -> next turn', () => {
    GameScenario.create({ players: TRUTHFUL_EXCHANGE() })
      .action('p1', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      .exchangeSelect('p1', [0, 1]) // keep original cards
      .expectPhase('action')
      .expectCards('p1', 2)
      .expectCurrentTurn('p2');
  });

  test('coup -> lose_influence -> card revealed -> next turn', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 7, cards: ['Duke', 'Captain'] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] },
      ],
    })
      .action('p1', { type: 'coup', targetId: 'p2' })
      .expectCoins('p1', 0) // -7 coins
      .expectPhase('lose_influence')
      .loseInfluence('p2', 0)
      .expectCards('p2', 1)
      .expectPhase('action')
      .expectCurrentTurn('p2');
  });
});

// ============================================================
// 2. Challenge Scenarios
// ============================================================

describe('Scenario: Challenges', () => {
  // --- Tax ---
  test('tax bluff challenged -> actor loses card, no coins gained', () => {
    GameScenario.create({ players: BLUFFER_TAX() })
      .action('p1', { type: 'tax' })
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p1', 1)
      .expectCoins('p1', 2)
      .expectCurrentTurn('p2');
  });

  test('tax real challenged -> challenger loses card, +3 coins', () => {
    GameScenario.create({ players: TRUTHFUL_TAX() })
      .action('p1', { type: 'tax' })
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p2', 1)
      .expectCoins('p1', 5)
      .expectCurrentTurn('p2');
  });

  // --- Steal ---
  test('steal bluff challenged -> actor loses card, no steal', () => {
    GameScenario.create({ players: BLUFFER_STEAL() })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p1', 1)
      .expectCoins('p1', 2)
      .expectCoins('p2', 2)
      .expectCurrentTurn('p2');
  });

  test('steal real challenged -> challenger loses card, steal executes', () => {
    GameScenario.create({ players: TRUTHFUL_STEAL() })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p2', 1)
      .expectCoins('p1', 4)
      .expectCoins('p2', 0)
      .expectCurrentTurn('p2');
  });

  // --- Assassinate ---
  test('assassinate bluff challenged -> actor loses card, coins NOT refunded, target safe', () => {
    GameScenario.create({ players: BLUFFER_ASSASSIN() })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p1', 2) // coins already deducted
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p1', 1)
      .expectCoins('p1', 2) // NOT refunded
      .expectCards('p2', 2) // target safe
      .expectCurrentTurn('p2');
  });

  test('assassinate real challenged -> challenger loses card, target enters lose_influence', () => {
    GameScenario.create({ players: ASSASSIN_SETUP() })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .respond('p2', 'challenge')
      // challenge fails (p1 has Assassin), p2 loses a card from challenge
      .expectCards('p2', 1)
      // then assassinate executes -> lose_influence for p2
      .expectPhase('lose_influence')
      .loseInfluence('p2', 1) // p2's remaining card
      .expectAlive('p2', false);
  });

  // --- Exchange ---
  test('exchange bluff challenged -> actor loses card, no exchange', () => {
    GameScenario.create({ players: BLUFFER_EXCHANGE() })
      .action('p1', { type: 'exchange' })
      .respond('p2', 'challenge')
      .expectPhase('action')
      .expectCards('p1', 1)
      .expectCurrentTurn('p2');
  });

  test('exchange real challenged -> challenger loses card, exchange proceeds', () => {
    GameScenario.create({ players: TRUTHFUL_EXCHANGE() })
      .action('p1', { type: 'exchange' })
      .respond('p2', 'challenge')
      // challenge fails, p2 loses card, exchange proceeds
      .expectCards('p2', 1)
      .expectPhase('exchange_select')
      .exchangeSelect('p1', [0, 1])
      .expectPhase('action')
      .expectCurrentTurn('p2');
  });
});

// ============================================================
// 3. Block Scenarios
// ============================================================

describe('Scenario: Blocks', () => {
  test('foreignAid blocked by Duke -> all pass block -> action cancelled', () => {
    GameScenario.create({ players: TRUTHFUL_TAX() })
      .action('p1', { type: 'foreignAid' })
      .respond('p2', 'block', 'Duke')
      .expectPhase('awaiting_block_response')
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 2) // no +2
      .expectCurrentTurn('p2');
  });

  test('assassinate blocked by Contessa -> all pass block -> action cancelled (coins not refunded)', () => {
    GameScenario.create({ players: ASSASSIN_SETUP() })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p1', 2) // -3 already
      .respond('p2', 'block', 'Contessa')
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 2) // NOT refunded
      .expectCards('p2', 2) // target safe
      .expectCurrentTurn('p2');
  });

  test('steal blocked by Captain -> all pass block -> no steal', () => {
    GameScenario.create({ players: TRUTHFUL_STEAL() })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'block', 'Captain')
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 2)
      .expectCoins('p2', 2)
      .expectCurrentTurn('p2');
  });

  test('steal blocked by Ambassador -> all pass block -> no steal', () => {
    GameScenario.create({ players: TRUTHFUL_STEAL() })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'block', 'Ambassador')
      .allPass()
      .expectPhase('action')
      .expectCoins('p1', 2)
      .expectCoins('p2', 2)
      .expectCurrentTurn('p2');
  });
});

// ============================================================
// 4. Block Challenge Scenarios
// ============================================================

describe('Scenario: Block Challenges', () => {
  // --- foreignAid block ---
  test('foreignAid -> Duke block (real) -> challenge block -> challenger loses card, block holds', () => {
    // p3 has Duke, blocks foreignAid, p1 challenges the block
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Ambassador'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Duke', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'foreignAid' })
      .respond('p3', 'block', 'Duke')
      .blockRespond('p1', 'challenge')
      // p3 really has Duke -> challenger (p1) loses card, block holds
      .expectCards('p1', 1)
      .expectCoins('p1', 2) // no foreignAid
      .expectPhase('action');
  });

  test('foreignAid -> Duke block (bluff) -> challenge block -> blocker loses card, action executes', () => {
    // p2 has no Duke, bluffs block on foreignAid, p1 challenges
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Ambassador'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Duke', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'foreignAid' })
      .respond('p2', 'block', 'Duke')
      .blockRespond('p1', 'challenge')
      // p2 bluffed -> blocker (p2) loses card, foreignAid executes
      .expectCards('p2', 1)
      .expectCoins('p1', 4) // +2 foreignAid
      .expectPhase('action');
  });

  // --- assassinate block ---
  test('assassinate -> Contessa block (real) -> challenge block -> challenger loses card, target safe', () => {
    // p1 assassinates p2, p2 blocks with Contessa (real), p1 challenges the block
    GameScenario.create({ players: ASSASSIN_SETUP() })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .respond('p2', 'block', 'Contessa')
      .blockRespond('p1', 'challenge')
      // p2 really has Contessa -> challenger (p1) loses card, block holds, target safe
      .expectCards('p1', 1)
      .expectCards('p2', 2) // safe
      .expectCoins('p1', 2) // coins not refunded
      .expectPhase('action');
  });

  test('assassinate -> Contessa block (bluff) -> challenge block -> blocker loses card, target enters lose_influence', () => {
    // p2 has no Contessa, bluffs Contessa block
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 5, cards: ['Assassin', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Captain', 'Ambassador'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Duke', 'Contessa'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .respond('p2', 'block', 'Contessa')
      .blockRespond('p1', 'challenge')
      // p2 bluffed Contessa -> p2 loses card from challenge, then assassinate executes
      .expectCards('p2', 1)
      .expectPhase('lose_influence')
      .loseInfluence('p2', 1) // p2's remaining unrevealed card
      .expectAlive('p2', false);
  });

  // --- steal block ---
  test('steal -> Captain block (real) -> challenge -> challenger loses card, no steal', () => {
    // p2 really has Captain, blocks steal, p1 challenges
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Captain', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'block', 'Captain')
      .blockRespond('p1', 'challenge')
      // p2 really has Captain -> p1 loses card, block holds
      .expectCards('p1', 1)
      .expectCoins('p1', 2) // no steal
      .expectCoins('p2', 2)
      .expectPhase('action');
  });

  test('steal -> Captain block (bluff) -> challenge -> blocker loses card, steal executes', () => {
    // p2 has no Captain, bluffs Captain block, p1 challenges
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .respond('p2', 'block', 'Captain')
      .blockRespond('p1', 'challenge')
      // p2 bluffed Captain -> p2 loses card, steal executes
      .expectCards('p2', 1)
      .expectCoins('p1', 4) // +2 stolen
      .expectCoins('p2', 0)
      .expectPhase('action');
  });
});

// ============================================================
// 5. Multi-Turn Games
// ============================================================

describe('Scenario: Multi-Turn Games', () => {
  test('3-player game to completion: income rounds -> coup -> eliminations -> game_over', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 7, cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', coins: 0, cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', coins: 0, cards: ['Ambassador', 'Duke'] as [Character, Character], revealedIndices: [0], alive: true },
      ],
    })
      // p1 coups p3 (1 card left -> eliminated)
      .action('p1', { type: 'coup', targetId: 'p3' })
      .loseInfluence('p3', 1)
      .expectAlive('p3', false)
      .expectPhase('action')
      .expectCurrentTurn('p2')
      // p2 income
      .action('p2', { type: 'income' })
      .expectCoins('p2', 1)
      .expectCurrentTurn('p1') // p3 skipped (dead)
      // p1 income (needs coins for next coup)
      .action('p1', { type: 'income' })
      .expectCoins('p1', 1)
      .expectCurrentTurn('p2')
      // continue accumulating... (each player needs 6 more incomes to reach 7)
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      // p1 has 7 coins (0+7 incomes), p2 has 7 coins (0+7 incomes)
      .expectCoins('p2', 7)
      .expectCoins('p1', 7)
      .expectCurrentTurn('p2')
      // p2 coups p1
      .action('p2', { type: 'coup', targetId: 'p1' })
      .loseInfluence('p1', 0) // lose first card
      .expectCards('p1', 1)
      .expectCurrentTurn('p1')
      // p1 coups p2
      .action('p1', { type: 'coup', targetId: 'p2' })
      .loseInfluence('p2', 0)
      .expectCards('p2', 1)
      .expectCurrentTurn('p2')
      // accumulate coins again (both at 0 after coup)
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'income' })
      .action('p1', { type: 'income' })
      // p2 has 7 coins (0+7 incomes)
      .expectCoins('p2', 7)
      .action('p2', { type: 'coup', targetId: 'p1' })
      .loseInfluence('p1', 1)
      .expectAlive('p1', false)
      .expectWinner('p2');
  });

  test('assassination chain: assassinate -> Contessa block bluff -> challenge block -> elimination -> game_over', () => {
    // 2-player endgame: p1 assassinates p2, p2 bluffs Contessa block, p1 challenges
    // p2 has 1 card left -> loses it from challenge -> eliminated -> game_over
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 5, cards: ['Assassin', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Captain', 'Ambassador'] as [Character, Character], revealedIndices: [0] },
      ],
    })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .respond('p2', 'block', 'Contessa')
      .blockRespond('p1', 'challenge')
      // p2 bluffed -> loses last card -> eliminated
      .expectAlive('p2', false)
      .expectWinner('p1');
  });

  test('challenge causes elimination mid-action -> turn skips dead player', () => {
    // p1 taxes (has Duke), p2 challenges with 1 card -> p2 eliminated, tax executes, turn goes to p3
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character], revealedIndices: [0] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'tax' })
      .respond('p2', 'challenge')
      // p1 really has Duke -> p2 loses last card -> eliminated
      .expectAlive('p2', false)
      .expectCoins('p1', 5) // tax executed
      .expectCurrentTurn('p3'); // p2 skipped
  });

  test('player with 10+ coins forced to coup', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 10, cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'coup', targetId: 'p2' })
      .expectCoins('p1', 3)
      .expectPhase('lose_influence');

    // Attempting non-coup with 10+ coins should throw
    expect(() => {
      GameScenario.create({
        players: [
          { id: 'p1', name: 'Alice', coins: 10, cards: ['Duke', 'Captain'] as [Character, Character] },
          { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        ],
      }).action('p1', { type: 'tax' });
    }).toThrow();
  });

  test('exchange with empty deck (0 cards)', () => {
    GameScenario.create({
      players: TRUTHFUL_EXCHANGE(),
      deck: [],
    })
      .action('p1', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      .exchangeSelect('p1', [0, 1]) // keep original since no new cards drawn
      .expectPhase('action')
      .expectCards('p1', 2);
  });

  test('exchange with 1 card in deck', () => {
    GameScenario.create({
      players: TRUTHFUL_EXCHANGE(),
      deck: ['Contessa'],
    })
      .action('p1', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      .exchangeSelect('p1', [0, 1]) // keep originals from 3 options
      .expectPhase('action')
      .expectCards('p1', 2);
  });

  test('exchange with 2 cards in deck (normal)', () => {
    GameScenario.create({
      players: TRUTHFUL_EXCHANGE(),
      deck: ['Contessa', 'Captain'],
    })
      .action('p1', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      .exchangeSelect('p1', [2, 3]) // keep drawn cards
      .expectPhase('action')
      .expectCards('p1', 2);
  });
});

// ============================================================
// 6. Edge Cases
// ============================================================

describe('Scenario: Edge Cases', () => {
  test('double loss guard: assassinate target who dies from block challenge', () => {
    // p2 has 1 card, gets assassinated, bluffs Contessa block, p1 challenges -> p2 dies from challenge
    // assassinate should NOT also execute (double loss guard)
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 5, cards: ['Assassin', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Captain', 'Ambassador'] as [Character, Character], revealedIndices: [0] },
        { id: 'p3', name: 'Charlie', cards: ['Duke', 'Contessa'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .respond('p2', 'block', 'Contessa')
      .blockRespond('p1', 'challenge')
      // p2 loses last card from challenge -> eliminated
      .expectAlive('p2', false)
      // assassinate skips (target dead), move to next turn
      .expectPhase('action')
      .expectCurrentTurn('p3'); // p2 dead, skip to p3
  });

  test('last two players: action leads to game_over', () => {
    // 2 players, p1 coups p2 who has 1 card
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', coins: 7, cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character], revealedIndices: [0] },
      ],
    })
      .action('p1', { type: 'coup', targetId: 'p2' })
      .loseInfluence('p2', 1) // last card
      .expectAlive('p2', false)
      .expectPhase('game_over')
      .expectWinner('p1');
  });

  test('dead player skipped in response collection', () => {
    // p3 is dead, p1 does foreignAid, only p2 needs to respond (p3 not in responses)
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character], revealedIndices: [0, 1], alive: false },
      ],
    })
      .action('p1', { type: 'foreignAid' })
      .respond('p2', 'pass')
      // only p2 needed to respond (p3 is dead), so this resolves immediately
      .expectPhase('action')
      .expectCoins('p1', 4)
      .expectCurrentTurn('p2');
  });

  test('steal from player with 0 coins -> still valid, steals 0', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', coins: 0, cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .allPass()
      .expectCoins('p1', 2) // 0 stolen
      .expectCoins('p2', 0);
  });

  test('steal from player with 1 coin -> steals only 1', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Captain', 'Duke'] as [Character, Character] },
        { id: 'p2', name: 'Bob', coins: 1, cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      .action('p1', { type: 'steal', targetId: 'p2' })
      .allPass()
      .expectCoins('p1', 3) // only 1 stolen
      .expectCoins('p2', 0);
  });

  test('multiple turns with mixed actions - full integration', () => {
    GameScenario.create({
      players: [
        { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] as [Character, Character] },
        { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'Charlie', cards: ['Ambassador', 'Duke'] as [Character, Character] },
      ],
    })
      // Turn 1: p1 tax (uncontested)
      .action('p1', { type: 'tax' })
      .allPass()
      .expectCoins('p1', 5)
      .expectCurrentTurn('p2')
      // Turn 2: p2 income
      .action('p2', { type: 'income' })
      .expectCoins('p2', 3)
      .expectCurrentTurn('p3')
      // Turn 3: p3 foreignAid (uncontested)
      .action('p3', { type: 'foreignAid' })
      .allPass()
      .expectCoins('p3', 4)
      .expectCurrentTurn('p1')
      // Turn 4: p1 steal from p3
      .action('p1', { type: 'steal', targetId: 'p3' })
      .allPass()
      .expectCoins('p1', 7)
      .expectCoins('p3', 2)
      .expectCurrentTurn('p2');
  });
});
