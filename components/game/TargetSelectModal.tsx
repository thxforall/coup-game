'use client';

import { memo, useState } from 'react';
import { Coins, Crown, Crosshair, Anchor, Repeat, Zap, Shield } from 'lucide-react';
import { FilteredPlayer, Character, CHARACTER_NAMES, ActionType } from '@/lib/game/types';
import BottomSheet from '@/components/ui/BottomSheet';
import { getPlayerColor } from '@/lib/game/player-colors';

type ButtonVariant = 'general' | 'duke' | 'assassin' | 'captain' | 'ambassador' | 'coup';

const DARK_COLORS = ['var(--assassin-color)', '#2C3E50'];
function isDarkColor(color?: string): boolean {
    if (!color) return false;
    return DARK_COLORS.includes(color);
}

const VARIANT_COLORS: Record<ButtonVariant, string> = {
    general: 'var(--gold)',
    duke: 'var(--duke-color)',
    assassin: 'var(--assassin-color)',
    captain: 'var(--captain-color)',
    ambassador: 'var(--ambassador-color)',
    coup: 'var(--gold)',
};

const ALL_CHARACTERS: Character[] = ['Duke', 'Contessa', 'Captain', 'Assassin', 'Ambassador'];

const GUESS_CHAR_ICONS: Record<Character, React.ElementType> = {
    Duke: Crown,
    Contessa: Shield,
    Captain: Anchor,
    Assassin: Crosshair,
    Ambassador: Repeat,
};

interface ActionDef {
    type: ActionType;
    label: string;
    icon: React.ElementType;
    desc: string;
    cost?: number;
    claimedChar?: Character;
    variant: ButtonVariant;
}

interface Props {
    actionDef: ActionDef;
    aliveOthers: FilteredPlayer[];
    isGuessMode: boolean;
    loading: boolean;
    onSelectTarget: (targetId: string, guessChar?: Character) => void;
    onCancel: () => void;
}

function TargetSelectModal({ actionDef, aliveOthers, isGuessMode, loading, onSelectTarget, onCancel }: Props) {
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [selectedGuessChar, setSelectedGuessChar] = useState<Character | null>(null);

    const ActionIcon = actionDef.icon;
    const accentColor = VARIANT_COLORS[actionDef.variant];
    const isCoupGuess = actionDef.type === 'coup' && isGuessMode;

    const canConfirm = selectedTargetId !== '' && (!isCoupGuess || selectedGuessChar !== null);
    const selectedTarget = aliveOthers.find((p) => p.id === selectedTargetId);

    const handleConfirm = () => {
        if (!canConfirm) return;
        onSelectTarget(selectedTargetId, selectedGuessChar ?? undefined);
    };

    const handleTargetClick = (playerId: string, isDisabled: boolean) => {
        if (isDisabled || loading) return;
        setSelectedTargetId(playerId);
    };

    return (
        <BottomSheet onClose={onCancel} mobileMaxHeight="70vh">
            <div className="px-5 py-5 space-y-4">
                {/* Header — ConfirmModal 동일 패턴: 아이콘 + 제목 */}
                <div className="flex items-center gap-2">
                    <ActionIcon className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                    <h3 className="font-sora font-bold text-base text-text-primary">{actionDef.label}</h3>
                    {actionDef.cost && (
                        <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                                backgroundColor: 'rgba(200, 169, 96, 0.2)',
                                color: 'var(--gold)',
                                border: '1px solid rgba(200, 169, 96, 0.4)',
                            }}
                        >
                            -{actionDef.cost}
                        </span>
                    )}
                </div>

                {/* Message */}
                <p className="text-sm text-text-secondary leading-relaxed">{actionDef.desc}</p>

                {/* 대상 선택 */}
                <div className="space-y-2">
                    <p className="text-xs text-text-muted">대상을 선택하세요</p>
                    <div className="flex flex-wrap gap-2">
                        {aliveOthers.map((p) => {
                            const isSelected = selectedTargetId === p.id;
                            const isStealNoCoins = actionDef.type === 'steal' && p.coins === 0;
                            const playerColor = getPlayerColor(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleTargetClick(p.id, isStealNoCoins)}
                                    disabled={loading || isStealNoCoins}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 ${isStealNoCoins
                                            ? 'cursor-not-allowed bg-bg-surface border-border-subtle text-text-muted'
                                            : isSelected
                                                ? 'text-text-primary active:scale-95'
                                                : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-gold/50 hover:text-text-primary active:scale-95'
                                        }`}
                                    style={
                                        isStealNoCoins
                                            ? undefined
                                            : isSelected
                                                ? {
                                                    borderColor: accentColor,
                                                    backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                                                    borderLeft: `3px solid ${playerColor}`,
                                                    boxShadow: `0 0 8px ${playerColor}33`,
                                                }
                                                : {
                                                    borderLeft: `3px solid ${playerColor}66`,
                                                }
                                    }
                                >
                                    {/* Player identity dot */}
                                    {!isStealNoCoins && (
                                        <span
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ backgroundColor: playerColor }}
                                        />
                                    )}
                                    {p.name}
                                    <span
                                        className="text-xs"
                                        style={{ color: isStealNoCoins ? 'var(--text-muted)' : 'var(--coin-color)' }}
                                    >
                                        {p.coins}
                                    </span>
                                    {isStealNoCoins && (
                                        <span className="text-[10px] text-text-muted">코인 없음</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* guess 모드 쿠데타: 캐릭터 선택 */}
                {isCoupGuess && selectedTargetId && (
                    <div className="space-y-2">
                        <p className="text-xs text-text-muted">추측 캐릭터 선택</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_CHARACTERS.map((ch) => {
                                const Icon = GUESS_CHAR_ICONS[ch];
                                const isSelectedChar = selectedGuessChar === ch;
                                return (
                                    <button
                                        key={ch}
                                        onClick={() => setSelectedGuessChar(isSelectedChar ? null : ch)}
                                        disabled={loading}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 ${isSelectedChar
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

                {/* Buttons — ConfirmModal 동일 패턴 */}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold border border-border-subtle bg-bg-surface text-text-secondary hover:bg-border-subtle transition-all disabled:opacity-40"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || loading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1.5"
                        style={{
                            backgroundColor: accentColor,
                            color: isDarkColor(accentColor) ? '#FFFFFF' : 'var(--bg-dark)',
                            border: `1px solid ${accentColor}`,
                        }}
                    >
                        {loading ? (
                            '...'
                        ) : (
                            <>
                                <ActionIcon size={14} strokeWidth={2.5} />
                                {selectedTarget ? `${selectedTarget.name} ${actionDef.label}` : `${actionDef.label} 확인`}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}

export default memo(TargetSelectModal);
