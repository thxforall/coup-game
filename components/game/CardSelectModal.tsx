'use client';

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
    title: string;
    subtitle: string;
    onSelect: (cardIndex: number) => void;
}

export default function CardSelectModal({ player, title, subtitle, onSelect }: Props) {
    const selectableCards = player.cards
        .map((c, i) => ({ ...c, index: i }))
        .filter((c) => !c.revealed);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-xs p-6 animate-slide-up text-center">
                <div className="text-4xl mb-2">💀</div>
                <h2 className="text-xl font-black text-white mb-1">{title}</h2>
                <p className="text-slate-400 text-sm mb-5">{subtitle}</p>

                <div className="flex gap-4 justify-center">
                    {selectableCards.map((card) => (
                        <button
                            key={card.index}
                            onClick={() => onSelect(card.index)}
                            className={`flex flex-col items-center justify-center rounded-xl border-2 bg-gradient-to-b ${CHAR_STYLES[card.character]} p-3 transition-all hover:scale-105 active:scale-95 shadow-lg`}
                            style={{ width: '90px', height: '120px' }}
                        >
                            <span className="text-3xl">{CHAR_EMOJI[card.character]}</span>
                            <span className="text-xs font-bold text-white mt-2 text-center leading-tight">
                                {CHARACTER_NAMES[card.character]}
                            </span>
                        </button>
                    ))}
                </div>

                <p className="text-slate-600 text-xs mt-4">선택한 카드가 공개됩니다</p>
            </div>
        </div>
    );
}
