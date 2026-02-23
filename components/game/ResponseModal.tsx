'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { TriangleAlert, Zap, Shield, Check } from 'lucide-react';
import { FilteredGameState, Card, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES } from '@/lib/game/types';

interface Props {
    state: FilteredGameState;
    playerId: string;
    myCards: Card[];
    onAction: (action: object) => Promise<void>;
}

function ResponseModal({ state, playerId, myCards, onAction }: Props) {
    const [loading, setLoading] = useState(false);
    const [remainingMs, setRemainingMs] = useState(30000);

    const pending = state.pendingAction!;
    const actor = state.players.find((p) => p.id === pending.actorId);
    const isBlockPhase = state.phase === 'awaiting_block_response';
    const blocker = isBlockPhase ? state.players.find((p) => p.id === pending.blockerId) : null;
    const target = pending.targetId ? state.players.find((p) => p.id === pending.targetId) : null;

    // 내가 블록할 수 있는 캐릭터 (내가 가진 카드 기준이 아니라 블러핑도 가능)
    const blockableChars = BLOCK_CHARACTERS[pending.type] ?? [];
    // liveCards는 블록 가능 여부 UI에 활용할 수 있도록 유지
    const liveCards = myCards.filter((c) => !c.revealed);

    // 카운트다운 타이머
    useEffect(() => {
        if (!pending.responseDeadline) return;
        const update = () => {
            const left = Math.max(0, pending.responseDeadline! - Date.now());
            setRemainingMs(left);
        };
        update();
        const interval = setInterval(update, 100);
        return () => clearInterval(interval);
    }, [pending.responseDeadline]);

    const handleResponse = useCallback(async (response: string, character?: Character) => {
        if (loading) return;
        setLoading(true);
        await onAction({ type: 'respond', response, character });
        setLoading(false);
    }, [loading, onAction]);

    // 시간 초과 시 자동 패스
    useEffect(() => {
        if (remainingMs <= 0 && !loading) {
            handleResponse('pass');
        }
    }, [remainingMs, loading, handleResponse]);

    const totalSeconds = 30;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const progress = Math.max(0, remainingMs / (totalSeconds * 1000));
    const isUrgent = remainingSeconds <= 10;
    const isCritical = remainingSeconds <= 5;

    const timerBarColor = isCritical ? '#EF4444' : isUrgent ? '#F59E0B' : '#10B981';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 p-4">
            <div className="w-full max-w-[480px] mb-2 animate-slide-up">
                {/* 타이머 바 */}
                <div
                    className="w-full h-1 rounded-full mb-2 overflow-hidden"
                    style={{ backgroundColor: 'var(--border-subtle)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{ width: `${progress * 100}%`, backgroundColor: timerBarColor }}
                    />
                </div>

                {/* 모달 패널 */}
                <div
                    className="rounded-xl border border-border-subtle overflow-hidden"
                    style={{ backgroundColor: '#1A1A1A' }}
                >
                    {/* 상단 섹션: 경고 아이콘 + 타이머 + 제목 + 부제목 */}
                    <div className="flex flex-col items-center text-center px-6 pt-6 pb-5">
                        {/* 경고 아이콘 원형 배경 */}
                        <div
                            className="flex items-center justify-center w-12 h-12 rounded-full mb-3"
                            style={{
                                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                                border: '1.5px solid rgba(212, 175, 55, 0.35)',
                            }}
                        >
                            <TriangleAlert size={22} style={{ color: 'var(--gold, #D4AF37)' }} />
                        </div>

                        {/* 타이머 숫자 */}
                        <div className="flex items-baseline gap-1 mb-3">
                            <span
                                className={`font-sora font-black text-3xl tabular-nums ${isCritical ? 'animate-pulse' : ''}`}
                                style={{ color: timerBarColor }}
                            >
                                {remainingSeconds}
                            </span>
                            <span className="font-sora text-text-secondary text-sm">초</span>
                        </div>

                        {/* 타이틀 / 서브타이틀 */}
                        {isBlockPhase ? (
                            <>
                                <p className="font-sora font-black text-lg text-text-primary leading-snug">
                                    {CHARACTER_NAMES[pending.blockerCharacter!]}으로 막았습니다!
                                </p>
                                <p className="font-sora text-text-secondary text-sm mt-1">
                                    {blocker?.name}이(가) 블록했습니다 — 도전하거나 허용하세요
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-sora font-black text-lg text-text-primary leading-snug">
                                    {ACTION_NAMES[pending.type]}
                                </p>
                                <p className="font-sora text-text-secondary text-sm mt-1">
                                    {actor?.name}이(가) 선언했습니다
                                    {target ? ` — 대상: ${target.name}` : ' — 도전하거나 막으세요'}
                                </p>
                            </>
                        )}
                    </div>

                    {/* 버튼 섹션 */}
                    <div className="flex flex-col gap-2 px-6 pb-6">
                        {/* 도전 버튼 */}
                        <button
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-sm transition-opacity disabled:opacity-50"
                            style={{
                                backgroundColor: 'rgba(231, 76, 60, 0.15)',
                                border: '1px solid var(--red-light, #E74C3C)',
                                color: 'var(--red-light, #E74C3C)',
                            }}
                            onClick={() => handleResponse('challenge')}
                            disabled={loading}
                        >
                            <Zap size={16} />
                            {isBlockPhase
                                ? '블록에 도전! (블러프라고 생각해요)'
                                : '도전! (거짓말이라고 생각해요)'
                            }
                        </button>

                        {/* 블록 버튼들 (직접 액션 단계, 비대상자) */}
                        {!isBlockPhase && blockableChars.length > 0 && pending.targetId !== playerId && pending.actorId !== playerId && (
                            <>
                                {blockableChars.map((char) => (
                                    <button
                                        key={char}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-sm text-text-primary transition-opacity disabled:opacity-50"
                                        style={{
                                            backgroundColor: 'var(--bg-surface)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                        onClick={() => handleResponse('block', char)}
                                        disabled={loading}
                                    >
                                        <Shield size={16} />
                                        {CHARACTER_NAMES[char]}으로 막기
                                    </button>
                                ))}
                            </>
                        )}

                        {/* 블록 버튼들 (직접 액션 단계, 대상자) */}
                        {!isBlockPhase && blockableChars.length > 0 && pending.targetId === playerId && (
                            <>
                                {blockableChars.map((char) => (
                                    <button
                                        key={char}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-sm transition-opacity disabled:opacity-50"
                                        style={{
                                            backgroundColor: 'var(--bg-surface)',
                                            border: '1px solid rgba(212, 175, 55, 0.4)',
                                            color: 'var(--gold, #D4AF37)',
                                        }}
                                        onClick={() => handleResponse('block', char)}
                                        disabled={loading}
                                    >
                                        <Shield size={16} />
                                        {CHARACTER_NAMES[char]}으로 막기! (나를 향한 공격)
                                    </button>
                                ))}
                            </>
                        )}

                        {/* 패스 / 허용 버튼 */}
                        <button
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora text-sm text-text-secondary transition-opacity disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                            }}
                            onClick={() => handleResponse('pass')}
                            disabled={loading}
                        >
                            <Check size={16} />
                            패스 (허용)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(ResponseModal);
