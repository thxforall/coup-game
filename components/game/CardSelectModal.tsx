'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Skull } from 'lucide-react';
import { FilteredPlayer, Card, Character, CHARACTER_NAMES } from '@/lib/game/types';
import BottomSheet from '@/components/ui/BottomSheet';

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
    Inquisitor: '/cards/inquisitor.jpg',
};

const CHAR_BORDER: Record<Character, string> = {
    Duke: 'border-duke',
    Contessa: 'border-contessa',
    Captain: 'border-captain',
    Assassin: 'border-assassin',
    Ambassador: 'border-ambassador',
    Inquisitor: 'border-teal-500',
};

interface Props {
    player: FilteredPlayer;
    title: string;
    subtitle: string;
    onSelect: (cardIndex: number) => void;
}

function CardSelectModal({ player, title, subtitle, onSelect }: Props) {
    const selectableCards = (player.cards as Card[])
        .map((c, i) => ({ ...c, index: i }))
        .filter((c) => !c.revealed);

    return (
        // closeOnBackdrop=false: 반드시 카드를 선택해야 함
        <BottomSheet closeOnBackdrop={false} mobileMaxHeight="65vh">
            <div className="px-5 py-5 text-center">
                <div className="flex justify-center mb-3">
                    <Skull size={36} color="var(--gold)" />
                </div>
                <h2 className="text-xl font-black text-text-primary mb-1">{title}</h2>
                <p className="text-text-secondary text-sm mb-6">{subtitle}</p>

                <div className="flex gap-4 justify-center">
                    {selectableCards.map((card) => (
                        <button
                            key={card.index}
                            onClick={() => onSelect(card.index)}
                            className={`relative rounded-xl border-2 overflow-hidden ${CHAR_BORDER[card.character]} transition-all hover:scale-105 active:scale-95 shadow-lg`}
                            style={{ width: '110px', height: '154px' }}
                        >
                            <Image
                                src={CARD_IMAGES[card.character]}
                                alt={CHARACTER_NAMES[card.character]}
                                fill
                                className="object-cover"
                                sizes="110px"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <span className="text-xs font-bold text-white block text-center">
                                    {CHARACTER_NAMES[card.character]}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-text-muted text-xs mt-5">선택한 카드가 공개됩니다</p>
            </div>
        </BottomSheet>
    );
}

export default memo(CardSelectModal);
