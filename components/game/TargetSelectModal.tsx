'use client';

import { memo, useState } from 'react';
import { Coins, Crown, Crosshair, Anchor, Repeat, Zap, Shield, X } from 'lucide-react';
import { FilteredPlayer, Character, CHARACTER_NAMES, ActionType } from '@/lib/game/types';

type ButtonVariant = 'general' | 'duke' | 'assassin' | 'captain' | 'ambassador' | 'coup';

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
    const headerColor = VARIANT_TEXT_COLORS[actionDef.variant];
    const isCoupGuess = actionDef.type === 'coup' && isGuessMode;

    const canConfirm = selectedTargetId !== '' && (!isCoupGuess || selectedGuessChar !== null);

    const handleConfirm = () => {
        if (!canConfirm) return;
        onSelectTarget(selectedTargetId, selectedGuessChar ?? undefined);
    };

    const handleTargetClick = (playerId: string, isDisabled: boolean) => {
        if (isDisabled || loading) return;
        setSelectedTargetId(playerId);
        // If not coup-guess, we still wait for confirm button
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
            onClick={onCancel}
        >
            <div
                className="glass-panel max-w-[480px] w-full animate-slide-up rounded-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 영역 */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {/* 액션 아이콘 원형 배경 */}
                            <div
                                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${headerColor} 15%, transparent)`,
                                    border: `1.5px solid color-mix(in srgb, ${headerColor} 40%, transparent)`,
                                }}
                            >
                                <ActionIcon
                                    className="w-5 h-5"
                                    style={{ color: headerColor }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-base text-text-primary">{actionDef.label}</span>
                                    {/* 코스트 배지 */}
                                    {actionDef.cost && (
                                        <span
                                            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: 'rgba(200, 169, 96, 0.2)',
                                                color: 'var(--gold)',
                                                border: '1px solid rgba(200, 169, 96, 0.4)',
                                            }}
                                        >
                                            <Coins className="inline w-3 h-3 mr-0.5" />
                                            -{actionDef.cost}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted mt-0.5">{actionDef.desc}</p>
                                {/* 주장 캐릭터 */}
                                {actionDef.claimedChar && (
                                    <p className="text-xs mt-0.5" style={{ color: headerColor }}>
                                        {CHARACTER_NAMES[actionDef.claimedChar]} 주장
                                    </p>
                                )}
                            </div>
                        </div>
                        {/* 취소 버튼 */}
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-text-muted hover:text-text-primary border border-border-subtle hover:border-border-muted transition-all disabled:opacity-40 shrink-0"
                        >
                            <X size={12} />
                            취소
                        </button>
                    </div>

                    {/* 대상 선택 영역 */}
                    <div>
                        <p className="text-xs text-text-muted mb-2">대상을 선택하세요</p>
                        <div className="flex flex-wrap gap-2">
                            {aliveOthers.map((p) => {
                                const isSelected = selectedTargetId === p.id;
                                const isStealNoCoins = actionDef.type === 'steal' && p.coins === 0;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => handleTargetClick(p.id, isStealNoCoins)}
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
                                        <span
                                            className="text-xs font-semibold"
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

                    {/* guess 모드 쿠데타: 대상 선택 후 캐릭터 선택 */}
                    {isCoupGuess && selectedTargetId && (
                        <div className="mt-4">
                            <p className="text-xs text-text-muted mb-2">쿠데타 추측 캐릭터 선택</p>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_CHARACTERS.map((ch) => {
                                    const Icon = GUESS_CHAR_ICONS[ch];
                                    const isSelectedChar = selectedGuessChar === ch;
                                    return (
                                        <button
                                            key={ch}
                                            onClick={() => setSelectedGuessChar(isSelectedChar ? null : ch)}
                                            disabled={loading}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 ${
                                                isSelectedChar
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
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-2 px-5 pb-5">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border-subtle bg-bg-surface text-text-secondary hover:bg-border-subtle transition-all disabled:opacity-40"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || loading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1.5"
                        style={{
                            backgroundColor: canConfirm ? headerColor : undefined,
                            color: canConfirm ? 'var(--bg-dark)' : undefined,
                            borderColor: headerColor,
                            border: `1px solid ${headerColor}`,
                        }}
                    >
                        {loading ? (
                            '...'
                        ) : (
                            <>
                                <ActionIcon size={14} />
                                {actionDef.label} 확인
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(TargetSelectModal);
