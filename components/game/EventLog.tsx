'use client';

import { memo, useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

interface Props {
    log: string[];
}

/**
 * Log entry keyword -> Tailwind text color class
 * Uses design system tokens from tailwind.config.js
 */
export function getLogColor(entry: string): string {
    if (entry.includes('승리')) return 'text-gold';
    if (entry.includes('탈락') || entry.includes('잃었습니다')) return 'text-contessa';
    if (entry.includes('도전 성공') || entry.includes('블러프')) return 'text-ambassador';
    if (entry.includes('도전 실패')) return 'text-contessa';
    if (entry.includes('막습니다') || entry.includes('블록')) return 'text-captain';
    if (entry.includes('도전')) return 'text-gold-dark';
    return 'text-text-muted';
}

function EventLog({ log }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    return (
        <div className="flex flex-col h-full bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle flex-shrink-0">
                <ScrollText className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <span className="font-sora text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    게임 로그
                </span>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                {log.map((entry, i) => {
                    const isLatest = i === log.length - 1;
                    const color = isLatest ? 'text-gold' : getLogColor(entry);

                    return (
                        <div
                            key={i}
                            className={`flex items-start gap-2 rounded-md px-2 py-1 transition-colors duration-200 ${
                                isLatest ? 'bg-gold/10' : 'hover:bg-bg-surface'
                            }`}
                        >
                            <span className={`font-mono text-[10px] leading-relaxed flex-shrink-0 mt-px ${color}`}>
                                &bull;
                            </span>
                            <span className={`font-mono text-[10px] leading-relaxed ${color}`}>
                                {entry}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

export default memo(EventLog);
