'use client';

import { useState } from 'react';
import { Player, Character, CHARACTER_NAMES } from '@/lib/game/types';

const CHAR_STYLES: Record<Character, string> = {
    Duke: 'from-violet-600 to-violet-900 border-violet-500',
    Contessa: 'from-red-600 to-red-900 border-red-500',
    Captain: 'from-blue-600 to-blue-900 border-blue-500',
    Assassin: 'from-slate-600 to-slate-950 border-slate-500',
    Ambassador: 'from-emerald-600 to-emerald-900 border-emerald-500',
};

const CHAR_EMOJI: Record<Character, string> = {
    Duke: '👑', Contessa: '🌹', Captain: '⚔️', Assassin: '🗡️', Ambassador: '🕊️',
};

interface Props {
    player: Player;
    exchangeCards: Character[];
    onSelect: (keptIndices: number[]) => void;
}

export default function ExchangeModal({ player, exchangeCards, onSelect }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const liveCards = player.cards.filter((c) => !c.revealed);
    const liveCount = liveCards.length;
    // 현재 카드 + 교환 카드를 합쳐서 표시
    const allOptions: Character[] = [
        ...liveCards.map((c) => c.character),
        ...exchangeCards,
    ];

    const toggle = (i: number) => {
        setSelected((prev) => {
            if (prev.includes(i)) return prev.filter((x) => x !== i);
            if (prev.length >= liveCount) return prev; // 최대 선택 수 제한
            return [...prev, i];
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-sm p-6 animate-slide-up text-center">
                <div className="text-3xl mb-2">🕊️</div>
                <h2 className="text-xl font-black text-white mb-1">카드 교환</h2>
                <p className="text-slate-400 text-sm mb-1">대사 능력 — 카드를 교환합니다</p>
                <p className="text-amber-400 text-xs mb-5">유지할 카드 {liveCount}장을 선택하세요</p>

                <div className="flex flex-wrap gap-3 justify-center mb-4">
                    {allOptions.map((char, i) => {
                        const isOwned = i < liveCards.length;
                        const isSelected = selected.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => toggle(i)}
                                className={`flex flex-col items-center justify-center rounded-xl border-2 bg-gradient-to-b ${CHAR_STYLES[char]} p-2 transition-all shadow ${isSelected ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                                    }`}
                                style={{ width: '76px', height: '100px' }}
                            >
                                <span className="text-2xl">{CHAR_EMOJI[char]}</span>
                                <span className="text-[10px] font-bold text-white mt-1 text-center leading-tight">
                                    {CHARACTER_NAMES[char]}
                                </span>
                                {isOwned && !isSelected && (
                                    <span className="text-[9px] text-white/60 mt-1">현재</span>
                                )}
                                {!isOwned && (
                                    <span className="text-[9px] text-emerald-300 mt-1">새 카드</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <button
                    className="w-full btn-primary py-3"
                    onClick={() => onSelect(selected)}
                    disabled={selected.length !== liveCount}
                >
                    {selected.length === liveCount ? '✅ 교환 완료' : `${liveCount - selected.length}장 더 선택하세요`}
                </button>
            </div>
        </div>
    );
}
