'use client';

import { memo } from 'react';
import Image from 'next/image';
import {
    Crown,
    Crosshair,
    Anchor,
    Repeat,
    Shield,
    Coins,
} from 'lucide-react';
import { FilteredPlayer, Character, CHARACTER_NAMES } from '@/lib/game/types';

// ----------------------------------------------------------------
// Types & constants
// ----------------------------------------------------------------

interface Props {
    player: FilteredPlayer;
    isCurrentTurn: boolean;
}

const PLAYER_AVATAR_COLORS = [
    '#8E44AD', // violet
    '#2980B9', // blue
    '#27AE60', // green
    '#C0392B', // red
    '#E67E22', // orange
    '#16A085', // teal
];

const CHAR_COLORS: Record<Character, string> = {
    Duke: '#8E44AD',
    Assassin: '#2C3E50',
    Captain: '#2980B9',
    Ambassador: '#27AE60',
    Contessa: '#C0392B',
};

const CHAR_ICONS: Record<Character, React.ElementType> = {
    Duke: Crown,
    Assassin: Crosshair,
    Captain: Anchor,
    Ambassador: Repeat,
    Contessa: Shield,
};

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

interface PlayerBadgeProps {
    name: string;
    playerIndex: number;
    isCurrentTurn: boolean;
}

function PlayerBadge({ name, playerIndex, isCurrentTurn }: PlayerBadgeProps) {
    const avatarColor = PLAYER_AVATAR_COLORS[playerIndex % PLAYER_AVATAR_COLORS.length];
    const initial = name.charAt(0).toUpperCase();

    return (
        <div className="flex items-center gap-2 min-w-0">
            <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: avatarColor }}
            >
                {initial}
            </div>
            <span className="text-sm font-semibold text-text-primary truncate">
                {isCurrentTurn && (
                    <span className="text-gold mr-1">&#9658;</span>
                )}
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
            className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold"
            style={{
                borderColor: '#F1C40F',
                color: '#F1C40F',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
            }}
        >
            <Coins size={11} strokeWidth={2.5} />
            <span>{coins}</span>
        </div>
    );
}

function FaceDownCard() {
    return (
        <div
            className="w-11 h-16 sm:w-[80px] sm:h-[112px] rounded-lg flex flex-col items-center justify-center gap-1 shadow-md flex-shrink-0"
            style={{
                background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                border: '1px solid #3A3A3A',
            }}
        >
            <Shield size={22} strokeWidth={1.5} className="text-slate-400" />
            <span
                className="text-[9px] font-bold tracking-widest"
                style={{ color: '#5A5A5A' }}
            >
                COUP
            </span>
        </div>
    );
}

interface RevealedCardProps {
    character: Character;
}

function RevealedCard({ character }: RevealedCardProps) {
    const CharIcon = CHAR_ICONS[character];
    const accentColor = CHAR_COLORS[character];

    return (
        <div
            className="w-11 h-16 sm:w-[80px] sm:h-[112px] rounded-lg overflow-hidden relative flex-shrink-0 shadow-md"
        >
            <Image
                src={`/cards/${character.toLowerCase()}.jpg`}
                alt={CHARACTER_NAMES[character]}
                fill
                className="object-cover opacity-40 grayscale"
                sizes="(max-width: 640px) 56px, 80px"
            />
            {/* Eliminated overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 bg-black/30">
                <CharIcon
                    size={14}
                    strokeWidth={2}
                    style={{ color: accentColor }}
                    className="mb-0.5 opacity-70"
                />
                <span className="text-[8px] font-bold text-white/60 tracking-wide">
                    탈락
                </span>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

function PlayerArea({ player, isCurrentTurn }: Props) {
    // Derive player index from id for stable avatar color (fallback: 0)
    // PlayerArea doesn't receive index directly, so we hash from id
    const playerIndex = player.id
        ? player.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        : 0;

    return (
        <div
            className={`
                bg-bg-card border border-border-subtle rounded-xl p-2 sm:p-3
                transition-all duration-200 min-w-0 w-[110px] sm:w-auto sm:min-w-[140px] flex-shrink-0
                ${!player.isAlive ? 'opacity-50' : ''}
                ${isCurrentTurn ? 'ring-2 ring-gold shadow-lg' : ''}
            `}
            style={isCurrentTurn ? { boxShadow: '0 0 16px rgba(241, 196, 15, 0.2)' } : undefined}
        >
            {/* Header: badge + coin */}
            <div className="flex items-center justify-between mb-3 gap-2">
                <PlayerBadge
                    name={player.name}
                    playerIndex={playerIndex}
                    isCurrentTurn={isCurrentTurn}
                />
                {player.isAlive ? (
                    <CoinBadge coins={player.coins} />
                ) : (
                    <span className="text-[11px] text-text-muted font-medium">탈락</span>
                )}
            </div>

            {/* Cards */}
            <div className="flex gap-1 sm:gap-2 justify-center">
                {player.cards.map((card, i) =>
                    card.revealed && card.character ? (
                        <RevealedCard key={i} character={card.character} />
                    ) : (
                        <FaceDownCard key={i} />
                    )
                )}
            </div>
        </div>
    );
}

export default memo(PlayerArea);
