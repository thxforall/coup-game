'use client';

import { memo, useEffect, useRef } from 'react';
import { ScrollText, Swords, ShieldAlert, ShieldCheck, Zap, Crosshair, Repeat, Skull, Trophy, MessageCircle } from 'lucide-react';
import { LogEntry, LogEntryType } from '@/lib/game/types';
import { getPlayerColor } from '@/lib/game/player-colors';

interface ChatLogItem {
    playerName: string;
    message: string;
    timestamp: number;
    playerId?: string;
}

/** Minimal shape needed from a player for name colorization. */
interface PlayerColorInfo {
    id: string;
    name: string;
}

interface Props {
    log: string[];
    structuredLog?: LogEntry[];
    chatLogs?: ChatLogItem[];
    hideHeader?: boolean;
    players?: PlayerColorInfo[];
}

/**
 * Log entry keyword -> Tailwind text color class
 * Uses design system tokens from tailwind.config.js
 */
export function getLogColor(entry: string): string {
    if (entry.includes('승리')) return 'text-gold';
    if (entry.includes('탈락') || entry.includes('잃었습니다')) return 'text-contessa';
    if (entry.includes('도전 성공') || entry.includes('거짓말')) return 'text-ambassador';
    if (entry.includes('도전 실패')) return 'text-contessa';
    if (entry.includes('막습니다') || entry.includes('블록')) return 'text-captain';
    if (entry.includes('도전')) return 'text-gold-dark';
    if (entry.includes('의 턴 ---')) return 'text-gold';
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
    turn_start: { color: 'text-gold', icon: Zap },
};


/**
 * Split a message into React nodes, wrapping player names with their unique color.
 * Longer names are matched first to prevent partial-name collisions.
 */
function colorizePlayerNames(message: string, players: PlayerColorInfo[]): React.ReactNode {
    if (!players || players.length === 0) return message;

    // Sort by name length descending so longer names match first
    const sorted = [...players].sort((a, b) => b.name.length - a.name.length);

    // Recursive split: iterate through each player name and wrap matches
    function splitAndColor(text: string, playerIndex: number): React.ReactNode[] {
        if (playerIndex >= sorted.length) return [text];
        const player = sorted[playerIndex];
        const name = player.name;
        const color = getPlayerColor(player.id);
        const parts = text.split(name);
        if (parts.length === 1) {
            // Name not found in this segment — recurse with next player
            return splitAndColor(text, playerIndex + 1);
        }
        const result: React.ReactNode[] = [];
        parts.forEach((part, i) => {
            if (part.length > 0) {
                const subNodes = splitAndColor(part, playerIndex + 1);
                result.push(...subNodes);
            }
            if (i < parts.length - 1) {
                result.push(
                    <span key={`${player.id}-${i}`} style={{ color }}>
                        {name}
                    </span>
                );
            }
        });
        return result;
    }

    const nodes = splitAndColor(message, 0);
    // If only a single plain string was returned, keep it simple
    if (nodes.length === 1 && typeof nodes[0] === 'string') return nodes[0];
    return <>{nodes}</>;
}

function StructuredLogEntry({ entry, isLatest, players }: { entry: LogEntry; isLatest: boolean; players: PlayerColorInfo[] }) {
    const config = LOG_TYPE_CONFIG[entry.type] ?? { color: 'text-text-muted' };
    const color = isLatest ? 'text-gold' : config.color;
    const Icon = config.icon;
    const isTurnStart = entry.type === 'turn_start';

    return (
        <div
            className={`flex items-start gap-2 px-2 py-1 transition-colors duration-200 ${isTurnStart ? 'border-t border-border-subtle/40 mt-1 pt-1.5' : 'rounded-md'
                } ${isLatest ? 'bg-gold/10' : 'hover:bg-bg-surface'}`}
        >
            <span className={`flex-shrink-0 mt-px ${color}`}>
                {Icon ? <Icon size={10} strokeWidth={2.5} /> : <span className="font-mono text-[10px]">&bull;</span>}
            </span>
            <span className={`font-mono text-[10px] leading-relaxed ${color}`}>
                {colorizePlayerNames(entry.message, players)}
            </span>
        </div>
    );
}

function ChatLogEntry({ item, isLatest }: { item: ChatLogItem; isLatest: boolean }) {
    const playerColor = item.playerId ? getPlayerColor(item.playerId) : '#22d3ee'; // fallback cyan-400
    return (
        <div
            className={`flex items-start gap-2 rounded-md px-2 py-1 transition-colors duration-200 ${isLatest ? 'bg-cyan-400/10' : 'hover:bg-bg-surface'
                }`}
        >
            <span className="flex-shrink-0 mt-px" style={{ color: playerColor }}>
                <MessageCircle size={10} strokeWidth={2.5} />
            </span>
            <span className="font-mono text-[10px] leading-relaxed">
                <span style={{ color: playerColor }}>{item.playerName}</span>
                <span className={isLatest ? 'text-gold' : 'text-text-muted'}>: {item.message}</span>
            </span>
        </div>
    );
}

function EventLog({ log, structuredLog, chatLogs = [], hideHeader = false, players = [] }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log, structuredLog, chatLogs]);

    const useStructured = structuredLog && structuredLog.length > 0;

    // Build merged entries for structured log mode
    type StructuredMerged =
        | { kind: 'game'; entry: LogEntry; sortKey: number }
        | { kind: 'chat'; item: ChatLogItem; sortKey: number };

    const mergedStructured: StructuredMerged[] | null = useStructured
        ? (() => {
            const gameEntries: StructuredMerged[] = structuredLog.map((entry) => ({
                kind: 'game',
                entry,
                sortKey: entry.timestamp,
            }));
            const chatEntries: StructuredMerged[] = chatLogs.map((item) => ({
                kind: 'chat',
                item,
                sortKey: item.timestamp,
            }));
            return [...gameEntries, ...chatEntries].sort((a, b) => a.sortKey - b.sortKey);
        })()
        : null;

    // Build merged entries for plain log mode
    type PlainMerged =
        | { kind: 'game'; text: string; index: number; sortKey: number }
        | { kind: 'chat'; item: ChatLogItem; sortKey: number };

    const mergedPlain: PlainMerged[] | null = !useStructured
        ? (() => {
            const gameEntries: PlainMerged[] = log.map((text, i) => ({
                kind: 'game',
                text,
                index: i,
                sortKey: i,
            }));
            const minChat = chatLogs.length > 0 ? Math.min(...chatLogs.map((c) => c.timestamp)) : 0;
            const maxGame = gameEntries.length;
            const chatEntries: PlainMerged[] = chatLogs.map((item) => ({
                kind: 'chat',
                item,
                sortKey: maxGame + (item.timestamp - minChat) / 1e13,
            }));
            return [...gameEntries, ...chatEntries].sort((a, b) => a.sortKey - b.sortKey);
        })()
        : null;

    return (
        <div className="h-full bg-bg-card rounded-xl overflow-y-auto">
            {/* Header — sticky (hidden inside bottom sheet which has its own header) */}
            {!hideHeader && (
                <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border-subtle/50 bg-bg-card">
                    <ScrollText className="w-4 h-4 text-text-secondary flex-shrink-0" />
                    <span className="font-sora text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        게임 로그
                    </span>
                </div>
            )}
            {/* Log entries */}
            <div className="px-3 py-2 space-y-0.5">
                {mergedStructured
                    ? mergedStructured.map((item, i) => {
                        const isLatest = i === mergedStructured.length - 1;
                        if (item.kind === 'chat') {
                            return (
                                <ChatLogEntry key={`chat-${i}`} item={item.item} isLatest={isLatest} />
                            );
                        }
                        return (
                            <StructuredLogEntry
                                key={`game-${i}`}
                                entry={item.entry}
                                isLatest={isLatest}
                                players={players}
                            />
                        );
                    })
                    : mergedPlain!.map((item, i) => {
                        const isLatest = i === mergedPlain!.length - 1;
                        if (item.kind === 'chat') {
                            return (
                                <ChatLogEntry key={`chat-${i}`} item={item.item} isLatest={isLatest} />
                            );
                        }
                        const color = isLatest ? 'text-gold' : getLogColor(item.text);
                        return (
                            <div
                                key={`game-${item.index}`}
                                className={`flex items-start gap-2 rounded-md px-2 py-1 transition-colors duration-200 ${isLatest ? 'bg-gold/10' : 'hover:bg-bg-surface'
                                    }`}
                            >
                                <span className={`font-mono text-[10px] leading-relaxed flex-shrink-0 mt-px ${color}`}>
                                    &bull;
                                </span>
                                <span className={`font-mono text-[10px] leading-relaxed ${color}`}>
                                    {colorizePlayerNames(item.text, players)}
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
