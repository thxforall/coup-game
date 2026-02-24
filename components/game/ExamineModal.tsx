'use client';

import { useState, useEffect } from 'react';
import { Search, RotateCcw, Check } from 'lucide-react';
import { FilteredGameState, CHARACTER_NAMES } from '@/lib/game/types';

interface Props {
    state: FilteredGameState;
    playerId: string;
    onAction: (action: object) => Promise<void>;
}

export default function ExamineModal({ state, playerId, onAction }: Props) {
    const [loading, setLoading] = useState(false);
    const [remainingMs, setRemainingMs] = useState(45000);

    const pending = state.pendingAction;
    const deadline = pending?.exchangeDeadline;

    useEffect(() => {
        if (!deadline) return;
        const update = () => setRemainingMs(Math.max(0, deadline - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [deadline]);

    if (!pending || !pending.examinedCard || pending.actorId !== playerId) return null;

    const target = state.players.find((p) => p.id === pending.targetId);
    const examinedChar = pending.examinedCard;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const progress = Math.max(0, remainingMs / 45000);
    const isCritical = remainingSeconds <= 5;
    const isUrgent = remainingSeconds <= 15;
    const timerColor = isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-teal-500';

    const handleAction = async (action: 'return' | 'replace') => {
        setLoading(true);
        await onAction({ type: 'examine_select', action });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm p-6 animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Search size={20} className="text-teal-400" />
                    <h2 className="text-lg font-bold text-text-primary">심문 결과</h2>
                </div>

                {/* Timer */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted">남은 시간</span>
                        <span className={`font-bold tabular-nums ${isCritical ? 'text-red-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-text-muted'}`}>
                            {remainingSeconds}s
                        </span>
                    </div>
                    <div className="w-full h-1 bg-bg-surface rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>

                {/* Examined card */}
                <div className="text-center mb-6">
                    <p className="text-sm text-text-muted mb-2">
                        {target?.name}의 카드:
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                        <span className="text-2xl font-bold text-teal-300">
                            {CHARACTER_NAMES[examinedChar]}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleAction('return')}
                        disabled={loading}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-subtle bg-bg-surface hover:bg-border-subtle transition-all disabled:opacity-40"
                    >
                        <Check size={20} className="text-emerald-400" />
                        <span className="text-sm font-bold text-text-primary">돌려주기</span>
                        <span className="text-[10px] text-text-muted">카드를 그대로 유지</span>
                    </button>
                    <button
                        onClick={() => handleAction('replace')}
                        disabled={loading}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 transition-all disabled:opacity-40"
                    >
                        <RotateCcw size={20} className="text-teal-400" />
                        <span className="text-sm font-bold text-text-primary">교체하기</span>
                        <span className="text-[10px] text-text-muted">덱에서 새 카드로 교체</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
