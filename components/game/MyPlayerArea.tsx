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
    Duke: 'border-violet-500 shadow-violet-500/30',
    Contessa: 'border-red-500 shadow-red-500/30',
    Captain: 'border-blue-500 shadow-blue-500/30',
    Assassin: 'border-slate-500 shadow-slate-500/30',
    Ambassador: 'border-emerald-500 shadow-emerald-500/30',
};

interface Props {
    player: FilteredPlayer;
}

export default function MyPlayerArea({ player }: Props) {
    return (
        <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">나:</span>
                    <span className="font-bold text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">코인</span>
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(player.coins, 13) }).map((_, i) => (
                            <div key={i} className="w-4 h-4 rounded-full bg-amber-400 border border-amber-300 shadow-sm shadow-amber-500/50" />
                        ))}
                        {player.coins > 13 && <span className="text-amber-400 text-xs self-center">+{player.coins - 13}</span>}
                    </div>
                    <span className="font-bold text-amber-400">{player.coins}</span>
                </div>
            </div>

            {/* 내 카드 (앞면 공개) */}
            <div className="flex gap-3 justify-center">
                {(player.cards as Card[]).map((card, i) => (
                    <div key={i} className={`relative rounded-xl border-2 overflow-hidden ${card.revealed ? 'opacity-40 grayscale' : ''} ${CHAR_BORDER[card.character]} shadow-lg`}
                        style={{ width: '100px', height: '140px' }}>
                        <Image
                            src={CARD_IMAGES[card.character]}
                            alt={CHARACTER_NAMES[card.character]}
                            fill
                            className="object-cover"
                            sizes="100px"
                        />
                        {/* 카드 이름 오버레이 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <span className="text-xs font-bold text-white block text-center">
                                {CHARACTER_NAMES[card.character]}
                            </span>
                        </div>
                        {card.revealed && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-xs text-slate-300 font-bold bg-black/60 px-2 py-1 rounded">공개됨</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
