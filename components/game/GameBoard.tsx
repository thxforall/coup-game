'use client';

import { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Skull, Settings, Trophy, ScrollText, RotateCcw, BookOpen } from 'lucide-react';
import { FilteredGameState, Card, Player, ACTION_NAMES } from '@/lib/game/types';
import { PresenceMap, subscribeToChatMessages, CHAT_MESSAGES } from '@/lib/firebase.client';
import { clearActiveRoom } from '@/lib/storage';
import { useGameAudio } from '@/lib/useGameAudio';
import PlayerArea from './PlayerArea';
import MyPlayerArea from './MyPlayerArea';
import ActionPanel from './ActionPanel';
import EventLog, { getLogColor } from './EventLog';
import GameToast from './GameToast';
import BgmPlayer from './BgmPlayer';
import QuickChat from './QuickChat';

// 응답 대기 표시 컴포넌트 (memo 처리로 불필요한 리렌더 방지)
const WaitingResponseIndicator = memo(function WaitingResponseIndicator({ state, playerId }: { state: FilteredGameState; playerId: string }) {
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
                                className={`w-2.5 h-2.5 rounded-full ${isPending ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
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
                    className={`text-xs font-bold tabular-nums ${isCritical
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
});

// 모달 컴포넌트는 조건부로만 렌더되므로 dynamic import로 코드 스플릿
const ResponseModal = dynamic(() => import('./ResponseModal'), { ssr: false });
const CardSelectModal = dynamic(() => import('./CardSelectModal'), { ssr: false });
const ExchangeModal = dynamic(() => import('./ExchangeModal'), { ssr: false });
const SettingsModal = dynamic(() => import('./SettingsModal'), { ssr: false });
const GameRulesModal = dynamic(() => import('./GameRulesModal'), { ssr: false });

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onAction: (action: object) => Promise<void>;
    onRestart?: () => Promise<void>;
    presence?: PresenceMap;
}

export default function GameBoard({ state, playerId, roomId, onAction, onRestart, presence = {} }: Props) {
    const [showMobileLog, setShowMobileLog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const mobileLogRef = useRef<HTMLDivElement>(null);

    // 퀵챗 로그 상태: 최근 50개 보관
    const [chatLogs, setChatLogs] = useState<{ playerName: string; message: string; timestamp: number }[]>([]);

    // Close mobile log when tapping outside
    const handleOutsideClick = useCallback((e: MouseEvent) => {
        if (mobileLogRef.current && !mobileLogRef.current.contains(e.target as Node)) {
            setShowMobileLog(false);
        }
    }, []);

    useEffect(() => {
        if (showMobileLog) {
            document.addEventListener('mousedown', handleOutsideClick);
            return () => document.removeEventListener('mousedown', handleOutsideClick);
        }
    }, [showMobileLog, handleOutsideClick]);
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

    // 채팅 로그 추가 헬퍼
    const addChatLog = useCallback((senderPlayerId: string, message: string) => {
        const playerName = state.players.find((p) => p.id === senderPlayerId)?.name ?? senderPlayerId;
        setChatLogs((prev) => {
            const next = [...prev, { playerName, message, timestamp: Date.now() }];
            // 최대 50개 유지
            return next.length > 50 ? next.slice(next.length - 50) : next;
        });
    }, [state.players]);

    // 낙관적 UI: 내 채팅 즉시 표시
    const handleChatSend = useCallback((messageId: number) => {
        const message = CHAT_MESSAGES[messageId] ?? '';
        if (!message) return;
        addChatLog(playerId, message);
    }, [playerId, addChatLog]);

    // 퀵챗 구독 (상대 메시지만 - 내 메시지는 낙관적 UI로 이미 표시됨)
    useEffect(() => {
        const unsub = subscribeToChatMessages(roomId, (msg) => {
            // 내 메시지는 낙관적 UI로 이미 표시했으므로 무시
            if (msg.playerId === playerId) return;

            const message = CHAT_MESSAGES[msg.messageId] ?? '';
            if (!message) return;

            addChatLog(msg.playerId, message);
        });
        return unsub;
    }, [roomId, playerId, addChatLog]);

    const mustLoseCard = useMemo(
        () =>
            state.phase === 'lose_influence' &&
            state.pendingAction?.losingPlayerId === playerId &&
            me,
        [state.phase, state.pendingAction?.losingPlayerId, playerId, me]
    );

    // 도전으로 인한 카드 잃기 시 상황별 title/subtitle
    const loseCardModal = useMemo(() => {
        const ctx = state.pendingAction?.challengeLoseContext;
        if (!ctx) {
            return { title: '카드를 잃어야 합니다', subtitle: '공개할 카드를 선택하세요' };
        }
        const losingPlayerId = state.pendingAction?.losingPlayerId;
        const actorId = state.pendingAction?.actorId;
        const isActor = losingPlayerId === actorId;
        if (ctx.continuation === 'execute_action') {
            if (isActor) {
                // 블록 도전 성공 → 블로커(행동자가 아닐 수도) 카드 잃음
                return { title: '거짓말 발각!', subtitle: '잃을 카드를 선택하세요' };
            }
            // 도전 실패 → 도전자 카드 잃음
            return { title: '도전 실패!', subtitle: '상대가 진짜였습니다. 잃을 카드를 선택하세요' };
        }
        if (ctx.continuation === 'block_success_next_turn') {
            return { title: '도전 실패!', subtitle: '상대 블록이 진짜였습니다. 잃을 카드를 선택하세요' };
        }
        // 'next_turn' — 도전 성공, 행동자가 카드 잃음
        return { title: '거짓말 발각!', subtitle: '잃을 카드를 선택하세요' };
    }, [state.pendingAction?.challengeLoseContext, state.pendingAction?.losingPlayerId, state.pendingAction?.actorId]);

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
            // awaiting_response: actor는 자기 액션에 응답 불가
            // awaiting_block_response: actor도 블록에 도전 가능
            (state.phase === 'awaiting_block_response' || state.pendingAction?.actorId !== playerId),
        [state.phase, me?.isAlive, state.pendingAction?.responses, state.pendingAction?.actorId, playerId]
    );

    // 서버 사이드 타임아웃 폴링: deadline 초과 시 /api/game/timeout 호출
    const timeoutRequestedRef = useRef(false);
    const timeoutDeadlineRef = useRef<number | undefined>(undefined);

    // 타임아웃 fetch 헬퍼 (중복 제거)
    const fireTimeout = useCallback(() => {
        if (timeoutRequestedRef.current) return;
        timeoutRequestedRef.current = true;
        fetch('/api/game/timeout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        }).catch(() => {
            timeoutRequestedRef.current = false;
            setTimeout(() => {
                if (!timeoutRequestedRef.current) {
                    timeoutRequestedRef.current = true;
                    fetch('/api/game/timeout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId }),
                    }).catch(() => { });
                }
            }, 2000);
        });
    }, [roomId]);

    useEffect(() => {
        if (state.phase === 'game_over') return;

        const isAwaitingPhase =
            state.phase === 'awaiting_response' || state.phase === 'awaiting_block_response';
        const deadline = state.pendingAction?.responseDeadline;

        // phase나 deadline이 변경되면 플래그 리셋
        if (deadline !== timeoutDeadlineRef.current) {
            timeoutRequestedRef.current = false;
            timeoutDeadlineRef.current = deadline;
        }

        if (!isAwaitingPhase || !deadline || timeoutRequestedRef.current) return;

        const now = Date.now();
        const delay = deadline - now + 1000;

        if (delay <= 0) {
            fireTimeout();
            return;
        }

        const timer = setTimeout(fireTimeout, delay);
        return () => clearTimeout(timer);
    }, [state.phase, state.pendingAction?.responseDeadline, fireTimeout]);

    // 게임 오버 화면
    if (state.phase === 'game_over') {
        const winner = state.players.find((p) => p.id === state.winnerId);
        const iWon = state.winnerId === playerId;
        const isHost = state.players[0]?.id === playerId;
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
                <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up relative">
                    {/* 설정 버튼 (우측 상단) */}
                    <button
                        className="absolute top-3 right-3 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                        aria-label="설정"
                        onClick={() => setShowSettings(true)}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
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
                    <div className="mt-6 flex flex-col gap-3">
                        {isHost && onRestart ? (
                            <button
                                className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base"
                                onClick={onRestart}
                            >
                                <RotateCcw size={18} />
                                다시 시작
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 py-3 text-text-muted text-sm">
                                <RotateCcw size={16} className="animate-spin" />
                                방장의 재시작을 기다리는 중...
                            </div>
                        )}
                        <button
                            className="btn-primary inline-block px-8 py-3 text-center w-full"
                            onClick={() => { clearActiveRoom(); window.location.href = '/'; }}
                        >
                            방 나가기
                        </button>
                    </div>
                </div>
                {showSettings && (
                    <SettingsModal
                        state={state}
                        playerId={playerId}
                        roomId={roomId}
                        onClose={() => setShowSettings(false)}
                        onRestart={onRestart ?? (async () => { })}
                    />
                )}
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
            <header className="h-14 flex-shrink-0 flex items-center justify-between px-2 sm:px-4 border-b border-border-subtle bg-bg-card">
                {/* 좌: 로고 */}
                <div className="flex items-center gap-2">
                    <Skull className="w-5 h-5 text-gold" />
                    <span className="font-sora font-bold text-gold tracking-wide text-base sm:text-lg">
                        COUP
                    </span>
                </div>

                {/* 중앙: 턴 정보 */}
                <div className="flex items-center gap-1.5 sm:gap-3 text-sm">
                    <span className="text-text-muted hidden sm:inline">현재 턴:</span>
                    <span
                        className={`font-bold transition-colors duration-300 ${isMyTurn ? 'text-gold' : 'text-text-primary'
                            }`}
                    >
                        {isMyTurn ? '내 턴' : currentPlayer?.name}
                    </span>
                </div>

                {/* 우: BGM + 로그 토글(모바일) + 설정 아이콘 */}
                <div className="flex items-center gap-0.5">
                    <BgmPlayer />
                    <button
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                        aria-label="게임 규칙"
                        onClick={() => setShowRules(true)}
                    >
                        <BookOpen className="w-5 h-5" />
                    </button>
                    <button
                        className={`lg:hidden p-2 rounded-lg transition-colors ${showMobileLog
                            ? 'text-gold bg-gold/10'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
                            }`}
                        aria-label="게임 로그"
                        onClick={() => setShowMobileLog((v) => !v)}
                    >
                        <ScrollText className="w-5 h-5" />
                    </button>
                    <button
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                        aria-label="설정"
                        onClick={() => setShowSettings(true)}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* 상대방 플레이어 행 (가로) */}
            <div className="flex-shrink-0 flex flex-row items-start gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-3 border-b border-border-subtle overflow-x-auto scrollbar-hide">
                {others.map((player) => (
                    <PlayerArea
                        key={player.id}
                        player={player}
                        isCurrentTurn={state.currentTurnId === player.id}
                        online={!!presence[player.id]?.online}
                    />
                ))}
            </div>

            {/* 모바일 컴팩트 로그 (항상 보임, 최근 3개 - 게임로그 + 채팅 병합) */}
            <div className="lg:hidden flex-shrink-0 bg-bg-card/80 border-b border-border-subtle px-2 sm:px-3 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 space-y-0.5">
                        {(() => {
                            // 게임 로그 항목에 타임스탬프 부여 (인덱스 기반)
                            const gameParts = state.log.map((entry, i) => ({
                                type: 'game' as const,
                                text: entry,
                                timestamp: i,
                            }));
                            // 채팅 로그 항목 (실제 timestamp 사용, 게임 로그보다 크게 보정)
                            const chatParts = chatLogs.map((c) => ({
                                type: 'chat' as const,
                                playerName: c.playerName,
                                text: c.message,
                                timestamp: gameParts.length + c.timestamp / 1e13,
                            }));
                            const merged = [...gameParts, ...chatParts]
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .slice(-3);
                            const total = merged.length;
                            return merged.map((item, i) => {
                                const isLatest = i === total - 1;
                                if (item.type === 'chat') {
                                    return (
                                        <div key={`chat-${i}`} className="truncate">
                                            <span className={`font-mono text-[10px] leading-relaxed ${isLatest ? 'text-gold' : 'text-cyan-400'}`}>
                                                &bull; 💬 {item.playerName}: {item.text}
                                            </span>
                                        </div>
                                    );
                                }
                                const color = isLatest ? 'text-gold' : getLogColor(item.text);
                                return (
                                    <div key={`game-${i}`} className="truncate">
                                        <span className={`font-mono text-[10px] leading-relaxed ${color}`}>
                                            &bull; {item.text}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                    <button
                        className="flex-shrink-0 ml-2 text-[10px] text-text-secondary hover:text-gold transition-colors"
                        onClick={() => setShowMobileLog(true)}
                    >
                        전체 보기
                    </button>
                </div>
            </div>

            {/* 모바일 로그 패널 (오버레이) */}
            {showMobileLog && (
                <div className="lg:hidden relative z-30" ref={mobileLogRef}>
                    <div className="absolute inset-x-0 top-0 max-h-[50vh] overflow-y-auto bg-bg-dark/95 p-3">
                        <EventLog log={state.log} structuredLog={state.structuredLog} chatLogs={chatLogs} />
                    </div>
                </div>
            )}

            {/* 중앙 영역: EventLog(좌, 320px desktop) + TurnArea(우) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* 게임 로그 — 데스크톱에서만 표시 */}
                <div className="hidden lg:block w-80 flex-shrink-0 border-r border-border-subtle p-3 overflow-hidden">
                    <EventLog log={state.log} structuredLog={state.structuredLog} chatLogs={chatLogs} />
                </div>

                {/* 턴 영역 */}
                <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-y-auto">
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

                    {/* 대기 메시지: 다른 플레이어가 카드 선택 중 */}
                    {state.phase === 'lose_influence' &&
                        state.pendingAction?.losingPlayerId !== playerId && (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-text-muted text-sm animate-pulse">
                                    {state.players.find((p) => p.id === state.pendingAction?.losingPlayerId)?.name}이(가) 잃을 카드를 선택하고 있습니다...
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
                <div className="flex-shrink-0 border-t border-border-subtle bg-bg-card">
                    {/* 퀵챗 버튼 */}
                    <div className="relative">
                        <QuickChat
                            roomId={roomId}
                            playerId={playerId}
                            disabled={!me.isAlive}
                            turnId={state.currentTurnId}
                            onSend={handleChatSend}
                        />
                    </div>
                    <div className="p-2 sm:p-4">
                        <MyPlayerArea player={me as Player} />
                    </div>
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
                    title={loseCardModal.title}
                    subtitle={loseCardModal.subtitle}
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

            {/* 모달: 설정 */}
            {showSettings && (
                <SettingsModal
                    state={state}
                    playerId={playerId}
                    roomId={roomId}
                    onClose={() => setShowSettings(false)}
                    onRestart={onRestart ?? (async () => { })}
                />
            )}

            {/* 모달: 게임 규칙 */}
            {showRules && <GameRulesModal onClose={() => setShowRules(false)} />}
        </div>
    );
}
