'use client';

import { GameState, Character, CHARACTER_NAMES } from '@/lib/game/types';
import { useGameAudio } from '@/lib/useGameAudio';
import PlayerArea from './PlayerArea';
import MyPlayerArea from './MyPlayerArea';
import ActionPanel from './ActionPanel';
import ResponseModal from './ResponseModal';
import CardSelectModal from './CardSelectModal';
import ExchangeModal from './ExchangeModal';
import EventLog from './EventLog';
import GameToast from './GameToast';

interface Props {
    state: GameState;
    playerId: string;
    roomId: string;
    onAction: (action: object) => Promise<void>;
}

export default function GameBoard({ state, playerId, onAction }: Props) {
    const me = state.players.find((p) => p.id === playerId);
    const others = state.players.filter((p) => p.id !== playerId);
    const isMyTurn = state.currentTurnId === playerId;
    const currentPlayer = state.players.find((p) => p.id === state.currentTurnId);

    // 오디오 피드백 훅
    useGameAudio(state, playerId);

    // 승리 화면
    if (state.phase === 'game_over') {
        const winner = state.players.find((p) => p.id === state.winnerId);
        const iWon = state.winnerId === playerId;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-4">
                {/* 토스트 */}
                <GameToast
                    log={state.log}
                    playerId={playerId}
                    currentTurnId={state.currentTurnId}
                    phase={state.phase}
                    winnerId={state.winnerId}
                    players={state.players}
                />
                <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up">
                    <div className="text-6xl mb-4">{iWon ? '🏆' : '💀'}</div>
                    <h1 className="text-3xl font-black mb-2">
                        {iWon ? '승리!' : '패배...'}
                    </h1>
                    <p className="text-slate-400 mb-1">
                        {iWon ? '당신이 최후의 생존자입니다!' : `${winner?.name}이(가) 승리했습니다`}
                    </p>
                    <a href="/" className="btn-primary mt-6 inline-block px-8 py-3">
                        🏠 로비로 돌아가기
                    </a>
                </div>
            </div>
        );
    }

    // 내가 카드를 잃어야 하는 상황
    const mustLoseCard =
        state.phase === 'lose_influence' &&
        state.pendingAction?.losingPlayerId === playerId &&
        me;

    // 대사 교환
    const mustExchange =
        state.phase === 'exchange_select' &&
        state.pendingAction?.actorId === playerId &&
        me;

    // 응답 필요 (내 턴이 아니고, 응답하지 않은 경우)
    const mustRespond =
        (state.phase === 'awaiting_response' || state.phase === 'awaiting_block_response') &&
        me?.isAlive &&
        state.pendingAction?.responses?.[playerId] === null &&
        state.pendingAction?.actorId !== playerId;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex flex-col">
            {/* 토스트 알림 */}
            <GameToast
                log={state.log}
                playerId={playerId}
                currentTurnId={state.currentTurnId}
                phase={state.phase}
                winnerId={state.winnerId}
                players={state.players}
            />

            {/* 헤더 */}
            <header className={`flex items-center justify-between px-4 py-3 border-b border-white/5 transition-all duration-500 ${isMyTurn ? 'bg-amber-500/5 border-b-amber-400/20' : ''}`}>
                <span className="text-lg font-black text-violet-300">🃏 COUP</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">현재 턴:</span>
                    <span className={`text-sm font-bold transition-all duration-300 ${isMyTurn ? 'text-amber-400 my-turn-glow' : 'text-slate-300'}`}>
                        {isMyTurn ? '🌟 나' : currentPlayer?.name}
                    </span>
                </div>
            </header>

            {/* 상대방 플레이어들 */}
            <div className="flex flex-wrap justify-center gap-3 p-3">
                {others.map((player) => (
                    <PlayerArea
                        key={player.id}
                        player={player}
                        isCurrentTurn={state.currentTurnId === player.id}
                    />
                ))}
            </div>

            {/* 가운데: 이벤트 로그 */}
            <div className="flex-1 px-4 py-2 min-h-0">
                <EventLog log={state.log} />
            </div>

            {/* 내 영역 */}
            {me && (
                <div className={`border-t border-white/5 p-4 space-y-3 transition-all duration-500 ${isMyTurn ? 'bg-amber-500/5 border-t-amber-400/20' : ''}`}>
                    <MyPlayerArea player={me} />

                    {/* 내 턴: 액션 선택 */}
                    {isMyTurn && state.phase === 'action' && (
                        <ActionPanel
                            state={state}
                            playerId={playerId}
                            onAction={onAction}
                        />
                    )}

                    {/* 대기 메시지 */}
                    {!isMyTurn && !mustRespond && state.phase === 'action' && (
                        <div className="text-center text-slate-500 text-sm animate-pulse py-2">
                            {currentPlayer?.name}의 턴입니다...
                        </div>
                    )}

                    {/* waiting_response / block_response 대기 중 */}
                    {(state.phase === 'awaiting_response' || state.phase === 'awaiting_block_response') && !mustRespond && (
                        <div className="text-center text-slate-500 text-sm animate-pulse py-2">
                            다른 플레이어의 응답을 기다리는 중...
                        </div>
                    )}
                </div>
            )}

            {/* 모달: 도전/블록/패스 */}
            {mustRespond && me && (
                <ResponseModal
                    state={state}
                    playerId={playerId}
                    myCards={me.cards}
                    onAction={onAction}
                />
            )}

            {/* 모달: 카드 잃기 */}
            {mustLoseCard && (
                <CardSelectModal
                    player={me}
                    title="카드를 잃어야 합니다"
                    subtitle="공개할 카드를 선택하세요"
                    onSelect={(idx) => onAction({ type: 'lose_influence', cardIndex: idx })}
                />
            )}

            {/* 모달: 대사 교환 */}
            {mustExchange && state.pendingAction?.exchangeCards && (
                <ExchangeModal
                    player={me}
                    exchangeCards={state.pendingAction.exchangeCards}
                    onSelect={(keptIndices) => onAction({ type: 'exchange_select', keptIndices })}
                />
            )}
        </div>
    );
}
