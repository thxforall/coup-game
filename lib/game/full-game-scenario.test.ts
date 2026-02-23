import { GameScenario } from './test-helpers';
import { Character } from './types';

/**
 * 풀 게임 시나리오 테스트: 5인 플레이어 (P1~P5)
 *
 * 파주 숙소에서 서른 살 동갑내기 5명이 밤새워 즐기는 쿠(Coup) 게임.
 * 게임의 시작부터 최후의 1인(P3)이 우승할 때까지 모든 액션, 방어, 도전 로직 검증.
 *
 * 초기 카드 배분:
 * - P1: 공작(Duke), 암살자(Assassin)
 * - P2: 사령관(Captain), 귀부인(Contessa)
 * - P3: 대사(Ambassador), 공작(Duke)
 * - P4: 귀부인(Contessa), 대사(Ambassador)
 * - P5: 사령관(Captain), 암살자(Assassin)
 *
 * 중앙 덱 (5장): Duke, Captain, Assassin, Contessa, Ambassador
 */

// ============================================================
// 5인 플레이어 세팅
// ============================================================

const FULL_GAME_PLAYERS = () => [
  { id: 'p1', name: 'P1', cards: ['Duke', 'Assassin'] as [Character, Character] },
  { id: 'p2', name: 'P2', cards: ['Captain', 'Contessa'] as [Character, Character] },
  { id: 'p3', name: 'P3', cards: ['Ambassador', 'Duke'] as [Character, Character] },
  { id: 'p4', name: 'P4', cards: ['Contessa', 'Ambassador'] as [Character, Character] },
  { id: 'p5', name: 'P5', cards: ['Captain', 'Assassin'] as [Character, Character] },
];

const DECK: Character[] = ['Duke', 'Captain', 'Assassin', 'Contessa', 'Ambassador'];

// ============================================================
// Phase 1: 경제 활동과 첫 번째 시스템 검증
// ============================================================

describe('Full Game Scenario: Phase 1 - 경제 활동', () => {
  test('Turn 1: P1 소득 → 즉시 턴 종료, 방어/도전 불가', () => {
    GameScenario.create({ players: FULL_GAME_PLAYERS(), deck: [...DECK] })
      .action('p1', { type: 'income' })
      .expectCoins('p1', 3)
      .expectPhase('action')
      .expectCurrentTurn('p2');
  });

  test('Turn 2: P2 외교 원조 → P3 공작으로 차단 (진실) → 코인 획득 실패', () => {
    GameScenario.create({ players: FULL_GAME_PLAYERS(), deck: [...DECK] })
      .action('p1', { type: 'income' })
      // Turn 2: P2 외교 원조
      .action('p2', { type: 'foreignAid' })
      .respond('p3', 'block', 'Duke') // P3 진짜 공작 보유
      .allPass() // 블록에 대해 아무도 도전하지 않음
      .expectCoins('p2', 2) // 코인 획득 실패
      .expectPhase('action')
      .expectCurrentTurn('p3');
  });

  test('Turn 3: P3 대사 교환 → 아무도 도전 안 함 → 카드 교체', () => {
    GameScenario.create({ players: FULL_GAME_PLAYERS(), deck: [...DECK] })
      .action('p1', { type: 'income' })
      .action('p2', { type: 'foreignAid' })
      .respond('p3', 'block', 'Duke')
      .allPass()
      // Turn 3: P3 대사로 교환
      .action('p3', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      // P3 원래 카드: [Ambassador(0), Duke(1)] + 덱에서 2장 뽑음
      // 시나리오: Duke와 Assassin을 킵 → 인덱스 1(Duke)과 3(Assassin, 덱에서 뽑은 것)
      // 덱: Duke, Captain, Assassin, Contessa, Ambassador → 앞 2장 = Duke, Captain 뽑음
      // 총 4장: Ambassador(0), Duke(1), Duke(2), Captain(3) → Duke, Duke를 킵 = [1, 2]
      .exchangeSelect('p3', [1, 2])
      .expectPhase('action')
      .expectCards('p3', 2)
      .expectCurrentTurn('p4');
  });
});

// ============================================================
// Phase 2: 직접 공격과 이중 데스
// ============================================================

describe('Full Game Scenario: Phase 2 - 직접 공격', () => {
  test('Turn 4: P4 사령관 갈취(거짓말) → P1 대사 방어(거짓말) → P4 방어 도전 성공 → P1 카드 잃고 갈취 적중', () => {
    // P1이 3코인 보유 상태에서 시작 (Turn 1 income 반영)
    GameScenario.create({
      players: [
        { id: 'p1', name: 'P1', coins: 3, cards: ['Duke', 'Assassin'] as [Character, Character] },
        { id: 'p2', name: 'P2', cards: ['Captain', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'P3', cards: ['Duke', 'Duke'] as [Character, Character] }, // 교환 후
        { id: 'p4', name: 'P4', cards: ['Contessa', 'Ambassador'] as [Character, Character] },
        { id: 'p5', name: 'P5', cards: ['Captain', 'Assassin'] as [Character, Character] },
      ],
      currentTurnId: 'p4',
      deck: ['Assassin', 'Contessa', 'Ambassador', 'Captain', 'Ambassador'],
    })
      // P4가 사령관으로 P1 갈취 (거짓말 - Captain 없음)
      .action('p4', { type: 'steal', targetId: 'p1' })
      // P1이 대사로 방어 (거짓말 - Ambassador 없음)
      .respond('p1', 'block', 'Ambassador')
      // P4가 P1의 방어를 도전
      .blockRespond('p4', 'challenge')
      // P1은 Ambassador 증명 실패 → P1이 카드 선택
      .expectPhase('lose_influence')
      .loseInfluence('p1', 1) // Assassin 버림
      // 방어 실패 → 갈취 적중
      .expectCards('p1', 1)
      .expectCoins('p1', 1) // 3 - 2 = 1
      .expectCoins('p4', 4) // 2 + 2 = 4
      .expectPhase('action')
      .expectCurrentTurn('p5');
  });

  test('Turn 5: P5 암살자로 P2 암살 → P2 귀부인 방어(진실) → P5 도전 실패 → P5 카드 잃고 암살 무효화', () => {
    // P5가 5코인 보유 상태 (세금징수 등으로 모았다고 가정)
    GameScenario.create({
      players: [
        { id: 'p1', name: 'P1', coins: 1, cards: ['Duke', 'Assassin'] as [Character, Character], revealedIndices: [1] },
        { id: 'p2', name: 'P2', cards: ['Captain', 'Contessa'] as [Character, Character] },
        { id: 'p3', name: 'P3', cards: ['Duke', 'Duke'] as [Character, Character] },
        { id: 'p4', name: 'P4', coins: 4, cards: ['Contessa', 'Ambassador'] as [Character, Character] },
        { id: 'p5', name: 'P5', coins: 5, cards: ['Captain', 'Assassin'] as [Character, Character] },
      ],
      currentTurnId: 'p5',
      deck: ['Duke', 'Assassin', 'Contessa', 'Ambassador', 'Captain'],
    })
      // P5가 암살자로 P2 암살 (진실)
      .action('p5', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p5', 2) // 5 - 3 = 2 (선언 시점 차감)
      // P2가 귀부인으로 방어 (진실)
      .respond('p2', 'block', 'Contessa')
      // P5가 P2의 방어를 도전
      .blockRespond('p5', 'challenge')
      // P2는 Contessa 증명 성공 → 도전자(P5) 카드 잃음
      .expectPhase('lose_influence')
      .loseInfluence('p5', 0) // Captain 버림
      // P2 방어 성공 → 암살 무효화, P2 안전
      .expectCards('p5', 1)
      .expectCards('p2', 2)
      .expectCoins('p5', 2) // 3코인 환불 안 됨
      .expectPhase('action');
  });
});

// ============================================================
// Phase 3: 탈락자 발생과 쿠
// ============================================================

describe('Full Game Scenario: Phase 3 - 탈락자 발생', () => {
  test('Turn 6-8: P1 세금징수 → P2 세금징수 → P3 쿠데타로 P5 확정 킬', () => {
    // Phase 2 이후 상태
    GameScenario.create({
      players: [
        { id: 'p1', name: 'P1', coins: 1, cards: ['Duke', 'Assassin'] as [Character, Character], revealedIndices: [1] },
        { id: 'p2', name: 'P2', cards: ['Captain', 'Duke'] as [Character, Character] }, // Contessa→Duke (덱에서 교체)
        { id: 'p3', name: 'P3', coins: 2, cards: ['Duke', 'Duke'] as [Character, Character] },
        { id: 'p4', name: 'P4', coins: 4, cards: ['Contessa', 'Ambassador'] as [Character, Character] },
        { id: 'p5', name: 'P5', coins: 2, cards: ['Captain', 'Assassin'] as [Character, Character], revealedIndices: [0] },
      ],
      currentTurnId: 'p1',
      deck: ['Contessa', 'Ambassador', 'Assassin', 'Captain', 'Ambassador'],
    })
      // Turn 6: P1 공작으로 세금징수 (진실)
      .action('p1', { type: 'tax' })
      .allPass()
      .expectCoins('p1', 4)
      .expectCurrentTurn('p2')
      // Turn 7: P2 공작으로 세금징수 (진실 - Duke 보유)
      .action('p2', { type: 'tax' })
      .allPass()
      .expectCoins('p2', 5)
      .expectCurrentTurn('p3')
      // P3에게 쿠데타를 위한 7코인이 필요 → 추가 세금징수
      .action('p3', { type: 'tax' })
      .allPass()
      .expectCoins('p3', 5)
      .expectCurrentTurn('p4')
      // P4 소득
      .action('p4', { type: 'income' })
      .expectCurrentTurn('p5')
      // P5 소득
      .action('p5', { type: 'income' })
      .expectCurrentTurn('p1')
      // P1 세금징수
      .action('p1', { type: 'tax' })
      .allPass()
      .expectCoins('p1', 7)
      .expectCurrentTurn('p2')
      // P2 소득
      .action('p2', { type: 'income' })
      .expectCurrentTurn('p3')
      // Turn 8: P3 쿠데타로 P5 제거 (추가 세금징수 후 7코인 도달)
      .action('p3', { type: 'tax' })
      .allPass()
      .expectCoins('p3', 8)
      .expectCurrentTurn('p4')
      .action('p4', { type: 'income' })
      .expectCurrentTurn('p5')
      .action('p5', { type: 'income' })
      .expectCurrentTurn('p1')
      .action('p1', { type: 'coup', targetId: 'p2' }) // P1도 쿠 가능
      .loseInfluence('p2', 0) // Captain 버림
      .expectCards('p2', 1)
      .expectCurrentTurn('p2') // P2 아직 살아있음 → P2 턴
      // P2 소득
      .action('p2', { type: 'income' })
      .expectCurrentTurn('p3')
      // P3가 P5에게 쿠 발동
      .action('p3', { type: 'coup', targetId: 'p5' })
      .expectCoins('p3', 1) // 8 - 7 = 1
      // 쿠데타는 방어/도전 불가 → 즉시 lose_influence
      .loseInfluence('p5', 1) // 마지막 카드 Assassin 버림
      .expectAlive('p5', false); // P5 탈락
  });
});

// ============================================================
// Phase 4: 최후의 3인 (P1 탈락 포함)
// ============================================================

describe('Full Game Scenario: Phase 4 - 최후의 3인', () => {
  test('P1 암살 거짓말 도전 실패 → P1 탈락', () => {
    // P1(Duke/생명1), P2(Duke/생명1), P3(Duke,Duke/생명2)
    GameScenario.create({
      players: [
        { id: 'p1', name: 'P1', coins: 4, cards: ['Duke', 'Assassin'] as [Character, Character], revealedIndices: [1] },
        { id: 'p2', name: 'P2', coins: 5, cards: ['Captain', 'Duke'] as [Character, Character], revealedIndices: [0] },
        { id: 'p3', name: 'P3', coins: 3, cards: ['Duke', 'Duke'] as [Character, Character] },
      ],
      currentTurnId: 'p1',
      deck: ['Contessa', 'Ambassador', 'Assassin', 'Captain', 'Ambassador'],
    })
      // P1이 암살자로 P2 암살 시도 (거짓말 - Assassin은 revealed 상태)
      // 실제로는 Duke만 남아있음
      .action('p1', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p1', 1) // 4 - 3 = 1
      // P2가 도전
      .respond('p2', 'challenge')
      // P1은 Assassin이 이미 공개된 상태 → 증명 실패 → 마지막 카드(Duke) 잃음
      .expectAlive('p1', false) // P1 탈락 (카드 1장뿐이라 자동 탈락)
      .expectPhase('action');
  });

  test('0코인 대상에 갈취 → 서버에서 에러 반환 (갈취 불가)', () => {
    const scenario = GameScenario.create({
      players: [
        { id: 'p2', name: 'P2', coins: 6, cards: ['Captain', 'Duke'] as [Character, Character], revealedIndices: [0] },
        { id: 'p3', name: 'P3', coins: 0, cards: ['Duke', 'Duke'] as [Character, Character] },
      ],
      currentTurnId: 'p2',
      deck: ['Contessa', 'Ambassador'],
    });
    // P2가 사령관으로 P3 갈취 시도 (P3 코인 0) → 에러
    expect(() =>
      scenario.action('p2', { type: 'steal', targetId: 'p3' })
    ).toThrow('갈취: 대상의 코인이 0입니다');
  });
});

// ============================================================
// Phase 5: 1대1 데스매치 → P3 최종 우승
// ============================================================

describe('Full Game Scenario: Phase 5 - 1대1 데스매치', () => {
  test('P2 vs P3: 암살 → 귀부인 거짓말 방어 → 도전 성공 → 이중 데스 → P3 우승', () => {
    // P2(Duke/생명1/7코인) vs P3(Duke,Assassin/생명2/3코인)
    // P2가 다음 턴 쿠를 쏠 수 있으므로 P3는 이번 턴에 반드시 행동해야 함
    GameScenario.create({
      players: [
        { id: 'p2', name: 'P2', coins: 7, cards: ['Captain', 'Duke'] as [Character, Character], revealedIndices: [0] },
        { id: 'p3', name: 'P3', coins: 3, cards: ['Duke', 'Assassin'] as [Character, Character] },
      ],
      currentTurnId: 'p3',
      deck: ['Contessa', 'Ambassador', 'Assassin'],
    })
      // P3가 암살자로 P2 암살 (진실 - Assassin 보유)
      .action('p3', { type: 'assassinate', targetId: 'p2' })
      .expectCoins('p3', 0) // 3 - 3 = 0
      // P2가 귀부인으로 방어 (거짓말 - Contessa 없음, Duke만 보유)
      .respond('p2', 'block', 'Contessa')
      // P3가 P2의 방어를 도전
      .blockRespond('p3', 'challenge')
      // P2는 Contessa 증명 실패 → 마지막 카드(Duke) 잃음 → 탈락
      // 카드 1장뿐이므로 자동 탈락 (lose_influence 미전환)
      .expectAlive('p2', false) // P2 탈락 (이중 데스)
      .expectPhase('game_over')
      .expectWinner('p3'); // P3 최종 우승!
  });

  test('전체 흐름 요약: 소득 → 블록 → 교환 → 갈취 → 암살 → 쿠데타 → 최종 결투', () => {
    // 핵심 로직 체크포인트를 한 번에 검증하는 통합 테스트
    GameScenario.create({
      players: FULL_GAME_PLAYERS(),
      deck: ['Duke', 'Captain', 'Assassin', 'Contessa', 'Ambassador'],
    })
      // === Phase 1: 경제 활동 ===
      // Turn 1: P1 소득
      .action('p1', { type: 'income' })
      .expectCoins('p1', 3)
      // Turn 2: P2 외교 원조 → P3 공작 차단
      .action('p2', { type: 'foreignAid' })
      .respond('p3', 'block', 'Duke')
      .allPass()
      .expectCoins('p2', 2)
      // Turn 3: P3 교환 (진실)
      .action('p3', { type: 'exchange' })
      .allPass()
      .expectPhase('exchange_select')
      .exchangeSelect('p3', [1, 2]) // Duke(기존) + Duke(덱) 킵
      .expectCurrentTurn('p4')
      // === Phase 2: 공격 시작 ===
      // Turn 4: P4 사령관 갈취 P1(거짓말) → P1 대사 방어(거짓말) → P4 도전
      .action('p4', { type: 'steal', targetId: 'p1' })
      .respond('p1', 'block', 'Ambassador')
      .blockRespond('p4', 'challenge')
      .expectPhase('lose_influence')
      .loseInfluence('p1', 1) // Assassin 잃음
      .expectCards('p1', 1)
      .expectCoins('p1', 1) // 3 - 2 = 1
      .expectCoins('p4', 4)
      .expectCurrentTurn('p5');
  });
});
