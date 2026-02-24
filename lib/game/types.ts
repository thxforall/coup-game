// ============================================================
// 게임 타입 정의
// ============================================================

export type GameMode = 'standard' | 'guess';

export type Character = 'Duke' | 'Contessa' | 'Captain' | 'Assassin' | 'Ambassador';

export type ActionType =
  | 'income'       // 소득: 코인 +1 (막기 불가)
  | 'foreignAid'   // 해외원조: 코인 +2 (공작이 막을 수 있음)
  | 'coup'         // 쿠데타: 코인 7개, 상대 카드 제거 (막기 불가)
  | 'tax'          // 세금징수: 코인 +3 (공작 능력, 도전 가능)
  | 'assassinate'  // 암살: 코인 3개, 상대 카드 제거 (암살자 능력, 백작부인 막기, 도전 가능)
  | 'steal'        // 갈취: 상대 코인 2개 탈취 (사령관 능력, 대사/사령관 막기, 도전 가능)
  | 'exchange';    // 교환: 덱에서 카드 교체 (대사 능력, 도전 가능)

export type ResponseType = 'challenge' | 'block' | 'pass';

export type GamePhase =
  | 'waiting'                 // 대기실
  | 'action'                  // 현재 플레이어 액션 선택
  | 'awaiting_response'       // 다른 플레이어들 도전/블록 대기
  | 'awaiting_block_response' // 블록에 대한 도전 대기
  | 'lose_influence'          // 카드 잃을 플레이어가 선택해야 함
  | 'exchange_select'         // 대사 능력: 교환할 카드 선택
  | 'game_over';              // 게임 종료

export interface Card {
  character: Character;
  revealed: boolean; // true = 탈락 카드 (공개됨)
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  cards: Card[];
  isAlive: boolean;
  isReady: boolean; // 대기실에서 준비 완료 여부
}

export interface ChallengeLoseContext {
  // 도전/블록도전 후 카드를 잃는 플레이어가 선택을 완료하면 어디로 이어질지
  continuation: 'execute_action' | 'next_turn' | 'block_success_next_turn';
}

export interface PendingAction {
  type: ActionType;
  actorId: string;
  targetId?: string;                                        // 대상이 있는 액션 (쿠데타, 암살, 갈취)
  responses: Record<string, ResponseType | 'pending'>;          // 플레이어별 응답 ('pending' = 미응답)
  blockerId?: string;                                      // 블로커 플레이어 ID
  blockerCharacter?: Character;                            // 블로커가 주장하는 캐릭터
  losingPlayerId?: string;                                 // 카드를 잃어야 하는 플레이어 ID
  exchangeCards?: Character[];                             // 대사가 뽑은 카드 2장
  responseDeadline?: number;                               // 응답 제한시간 (Unix timestamp ms)
  guessedCharacter?: Character;                            // guess 모드: 쿠데타 시 추측 캐릭터
  challengeLoseContext?: ChallengeLoseContext;              // 도전으로 인한 카드 잃기 컨텍스트
}

export interface GameState {
  players: Player[];
  currentTurnId: string;
  phase: GamePhase;
  deck: Character[];
  pendingAction: PendingAction | null;
  actionDeadline?: number; // 턴 액션 선택 제한시간 (Unix timestamp ms) - 45초
  log: string[];
  structuredLog?: LogEntry[];
  winnerId?: string;
  gameMode?: GameMode;
  kickedPlayerIds?: string[]; // 추방된 플레이어 ID 목록 (재입장 차단)
  createdAt?: number; // 방 생성 시간 (Unix ms) - cleanup용 서버 내부 메타데이터
  updatedAt?: number; // 마지막 활동 시간 (Unix ms) - cleanup용 서버 내부 메타데이터
}

// 액션 요청 타입 (API 전달용)
export type GameAction =
  | { type: 'income' }
  | { type: 'foreignAid' }
  | { type: 'coup'; targetId: string; guessedCharacter?: Character }
  | { type: 'tax' }
  | { type: 'assassinate'; targetId: string }
  | { type: 'steal'; targetId: string }
  | { type: 'exchange' }
  | { type: 'respond'; response: ResponseType; character?: Character } // block 시 character 필요
  | { type: 'lose_influence'; cardIndex: number }
  | { type: 'exchange_select'; keptIndices: number[] };

// ============================================================
// Server-side filtered state (클라이언트에 전달)
// ============================================================

export interface MaskedCard {
  revealed: boolean;
  character: Character | null; // null when revealed === false (상대방 비공개 카드)
}

export interface FilteredPlayer {
  id: string;
  name: string;
  coins: number;
  cards: Card[] | MaskedCard[]; // self: Card[], opponent: MaskedCard[]
  isAlive: boolean;
  isReady: boolean;
}

export interface FilteredPendingAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
  responses: Record<string, ResponseType | 'pending'>;
  blockerId?: string;
  blockerCharacter?: Character;
  losingPlayerId?: string;
  exchangeCards?: Character[]; // 본인 exchange일 때만 포함
  responseDeadline?: number;   // 응답 제한시간 (Unix timestamp ms)
  guessedCharacter?: Character; // guess 모드: 쿠데타 시 추측 캐릭터
  challengeLoseContext?: ChallengeLoseContext; // 도전으로 인한 카드 잃기 컨텍스트
}

export interface FilteredGameState {
  players: FilteredPlayer[];
  currentTurnId: string;
  phase: GamePhase;
  pendingAction: FilteredPendingAction | null;
  actionDeadline?: number; // 턴 액션 선택 제한시간 (Unix timestamp ms) - 45초
  log: string[];
  structuredLog?: LogEntry[];
  winnerId?: string;
  gameMode?: GameMode;
  // deck 제외 — 클라이언트에 절대 노출 안함
}

// 캐릭터 한국어 이름
export const CHARACTER_NAMES: Record<Character, string> = {
  Duke: '공작',
  Contessa: '백작부인',
  Captain: '사령관',
  Assassin: '암살자',
  Ambassador: '대사',
};

// 액션 한국어 이름
export const ACTION_NAMES: Record<ActionType, string> = {
  income: '소득',
  foreignAid: '해외원조',
  coup: '쿠데타',
  tax: '세금징수',
  assassinate: '암살',
  steal: '갈취',
  exchange: '교환',
};

// 블록 가능 캐릭터 (action -> 막을 수 있는 캐릭터들)
export const BLOCK_CHARACTERS: Partial<Record<ActionType, Character[]>> = {
  foreignAid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
};

// 캐릭터별 액션 능력
export const CHARACTER_ACTIONS: Partial<Record<Character, ActionType>> = {
  Duke: 'tax',
  Captain: 'steal',
  Assassin: 'assassinate',
  Ambassador: 'exchange',
};

// ============================================================
// 구조화된 게임 로그
// ============================================================

export type LogEntryType =
  | 'game_start' | 'action_declared' | 'action_resolved'
  | 'challenge_success' | 'challenge_fail'
  | 'block_declared' | 'block_confirmed'
  | 'block_challenge_success' | 'block_challenge_fail'
  | 'lose_influence' | 'player_eliminated'
  | 'exchange_complete' | 'game_over'
  | 'guess_success' | 'guess_fail'
  | 'turn_start';

export interface LogEntry {
  type: LogEntryType;
  timestamp: number;
  actorId?: string;
  targetId?: string;
  action?: ActionType;
  character?: Character;
  message: string;  // 기존 string 로그 호환
  visibleTo?: string; // 특정 플레이어만 볼 수 있는 로그 (playerId). 없으면 전체 공개.
}
