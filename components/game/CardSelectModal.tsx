'use client';

import Image from 'next/image';
import { FilteredPlayer, Card, Character, CHARACTER_NAMES } from '@/lib/game/types';

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

const CHAR_BORDER: Record<Character, string> = {
    Duke: 'border-violet-500',
    Contessa: 'border-red-500',
    Captain: 'border-blue-500',
    Assassin: 'border-slate-500',
    Ambassador: 'border-emerald-500',
};

interface Props {
    player: FilteredPlayer;
    title: string;
    subtitle: string;
    onSelect: (cardIndex: number) => void;
}

export default function CardSelectModal({ player, title, subtitle, onSelect }: Props) {
    const selectableCards = (player.cards as Card[])
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
                            className={`relative rounded-xl border-2 overflow-hidden ${CHAR_BORDER[card.character]} transition-all hover:scale-105 active:scale-95 shadow-lg`}
                            style={{ width: '100px', height: '140px' }}
                        >
                            <Image
                                src={CARD_IMAGES[card.character]}
                                alt={CHARACTER_NAMES[card.character]}
                                fill
                                className="object-cover"
                                sizes="100px"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <span className="text-xs font-bold text-white block text-center">
                                    {CHARACTER_NAMES[card.character]}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-slate-600 text-xs mt-4">선택한 카드가 공개됩니다</p>
            </div>
        </div>
    );
}
