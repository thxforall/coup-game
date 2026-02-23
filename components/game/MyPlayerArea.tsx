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
    Duke: '👑',
    Contessa: '🌹',
    Captain: '⚔️',
    Assassin: '🗡️',
    Ambassador: '🕊️',
};

interface Props {
    player: Player;
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
                {player.cards.map((card, i) => (
                    <div key={i} className={`relative rounded-xl border-2 bg-gradient-to-b ${card.revealed ? 'opacity-40 grayscale' : ''} ${CHAR_STYLES[card.character]} flex flex-col items-center justify-center gap-1 shadow-lg p-3`}
                        style={{ width: '90px', height: '120px' }}>
                        <span className="text-3xl">{CHAR_EMOJI[card.character]}</span>
                        <span className="text-xs font-bold text-white text-center leading-tight">
                            {CHARACTER_NAMES[card.character]}
                        </span>
                        {card.revealed && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                                <span className="text-xs text-slate-300">공개됨</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
