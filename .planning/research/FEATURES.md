# Feature Research

**Domain:** Online multiplayer board game (Coup) — completeness milestone
**Researched:** 2026-02-23
**Confidence:** HIGH (official rulebook + existing engine code cross-verified)

---

## Scope

The basic 7 actions (income, foreignAid, coup, tax, assassinate, steal, exchange) and a
challenge/block system already exist. This document focuses on **completeness** — every
game scenario and interaction that must work correctly for a finished implementation.

---

## Complete Action Reference

| Action | Type | Cost | Effect | Challengeable | Blockable By |
|--------|------|------|--------|---------------|--------------|
| Income | General | 0 | +1 coin | No | No |
| Foreign Aid | General | 0 | +2 coins | No | Duke |
| Coup | General | 7 coins | Target loses 1 influence (mandatory at 10+) | No | No |
| Tax | Character (Duke) | 0 | +3 coins | Yes | — |
| Assassinate | Character (Assassin) | 3 coins | Target loses 1 influence | Yes | Contessa (target only) |
| Steal | Character (Captain) | 0 | Take ≤2 coins from target | Yes | Captain, Ambassador (target only) |
| Exchange | Character (Ambassador) | 0 | Draw 2 from deck, keep hand size, return rest | Yes | — |

---

## Table Stakes

Features users expect. Missing = game is broken or unplayable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All 7 actions execute correctly | Core game loop | LOW | Already implemented |
| Challenge on all 4 character actions (tax, assassinate, steal, exchange) | Core bluffing mechanic | LOW | Already implemented |
| Block on foreign aid (Duke), assassinate (Contessa), steal (Captain/Ambassador) | Core counterplay | LOW | Already implemented |
| Challenge on any block claim | Without this, blocks are automatic free counters | LOW | Already implemented |
| Forced coup at 10+ coins | Official rule; prevents coin hoarding | LOW | Already implemented |
| Player chooses which card to lose (not auto-reveal first card) | Core player agency | LOW | Already implemented via cardIndex |
| Player elimination when both cards are revealed | Win condition depends on this | LOW | Already implemented |
| Turn skip for eliminated players | Eliminated players can't act | LOW | Already implemented |
| Win detection (last player standing) | Game must end | LOW | Already implemented |
| Coin deducted for assassinate at declaration time, not resolution | Official rule; coin not refunded on failed challenge | MEDIUM | Already implemented — no refund on challenge success |
| Assassinate coin NOT refunded when action is challenged and challenged succeeds | Official rule — explicitly documented in engine | LOW | Already implemented per comment in engine.ts |
| Steal takes min(target.coins, 2) — not a fixed 2 | Correctness when target has 0 or 1 coin | LOW | Already implemented |
| Block claim does NOT require actual card (bluffing allowed) | Fundamental to Coup's design | LOW | Already implemented |
| Card replacement after successful challenge defense | When challenger loses, actor shuffles claimed card back and draws new one | MEDIUM | Already implemented |
| Blocker card replacement after block challenge defense | Same mechanic as above but for blocker | MEDIUM | Already implemented |
| Ambassador exchange: draw 2 cards from deck, player keeps hand-size cards, returns rest | Core exchange mechanic | MEDIUM | Implemented but edge case below |
| 2–6 player support | Official player count range | LOW | Deck has 15 cards; 6 players × 2 cards = 12, leaving 3 in deck for exchange |

---

## Critical Edge Cases (Table Stakes)

These are scenarios that MUST work correctly — incorrect handling breaks the game.

### Edge Case 1: Double Influence Loss in One Turn (Assassination)

**Scenario:** Player A assassinates Player B. Player B has 1 card remaining.

**Sub-scenario A — Target challenges the Assassin (and loses):**
1. Player A declares assassinate (pays 3 coins)
2. Player B challenges — Player A reveals Assassin card
3. Player B loses 1 influence for the failed challenge
4. If Player B is now eliminated → game checks for winner, assassination does NOT still resolve (target is already dead)
5. If Player B still has 1 card → assassination proceeds → Player B loses 1 more influence → eliminated

**Sub-scenario B — Target blocks with false Contessa (block is challenged and lost):**
1. Player A declares assassinate (pays 3 coins)
2. Player B claims Contessa block (bluffing)
3. Any player challenges the block — Player B cannot show Contessa
4. Player B loses 1 influence for the failed block claim
5. If Player B is now eliminated → game checks for winner, assassination does NOT resolve
6. If Player B still has 1 card → assassination proceeds → Player B loses 1 more influence → eliminated

**Status:** UNVERIFIED in current engine. The engine's `processBlockResponse` when block challenge succeeds calls `executeAction` directly after blocker loses a card, but does NOT check if the blocker (who is the assassination target) was eliminated in step 4. **This is a bug risk.**

---

### Edge Case 2: Ambassador Exchange Card Count with 1 Live Card

**Scenario:** Player has only 1 face-down card (1 influence remaining) and uses Exchange.

**Rule:** Draw 2 cards from deck. Player now has 1 (hand) + 2 (drawn) = 3 cards to choose from. Must return 2, keep 1.

**Status:** Current engine `processExchangeSelect` uses `liveCards` count to determine how many to keep (`keptIndices.length` must equal `liveCards.length`). With 1 live card the player keeps 1 from 3 options. This appears correct but needs a test.

---

### Edge Case 3: Target Already Eliminated Before Pending Action Resolves

**Scenario:** In a multi-step resolution, the target player is eliminated mid-sequence (e.g., via double influence loss) before the pending action's lose_influence phase runs.

**Rule:** If the target has already lost all influence, the pending action's lose_influence phase should not trigger again.

**Status:** UNVERIFIED. The `processLoseInfluence` function does not guard against calling it on an already-eliminated player. The `checkWinner` logic runs after each card loss but the phase transitions need to respect already-dead targets.

---

### Edge Case 4: Action Challenger is the Target of Assassination

**Scenario:** Player B is the assassination target AND Player B also challenges the Assassin claim (target challenging the action against themselves).

This is legal — the target may challenge the action instead of blocking it. If the challenge succeeds (actor was bluffing), the assassination is cancelled and the actor loses a card. If the challenge fails, the actor's card is replaced and the assassination proceeds — triggering lose_influence for Player B.

**Status:** VERIFIED in existing engine. `processResponse` handles challenges from any player including the target.

---

### Edge Case 5: Non-Target Player Blocks

**Rule:** Only the TARGET of steal/assassinate can block. Any player can block foreign aid (Duke block).

**Current engine behavior:** The `processResponse` function allows ANY alive player to block steal and assassinate, not just the target. This contradicts official rules.

**Status:** BUG — blocking should be restricted to the target for steal and assassinate.

---

### Edge Case 6: Only Target Can Block Steal/Assassinate, But Anyone Can Challenge

**Rule:** Foreign aid block — any player may claim Duke to block (not just target, since there is no specific target). Steal/assassinate block — only the target player may block.

**Status:** BUG (same as Edge Case 5) — engine does not enforce target-only blocking.

---

### Edge Case 7: Player with 0 Coins Is Targeted by Steal

**Rule:** If target has 0 coins, Captain steals 0 (action still "resolves" but no coins change hands).

**Status:** VERIFIED in engine and tests (`Math.min(target.coins, 2)`, test exists for 0-coin target).

---

### Edge Case 8: Forced Coup at Exactly 10 Coins (Not Only 10+)

**Rule:** If a player starts their turn with 10 OR MORE coins, they must coup.

**Status:** VERIFIED. Engine checks `actor.coins >= 10`.

---

### Edge Case 9: Coup Target with 1 Card vs 2 Cards

**Rule:** Coup always causes exactly 1 influence loss. If target has 1 card, they are eliminated.

**Status:** VERIFIED. `processLoseInfluence` handles elimination correctly.

---

### Edge Case 10: 2-Player Game

**Official variant rules:** Starting player receives 1 coin instead of 2. Deck setup differs.

**Status:** NOT IMPLEMENTED. Current engine gives all players 2 coins at start regardless of player count. For a 2-player game, the starting player should have 1 coin.

**Note on player count:** Official rulebook says 3–6 players. The 2-player variant is an unofficial variant included in some printings. As this is an online game supporting 2–6 players, explicit handling should be documented.

---

### Edge Case 11: Exchange When Deck Has Fewer Than 2 Cards

**Scenario:** Late game, very few cards remain in deck. Ambassador tries to exchange but deck has 0 or 1 cards.

**Rule:** Not explicitly addressed in official rules. Common implementation: draw however many are available (0 or 1).

**Status:** UNVERIFIED. Current engine pops 2 cards without checking deck size. If deck has 0 cards, `pop()` returns `undefined`, which would cause runtime errors.

---

### Edge Case 12: Multiple Simultaneous Block Claims

**Rule:** Only one block can be active at a time. Once one player declares a block, the response phase shifts to "challenge the block". Other players cannot also declare blocks.

**Status:** VERIFIED by design — engine transitions to `awaiting_block_response` phase immediately on first block, preventing other blocks.

---

### Edge Case 13: Action Actor Cannot Block Their Own Action

**Rule:** The player who declared the action cannot block or challenge their own action.

**Status:** VERIFIED. Engine's response collection excludes the actor (`responses` only includes other alive players).

---

### Edge Case 14: Player Eliminated During Challenge Resolution May Affect Turn Order

**Scenario:** Player B challenges Player A's action, Player B loses the challenge and has only 1 card — Player B is eliminated. Turn should go to next alive player, skipping B.

**Status:** VERIFIED. `nextTurn` uses `getAlivePlayers` which filters by `isAlive`.

---

### Edge Case 15: Contessa Block Can Only Be Claimed by the Assassination Target

**Rule:** Only the targeted player can use Contessa to block an assassination. Third parties cannot block assassination.

**Status:** BUG — same as Edge Cases 5 and 6. Engine allows any player to respond with 'block' + 'Contessa'.

---

## Complete Scenario Matrix

### Action × Response × Outcome

| # | Action | Response | By | Outcome |
|---|--------|----------|----|---------|
| 1 | Income | (none possible) | — | Actor +1 coin, next turn |
| 2 | Foreign Aid | All pass | Others | Actor +2 coins, next turn |
| 3 | Foreign Aid | Block (Duke) | Any player | Enters block-response phase |
| 3a | → Block (Duke) | All pass | Others | Block confirmed, Actor +0 coins, next turn |
| 3b | → Block (Duke) | Challenge | Any player | Blocker has Duke → challenger loses card, block holds, Actor +0 coins |
| 3c | → Block (Duke) | Challenge | Any player | Blocker lacks Duke → blocker loses card, Foreign Aid executes, Actor +2 coins |
| 4 | Coup | (none possible) | — | Actor -7 coins, target chooses card to lose |
| 4a | → Target has 2 cards | Lose 1 card | Target | Target survives with 1 card, next turn |
| 4b | → Target has 1 card | Lose 1 card | Target | Target eliminated, check winner, next turn |
| 5 | Tax (Duke claim) | All pass | Others | Actor +3 coins, next turn |
| 6 | Tax (Duke claim) | Challenge | Any player | Actor has Duke → challenger loses card, tax executes, Actor +3 coins |
| 7 | Tax (Duke claim) | Challenge | Any player | Actor lacks Duke → actor loses card, tax cancelled, Actor +0 coins |
| 8 | Assassinate (Assassin claim) | All pass | Others | Target chooses card to lose (lose_influence) |
| 9 | Assassinate | Challenge | Any player | Actor has Assassin → challenger loses card, assassination executes (lose_influence for target) |
| 10 | Assassinate | Challenge | Any player | Actor lacks Assassin → actor loses card, assassination cancelled, 3 coins NOT refunded |
| 11 | Assassinate | Block (Contessa) | Target only | Enters block-response phase, actor still has -3 coins |
| 11a | → Block (Contessa) | All pass | Others | Block confirmed, assassination cancelled, actor's 3 coins not returned |
| 11b | → Block (Contessa) | Challenge | Any player | Target has Contessa → challenger loses card, block holds, assassination cancelled |
| 11c | → Block (Contessa) | Challenge | Any player | Target lacks Contessa → target loses card (failed bluff), if target alive: assassination executes (target loses another card); if target eliminated: action resolves (no further loss needed) |
| 12 | Steal (Captain claim) | All pass | Others | Actor takes min(target.coins, 2) coins from target |
| 13 | Steal | Challenge | Any player | Actor has Captain → challenger loses card, steal executes |
| 14 | Steal | Challenge | Any player | Actor lacks Captain → actor loses card, steal cancelled |
| 15 | Steal | Block (Captain) | Target only | Enters block-response phase |
| 15a | → Block (Captain) | All pass | Others | Block confirmed, steal cancelled |
| 15b | → Block (Captain) | Challenge | Any player | Target has Captain → challenger loses card, block holds, steal cancelled |
| 15c | → Block (Captain) | Challenge | Any player | Target lacks Captain → target loses card, steal executes |
| 16 | Steal | Block (Ambassador) | Target only | Enters block-response phase |
| 16a | → Block (Ambassador) | All pass | Others | Block confirmed, steal cancelled |
| 16b | → Block (Ambassador) | Challenge | Any player | Target has Ambassador → challenger loses card, block holds, steal cancelled |
| 16c | → Block (Ambassador) | Challenge | Any player | Target lacks Ambassador → target loses card, steal executes |
| 17 | Exchange (Ambassador claim) | All pass | Others | Actor draws 2 cards from deck, enters exchange_select phase |
| 18 | Exchange | Challenge | Any player | Actor has Ambassador → challenger loses card, exchange executes |
| 19 | Exchange | Challenge | Any player | Actor lacks Ambassador → actor loses card, exchange cancelled |

### Double-Loss Assassination Sub-Matrix (Critical Edge Cases)

| # | Sub-scenario | Step 1 | Step 2 | Outcome |
|---|-------------|--------|--------|---------|
| A | Target (2 cards) challenges Assassin, loses | Target loses 1 card (1 remaining) | Assassination executes → target loses 1 more card | Target eliminated |
| B | Target (1 card) challenges Assassin, loses | Target loses 1 card (eliminated) | checkWinner fires; assassination does NOT execute again | Winner check |
| C | Target (2 cards) bluffs Contessa block, block challenged | Target loses 1 card (1 remaining) | Assassination executes → target loses 1 more card | Target eliminated |
| D | Target (1 card) bluffs Contessa block, block challenged | Target loses 1 card (eliminated) | checkWinner fires; assassination does NOT execute again | Winner check |
| E | Target (2 cards) with real Contessa, block challenged by actor, actor loses | Actor loses 1 card | Block confirmed, assassination cancelled | Target safe, actor weakened |

---

## Differentiators

Features that set the product apart. Not required for correctness, but valuable for experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Action timer per player | Keeps game moving, prevents stalling | MEDIUM | Must handle timeout = auto-pass |
| Spectator mode | Users can observe ongoing games | MEDIUM | Read-only Firebase subscription |
| Game replay / event log | Review decisions after game | LOW | Event log already exists; add replay UI |
| Player reconnect / rejoin | Network drop recovery | HIGH | Firebase presence + session restore |
| Rematch button | Quick restart with same players | LOW | Re-run initGame with same player list |
| Sound effects + animations | Improves engagement | MEDIUM | Hook exists (lib/useGameAudio.ts, lib/audio.ts) |
| Toast notifications for actions | Visual feedback for remote player actions | LOW | GameToast.tsx already exists |
| Private card visibility | Each player sees only their own face-down cards | HIGH | Requires server-side state filtering |
| In-game chat | Social interaction | MEDIUM | Side channel; not game-critical |
| Turn highlight / active player indicator | Reduces "whose turn is it?" confusion | LOW | UI only |
| Player count display (2–6) | Room setup clarity | LOW | Already in WaitingRoom.tsx |
| Action history with full context | Shows each action's challenge/block chain | MEDIUM | Extend existing log structure |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes for this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-accept blocks when no challenge comes in 0ms | Removes player decision time, feels broken | Require explicit pass from each player OR implement timer-based auto-pass after configurable delay |
| Showing all face-down cards to all players | Defeats core hidden information mechanic | Server must filter state per player — each client only receives their own hidden card characters |
| Refunding assassinate coins on failed challenge | Incorrect per official rules; creates dominant strategy to always challenge | Never refund — 3 coins are lost regardless of challenge outcome |
| Allowing any player to block steal/assassinate | Incorrect per rules; breaks game balance | Only the target of steal/assassinate may block |
| Allowing income/coup to be challenged | These are not character actions; no challenge window | Skip challenge phase entirely for these two actions |
| Auto-resolving exchange without player selection | Removes meaningful decision | Always present exchange_select phase to the actor |
| Letting a dead player act, block, or challenge | Breaks game integrity | Filter all action handlers by isAlive check |
| Multiple concurrent challenges on same action | Only one challenge can be active; first one wins | Transition to challenge-resolution phase on first challenge received |
| Allowing self-targeting for assassinate/steal/coup | Illogical; breaks economy | Validate targetId !== actorId |
| Unlimited player wait time with no consequence | Games get stuck when player disconnects | Implement auto-pass timeout (30–60 seconds recommended) |

---

## Feature Dependencies

```
[initGame: player count 2-6]
    └──requires──> [deck has enough cards: 15 cards, 2 per player]
                       └──requires──> [exchange deck size guard: deck >= 0 when drawing]

[assassinate]
    └──requires──> [lose_influence phase]
    └──requires──> [double-loss guard: check winner between each influence loss]

[block]
    └──requires──> [target-only validation for steal/assassinate]
    └──requires──> [any-player permission for foreignAid Duke block]

[challenge on block]
    └──requires──> [awaiting_block_response phase]
    └──requires──> [card replacement for blocker if block was truthful]

[exchange]
    └──requires──> [exchange_select phase]
    └──requires──> [deck size guard: pop() safety when deck < 2]

[private card visibility] ──conflicts──> [shared Firebase state (current implementation)]
    → Current: all clients see full GameState including opponent card characters
    → Fix: server-side state projection per player before sending to client
```

### Dependency Notes

- **double-loss guard requires checkWinner between each influence loss:** If target is eliminated by a failed challenge, the assassination must not force a second influence loss on an already-eliminated player.
- **target-only blocking requires actor context in processResponse:** The blocker's identity must be checked against `pending.targetId` for steal/assassinate before accepting the block.
- **private card visibility conflicts with current shared state:** The entire GameState is currently stored and read from Firebase in full. Implementing hidden information requires a projection layer that strips opponent card characters before each client receives state.

---

## MVP Definition

### Launch With (v1) — Game Completeness

- [x] All 7 actions execute correctly — already done
- [x] Challenge on all 4 character actions — already done
- [x] Block + challenge-on-block for foreign aid, assassinate, steal — already done
- [x] Forced coup at 10+ coins — already done
- [x] Player elimination and win detection — already done
- [ ] **BUG FIX: Target-only blocking for steal/assassinate** — any player can currently block; must restrict to target
- [ ] **BUG FIX: Double-loss guard in assassination** — target killed by failed block challenge must not face second influence loss
- [ ] **BUG FIX: Exchange deck size guard** — `pop()` on empty deck returns `undefined`; must guard or handle gracefully
- [ ] **TEST: Ambassador exchange with 1 live card** — draw 2, keep 1 from 3 options; needs a test case
- [ ] **TEST: All 19 action × response × outcome scenarios** — scenario matrix above should drive test suite

### Add After Validation (v1.x)

- [ ] Action timer / auto-pass — prevents games from stalling on disconnected players
- [ ] Player reconnect — graceful handling of dropped connections
- [ ] Rematch flow — restart with same players
- [ ] Private card visibility (server-side state projection) — currently all clients see all cards

### Future Consideration (v2+)

- [ ] Spectator mode — read-only room observation
- [ ] In-game chat — social layer
- [ ] Game history / replay — post-game review
- [ ] Tournament mode / ELO ranking — competitive layer

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Target-only blocking bug fix | HIGH | LOW | P1 |
| Double-loss assassination guard | HIGH | LOW | P1 |
| Exchange deck size guard | HIGH | LOW | P1 |
| Full scenario test coverage | HIGH | MEDIUM | P1 |
| Action timer / auto-pass | HIGH | MEDIUM | P2 |
| Player reconnect | HIGH | HIGH | P2 |
| Private card visibility | HIGH | HIGH | P2 |
| Rematch flow | MEDIUM | LOW | P2 |
| Sound effects / animations | MEDIUM | MEDIUM | P3 |
| Spectator mode | LOW | MEDIUM | P3 |
| In-game chat | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (game correctness)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Board Game Arena (Coup) | Tabletopia | Our Approach |
|---------|------------------------|------------|--------------|
| Target-only blocking | Enforced | Enforced | BUG — needs fix |
| Challenge on all character actions | Yes | Yes | Yes |
| Block challenge | Yes | Yes | Yes |
| Double-loss in assassination | Yes (official rule) | Yes | Partial — needs guard |
| Private card state | Yes (server-filtered) | Yes | Not yet — full state shared |
| Action timer | Yes (30s typical) | No | Not yet |
| Reconnect | Yes | Limited | Not yet |
| Exchange with 1 card | Correct (keep 1 from 3) | Correct | Appears correct, needs test |

---

## Sources

- Official Coup rulebook (Taejin Hwang / Indie Boards & Cards): https://artofthegame.github.io/coup/rulebook.pdf
- UltraBoardGames rules reference: https://www.ultraboardgames.com/coup/game-rules.php
- GroupGames101 edge cases: https://groupgames101.com/coup-card-game-rules/
- 64OunceGames rules including double-loss ruling: https://www.64ouncegames.com/pages/coup
- BGG thread "Assassin double kill": https://boardgamegeek.com/thread/1218380/assassin-double-kill
- HappyPiranha rules with challenge mechanics: https://happypiranha.com/blogs/board-game-rules/how-to-play-coup-board-game-rules-instructions
- GamerRules.com Coup: https://gamerules.com/rules/coup/
- Project engine implementation: `/Users/kiyeol/development/coup/lib/game/engine.ts`
- Project types: `/Users/kiyeol/development/coup/lib/game/types.ts`
- Project existing tests: `/Users/kiyeol/development/coup/lib/game/engine.test.ts`

---
*Feature research for: Online multiplayer Coup board game*
*Researched: 2026-02-23*
