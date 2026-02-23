'use client';

import { memo, useState } from 'react';
import { Coins, Handshake, Crown, Crosshair, Anchor, Repeat, Zap, Shield, X, ChevronRight } from 'lucide-react';
import { FilteredGameState, Player, ActionType, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES } from '@/lib/game/types';
import ConfirmModal from './ConfirmModal';

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

const VARIANT_TEXT_COLORS: Record<ButtonVariant, string> = {
    general: 'var(--gold)',
    duke: 'var(--duke)',
    assassin: 'var(--assassin)',
    captain: 'var(--captain)',
    ambassador: 'var(--ambassador)',
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

function ActionPanel({ state, playerId, onAction }: Props) {
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [guessChar, setGuessChar] = useState<Character | null>(null);
    const [pendingActionType, setPendingActionType] = useState<ActionType | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: ActionType; targetId: string; guessChar?: Character } | null>(null);

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
        // Reset state after action fires
        setGuessChar(null);
        setTargetId('');
        setPendingActionType(null);
        setLoading(false);
    };

    const handleActionButtonClick = (actionType: ActionType, needsTarget: boolean) => {
        if (needsTarget) {
            // Enter target selection mode
            setPendingActionType(actionType);
            setTargetId('');
            setGuessChar(null);
        } else {
            // Show confirm modal for non-target actions too
            setConfirmAction({ type: actionType, targetId: '' });
        }
    };

    const handleCancelTargetSelection = () => {
        setPendingActionType(null);
        setTargetId('');
        setGuessChar(null);
    };

    const getConfirmInfo = (type: ActionType, target?: { name: string }) => {
        switch (type) {
            case 'income':
                return { title: '소득 확인', message: '소득을 선택하시겠습니까? (코인 +1)', label: '소득 받기', color: 'var(--gold)', icon: Coins };
            case 'foreignAid':
                return { title: '외국 원조 확인', message: '외국 원조를 선택하시겠습니까? (코인 +2, 공작이 막을 수 있음)', label: '원조 받기', color: 'var(--gold)', icon: Handshake };
            case 'tax':
                return { title: '세금징수 확인', message: '세금징수를 선택하시겠습니까? (코인 +3, 도전 가능)', label: '세금 징수하기', color: 'var(--duke)', icon: Crown };
            case 'exchange':
                return { title: '교환 확인', message: '카드 교환을 선택하시겠습니까? (도전 가능)', label: '카드 교환하기', color: 'var(--ambassador)', icon: Repeat };
            case 'steal':
                return { title: '갈취 확인', message: `${target?.name}에게서 코인을 갈취하시겠습니까?`, label: `${target?.name ?? ''} 갈취하기`, color: 'var(--captain)', icon: Anchor };
            case 'assassinate':
                return { title: '암살 확인', message: `정말 ${target?.name}을(를) 암살하시겠습니까? (3코인 소모)`, label: `${target?.name ?? ''} 암살하기`, color: 'var(--assassin)', icon: Crosshair };
            case 'coup':
                return { title: '쿠데타 확인', message: `정말 ${target?.name}에게 쿠데타를 하시겠습니까? (7코인 소모)`, label: `${target?.name ?? ''} 쿠데타`, color: 'var(--gold)', icon: Zap };
            default:
                return { title: '확인', message: '이 행동을 선택하시겠습니까?', label: '확인', color: 'var(--gold)', icon: undefined as React.ElementType | undefined };
        }
    };

    const handleTargetSelect = (selectedId: string) => {
        if (!pendingActionType) return;
        const isCoupGuess = pendingActionType === 'coup' && isGuessMode;
        if (isCoupGuess) {
            // In guess mode, need character selection before firing
            setTargetId(selectedId);
        } else {
            // Show confirm modal for all target actions
            setTargetId(selectedId);
            setConfirmAction({ type: pendingActionType, targetId: selectedId });
        }
    };

    const handleConfirm = async () => {
        if (!confirmAction) return;
        setLoading(true);
        await onAction({
            type: confirmAction.type,
            targetId: confirmAction.targetId || undefined,
            ...(confirmAction.type === 'coup' && isGuessMode && confirmAction.guessChar
                ? { guessedCharacter: confirmAction.guessChar }
                : {}),
        });
        setGuessChar(null);
        setTargetId('');
        setPendingActionType(null);
        setConfirmAction(null);
        setLoading(false);
    };

    const handleConfirmCancel = () => {
        setConfirmAction(null);
        // Keep target selection mode open so user can re-pick
    };

    const visibleButtons = ACTION_BUTTONS.filter((a) => {
        if (mustCoup && a.type !== 'coup') return false;
        return true;
    });

    const row1 = visibleButtons.filter((a) => a.row === 1);
    const row2 = visibleButtons.filter((a) => a.row === 2);

    const pendingActionDef = pendingActionType
        ? ACTION_BUTTONS.find((a) => a.type === pendingActionType)
        : null;

    // Confirm modal for all actions
    const confirmTarget = confirmAction?.targetId ? state.players.find((p) => p.id === confirmAction.targetId) : undefined;
    const confirmInfo = confirmAction ? getConfirmInfo(confirmAction.type, confirmTarget) : null;
    const confirmModalNode = confirmAction && confirmInfo ? (
        <ConfirmModal
            title={confirmInfo.title}
            message={confirmInfo.message}
            confirmLabel={confirmInfo.label}
            confirmColor={confirmInfo.color}
            confirmIcon={confirmInfo.icon}
            onConfirm={handleConfirm}
            onCancel={handleConfirmCancel}
            loading={loading}
        />
    ) : null;

    // Target selection mode
    if (pendingActionType && pendingActionDef) {
        const isCoupGuess = pendingActionType === 'coup' && isGuessMode;
        const PendingIcon = pendingActionDef.icon;
        const headerColor = VARIANT_TEXT_COLORS[pendingActionDef.variant];

        return (
            <>
                <div className="space-y-3">
                    {/* Header: selected action + cancel */}
                    <div
                        className="flex items-center justify-between rounded-xl px-3 py-2 border"
                        style={{
                            borderColor: headerColor,
                            backgroundColor: `color-mix(in srgb, ${headerColor} 12%, transparent)`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <PendingIcon
                                className="w-4 h-4 shrink-0"
                                style={{ color: headerColor }}
                            />
                            <span className="font-bold text-sm text-text-primary">
                                {pendingActionDef.label}
                            </span>
                            <ChevronRight className="w-3 h-3 text-text-muted" />
                            <span className="text-sm text-text-muted">대상을 선택하세요</span>
                        </div>
                        <button
                            onClick={handleCancelTargetSelection}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-muted hover:text-text-primary border border-border-subtle hover:border-border-muted transition-all"
                            disabled={loading}
                        >
                            <X size={11} />
                            취소
                        </button>
                    </div>

                    {/* Target player buttons */}
                    <div className="flex flex-wrap gap-2">
                        {aliveOthers.map((p) => {
                            const isSelected = targetId === p.id;
                            const isStealNoCoins = pendingActionType === 'steal' && p.coins === 0;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => !isStealNoCoins && handleTargetSelect(p.id)}
                                    disabled={loading || isStealNoCoins}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold text-sm transition-all disabled:opacity-40 ${
                                        isStealNoCoins
                                            ? 'cursor-not-allowed bg-bg-surface border-border-subtle text-text-muted'
                                            : isSelected
                                            ? 'text-text-primary active:scale-95'
                                            : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-gold/50 hover:text-text-primary active:scale-95'
                                    }`}
                                    style={
                                        isSelected && !isStealNoCoins
                                            ? {
                                                  borderColor: headerColor,
                                                  backgroundColor: `color-mix(in srgb, ${headerColor} 15%, transparent)`,
                                                  color: 'var(--text-primary)',
                                              }
                                            : undefined
                                    }
                                >
                                    {p.name}
                                    <span className="text-xs font-semibold" style={{ color: isStealNoCoins ? 'var(--text-muted)' : 'var(--coin-color)' }}>
                                        {p.coins}
                                    </span>
                                    {isStealNoCoins && (
                                        <span className="text-[10px] text-text-muted">코인 없음</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Guess mode: character selection after target is picked */}
                    {isCoupGuess && targetId && (
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
                                            disabled={loading}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 ${
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
                            {/* Confirm button for guess mode — triggers confirm modal */}
                            <button
                                onClick={() => {
                                    if (guessChar && targetId) {
                                        setConfirmAction({ type: 'coup', targetId, guessChar });
                                    }
                                }}
                                disabled={!guessChar || loading}
                                className="mt-3 w-full py-2 rounded-xl font-bold text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                style={{
                                    backgroundColor: 'var(--gold)',
                                    color: 'var(--bg-dark)',
                                    borderColor: 'var(--gold)',
                                }}
                            >
                                <Zap className="inline w-4 h-4 mr-1.5" />
                                쿠데타 확인
                            </button>
                        </div>
                    )}
                </div>
                {confirmModalNode}
            </>
        );
    }

    // Default view: action buttons
    return (
        <div className="space-y-3">
            {confirmModalNode}
            {/* 액션 버튼 — Row 1: 소득 / 외국 원조 / 쿠데타 */}
            {row1.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {row1.map((a) => {
                        const canAfford = a.cost ? me.coins >= a.cost : true;
                        const disabled = !canAfford || loading;
                        const Icon = a.icon;
                        const isCoup = a.variant === 'coup';

                        return (
                            <button
                                key={a.type}
                                onClick={() => handleActionButtonClick(a.type, !!a.needsTarget)}
                                disabled={disabled}
                                className={`flex flex-col items-start p-1.5 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${
                                    disabled ? 'cursor-not-allowed' : 'active:scale-95'
                                } ${VARIANT_STYLES[a.variant]}`}
                                style={isCoup ? { backgroundColor: 'var(--gold)' } : undefined}
                            >
                                <div className="flex items-center gap-2 mb-1 w-full">
                                    <Icon
                                        className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${VARIANT_ICON_COLORS[a.variant]}`}
                                    />
                                    <span
                                        className={`font-bold text-xs sm:text-sm ${isCoup ? 'text-bg-dark' : 'text-text-primary'}`}
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
                                    className={`text-[10px] leading-tight line-clamp-2 ${isCoup ? 'text-bg-dark/70' : 'text-text-muted'}`}
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
                        const hasStealTarget = a.type === 'steal' ? aliveOthers.some((p) => p.coins > 0) : true;
                        const disabled = !canAfford || !hasStealTarget || loading;
                        const Icon = a.icon;

                        return (
                            <button
                                key={a.type}
                                onClick={() => handleActionButtonClick(a.type, !!a.needsTarget)}
                                disabled={disabled}
                                className={`flex flex-col items-start p-1.5 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${
                                    disabled ? 'cursor-not-allowed' : 'active:scale-95'
                                } ${VARIANT_STYLES[a.variant]}`}
                            >
                                <div className="flex items-center gap-1.5 mb-1 w-full">
                                    <Icon
                                        className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${VARIANT_ICON_COLORS[a.variant]}`}
                                    />
                                    <span className="font-bold text-xs sm:text-sm text-text-primary truncate">
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
