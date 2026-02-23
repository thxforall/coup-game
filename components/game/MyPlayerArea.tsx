'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Player, Character, CHARACTER_NAMES } from '@/lib/game/types';
import CardInfoModal from './CardInfoModal';

// ── constants ──────────────────────────────────────────────────────────────

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

/** Inline border color via CSS variable so Tailwind purging is not an issue */
const CHAR_BORDER_COLOR: Record<Character, string> = {
    Duke: 'var(--duke-color)',
    Assassin: 'var(--assassin-color)',
    Captain: 'var(--captain-color)',
    Ambassador: 'var(--ambassador-color)',
    Contessa: 'var(--contessa-color)',
};

// ── sub-components ─────────────────────────────────────────────────────────

interface PlayerBadgeProps {
    name: string;
}

function PlayerBadge({ name }: PlayerBadgeProps) {
    const initial = name.charAt(0).toUpperCase();
    return (
        <div className="flex items-center gap-2">
            {/* Circular avatar with gold background and gold border */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                    backgroundColor: 'var(--gold)',
                    border: '2px solid var(--gold-light)',
                    color: '#0D0D0D',
                }}
            >
                {initial}
            </div>
            <span
                className="font-sora font-bold text-sm"
                style={{ color: 'var(--text-primary)' }}
            >
                {name}
            </span>
        </div>
    );
}

interface CoinBadgeProps {
    coins: number;
}

function CoinBadge({ coins }: CoinBadgeProps) {
    return (
        <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
            style={{
                border: '1.5px solid var(--coin-color)',
                color: 'var(--coin-color)',
                backgroundColor: 'rgba(241, 196, 15, 0.08)',
            }}
        >
            <span style={{ color: 'var(--coin-color)' }}>&#9679;</span>
            <span>{coins}</span>
        </div>
    );
}

// ── card component ─────────────────────────────────────────────────────────

interface CharacterCardProps {
    character: Character;
    revealed: boolean;
    onClick: () => void;
}

function CharacterCard({ character, revealed, onClick }: CharacterCardProps) {
    const borderColor = CHAR_BORDER_COLOR[character];

    return (
        <button
            onClick={onClick}
            disabled={revealed}
            className={[
                'relative overflow-hidden rounded-lg transition-transform',
                revealed
                    ? 'opacity-40 grayscale cursor-default'
                    : 'cursor-pointer hover:scale-105 active:scale-95',
            ].join(' ')}
            style={{
                width: '120px',
                height: '170px',
                border: `2px solid ${borderColor}`,
                boxShadow: revealed ? 'none' : `0 4px 16px ${borderColor}4D`,
            }}
        >
            <Image
                src={CARD_IMAGES[character]}
                alt={CHARACTER_NAMES[character]}
                fill
                className="object-cover"
                sizes="120px"
            />

            {/* Character name overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-2">
                <span className="font-sora text-xs font-bold text-white block text-center leading-tight">
                    {CHARACTER_NAMES[character]}
                </span>
                {!revealed && (
                    <span className="text-[9px] text-white/40 block text-center mt-0.5">
                        탭하여 정보 보기
                    </span>
                )}
            </div>

            {/* Eliminated overlay */}
            {revealed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span
                        className="font-mono text-xs font-bold px-2 py-1 rounded"
                        style={{
                            color: 'var(--text-secondary)',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                        }}
                    >
                        Eliminated
                    </span>
                </div>
            )}
        </button>
    );
}

// ── main component ─────────────────────────────────────────────────────────

interface Props {
    player: Player;
}

function MyPlayerArea({ player }: Props) {
    const [selectedCard, setSelectedCard] = useState<Character | null>(null);

    function handleCardClick(character: Character, revealed: boolean) {
        if (!revealed) {
            setSelectedCard(character);
        }
    }

    return (
        <>
            <div
                className="p-4 rounded-2xl"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                }}
            >
                {/* Header row: PlayerBadge + label + CoinBadge */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <PlayerBadge name={player.name} />
                        <span
                            className="font-mono text-xs uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Your Influence
                        </span>
                    </div>
                    <CoinBadge coins={player.coins} />
                </div>

                {/* Card row */}
                <div className="flex gap-3 justify-center">
                    {player.cards.map((card, i) => (
                        <CharacterCard
                            key={i}
                            character={card.character}
                            revealed={card.revealed}
                            onClick={() => handleCardClick(card.character, card.revealed)}
                        />
                    ))}
                </div>
            </div>

            {/* Card info modal */}
            {selectedCard && (
                <CardInfoModal
                    character={selectedCard}
                    onClose={() => setSelectedCard(null)}
                />
            )}
        </>
    );
}

export default memo(MyPlayerArea);
