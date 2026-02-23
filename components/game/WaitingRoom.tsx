'use client';

import { FilteredGameState } from '@/lib/game/types';
import { useState } from 'react';
import { Skull, Copy, Check, Crown, Play } from 'lucide-react';

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
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg-dark">
            <div className="glass-panel w-full max-w-lg p-8 animate-slide-up">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <Skull size={32} className="text-gold mb-3" />
                    <h1 className="font-sora text-4xl font-bold text-gold tracking-tight">COUP</h1>
                    <p className="font-mono text-text-muted text-sm mt-1">Bluff. Deceive. Survive.</p>
                </div>

                {/* Room code */}
                <div className="text-center mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-2 font-mono">Room Code</p>
                    <div className="text-5xl font-mono font-bold tracking-widest text-text-primary mb-4">
                        {roomId}
                    </div>
                    <button className="btn-ghost flex items-center gap-2 mx-auto px-5 py-2 text-sm" onClick={copyCode}>
                        {copied ? (
                            <>
                                <Check size={15} />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={15} />
                                <span>Copy Code</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border-subtle mb-6" />

                {/* Player list */}
                <div className="mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">
                        Players ({state.players.length}/6)
                    </p>
                    <ul className="space-y-3">
                        {state.players.map((p, i) => (
                            <li key={p.id} className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center text-sm font-bold text-text-primary shrink-0">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>

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
                                        Me
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
                        {state.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
                    </button>
                ) : (
                    <p className="text-text-muted font-mono text-sm text-center animate-pulse">
                        Waiting for host to start...
                    </p>
                )}
            </div>
        </div>
    );
}
