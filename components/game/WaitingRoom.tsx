'use client';

import { FilteredGameState } from '@/lib/game/types';
import { useState } from 'react';

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onStart: () => void;
}

export default function WaitingRoom({ state, playerId, roomId, onStart }: Props) {
    const [copied, setCopied] = useState(false);
    const isHost = state.players[0]?.id === playerId;

    const copyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
            <div className="text-4xl mb-2">🃏</div>
            <h1 className="text-3xl font-black text-violet-300 mb-1">대기실</h1>
            <p className="text-slate-500 text-sm mb-6">친구에게 방 코드를 공유하세요</p>

            {/* 방 코드 */}
            <div className="glass-panel p-5 w-full max-w-sm mb-5 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">방 코드</p>
                <div className="text-5xl font-black tracking-[0.3em] text-white mb-3">{roomId}</div>
                <button
                    className="btn-ghost text-sm px-6 py-2"
                    onClick={copyCode}
                >
                    {copied ? '✅ 복사됨!' : '📋 코드 복사'}
                </button>
            </div>

            {/* 참가자 목록 */}
            <div className="glass-panel p-5 w-full max-w-sm mb-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                    참가자 ({state.players.length}/6)
                </p>
                <ul className="space-y-2">
                    {state.players.map((p, i) => (
                        <li key={p.id} className="flex items-center gap-3">
                            <span className="text-lg">{i === 0 ? '👑' : '🎭'}</span>
                            <span className="font-semibold text-white flex-1">{p.name}</span>
                            {p.id === playerId && (
                                <span className="text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">나</span>
                            )}
                            {i === 0 && (
                                <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">방장</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 시작 버튼 */}
            {isHost ? (
                <button
                    className="btn-primary px-8 py-3 text-base w-full max-w-sm"
                    onClick={onStart}
                    disabled={state.players.length < 2}
                >
                    {state.players.length < 2 ? '최소 2명 필요' : '🎮 게임 시작!'}
                </button>
            ) : (
                <div className="text-slate-500 text-sm text-center animate-pulse">
                    방장이 게임을 시작할 때까지 기다려주세요...
                </div>
            )}
        </div>
    );
}
