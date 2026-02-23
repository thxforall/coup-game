'use client';

import { useState } from 'react';
import { GameState, Card, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES } from '@/lib/game/types';

interface Props {
    state: GameState;
    playerId: string;
    myCards: Card[];
    onAction: (action: object) => Promise<void>;
}

export default function ResponseModal({ state, playerId, myCards, onAction }: Props) {
    const [loading, setLoading] = useState(false);
    const pending = state.pendingAction!;
    const actor = state.players.find((p) => p.id === pending.actorId);
    const isBlockPhase = state.phase === 'awaiting_block_response';
    const blocker = isBlockPhase ? state.players.find((p) => p.id === pending.blockerId) : null;

    // 내가 블록할 수 있는 캐릭터 (내가 가진 카드 기준이 아니라 블러핑도 가능)
    const blockableChars = BLOCK_CHARACTERS[pending.type] ?? [];
    const liveCards = myCards.filter((c) => !c.revealed);

    const handleResponse = async (response: string, character?: Character) => {
        setLoading(true);
        await onAction({ type: 'respond', response, character });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-sm p-5 animate-slide-up mb-2">
                {/* 제목 */}
                <div className="text-center mb-4">
                    {isBlockPhase ? (
                        <>
                            <p className="text-slate-400 text-sm">{blocker?.name}이(가)</p>
                            <p className="font-black text-xl text-white">
                                {CHARACTER_NAMES[pending.blockerCharacter!]}으로 막았습니다!
                            </p>
                            <p className="text-slate-400 text-xs mt-1">도전하거나 허용하세요</p>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-400 text-sm">{actor?.name}이(가)</p>
                            <p className="font-black text-xl text-white">
                                {ACTION_NAMES[pending.type]}
                            </p>
                            <p className="text-slate-400 text-xs mt-1">을(를) 선언했습니다</p>
                        </>
                    )}
                </div>

                <div className="space-y-2">
                    {/* 도전 버튼 */}
                    {!isBlockPhase && (
                        <button
                            className="w-full btn-danger py-3 text-base"
                            onClick={() => handleResponse('challenge')}
                            disabled={loading}
                        >
                            ⚡ 도전! (거짓말이라고 생각해요)
                        </button>
                    )}
                    {isBlockPhase && (
                        <button
                            className="w-full btn-danger py-3 text-base"
                            onClick={() => handleResponse('challenge')}
                            disabled={loading}
                        >
                            ⚡ 블록에 도전! (블러프라고 생각해요)
                        </button>
                    )}

                    {/* 블록 버튼들 (도전/블록 단계에서만, 직접 액션 단계) */}
                    {!isBlockPhase && blockableChars.length > 0 && pending.targetId !== playerId && pending.actorId !== playerId && (
                        <div className="space-y-2">
                            {blockableChars.map((char) => (
                                <button
                                    key={char}
                                    className="w-full btn-ghost py-3 text-sm"
                                    onClick={() => handleResponse('block', char)}
                                    disabled={loading}
                                >
                                    🛡️ {CHARACTER_NAMES[char]}으로 막기
                                </button>
                            ))}
                        </div>
                    )}
                    {/* 대상인 경우 블록 가능 (암살 백작부인 블록) */}
                    {!isBlockPhase && blockableChars.length > 0 && pending.targetId === playerId && (
                        <div className="space-y-2">
                            {blockableChars.map((char) => (
                                <button
                                    key={char}
                                    className="w-full btn-ghost py-3 text-sm border-amber-500/40 text-amber-300"
                                    onClick={() => handleResponse('block', char)}
                                    disabled={loading}
                                >
                                    🛡️ {CHARACTER_NAMES[char]}으로 막기!
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 패스 */}
                    <button
                        className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                        onClick={() => handleResponse('pass')}
                        disabled={loading}
                    >
                        ✋ 패스 (허용)
                    </button>
                </div>
            </div>
        </div>
    );
}
