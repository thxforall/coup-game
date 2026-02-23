'use client';

import { memo, useEffect, useState, useRef } from 'react';

export interface ToastItem {
    id: number;
    message: string;
    type: 'challenge' | 'block' | 'turn' | 'cardLost' | 'victory' | 'defeat' | 'info' | 'action';
    leaving?: boolean;
}

const TYPE_STYLES: Record<ToastItem['type'], { bg: string; border: string; icon: string }> = {
    challenge: { bg: 'bg-red-600/90', border: 'border-red-400/50', icon: '⚡' },
    block: { bg: 'bg-blue-600/90', border: 'border-blue-400/50', icon: '🛡️' },
    turn: { bg: 'bg-amber-500/90', border: 'border-amber-300/50', icon: '🌟' },
    cardLost: { bg: 'bg-slate-700/90', border: 'border-slate-500/50', icon: '💀' },
    victory: { bg: 'bg-emerald-600/90', border: 'border-emerald-400/50', icon: '🏆' },
    defeat: { bg: 'bg-slate-800/90', border: 'border-slate-600/50', icon: '😢' },
    info: { bg: 'bg-violet-600/90', border: 'border-violet-400/50', icon: '💬' },
    action: { bg: 'bg-violet-700/90', border: 'border-violet-500/50', icon: '🎯' },
};

interface Props {
    log: string[];
    playerId: string;
    currentTurnId: string;
    phase: string;
    winnerId?: string;
    players: { id: string; name: string }[];
}

function GameToast({ log, playerId, currentTurnId, phase, winnerId, players }: Props) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const prevLogLength = useRef(log.length);
    const prevPhase = useRef(phase);
    const prevTurn = useRef(currentTurnId);
    const idCounter = useRef(0);

    const addToast = (message: string, type: ToastItem['type'], duration = 2500) => {
        const id = ++idCounter.current;
        setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
        // duration 후 페이드아웃 시작
        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
            );
        }, duration);
        // duration + 500ms 후 제거
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration + 500);
    };

    useEffect(() => {
        // 새 로그 분석
        if (log.length > prevLogLength.current) {
            const newLogs = log.slice(prevLogLength.current);
            for (const entry of newLogs) {
                if (entry.includes('도전') && (entry.includes('실패') || entry.includes('성공'))) {
                    addToast(entry, 'challenge');
                } else if (entry.includes('막습니다') || entry.includes('블록')) {
                    addToast(entry, 'block');
                } else if (entry.includes('잃었습니다') || entry.includes('탈락')) {
                    addToast(entry, 'cardLost');
                } else if (entry.includes('승리')) {
                    addToast(entry, 'victory');
                } else {
                    addToast(entry, 'action', 2000);
                }
            }
        }

        // 내 턴 시작
        if (
            currentTurnId === playerId &&
            (prevTurn.current !== currentTurnId || prevPhase.current !== phase) &&
            phase === 'action'
        ) {
            addToast('당신의 턴입니다!', 'turn');
        }

        // 게임 종료
        if (phase === 'game_over' && prevPhase.current !== 'game_over') {
            if (winnerId === playerId) {
                addToast('🏆 승리! 당신이 최후의 생존자입니다!', 'victory');
            } else {
                const winner = players.find((p) => p.id === winnerId);
                addToast(`${winner?.name || '상대'}이(가) 승리했습니다`, 'defeat');
            }
        }

        prevLogLength.current = log.length;
        prevPhase.current = phase;
        prevTurn.current = currentTurnId;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [log, phase, currentTurnId, winnerId]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
            {toasts.map((toast) => {
                const style = TYPE_STYLES[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`toast-enter ${toast.leaving ? 'toast-leave' : ''} ${style.bg} ${style.border} border backdrop-blur-md rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-2`}
                    >
                        <span className="text-lg flex-shrink-0">{style.icon}</span>
                        <span className="text-white text-sm font-semibold truncate">{toast.message}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default memo(GameToast);
