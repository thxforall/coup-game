'use client';

import { useState } from 'react';
import { GameState, Player, ActionType, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES } from '@/lib/game/types';

interface Props {
    state: GameState;
    playerId: string;
    onAction: (action: object) => Promise<void>;
}

const ACTION_BUTTONS: {
    type: ActionType;
    label: string;
    emoji: string;
    desc: string;
    cost?: number;
    minCoins?: number;
    needsTarget?: boolean;
    claimedChar?: Character;
}[] = [
        { type: 'income', label: '소득', emoji: '💰', desc: '코인 +1 (막기 불가)' },
        { type: 'foreignAid', label: '외국 원조', emoji: '🤝', desc: '코인 +2 (공작이 막을 수 있음)' },
        { type: 'tax', label: '세금', emoji: '👑', desc: '코인 +3 (공작, 도전 가능)', claimedChar: 'Duke' },
        { type: 'steal', label: '강탈', emoji: '⚔️', desc: '상대 코인 2개 탈취 (사령관)', needsTarget: true, claimedChar: 'Captain' },
        { type: 'assassinate', label: '암살', emoji: '🗡️', desc: '코인 3개, 상대 카드 제거 (암살자)', cost: 3, needsTarget: true, claimedChar: 'Assassin' },
        { type: 'exchange', label: '교환', emoji: '🕊️', desc: '카드 교환 (대사, 도전 가능)', claimedChar: 'Ambassador' },
        { type: 'coup', label: '쿠', emoji: '💣', desc: '코인 7개, 상대 카드 무조건 제거', cost: 7, needsTarget: true },
    ];

export default function ActionPanel({ state, playerId, onAction }: Props) {
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);
    const me = state.players.find((p) => p.id === playerId)!;
    const aliveOthers = state.players.filter((p) => p.isAlive && p.id !== playerId);
    const mustCoup = me.coins >= 10;

    const handleAction = async (type: ActionType, needsTarget: boolean) => {
        if (needsTarget && !targetId) return;
        setLoading(true);
        await onAction({ type, targetId: needsTarget ? targetId : undefined });
        setLoading(false);
    };

    return (
        <div className="space-y-3">
            {/* 대상 선택 (타겟 필요한 액션용) */}
            {aliveOthers.length > 0 && (
                <div>
                    <p className="text-xs text-slate-500 mb-1">대상 선택 (강탈·암살·쿠에 필요)</p>
                    <div className="flex flex-wrap gap-2">
                        {aliveOthers.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setTargetId(p.id === targetId ? '' : p.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${targetId === p.id
                                        ? 'bg-violet-600 border-violet-400 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                {p.name} ({p.coins}💰)
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 액션 버튼 */}
            <div className="grid grid-cols-2 gap-2">
                {ACTION_BUTTONS.filter((a) => {
                    if (mustCoup && a.type !== 'coup') return false;
                    return true;
                }).map((a) => {
                    const canAfford = a.cost ? me.coins >= a.cost : true;
                    const hasTarget = a.needsTarget ? !!targetId : true;
                    const disabled = !canAfford || !hasTarget || loading;

                    return (
                        <button
                            key={a.type}
                            onClick={() => handleAction(a.type, !!a.needsTarget)}
                            disabled={disabled}
                            className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${a.type === 'coup'
                                    ? 'bg-red-900/40 border-red-500/40 hover:bg-red-900/60 disabled:opacity-40'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-40'
                                } ${disabled ? 'cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{a.emoji}</span>
                                <span className="font-bold text-sm text-white">{a.label}</span>
                                {a.cost && (
                                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                                        -{a.cost}💰
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 leading-tight">{a.desc}</span>
                        </button>
                    );
                })}
            </div>

            {mustCoup && (
                <p className="text-center text-amber-400 text-xs font-semibold">
                    ⚠️ 코인 10개 이상 — 반드시 쿠를 해야 합니다
                </p>
            )}
        </div>
    );
}
