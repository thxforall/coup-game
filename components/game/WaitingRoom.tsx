'use client';

import { FilteredGameState } from '@/lib/game/types';
import { PresenceMap } from '@/lib/firebase.client';
import { useState } from 'react';
import { Skull, Copy, Check, Crown, Play } from 'lucide-react';

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onStart: () => void;
    presence?: PresenceMap;
}

export default function WaitingRoom({ state, playerId, roomId, onStart, presence }: Props) {
    const [copied, setCopied] = useState(false);
    const isHost = state.players[0]?.id === playerId;

    const copyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg-dark">
            <div className="glass-panel w-full max-w-lg p-8 animate-slide-up">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <Skull size={32} className="text-gold mb-3" />
                    <h1 className="font-sora text-4xl font-bold text-gold tracking-tight">COUP</h1>
                    <p className="font-mono text-text-muted text-sm mt-1">거짓말과 심리전의 게임</p>
                </div>

                {/* Room code */}
                <div className="text-center mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-2 font-mono">방 코드</p>
                    <div className="text-5xl font-mono font-bold tracking-widest text-text-primary mb-4">
                        {roomId}
                    </div>
                    <button className="btn-ghost flex items-center gap-2 mx-auto px-5 py-2 text-sm" onClick={copyCode}>
                        {copied ? (
                            <>
                                <Check size={15} />
                                <span>복사됨</span>
                            </>
                        ) : (
                            <>
                                <Copy size={15} />
                                <span>코드 복사</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Game mode badge */}
                {state.gameMode && state.gameMode !== 'standard' && (
                    <div className="flex justify-center mb-4">
                        <span className="text-xs font-mono px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
                            Guess 모드 — 쿠데타 시 카드 추측
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-border-subtle mb-6" />

                {/* Player list */}
                <div className="mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">
                        참가자 ({state.players.length}/6)
                    </p>
                    <ul className="space-y-3">
                        {state.players.map((p, i) => (
                            <li key={p.id} className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center text-sm font-bold text-text-primary shrink-0">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Presence dot */}
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    presence?.[p.id]?.online ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
                                }`} />

                                <span className="font-semibold text-text-primary flex-1 truncate">{p.name}</span>

                                {/* Host badge */}
                                {i === 0 && (
                                    <Crown size={15} className="text-gold shrink-0" />
                                )}

                                {/* Me badge */}
                                {p.id === playerId && (
                                    <span
                                        className="text-xs font-mono px-2 py-0.5 rounded-full border shrink-0"
                                        style={{
                                            color: 'var(--gold)',
                                            borderColor: 'var(--gold)',
                                            backgroundColor: 'rgba(200, 169, 96, 0.08)',
                                        }}
                                    >
                                        나
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Start / waiting */}
                {isHost ? (
                    <button
                        className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base"
                        onClick={onStart}
                        disabled={state.players.length < 2}
                    >
                        <Play size={18} />
                        {state.players.length < 2 ? '최소 2명 필요' : '게임 시작'}
                    </button>
                ) : (
                    <p className="text-text-muted font-mono text-sm text-center animate-pulse">
                        방장이 게임을 시작할 때까지 기다려주세요...
                    </p>
                )}
            </div>
        </div>
    );
}
