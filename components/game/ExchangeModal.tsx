'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Repeat } from 'lucide-react';
import { FilteredPlayer, Card, Character, CHARACTER_NAMES } from '@/lib/game/types';

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

const CHAR_BORDER: Record<Character, string> = {
    Duke: 'border-duke',
    Contessa: 'border-contessa',
    Captain: 'border-captain',
    Assassin: 'border-assassin',
    Ambassador: 'border-ambassador',
};

interface Props {
    player: FilteredPlayer;
    exchangeCards: Character[];
    onSelect: (keptIndices: number[]) => void;
}

function ExchangeModal({ player, exchangeCards, onSelect }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const liveCards = (player.cards as Card[]).filter((c) => !c.revealed);
    const liveCount = liveCards.length;
    const allOptions: Character[] = [
        ...liveCards.map((c) => c.character),
        ...exchangeCards,
    ];

    const toggle = (i: number) => {
        setSelected((prev) => {
            if (prev.includes(i)) return prev.filter((x) => x !== i);
            if (prev.length >= liveCount) return prev;
            return [...prev, i];
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-sm p-6 animate-slide-up text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Repeat size={20} color="var(--ambassador-color)" />
                    <h2 className="text-xl font-black text-text-primary">카드 교환</h2>
                </div>
                <p className="text-text-secondary text-sm mb-1">대사 능력 — 카드를 교환합니다</p>
                <p className="text-amber-400 text-xs mb-5">유지할 카드 {liveCount}장을 선택하세요</p>

                <div className="flex flex-wrap gap-3 justify-center mb-4">
                    {allOptions.map((char, i) => {
                        const isOwned = i < liveCards.length;
                        const isSelected = selected.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => toggle(i)}
                                className={`relative rounded-xl border-2 overflow-hidden ${CHAR_BORDER[char]} transition-all shadow ${isSelected ? 'ring-2 ring-gold scale-105' : 'opacity-70 hover:opacity-100'}`}
                                style={{ width: '80px', height: '110px' }}
                            >
                                <Image
                                    src={CARD_IMAGES[char]}
                                    alt={CHARACTER_NAMES[char]}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                                    <span className="text-[10px] font-bold text-white block text-center">
                                        {CHARACTER_NAMES[char]}
                                    </span>
                                    {isOwned && !isSelected && (
                                        <span className="text-[9px] text-white/60 block text-center">현재</span>
                                    )}
                                    {!isOwned && (
                                        <span className="text-[9px] text-ambassador block text-center">새 카드</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button
                    className="w-full btn-gold py-3"
                    onClick={() => onSelect(selected)}
                    disabled={selected.length !== liveCount}
                >
                    {selected.length === liveCount ? '교환 완료' : `${liveCount - selected.length}장 더 선택하세요`}
                </button>
            </div>
        </div>
    );
}

export default memo(ExchangeModal);
