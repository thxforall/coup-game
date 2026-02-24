'use client';

import { memo, useState, useEffect } from 'react';
import { Shield, Clock, Check } from 'lucide-react';
import { FilteredGameState, ALLEGIANCE_NAMES, Allegiance } from '@/lib/game/types';

interface Props {
    state: FilteredGameState;
    playerId: string;
    onAction: (action: object) => Promise<void>;
}

function AllegianceSelectionPanel({ state, playerId, onAction }: Props) {
    const [sending, setSending] = useState(false);
    const [remainingMs, setRemainingMs] = useState(30000);

    const selectionIndex = state.allegianceSelectionIndex ?? 0;
    const currentSelector = state.players[selectionIndex];
    const isMyTurn = currentSelector?.id === playerId;

    useEffect(() => {
        if (!state.allegianceSelectionDeadline) return;
        const update = () => setRemainingMs(Math.max(0, state.allegianceSelectionDeadline! - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [state.allegianceSelectionDeadline]);

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const isCritical = remainingSeconds <= 5;

    const handlePick = async (allegiance: Allegiance) => {
        if (sending) return;
        setSending(true);
        try {
            await onAction({ type: 'allegiance_pick', allegiance });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="glass-panel px-5 py-5 max-w-sm w-full space-y-4">
                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                        <Shield size={18} className="text-purple-400" />
                        <h2 className="text-base font-bold text-text-primary">진영 선택</h2>
                    </div>
                    <div className={`flex items-center justify-center gap-1 text-xs ${isCritical ? 'text-red-400 animate-pulse' : 'text-text-muted'}`}>
                        <Clock size={12} />
                        <span className="tabular-nums">{remainingSeconds}s</span>
                    </div>
                </div>

                {/* Current selector */}
                {isMyTurn ? (
                    <div className="space-y-3">
                        <p className="text-center text-sm text-gold font-bold">
                            진영을 선택하세요!
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                                onClick={() => handlePick('loyalist')}
                                disabled={sending}
                            >
                                {ALLEGIANCE_NAMES.loyalist}
                            </button>
                            <button
                                className="flex-1 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30"
                                onClick={() => handlePick('reformist')}
                                disabled={sending}
                            >
                                {ALLEGIANCE_NAMES.reformist}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-2">
                        <p className="text-sm text-text-primary font-bold">
                            {currentSelector?.name}
                        </p>
                        <p className="text-xs text-text-muted">진영을 선택하는 중...</p>
                        <div className="flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:300ms]" />
                        </div>
                    </div>
                )}

                {/* Player selection status */}
                <div className="border-t border-border-subtle pt-3 space-y-1.5">
                    {state.players.map((player, i) => {
                        const hasSelected = !!player.allegiance;
                        const isCurrent = i === selectionIndex;
                        return (
                            <div key={player.id} className="flex items-center justify-between text-xs">
                                <span className={`font-semibold ${isCurrent ? 'text-gold' : hasSelected ? 'text-text-secondary' : 'text-text-muted'}`}>
                                    {isCurrent && <span className="text-gold mr-1">&#9658;</span>}
                                    {player.name}
                                </span>
                                {hasSelected ? (
                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${player.allegiance === 'loyalist' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                        <Check size={10} />
                                        {ALLEGIANCE_NAMES[player.allegiance!]}
                                    </span>
                                ) : (
                                    <span className="text-text-muted">
                                        {isCurrent ? '선택 중...' : '대기'}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default memo(AllegianceSelectionPanel);
