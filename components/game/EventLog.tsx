'use client';

import { memo, useEffect, useRef } from 'react';
import { ScrollText, Swords, ShieldAlert, ShieldCheck, Zap, Crown, Crosshair, Anchor, Repeat, Shield, Skull, Trophy } from 'lucide-react';
import { LogEntry, LogEntryType } from '@/lib/game/types';

interface Props {
    log: string[];
    structuredLog?: LogEntry[];
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

const LOG_TYPE_CONFIG: Record<LogEntryType, { color: string; icon?: React.ElementType }> = {
    game_start: { color: 'text-gold', icon: Zap },
    action_declared: { color: 'text-text-muted' },
    action_resolved: { color: 'text-text-secondary' },
    challenge_success: { color: 'text-ambassador', icon: Swords },
    challenge_fail: { color: 'text-contessa', icon: Swords },
    block_declared: { color: 'text-captain', icon: ShieldAlert },
    block_confirmed: { color: 'text-captain', icon: ShieldCheck },
    block_challenge_success: { color: 'text-ambassador', icon: Swords },
    block_challenge_fail: { color: 'text-contessa', icon: Swords },
    lose_influence: { color: 'text-contessa', icon: Crosshair },
    player_eliminated: { color: 'text-contessa', icon: Skull },
    exchange_complete: { color: 'text-ambassador', icon: Repeat },
    game_over: { color: 'text-gold', icon: Trophy },
    guess_success: { color: 'text-ambassador', icon: Zap },
    guess_fail: { color: 'text-contessa', icon: Zap },
};

function StructuredLogEntry({ entry, isLatest }: { entry: LogEntry; isLatest: boolean }) {
    const config = LOG_TYPE_CONFIG[entry.type] ?? { color: 'text-text-muted' };
    const color = isLatest ? 'text-gold' : config.color;
    const Icon = config.icon;

    return (
        <div
            className={`flex items-start gap-2 rounded-md px-2 py-1 transition-colors duration-200 ${
                isLatest ? 'bg-gold/10' : 'hover:bg-bg-surface'
            }`}
        >
            <span className={`flex-shrink-0 mt-px ${color}`}>
                {Icon ? <Icon size={10} strokeWidth={2.5} /> : <span className="font-mono text-[10px]">&bull;</span>}
            </span>
            <span className={`font-mono text-[10px] leading-relaxed ${color}`}>
                {entry.message}
            </span>
        </div>
    );
}

function EventLog({ log, structuredLog }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log, structuredLog]);

    const useStructured = structuredLog && structuredLog.length > 0;

    return (
        <div className="h-full bg-bg-card border border-border-subtle rounded-xl overflow-y-auto">
            {/* Header — sticky */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-card">
                <ScrollText className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <span className="font-sora text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    게임 로그
                </span>
            </div>

            {/* Log entries */}
            <div className="px-3 py-2 space-y-0.5">
                {useStructured
                    ? structuredLog.map((entry, i) => (
                          <StructuredLogEntry
                              key={i}
                              entry={entry}
                              isLatest={i === structuredLog.length - 1}
                          />
                      ))
                    : log.map((entry, i) => {
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
