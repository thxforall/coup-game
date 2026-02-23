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
    isCurrentTurn: boolean;
}

export default function PlayerArea({ player, isCurrentTurn }: Props) {
    const liveCards = player.cards.filter((c) => !c.revealed).length;

    return (
        <div
            className={`glass-panel p-3 min-w-[130px] transition-all ${!player.isAlive ? 'opacity-40' : ''
                } ${isCurrentTurn ? 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-400/20' : ''}`}
        >
            {/* 이름 & 코인 */}
            <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm font-bold text-white truncate max-w-[80px]">
                    {isCurrentTurn && <span className="text-amber-400 mr-1">▶</span>}
                    {player.name}
                </span>
                {player.isAlive ? (
                    <span className="coin text-xs w-6 h-6">{player.coins}</span>
                ) : (
                    <span className="text-slate-500 text-xs">탈락</span>
                )}
            </div>

            {/* 카드 (뒷면) */}
            <div className="flex gap-2 justify-center">
                {player.cards.map((card, i) => (
                    <div key={i}>
                        {card.revealed ? (
                            <div
                                className={`w-12 h-18 rounded-lg border-2 bg-gradient-to-b ${CHAR_STYLES[card.character]} opacity-40 grayscale flex flex-col items-center justify-center p-1`}
                                style={{ height: '72px', width: '48px' }}
                            >
                                <span className="text-lg">{CHAR_EMOJI[card.character]}</span>
                                <span className="text-[9px] text-white/60 text-center leading-tight">
                                    {CHARACTER_NAMES[card.character]}
                                </span>
                            </div>
                        ) : (
                            <div
                                className="rounded-lg border-2 border-slate-600 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow"
                                style={{ height: '72px', width: '48px' }}
                            >
                                <span className="text-2xl">🂠</span>
                            </div>
                        )}
                    </div>
                ))}
                {/* 살아있는 카드 수 */}
                {player.isAlive && (
                    <div className="self-end">
                        <span className="text-[10px] text-slate-500">×{liveCards}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
