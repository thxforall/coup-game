'use client';

import { memo, useState } from 'react';
import { Coins, Handshake, Crown, Crosshair, Anchor, Repeat, Zap, Shield } from 'lucide-react';
import { FilteredGameState, Player, ActionType, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES } from '@/lib/game/types';

interface Props {
    state: FilteredGameState;
    playerId: string;
    onAction: (action: object) => Promise<void>;
}

type ButtonVariant = 'general' | 'duke' | 'assassin' | 'captain' | 'ambassador' | 'coup';

const ACTION_BUTTONS: {
    type: ActionType;
    label: string;
    icon: React.ElementType;
    desc: string;
    cost?: number;
    needsTarget?: boolean;
    claimedChar?: Character;
    variant: ButtonVariant;
    row: 1 | 2;
}[] = [
    {
        type: 'income',
        label: '소득',
        icon: Coins,
        desc: '코인 +1 (막기 불가)',
        variant: 'general',
        row: 1,
    },
    {
        type: 'foreignAid',
        label: '외국 원조',
        icon: Handshake,
        desc: '코인 +2 (공작이 막을 수 있음)',
        variant: 'general',
        row: 1,
    },
    {
        type: 'coup',
        label: '쿠데타',
        icon: Zap,
        desc: '코인 7개, 상대 카드 무조건 제거',
        cost: 7,
        needsTarget: true,
        variant: 'coup',
        row: 1,
    },
    {
        type: 'tax',
        label: '세금징수',
        icon: Crown,
        desc: '코인 +3 (공작, 도전 가능)',
        claimedChar: 'Duke',
        variant: 'duke',
        row: 2,
    },
    {
        type: 'assassinate',
        label: '암살',
        icon: Crosshair,
        desc: '코인 3개, 상대 카드 제거 (암살자)',
        cost: 3,
        needsTarget: true,
        claimedChar: 'Assassin',
        variant: 'assassin',
        row: 2,
    },
    {
        type: 'steal',
        label: '갈취',
        icon: Anchor,
        desc: '상대 코인 2개 갈취 (사령관)',
        needsTarget: true,
        claimedChar: 'Captain',
        variant: 'captain',
        row: 2,
    },
    {
        type: 'exchange',
        label: '교환',
        icon: Repeat,
        desc: '카드 교환 (대사, 도전 가능)',
        claimedChar: 'Ambassador',
        variant: 'ambassador',
        row: 2,
    },
];

const VARIANT_STYLES: Record<ButtonVariant, string> = {
    general: 'bg-bg-surface border-border-subtle hover:bg-border-subtle',
    duke: 'bg-duke/20 border-duke hover:bg-duke/30',
    assassin: 'bg-assassin/20 border-assassin hover:bg-assassin/30',
    captain: 'bg-captain/20 border-captain hover:bg-captain/30',
    ambassador: 'bg-ambassador/20 border-ambassador hover:bg-ambassador/30',
    coup: 'border-gold hover:opacity-90',
};

const VARIANT_ICON_COLORS: Record<ButtonVariant, string> = {
    general: 'text-gold',
    duke: 'text-duke',
    assassin: 'text-assassin',
    captain: 'text-captain',
    ambassador: 'text-ambassador',
    coup: 'text-bg-dark',
};

const ALL_CHARACTERS: Character[] = ['Duke', 'Contessa', 'Captain', 'Assassin', 'Ambassador'];

const GUESS_CHAR_ICONS: Record<Character, React.ElementType> = {
    Duke: Crown,
    Contessa: Shield,
    Captain: Anchor,
    Assassin: Crosshair,
    Ambassador: Repeat,
};

function ActionPanel({ state, playerId, onAction }: Props) {
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [guessChar, setGuessChar] = useState<Character | null>(null);
    const me = state.players.find((p) => p.id === playerId)!;
    const aliveOthers = state.players.filter((p) => p.isAlive && p.id !== playerId);
    const mustCoup = me.coins >= 10;
    const isGuessMode = state.gameMode === 'guess';

    const handleAction = async (type: ActionType, needsTarget: boolean) => {
        if (needsTarget && !targetId) return;
        if (type === 'coup' && isGuessMode && !guessChar) return;
        setLoading(true);
        await onAction({
            type,
            targetId: needsTarget ? targetId : undefined,
            ...(type === 'coup' && isGuessMode && guessChar ? { guessedCharacter: guessChar } : {}),
        });
        setGuessChar(null);
        setLoading(false);
    };

    const visibleButtons = ACTION_BUTTONS.filter((a) => {
        if (mustCoup && a.type !== 'coup') return false;
        return true;
    });

    const row1 = visibleButtons.filter((a) => a.row === 1);
    const row2 = visibleButtons.filter((a) => a.row === 2);

    return (
        <div className="space-y-3">
            {/* 대상 선택 */}
            {aliveOthers.length > 0 && (
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        대상 선택 (갈취·암살·쿠데타에 필요)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {aliveOthers.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setTargetId(p.id === targetId ? '' : p.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                                    targetId === p.id
                                        ? 'border-gold text-text-primary'
                                        : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-gold/50'
                                }`}
                                style={
                                    targetId === p.id
                                        ? { backgroundColor: 'rgba(200, 169, 96, 0.15)' }
                                        : undefined
                                }
                            >
                                {p.name}
                                <span className="ml-1.5 text-xs" style={{ color: 'var(--coin-color)' }}>
                                    {p.coins}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Guess 모드: 캐릭터 추측 선택 */}
            {isGuessMode && targetId && me.coins >= 7 && (
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        쿠데타 추측 캐릭터 선택
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_CHARACTERS.map((ch) => {
                            const Icon = GUESS_CHAR_ICONS[ch];
                            const selected = guessChar === ch;
                            return (
                                <button
                                    key={ch}
                                    onClick={() => setGuessChar(selected ? null : ch)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                        selected
                                            ? 'border-gold bg-gold/15 text-text-primary'
                                            : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-gold/50'
                                    }`}
                                >
                                    <Icon size={13} />
                                    {CHARACTER_NAMES[ch]}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 액션 버튼 — Row 1: 소득 / 외국 원조 / 쿠데타 */}
            {row1.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {row1.map((a) => {
                        const canAfford = a.cost ? me.coins >= a.cost : true;
                        const hasTarget = a.needsTarget ? !!targetId : true;
                        const needsGuess = a.type === 'coup' && isGuessMode && !guessChar;
                        const disabled = !canAfford || !hasTarget || needsGuess || loading;
                        const Icon = a.icon;
                        const isCoup = a.variant === 'coup';

                        return (
                            <button
                                key={a.type}
                                onClick={() => handleAction(a.type, !!a.needsTarget)}
                                disabled={disabled}
                                className={`flex flex-col items-start p-2 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${
                                    disabled ? 'cursor-not-allowed' : 'active:scale-95'
                                } ${VARIANT_STYLES[a.variant]}`}
                                style={isCoup ? { backgroundColor: 'var(--gold)' } : undefined}
                            >
                                <div className="flex items-center gap-2 mb-1 w-full">
                                    <Icon
                                        className={`w-5 h-5 shrink-0 ${VARIANT_ICON_COLORS[a.variant]}`}
                                    />
                                    <span
                                        className={`font-bold text-sm ${isCoup ? 'text-bg-dark' : 'text-text-primary'}`}
                                    >
                                        {a.label}
                                    </span>
                                    {a.cost && (
                                        <span
                                            className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: 'rgba(200, 169, 96, 0.2)',
                                                color: 'var(--gold)',
                                                border: '1px solid rgba(200, 169, 96, 0.4)',
                                            }}
                                        >
                                            -{a.cost}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`text-[10px] leading-tight ${isCoup ? 'text-bg-dark/70' : 'text-text-muted'}`}
                                >
                                    {a.desc}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 액션 버튼 — Row 2: 세금징수 / 암살 / 갈취 / 교환 */}
            {row2.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {row2.map((a) => {
                        const canAfford = a.cost ? me.coins >= a.cost : true;
                        const hasTarget = a.needsTarget ? !!targetId : true;
                        const disabled = !canAfford || !hasTarget || loading;
                        const Icon = a.icon;

                        return (
                            <button
                                key={a.type}
                                onClick={() => handleAction(a.type, !!a.needsTarget)}
                                disabled={disabled}
                                className={`flex flex-col items-start p-2 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${
                                    disabled ? 'cursor-not-allowed' : 'active:scale-95'
                                } ${VARIANT_STYLES[a.variant]}`}
                            >
                                <div className="flex items-center gap-1.5 mb-1 w-full">
                                    <Icon
                                        className={`w-5 h-5 shrink-0 ${VARIANT_ICON_COLORS[a.variant]}`}
                                    />
                                    <span className="font-bold text-sm text-text-primary truncate">
                                        {a.label}
                                    </span>
                                    {a.cost && (
                                        <span
                                            className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: 'rgba(200, 169, 96, 0.2)',
                                                color: 'var(--gold)',
                                                border: '1px solid rgba(200, 169, 96, 0.4)',
                                            }}
                                        >
                                            -{a.cost}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-text-muted leading-tight line-clamp-2">
                                    {a.desc}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {mustCoup && (
                <p
                    className="text-center text-xs font-semibold"
                    style={{ color: 'var(--gold)' }}
                >
                    코인 10개 이상 — 반드시 쿠데타를 해야 합니다
                </p>
            )}
        </div>
    );
}

export default memo(ActionPanel);
