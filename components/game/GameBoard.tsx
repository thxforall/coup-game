'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skull, Settings, Trophy } from 'lucide-react';
import { FilteredGameState, Card, Player, ACTION_NAMES } from '@/lib/game/types';
import { useGameAudio } from '@/lib/useGameAudio';
import PlayerArea from './PlayerArea';
import MyPlayerArea from './MyPlayerArea';
import ActionPanel from './ActionPanel';
import EventLog from './EventLog';
import GameToast from './GameToast';

// 응답 대기 표시 컴포넌트
function WaitingResponseIndicator({ state, playerId }: { state: FilteredGameState; playerId: string }) {
    const pending = state.pendingAction!;
    const [remainingMs, setRemainingMs] = useState(30000);

    useEffect(() => {
        if (!pending.responseDeadline) return;
        const update = () => setRemainingMs(Math.max(0, pending.responseDeadline! - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [pending.responseDeadline]);

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const progress = Math.max(0, remainingMs / 30000);
    const isCritical = remainingSeconds <= 5;
    const isUrgent = remainingSeconds <= 10;
    const timerColor = isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

    const isActor = pending.actorId === playerId;
    const actionName = ACTION_NAMES[pending.type];
    const isBlockPhase = state.phase === 'awaiting_block_response';

    return (
        <div className="space-y-2">
            {/* 상황 설명 */}
            <div className="text-center text-sm">
                {isActor ? (
                    <span className="text-amber-400 font-bold">
                        {isBlockPhase ? '블록에 대한 응답 대기' : `내 ${actionName} — 응답 대기 중`}
                    </span>
                ) : (
                    <span className="text-text-muted">
                        {isBlockPhase
                            ? `${state.players.find((p) => p.id === pending.blockerId)?.name}의 블록 — 응답 대기 중`
                            : `${state.players.find((p) => p.id === pending.actorId)?.name}의 ${actionName} — 응답 대기 중`
                        }
                    </span>
                )}
            </div>

            {/* 타이머 바 */}
            <div className="w-full h-1 bg-bg-surface rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            {/* 플레이어 응답 상태 */}
            <div className="flex items-center justify-center gap-3 py-1">
                {Object.entries(pending.responses).map(([pid, resp]) => {
                    const player = state.players.find((p) => p.id === pid);
                    if (!player) return null;
                    const isPending = resp === 'pending';
                    return (
                        <div key={pid} className="flex items-center gap-1.5">
                            <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                    isPending ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                                }`}
                            />
                            <span className={`text-xs ${isPending ? 'text-amber-300' : 'text-emerald-400'}`}>
                                {player.name}
                                {!isPending && ' ✓'}
                            </span>
                        </div>
                    );
                })}
                <span
                    className={`text-xs font-bold tabular-nums ${
                        isCritical
                            ? 'text-red-400 animate-pulse'
                            : isUrgent
                            ? 'text-amber-400'
                            : 'text-text-muted'
                    }`}
                >
                    {remainingSeconds}s
                </span>
            </div>
        </div>
    );
}

// 모달 컴포넌트는 조건부로만 렌더되므로 dynamic import로 코드 스플릿
const ResponseModal = dynamic(() => import('./ResponseModal'), { ssr: false });
const CardSelectModal = dynamic(() => import('./CardSelectModal'), { ssr: false });
const ExchangeModal = dynamic(() => import('./ExchangeModal'), { ssr: false });

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onAction: (action: object) => Promise<void>;
}

export default function GameBoard({ state, playerId, onAction }: Props) {
    const me = useMemo(
        () => state.players.find((p) => p.id === playerId),
        [state.players, playerId]
    );
    const others = useMemo(
        () => state.players.filter((p) => p.id !== playerId),
        [state.players, playerId]
    );
    const isMyTurn = useMemo(
        () => state.currentTurnId === playerId,
        [state.currentTurnId, playerId]
    );
    const currentPlayer = useMemo(
        () => state.players.find((p) => p.id === state.currentTurnId),
        [state.players, state.currentTurnId]
    );

    useGameAudio(state, playerId);

    const mustLoseCard = useMemo(
        () =>
            state.phase === 'lose_influence' &&
            state.pendingAction?.losingPlayerId === playerId &&
            me,
        [state.phase, state.pendingAction?.losingPlayerId, playerId, me]
    );

    const mustExchange = useMemo(
        () =>
            state.phase === 'exchange_select' &&
            state.pendingAction?.actorId === playerId &&
            me,
        [state.phase, state.pendingAction?.actorId, playerId, me]
    );

    const mustRespond = useMemo(
        () =>
            (state.phase === 'awaiting_response' || state.phase === 'awaiting_block_response') &&
            me?.isAlive &&
            state.pendingAction?.responses?.[playerId] === 'pending' &&
            state.pendingAction?.actorId !== playerId,
        [state.phase, me?.isAlive, state.pendingAction?.responses, state.pendingAction?.actorId, playerId]
    );

    // 게임 오버 화면
    if (state.phase === 'game_over') {
        const winner = state.players.find((p) => p.id === state.winnerId);
        const iWon = state.winnerId === playerId;
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
                <GameToast
                    log={state.log}
                    playerId={playerId}
                    currentTurnId={state.currentTurnId}
                    phase={state.phase}
                    winnerId={state.winnerId}
                    players={state.players}
                />
                <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up">
                    <div className="flex justify-center mb-4">
                        {iWon ? (
                            <Trophy className="w-16 h-16 text-gold" />
                        ) : (
                            <Skull className="w-16 h-16 text-text-muted" />
                        )}
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-text-primary">
                        {iWon ? '승리!' : '패배...'}
                    </h1>
                    <p className="text-text-secondary mb-1">
                        {iWon
                            ? '당신이 최후의 생존자입니다!'
                            : `${winner?.name}이(가) 승리했습니다`}
                    </p>
                    <a href="/" className="btn-primary mt-6 inline-block px-8 py-3">
                        로비로 돌아가기
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-bg-dark flex flex-col overflow-hidden">
            {/* 토스트 알림 */}
            <GameToast
                log={state.log}
                playerId={playerId}
                currentTurnId={state.currentTurnId}
                phase={state.phase}
                winnerId={state.winnerId}
                players={state.players}
            />

            {/* 헤더 (h-14 = 56px) */}
            <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-border-subtle bg-bg-card">
                {/* 좌: 로고 */}
                <div className="flex items-center gap-2">
                    <Skull className="w-5 h-5 text-gold" />
                    <span className="font-sora font-bold text-gold tracking-wide text-lg">
                        COUP
                    </span>
                </div>

                {/* 중앙: 턴 정보 */}
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-text-muted">현재 턴:</span>
                    <span
                        className={`font-bold transition-colors duration-300 ${
                            isMyTurn ? 'text-gold' : 'text-text-primary'
                        }`}
                    >
                        {isMyTurn ? '나' : currentPlayer?.name}
                    </span>
                </div>

                {/* 우: 설정 아이콘 */}
                <button
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                    aria-label="설정"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </header>

            {/* 상대방 플레이어 행 (가로) */}
            <div className="flex-shrink-0 flex flex-row flex-wrap items-start gap-3 px-4 py-3 border-b border-border-subtle">
                {others.map((player) => (
                    <PlayerArea
                        key={player.id}
                        player={player}
                        isCurrentTurn={state.currentTurnId === player.id}
                    />
                ))}
            </div>

            {/* 중앙 영역: EventLog(좌, 320px) + TurnArea(우) */}
            <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
                {/* 게임 로그 — 고정 너비 w-80 (320px) */}
                <div className="w-80 flex-shrink-0 border-r border-border-subtle p-3 overflow-hidden">
                    <EventLog log={state.log} />
                </div>

                {/* 턴 영역 */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                    {/* 내 턴 레이블 */}
                    {isMyTurn && state.phase === 'action' && (
                        <div className="mb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 px-3 py-1 rounded-full">
                                내 턴
                            </span>
                        </div>
                    )}

                    {/* 내 턴: 액션 패널 */}
                    {isMyTurn && state.phase === 'action' && (
                        <ActionPanel
                            state={state}
                            playerId={playerId}
                            onAction={onAction}
                        />
                    )}

                    {/* 대기 메시지: 다른 플레이어 턴 */}
                    {!isMyTurn && !mustRespond && state.phase === 'action' && (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-text-muted text-sm animate-pulse">
                                {currentPlayer?.name}의 턴입니다...
                            </p>
                        </div>
                    )}

                    {/* 응답 대기 중 — 타이머 + 플레이어 응답 상태 표시 */}
                    {(state.phase === 'awaiting_response' ||
                        state.phase === 'awaiting_block_response') &&
                        !mustRespond &&
                        state.pendingAction && (
                            <WaitingResponseIndicator state={state} playerId={playerId} />
                        )}
                </div>
            </div>

            {/* 내 플레이어 영역 (하단) */}
            {me && (
                <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-bg-card">
                    <MyPlayerArea player={me as Player} />
                </div>
            )}

            {/* 모달: 도전/블록/패스 */}
            {mustRespond && me && (
                <ResponseModal
                    state={state}
                    playerId={playerId}
                    myCards={me.cards as Card[]}
                    onAction={onAction}
                />
            )}

            {/* 모달: 카드 잃기 */}
            {mustLoseCard && me && (
                <CardSelectModal
                    player={me}
                    title="카드를 잃어야 합니다"
                    subtitle="공개할 카드를 선택하세요"
                    onSelect={(idx) => onAction({ type: 'lose_influence', cardIndex: idx })}
                />
            )}

            {/* 모달: 대사 교환 */}
            {mustExchange && me && state.pendingAction?.exchangeCards && (
                <ExchangeModal
                    player={me}
                    exchangeCards={state.pendingAction.exchangeCards}
                    onSelect={(keptIndices) => onAction({ type: 'exchange_select', keptIndices })}
                />
            )}
        </div>
    );
}
