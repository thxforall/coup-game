'use client';

import { memo, useState } from 'react';
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
import { PLAYER_AVATAR_COLORS, getPlayerColor } from '@/lib/game/player-colors';
import CardInfoModal from './CardInfoModal';
import BottomSheet from '@/components/ui/BottomSheet';

// ----------------------------------------------------------------
// Types & constants
// ----------------------------------------------------------------

interface Props {
    player: FilteredPlayer;
    isCurrentTurn: boolean;
    online?: boolean;
}

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
    online?: boolean;
}

function PlayerBadge({ name, playerIndex, isCurrentTurn, online }: PlayerBadgeProps) {
    const avatarColor = PLAYER_AVATAR_COLORS[playerIndex % PLAYER_AVATAR_COLORS.length];
    const initial = name.charAt(0).toUpperCase();

    return (
        <div className="flex items-center gap-2 min-w-0">
            <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: avatarColor }}
            >
                {initial}
            </div>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
                }`} />
            <span className="text-xs font-semibold text-text-primary truncate">
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
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-bold"
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
            className="w-12 h-[68px] sm:w-[80px] sm:h-[112px] rounded-lg flex flex-col items-center justify-center gap-1 shadow-md flex-shrink-0"
            style={{
                background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                border: '1px solid #3A3A3A',
            }}
        >
            <Shield size={20} strokeWidth={1.5} className="text-slate-400" />
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
    onClick?: () => void;
    /** px size override, default: 48x68 mobile / 80x112 desktop */
    cardSize?: { width: number; height: number };
}

function RevealedCard({ character, onClick, cardSize }: RevealedCardProps) {
    const CharIcon = CHAR_ICONS[character];
    const accentColor = CHAR_COLORS[character];

    const sizeClass = cardSize
        ? ''
        : 'w-12 h-[68px] sm:w-[80px] sm:h-[112px]';
    const sizeStyle = cardSize ? { width: cardSize.width, height: cardSize.height } : {};

    return (
        <button
            onClick={onClick}
            className={`${sizeClass} rounded-lg overflow-hidden relative flex-shrink-0 shadow-md cursor-pointer active:scale-95 transition-transform`}
            style={sizeStyle}
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
        </button>
    );
}

// ----------------------------------------------------------------
// Mobile compact chip sub-components
// ----------------------------------------------------------------

interface CardStatusDotsProps {
    cards: FilteredPlayer['cards'];
}

/** Small colored dots indicating card status for compact mobile view */
function CardStatusDots({ cards }: CardStatusDotsProps) {
    return (
        <div className="flex gap-0.5">
            {cards.map((card, i) => {
                const isRevealed = card.revealed;
                return (
                    <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRevealed ? 'bg-red-500' : 'bg-emerald-500'}`}
                        title={isRevealed ? '탈락' : '살아있음'}
                    />
                );
            })}
        </div>
    );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

function PlayerArea({ player, isCurrentTurn, online }: Props) {
    const [selectedCard, setSelectedCard] = useState<Character | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const playerIndex = player.id
        ? player.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        : 0;

    const avatarColor = PLAYER_AVATAR_COLORS[playerIndex % PLAYER_AVATAR_COLORS.length];
    const playerColor = getPlayerColor(player.id ?? '');
    const initial = player.name.charAt(0).toUpperCase();

    return (
        <>
            {/* ---- Desktop view (sm+): unchanged full card layout ---- */}
            <div className="relative flex-shrink-0 hidden sm:block">
                <div
                    className={`
                bg-bg-card rounded-xl p-2 sm:p-3
                transition-all duration-200 min-w-0 sm:min-w-[140px]
                ${!player.isAlive ? 'opacity-50' : ''}
                ${isCurrentTurn ? 'ring-2 ring-gold shadow-lg' : ''}
            `}
                    style={{
                        border: `1.5px solid ${playerColor}40`,
                        boxShadow: isCurrentTurn
                            ? `0 0 16px rgba(241, 196, 15, 0.2), 0 0 12px ${playerColor}1A`
                            : `0 0 12px ${playerColor}1A`,
                    }}
                >
                    {/* Header: badge + coin */}
                    <div className="flex items-center justify-between mb-1.5 gap-1">
                        <PlayerBadge
                            name={player.name}
                            playerIndex={playerIndex}
                            isCurrentTurn={isCurrentTurn}
                            online={online}
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
                                <RevealedCard
                                    key={i}
                                    character={card.character}
                                    onClick={() => setSelectedCard(card.character!)}
                                />
                            ) : (
                                <FaceDownCard key={i} />
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* ---- Mobile compact chip (below sm): tap to expand ---- */}
            <button
                type="button"
                onClick={() => setShowDetail(true)}
                className={`
                    sm:hidden flex-shrink-0 flex flex-col items-center gap-1
                    bg-bg-card rounded-lg p-1.5
                    transition-all duration-200 active:scale-95
                    w-[72px]
                    ${!player.isAlive ? 'opacity-50' : ''}
                    ${isCurrentTurn ? 'ring-2 ring-gold shadow-[0_0_8px_rgba(241,196,15,0.25)]' : ''}
                `}
                style={{
                    border: `1.5px solid ${playerColor}40`,
                    boxShadow: isCurrentTurn
                        ? `0 0 8px rgba(241,196,15,0.25), 0 0 8px ${playerColor}1A`
                        : `0 0 8px ${playerColor}1A`,
                }}
                aria-label={`${player.name} 상세 보기`}
            >
                {/* Avatar row: avatar + online dot */}
                <div className="relative">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: avatarColor }}
                    >
                        {initial}
                    </div>
                    {/* Online status dot (bottom-right of avatar) */}
                    <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-card ${online ? 'bg-emerald-500' : 'bg-gray-500'}`}
                    />
                </div>

                {/* Name (truncated to ~4 chars width) */}
                <span
                    className={`text-[10px] font-semibold leading-tight truncate w-full text-center ${!player.isAlive ? 'line-through text-text-muted' : 'text-text-primary'}`}
                    style={{ maxWidth: '64px' }}
                >
                    {player.name}
                </span>

                {/* Coin badge */}
                {player.isAlive ? (
                    <div
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded-full border text-[9px] font-bold"
                        style={{
                            borderColor: '#F1C40F',
                            color: '#F1C40F',
                            backgroundColor: 'rgba(241, 196, 15, 0.1)',
                        }}
                    >
                        <Coins size={8} strokeWidth={2.5} />
                        <span>{player.coins}</span>
                    </div>
                ) : (
                    <span className="text-[9px] text-text-muted font-medium">탈락</span>
                )}

                {/* Card status dots */}
                <CardStatusDots cards={player.cards} />
            </button>

            {/* ---- Mobile detail popover (bottom sheet) ---- */}
            {showDetail && (
                <BottomSheet onClose={() => setShowDetail(false)} mobileMaxHeight="60vh">
                    {/* Player header */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
                                style={{
                                    backgroundColor: avatarColor,
                                    boxShadow: `0 0 0 2px ${avatarColor}50, 0 0 12px ${avatarColor}30`,
                                }}
                            >
                                {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                                {/* Name + online dot */}
                                <div className="flex items-center gap-2 mb-1">
                                    {isCurrentTurn && (
                                        <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/30 px-1.5 py-0.5 rounded-full">턴</span>
                                    )}
                                    <span className="text-base font-black text-text-primary truncate">{player.name}</span>
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-gray-600'}`} />
                                </div>
                                {/* Status row */}
                                <div className="flex items-center gap-2">
                                    {player.isAlive ? (
                                        <>
                                            {/* Coin badge */}
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold"
                                                style={{ borderColor: '#F1C40F', color: '#F1C40F', backgroundColor: 'rgba(241,196,15,0.12)' }}>
                                                <Coins size={11} strokeWidth={2.5} />
                                                <span>{player.coins}</span>
                                            </div>
                                            {/* Card life indicator */}
                                            <div className="flex items-center gap-1">
                                                {player.cards.map((card, i) => (
                                                    <div key={i} className={`w-2 h-2 rounded-full ${card.revealed ? 'bg-red-500' : 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-text-muted">
                                                {player.cards.filter(c => !c.revealed).length}장 생존
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">탈락</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border-subtle/50 mx-4" />

                    {/* Full card display */}
                    <div className="flex gap-4 justify-center px-4 py-4">
                        {player.cards.map((card, i) =>
                            card.revealed && card.character ? (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <RevealedCard
                                        character={card.character}
                                        cardSize={{ width: 88, height: 124 }}
                                        onClick={() => {
                                            setShowDetail(false);
                                            setSelectedCard(card.character!);
                                        }}
                                    />
                                    <span className="text-[9px] font-bold text-red-400/70 uppercase tracking-wider">탈락</span>
                                </div>
                            ) : (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <div
                                        className="rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-md flex-shrink-0"
                                        style={{
                                            width: '88px', height: '124px',
                                            background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                                            border: '1px solid #3A3A3A',
                                        }}
                                    >
                                        <Shield size={24} strokeWidth={1.5} className="text-slate-500" />
                                        <span className="text-[9px] font-bold tracking-widest text-[#4A4A4A]">COUP</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider">생존</span>
                                </div>
                            )
                        )}
                    </div>
                </BottomSheet>
            )}

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

export default memo(PlayerArea);
