'use client';

import { memo, useState, useEffect } from 'react';
import { Coins, Handshake, Crown, Crosshair, Anchor, Repeat, Zap, RefreshCw, Banknote, Search, User, Users } from 'lucide-react';
import { FilteredGameState, ActionType, Character, Allegiance, ALLEGIANCE_NAMES } from '@/lib/game/types';
import ConfirmModal from './ConfirmModal';
import TargetSelectModal from './TargetSelectModal';

interface Props {
    state: FilteredGameState;
    playerId: string;
    onAction: (action: object) => Promise<void>;
    actionDeadline?: number;
}

type ButtonVariant = 'general' | 'duke' | 'assassin' | 'captain' | 'ambassador' | 'coup' | 'reformation' | 'inquisitor';

const ACTION_BUTTONS: {
    type: ActionType;
    label: string;
    icon: React.ElementType;
    desc: string;
    cost?: number;
    needsTarget?: boolean;
    claimedChar?: Character;
    variant: ButtonVariant;
    row: 1 | 2 | 3;
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
            label: '해외원조',
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
        // Reformation 전용 액션
        {
            type: 'conversion',
            label: '전향',
            icon: RefreshCw,
            desc: '진영 변경 (자기 1코인, 타인 2코인)',
            cost: 1,
            variant: 'reformation',
            row: 3 as 1 | 2,
        },
        {
            type: 'embezzlement',
            label: '횡령',
            icon: Banknote,
            desc: '재무부 코인 횡령 (공작이 없다고 선언, 도전 가능)',
            variant: 'reformation',
            row: 3 as 1 | 2,
        },
        {
            type: 'examine',
            label: '심문',
            icon: Search,
            desc: '상대 카드 확인 후 교체 (종교재판관)',
            needsTarget: true,
            claimedChar: 'Inquisitor',
            variant: 'inquisitor',
            row: 3 as 1 | 2,
        },
    ];

const VARIANT_STYLES: Record<ButtonVariant, string> = {
    general: 'bg-bg-surface border-border-subtle hover:bg-border-subtle',
    duke: 'bg-duke/20 border-duke hover:bg-duke/30',
    assassin: 'bg-assassin/20 border-assassin hover:bg-assassin/30',
    captain: 'bg-captain/20 border-captain hover:bg-captain/30',
    ambassador: 'bg-ambassador/20 border-ambassador hover:bg-ambassador/30',
    coup: 'border-gold hover:opacity-90',
    reformation: 'bg-purple-500/20 border-purple-500 hover:bg-purple-500/30',
    inquisitor: 'bg-teal-500/20 border-teal-500 hover:bg-teal-500/30',
};

const VARIANT_ICON_COLORS: Record<ButtonVariant, string> = {
    general: 'text-gold',
    duke: 'text-duke',
    assassin: 'text-assassin',
    captain: 'text-captain',
    ambassador: 'text-ambassador',
    coup: 'text-bg-dark',
    reformation: 'text-purple-400',
    inquisitor: 'text-teal-400',
};

function ActionPanel({ state, playerId, onAction, actionDeadline }: Props) {
    const [loading, setLoading] = useState(false);
    const [remainingMs, setRemainingMs] = useState(45000);

    useEffect(() => {
        if (!actionDeadline) return;
        const update = () => setRemainingMs(Math.max(0, actionDeadline - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [actionDeadline]);

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const progress = Math.max(0, remainingMs / 45000);
    const isCritical = remainingSeconds <= 5;
    const isUrgent = remainingSeconds <= 15;
    const timerColor = isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';
    const [pendingActionType, setPendingActionType] = useState<ActionType | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: ActionType; targetId: string; guessChar?: Character } | null>(null);
    const [showConversionChoice, setShowConversionChoice] = useState(false);

    const me = state.players.find((p) => p.id === playerId)!;
    const aliveOthers = state.players.filter((p) => p.isAlive && p.id !== playerId);
    const mustCoup = me.coins >= 10;
    const isGuessMode = state.gameMode === 'guess';
    const isReformation = state.gameMode === 'reformation';

    const handleActionButtonClick = (actionType: ActionType, needsTarget: boolean) => {
        if (actionType === 'conversion') {
            // 전향: 자기/타인 선택 모달 표시
            setShowConversionChoice(true);
            return;
        }
        if (needsTarget) {
            // Open target selection modal
            setPendingActionType(actionType);
        } else {
            // Show confirm modal for non-target actions
            setConfirmAction({ type: actionType, targetId: '' });
        }
    };

    const handleCancelTargetSelection = () => {
        setPendingActionType(null);
        setShowConversionChoice(false);
    };

    // Called by TargetSelectModal when user clicks confirm
    const handleTargetSelected = (selectedTargetId: string, selectedGuessChar?: Character) => {
        if (!pendingActionType) return;
        if (pendingActionType === 'coup' && isGuessMode && selectedGuessChar) {
            setConfirmAction({ type: 'coup', targetId: selectedTargetId, guessChar: selectedGuessChar });
        } else {
            setConfirmAction({ type: pendingActionType, targetId: selectedTargetId });
        }
        // Keep pendingActionType so TargetSelectModal reappears if ConfirmModal is cancelled
    };

    const getConfirmInfo = (type: ActionType, target?: { name: string; coins?: number; allegiance?: Allegiance }) => {
        switch (type) {
            case 'income':
                return { title: '소득 확인', message: '소득을 선택하시겠습니까? (코인 +1)', label: '소득 받기', color: 'var(--gold)', icon: Coins };
            case 'foreignAid':
                return { title: '해외원조 확인', message: '해외원조를 선택하시겠습니까? (코인 +2, 공작이 막을 수 있음)', label: '해외원조 받기', color: 'var(--gold)', icon: Handshake };
            case 'tax':
                return { title: '세금징수 확인', message: '세금징수를 선택하시겠습니까? (코인 +3, 도전 가능)', label: '세금 징수하기', color: 'var(--gold)', icon: Crown };
            case 'exchange':
                return { title: '교환 확인', message: '카드 교환을 선택하시겠습니까? (도전 가능)', label: '카드 교환하기', color: useInquisitor ? '#5eead4' : 'var(--gold)', icon: Repeat };
            case 'steal': {
                const stealAmount = target?.coins != null ? Math.min(target.coins, 2) : 2;
                return { title: '갈취 확인', message: `${target?.name}에게서 코인 ${stealAmount}개를 갈취하시겠습니까?`, label: `${target?.name ?? ''} 갈취하기`, color: 'var(--gold)', icon: Anchor };
            }
            case 'assassinate':
                return { title: '암살 확인', message: `정말 ${target?.name}을(를) 암살하시겠습니까? (3코인 소모)`, label: `${target?.name ?? ''} 암살하기`, color: 'var(--gold)', icon: Crosshair };
            case 'coup':
                return { title: '쿠데타 확인', message: `정말 ${target?.name}에게 쿠데타를 하시겠습니까? (7코인 소모)`, label: `${target?.name ?? ''} 쿠데타`, color: 'var(--gold)', icon: Zap };
            case 'conversion':
                if (target) {
                    const targetAllegiance = target.allegiance ? ALLEGIANCE_NAMES[target.allegiance] : '';
                    const newAllegiance = target.allegiance === 'loyalist' ? ALLEGIANCE_NAMES.reformist : ALLEGIANCE_NAMES.loyalist;
                    return { title: '타인 전향 확인', message: `${target.name}의 진영을 ${targetAllegiance} → ${newAllegiance}(으)로 변경하시겠습니까? (2코인 → 재무부)`, label: `${target.name} 전향시키기`, color: '#a855f7', icon: RefreshCw };
                }
                return { title: '자기 전향 확인', message: '자신의 진영을 변경하시겠습니까? (1코인 → 재무부)', label: '전향하기', color: '#a855f7', icon: RefreshCw };
            case 'embezzlement':
                return { title: '횡령 확인', message: `재무부의 ${state.treasury ?? 0}코인을 횡령하시겠습니까? (도전 가능)`, label: '횡령하기', color: 'var(--gold)', icon: Banknote };
            case 'examine':
                return { title: '심문 확인', message: `${target?.name}의 카드를 심문하시겠습니까? (도전 가능)`, label: `${target?.name ?? ''} 심문하기`, color: '#5eead4', icon: Search };
            default:
                return { title: '확인', message: '이 행동을 선택하시겠습니까?', label: '확인', color: 'var(--gold)', icon: undefined as React.ElementType | undefined };
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
        setPendingActionType(null);
        setConfirmAction(null);
        setLoading(false);
    };

    const handleConfirmCancel = () => {
        // Only clear confirmAction — pendingActionType stays so TargetSelectModal re-appears
        setConfirmAction(null);
    };

    const useInquisitor = isReformation && state.useInquisitor;
    const visibleButtons = ACTION_BUTTONS.filter((a) => {
        if (mustCoup && a.type !== 'coup' && a.type !== 'conversion') return false;
        // reformation 전용 액션은 reformation 모드에서만
        if (a.row === 3 && !isReformation) return false;
        // reformation 모드에서 인퀴지터 미사용 시 examine 숨김
        if (a.type === 'examine' && (!isReformation || !state.useInquisitor)) return false;
        return true;
    }).map((a) => {
        // 인퀴지터 모드: 교환 버튼을 종교재판관 색상/설명으로 변경
        if (a.type === 'exchange' && useInquisitor) {
            return { ...a, desc: '카드 교환 (종교재판관, 도전 가능)', claimedChar: 'Inquisitor' as Character, variant: 'inquisitor' as ButtonVariant };
        }
        return a;
    });

    const row1 = visibleButtons.filter((a) => a.row === 1);
    const row2 = visibleButtons.filter((a) => a.row === 2);
    const row3 = visibleButtons.filter((a) => a.row === 3);

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

    return (
        <div className="space-y-3">
            {/* 타이머 바 */}
            {actionDeadline && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">남은 시간</span>
                        <span className={`font-bold tabular-nums ${isCritical ? 'text-red-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-text-muted'}`}>
                            {remainingSeconds}s
                        </span>
                    </div>
                    <div className="w-full h-1 bg-bg-surface rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-text-muted text-center mt-1">
                        {mustCoup ? '⏱ 시간 초과 시 자동 쿠데타' : '⏱ 시간 초과 시 자동 소득'}
                    </p>
                </div>
            )}

            {/* 전향 선택 모달 — 자기 전향 / 타인 전향 */}
            {showConversionChoice && !pendingActionType && !confirmAction && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-bg-card space-y-3">
                    <div className="text-center">
                        <h3 className="text-sm font-bold text-purple-300 mb-1">전향 대상 선택</h3>
                        <p className="text-xs text-text-muted">누구의 진영을 변경하시겠습니까?</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                setShowConversionChoice(false);
                                setConfirmAction({ type: 'conversion', targetId: '' });
                            }}
                            disabled={me.coins < 1 || loading}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            <User className="w-5 h-5 text-purple-400" />
                            <span className="text-xs font-bold text-text-primary">자기 전향</span>
                            <span className="text-[10px] text-text-muted">1코인 → 재무부</span>
                        </button>
                        <button
                            onClick={() => {
                                setShowConversionChoice(false);
                                setPendingActionType('conversion');
                            }}
                            disabled={me.coins < 2 || loading}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            <Users className="w-5 h-5 text-purple-400" />
                            <span className="text-xs font-bold text-text-primary">타인 전향</span>
                            <span className="text-[10px] text-text-muted">2코인 → 재무부</span>
                        </button>
                    </div>
                    <button
                        onClick={() => setShowConversionChoice(false)}
                        className="w-full text-xs text-text-muted hover:text-text-secondary py-1"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* Target Select Modal — shown when action requires target, hidden while ConfirmModal is open */}
            {pendingActionType && pendingActionDef && !confirmAction && (
                <TargetSelectModal
                    actionDef={pendingActionDef}
                    aliveOthers={aliveOthers}
                    isGuessMode={isGuessMode}
                    loading={loading}
                    onSelectTarget={handleTargetSelected}
                    onCancel={handleCancelTargetSelection}
                    myAllegiance={me.allegiance}
                    allSameAllegiance={isReformation ? aliveOthers.every((p) => p.allegiance === me.allegiance) : undefined}
                />
            )}

            {/* Confirm Modal */}
            {confirmModalNode}

            {/* 액션 버튼 — Row 1: 소득 / 해외원조 / 쿠데타 */}
            {row1.length > 0 && (
                <div className={mustCoup ? 'flex justify-center' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>
                    {row1.map((a) => {
                        const canAfford = a.cost ? me.coins >= a.cost : true;
                        const disabled = !canAfford || loading;
                        const Icon = a.icon;
                        const isCoup = a.variant === 'coup';

                        // mustCoup 시 쿠데타만 표시
                        if (mustCoup && !isCoup) return null;

                        const isMustCoupHighlight = mustCoup && isCoup;

                        return (
                            <button
                                key={a.type}
                                onClick={() => handleActionButtonClick(a.type, !!a.needsTarget)}
                                disabled={disabled}
                                className={`border transition-all disabled:opacity-40 active:scale-95 ${isMustCoupHighlight
                                        ? 'w-full flex flex-row items-center justify-center gap-3 py-5 px-8 rounded-2xl'
                                        : 'flex flex-col items-start p-1.5 sm:p-3 rounded-xl text-left'
                                    } ${disabled ? 'cursor-not-allowed' : ''} ${VARIANT_STYLES[a.variant]}`}
                                style={{
                                    ...(isCoup ? { backgroundColor: 'var(--gold)' } : {}),
                                    ...(isMustCoupHighlight ? {
                                        boxShadow: '0 0 0 2px var(--gold), 0 0 24px rgba(212,175,55,0.5)',
                                    } : {}),
                                }}
                            >
                                <Icon
                                    className={`shrink-0 ${VARIANT_ICON_COLORS[a.variant]} ${isMustCoupHighlight ? 'w-7 h-7' : 'w-4 h-4 sm:w-5 sm:h-5'
                                        }`}
                                />
                                <div className={isMustCoupHighlight ? 'flex flex-col items-start' : 'flex items-center gap-2 mb-1 w-full mt-1'}>
                                    <span
                                        className={`font-black ${isMustCoupHighlight
                                                ? 'text-lg text-bg-dark'
                                                : `text-xs sm:text-sm ${isCoup ? 'text-bg-dark' : 'text-text-primary'}`
                                            }`}
                                    >
                                        {a.label}
                                    </span>
                                    {isMustCoupHighlight && (
                                        <span className="text-[11px] text-bg-dark/70 font-medium">{a.desc}</span>
                                    )}
                                    {a.cost && !isMustCoupHighlight && (
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
                                {!isMustCoupHighlight && (
                                    <span
                                        className={`text-[10px] leading-tight line-clamp-2 ${isCoup ? 'text-bg-dark/70' : 'text-text-muted'
                                            }`}
                                    >
                                        {a.desc}
                                    </span>
                                )}
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
                                className={`flex flex-col items-start p-1.5 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${disabled ? 'cursor-not-allowed' : 'active:scale-95'
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

            {/* 액션 버튼 — Row 3: 종교개혁 전용 (전향 / 횡령 / 심문) */}
            {row3.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-purple-500/20" />
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">종교개혁</span>
                        <div className="h-px flex-1 bg-purple-500/20" />
                    </div>
                    {/* 재무부 코인 표시 */}
                    {isReformation && (
                        <div className="flex items-center justify-center gap-2 mb-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <Banknote size={14} className="text-purple-400" />
                            <span className="text-xs text-purple-300 font-bold">재무부: {state.treasury ?? 0}코인</span>
                        </div>
                    )}
                    <div className={`grid gap-2 ${row3.length === 3 ? 'grid-cols-3' : row3.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {row3.map((a) => {
                            const canAfford = a.cost ? me.coins >= a.cost : true;
                            const hasTreasury = a.type === 'embezzlement' ? (state.treasury ?? 0) > 0 : true;
                            const disabled = !canAfford || !hasTreasury || loading;
                            const Icon = a.icon;

                            return (
                                <button
                                    key={a.type}
                                    onClick={() => handleActionButtonClick(a.type, !!a.needsTarget)}
                                    disabled={disabled}
                                    className={`flex flex-col items-start p-1.5 sm:p-3 rounded-xl border transition-all text-left disabled:opacity-40 ${disabled ? 'cursor-not-allowed' : 'active:scale-95'
                                        } ${VARIANT_STYLES[a.variant]}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 w-full">
                                        <Icon
                                            className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${VARIANT_ICON_COLORS[a.variant]}`}
                                        />
                                        <span className="font-bold text-xs sm:text-sm text-text-primary truncate">
                                            {a.label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-text-muted leading-tight line-clamp-2">
                                        {a.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {mustCoup && (
                <div
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{
                        backgroundColor: 'rgba(212,175,55,0.12)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: 'var(--gold)',
                    }}
                >
                    <span>⚡</span>
                    코인 10개 이상 — 반드시 쿠데타를 해야 합니다
                </div>
            )}
        </div>
    );
}

export default memo(ActionPanel);
