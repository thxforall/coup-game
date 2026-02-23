'use client';

import { useEffect, useRef } from 'react';

interface Props {
    log: string[];
}

// 로그 메시지 키워드 → 아이콘 매핑
function getLogIcon(entry: string): string {
    if (entry.includes('게임이 시작')) return '🎮';
    if (entry.includes('승리')) return '🏆';
    if (entry.includes('탈락')) return '☠️';
    if (entry.includes('잃었습니다')) return '💀';
    if (entry.includes('도전 성공')) return '⚡';
    if (entry.includes('도전 실패')) return '❌';
    if (entry.includes('도전')) return '⚔️';
    if (entry.includes('막습니다') || entry.includes('블록')) return '🛡️';
    if (entry.includes('블러프')) return '🎭';
    if (entry.includes('소득')) return '💰';
    if (entry.includes('외국 원조') || entry.includes('받았습니다')) return '🤝';
    if (entry.includes('세금') || entry.includes('걷었습니다')) return '👑';
    if (entry.includes('강탈')) return '⚔️';
    if (entry.includes('암살')) return '🗡️';
    if (entry.includes('교환')) return '🕊️';
    if (entry.includes('쿠')) return '💣';
    return '•';
}

// 로그 메시지 → 텍스트 색상
function getLogColor(entry: string): string {
    if (entry.includes('승리')) return 'text-amber-300';
    if (entry.includes('탈락') || entry.includes('잃었습니다')) return 'text-red-400';
    if (entry.includes('도전 성공') || entry.includes('블러프')) return 'text-emerald-400';
    if (entry.includes('도전 실패')) return 'text-red-400';
    if (entry.includes('막습니다') || entry.includes('블록')) return 'text-blue-400';
    if (entry.includes('도전')) return 'text-orange-400';
    return 'text-slate-400';
}

export default function EventLog({ log }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    return (
        <div className="glass-panel p-3 h-full max-h-40 overflow-y-auto flex flex-col">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-white/5 backdrop-blur-sm py-1 px-1 -mx-1 rounded z-10">
                📜 게임 로그
            </p>
            <div className="space-y-0.5 flex-1">
                {log.map((entry, i) => {
                    const isLatest = i === log.length - 1;
                    const icon = getLogIcon(entry);
                    const color = isLatest ? 'text-white' : getLogColor(entry);

                    return (
                        <div
                            key={i}
                            className={`log-entry flex items-start gap-1.5 rounded-md px-1.5 py-0.5 transition-all duration-300 ${isLatest
                                ? 'bg-white/10 font-semibold log-latest'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            <span className="text-xs leading-relaxed flex-shrink-0 mt-px">
                                {icon}
                            </span>
                            <span className={`text-xs leading-relaxed ${color}`}>
                                {entry}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div ref={bottomRef} />
        </div>
    );
}
