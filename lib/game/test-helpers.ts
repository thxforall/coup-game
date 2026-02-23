import {
  Character,
  ActionType,
  GameState,
  GamePhase,
  Player,
  Card,
  ResponseType,
} from './types';
import {
  processAction,
  processResponse,
  processBlockResponse,
  processLoseInfluence,
  processExchangeSelect,
  getPlayer,
  getAlivePlayers,
} from './engine';

// ============================================================
// Scenario Test DSL - Fluent API for Coup engine tests
// ============================================================

export interface PlayerConfig {
  id: string;
  name: string;
  coins?: number;
  cards: [Character, Character];
  alive?: boolean;
  revealedIndices?: number[];
}

export interface ScenarioConfig {
  players: PlayerConfig[];
  currentTurnId?: string;
  deck?: Character[];
}

/**
 * Fluent test helper for writing multi-step game scenarios.
 *
 * Usage:
 * ```ts
 * GameScenario.create({
 *   players: [
 *     { id: 'p1', name: 'Alice', cards: ['Duke', 'Captain'] },
 *     { id: 'p2', name: 'Bob', cards: ['Assassin', 'Contessa'] },
 *   ],
 * })
 *   .action('p1', { type: 'tax' })
 *   .allPass()
 *   .expectCoins('p1', 5)
 *   .expectCurrentTurn('p2');
 * ```
 */
export class GameScenario {
  private _state: GameState;

  private constructor(state: GameState) {
    this._state = state;
  }

  /** Access the raw GameState for custom assertions. */
  get state(): GameState {
    return this._state;
  }

  /** Create a deterministic game state from config. */
  static create(config: ScenarioConfig): GameScenario {
    const defaultDeck: Character[] = [
      'Duke', 'Contessa', 'Captain', 'Assassin', 'Ambassador',
      'Duke', 'Contessa', 'Captain', 'Assassin', 'Ambassador',
    ];

    const players: Player[] = config.players.map((p) => {
      const revealedSet = new Set(p.revealedIndices ?? []);
      const cards: Card[] = p.cards.map((char, i) => ({
        character: char,
        revealed: revealedSet.has(i),
      }));
      const liveCount = cards.filter((c) => !c.revealed).length;
      const isAlive = p.alive !== undefined ? p.alive : liveCount > 0;

      return {
        id: p.id,
        name: p.name,
        coins: p.coins ?? 2,
        cards,
        isAlive,
        isReady: true,
      };
    });

    const state: GameState = {
      players,
      currentTurnId: config.currentTurnId ?? config.players[0].id,
      phase: 'action',
      deck: config.deck ?? defaultDeck,
      pendingAction: null,
      log: ['Game started (scenario test)'],
    };

    return new GameScenario(state);
  }

  // ============================================================
  // Engine action wrappers (chainable)
  // ============================================================

  /** Declare an action. Wraps processAction. */
  action(playerId: string, action: { type: ActionType; targetId?: string }): this {
    this._state = processAction(this._state, playerId, action);
    return this;
  }

  /** Respond to a pending action. Wraps processResponse. */
  respond(playerId: string, response: ResponseType, character?: Character): this {
    this._state = processResponse(this._state, playerId, response, character);
    return this;
  }

  /** Respond to a pending block. Wraps processBlockResponse. */
  blockRespond(playerId: string, response: ResponseType): this {
    this._state = processBlockResponse(this._state, playerId, response);
    return this;
  }

  /** Lose influence (reveal a card). Wraps processLoseInfluence. */
  loseInfluence(playerId: string, cardIndex: number): this {
    this._state = processLoseInfluence(this._state, playerId, cardIndex);
    return this;
  }

  /** Select cards to keep during exchange. Wraps processExchangeSelect. */
  exchangeSelect(playerId: string, keptIndices: number[]): this {
    this._state = processExchangeSelect(this._state, playerId, keptIndices);
    return this;
  }

  /** All pending responders pass (handles both awaiting_response and awaiting_block_response). */
  allPass(): this {
    const pending = this._state.pendingAction;
    if (!pending) {
      throw new Error(
        `allPass() called but no pending action. Phase: ${this._state.phase}`
      );
    }

    for (const playerId of Object.keys(pending.responses)) {
      if (pending.responses[playerId] === 'pending') {
        if (this._state.phase === 'awaiting_response') {
          this._state = processResponse(this._state, playerId, 'pass');
        } else if (this._state.phase === 'awaiting_block_response') {
          this._state = processBlockResponse(this._state, playerId, 'pass');
        }
      }
    }
    return this;
  }

  // ============================================================
  // Assertion methods (chainable)
  // ============================================================

  /** Assert the current game phase. */
  expectPhase(phase: GamePhase): this {
    if (this._state.phase !== phase) {
      throw new Error(
        `Expected phase "${phase}" but got "${this._state.phase}"` +
        this._contextInfo()
      );
    }
    return this;
  }

  /** Assert a player's coin count. */
  expectCoins(playerId: string, coins: number): this {
    const player = getPlayer(this._state, playerId);
    if (player.coins !== coins) {
      throw new Error(
        `Expected ${playerId} to have ${coins} coins but got ${player.coins}` +
        this._contextInfo()
      );
    }
    return this;
  }

  /** Assert a player's alive status. */
  expectAlive(playerId: string, alive: boolean): this {
    const player = getPlayer(this._state, playerId);
    if (player.isAlive !== alive) {
      throw new Error(
        `Expected ${playerId} alive=${alive} but got alive=${player.isAlive}` +
        this._contextInfo()
      );
    }
    return this;
  }

  /** Assert a player's live (unrevealed) card count. */
  expectCards(playerId: string, count: number): this {
    const player = getPlayer(this._state, playerId);
    const liveCount = player.cards.filter((c) => !c.revealed).length;
    if (liveCount !== count) {
      throw new Error(
        `Expected ${playerId} to have ${count} live cards but got ${liveCount}` +
        this._contextInfo()
      );
    }
    return this;
  }

  /** Assert the game winner. */
  expectWinner(playerId: string): this {
    if (this._state.phase !== 'game_over') {
      throw new Error(
        `Expected game_over phase but got "${this._state.phase}"` +
        this._contextInfo()
      );
    }
    if (this._state.winnerId !== playerId) {
      throw new Error(
        `Expected winner "${playerId}" but got "${this._state.winnerId}"` +
        this._contextInfo()
      );
    }
    return this;
  }

  /** Assert whose turn it is. */
  expectCurrentTurn(playerId: string): this {
    if (this._state.currentTurnId !== playerId) {
      throw new Error(
        `Expected current turn "${playerId}" but got "${this._state.currentTurnId}"` +
        this._contextInfo()
      );
    }
    return this;
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  private _contextInfo(): string {
    const pending = this._state.pendingAction;
    return (
      ` | Context: phase=${this._state.phase}` +
      `, turn=${this._state.currentTurnId}` +
      (pending ? `, pendingAction=${pending.type}` : '')
    );
  }
}
