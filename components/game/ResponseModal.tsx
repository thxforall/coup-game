'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { TriangleAlert, Zap, Shield, Check, Info } from 'lucide-react';
import { FilteredGameState, Card, Character, CHARACTER_NAMES, BLOCK_CHARACTERS, ACTION_NAMES, ActionType } from '@/lib/game/types';

// ============================================================
// 액션별 상세 컨텍스트 정보
// ============================================================
interface ActionContext {
    claimedRole: string | null;       // 주장하는 역할
    effect: string;                   // 행동의 효과
    blockInfo: string | null;         // 누가 막을 수 있는지
    challengeInfo: string;            // 도전 시 어떤 일이 벌어지는지
    passInfo: string;                 // 패스하면 어떤 일이 벌어지는지
}

const ACTION_CONTEXT: Record<ActionType, ActionContext> = {
    income: {
        claimedRole: null,
        effect: '코인 1개를 획득합니다.',
        blockInfo: null,
        challengeInfo: '소득은 도전/블록 없이 자동 진행됩니다.',
        passInfo: '소득은 자동 진행됩니다.',
    },
    foreignAid: {
        claimedRole: null,
        effect: '국고에서 코인 2개를 가져옵니다.',
        blockInfo: '🛡️ 공작을 가진 플레이어가 막을 수 있습니다.',
        challengeInfo: '외국 원조는 역할 주장이 아니므로 도전할 수 없고, 블록만 가능합니다.',
        passInfo: '패스하면 코인 2개를 획득합니다.',
    },
    coup: {
        claimedRole: null,
        effect: '7코인을 지불하고 대상의 카드 1장을 제거합니다.',
        blockInfo: null,
        challengeInfo: '쿠데타는 도전/블록 없이 자동 진행됩니다.',
        passInfo: '쿠데타는 자동 진행됩니다.',
    },
    tax: {
        claimedRole: '👑 공작 (Duke)',
        effect: '국고에서 코인 3개를 가져옵니다.',
        blockInfo: null,
        challengeInfo: '도전 성공 시: 공작이 아니면 행동이 취소되고 선언자가 카드를 잃습니다.\n도전 실패 시: 선언자가 진짜 공작이면 도전자가 카드를 잃습니다.',
        passInfo: '패스하면 코인 3개를 획득합니다.',
    },
    assassinate: {
        claimedRole: '🗡️ 암살자 (Assassin)',
        effect: '3코인을 지불하고 대상의 카드 1장을 제거합니다.',
        blockInfo: '🛡️ 대상이 백작부인을 주장하면 막을 수 있습니다.\n(막아도 지불한 3코인은 돌아오지 않습니다)',
        challengeInfo: '도전 성공 시: 암살자가 아니면 행동이 취소됩니다. (3코인은 돌아오지 않음)\n도전 실패 시: 도전자가 카드를 잃고 암살도 진행됩니다.',
        passInfo: '패스하면 대상이 카드 1장을 잃습니다.',
    },
    steal: {
        claimedRole: '⚔️ 사령관 (Captain)',
        effect: '대상 플레이어의 코인 2개를 빼앗습니다.',
        blockInfo: '🛡️ 대상이 사령관 또는 대사를 주장하면 막을 수 있습니다.',
        challengeInfo: '도전 성공 시: 사령관이 아니면 행동이 취소됩니다.\n도전 실패 시: 도전자가 카드를 잃고 갈취가 진행됩니다.',
        passInfo: '패스하면 코인 2개가 갈취됩니다.',
    },
    exchange: {
        claimedRole: '🕊️ 대사 (Ambassador)',
        effect: '덱에서 카드 2장을 보고, 원하는 카드를 선택해 교체합니다.',
        blockInfo: null,
        challengeInfo: '도전 성공 시: 대사가 아니면 행동이 취소되고 선언자가 카드를 잃습니다.\n도전 실패 시: 도전자가 카드를 잃고 교환이 진행됩니다.',
        passInfo: '패스하면 카드 교환이 진행됩니다.',
    },
};

// 블록 단계 컨텍스트
function getBlockContext(actionType: ActionType, blockerChar: Character): { effect: string; challengeInfo: string; passInfo: string } {
    const charName = CHARACTER_NAMES[blockerChar];
    const blockContextMap: Record<string, { effect: string; challengeInfo: string; passInfo: string }> = {
        Duke: {
            effect: `공작(${charName})으로 외국 원조를 차단합니다.`,
            challengeInfo: `도전 성공 시: 블로커가 공작이 아니면 블록이 무효화되고 블로커가 카드를 잃습니다.\n도전 실패 시: 블로커가 진짜 공작이면 도전자가 카드를 잃습니다.`,
            passInfo: '패스하면 외국 원조가 차단되어 코인을 받지 못합니다.',
        },
        Contessa: {
            effect: `백작부인(${charName})으로 암살을 차단합니다.`,
            challengeInfo: `도전 성공 시: 블로커가 백작부인이 아니면 블록이 무효화되고 암살이 진행됩니다.\n도전 실패 시: 도전자가 카드를 잃고 암살은 차단됩니다.`,
            passInfo: '패스하면 암살이 차단됩니다. (3코인은 돌아오지 않습니다)',
        },
        Captain: {
            effect: `사령관(${charName})으로 갈취를 차단합니다.`,
            challengeInfo: `도전 성공 시: 블로커가 사령관이 아니면 블록이 무효화되고 갈취가 진행됩니다.\n도전 실패 시: 도전자가 카드를 잃고 갈취는 차단됩니다.`,
            passInfo: '패스하면 갈취가 차단됩니다.',
        },
        Ambassador: {
            effect: `대사(${charName})로 갈취를 차단합니다.`,
            challengeInfo: `도전 성공 시: 블로커가 대사가 아니면 블록이 무효화되고 갈취가 진행됩니다.\n도전 실패 시: 도전자가 카드를 잃고 갈취는 차단됩니다.`,
            passInfo: '패스하면 갈취가 차단됩니다.',
        },
        Assassin: {
            effect: '',
            challengeInfo: '',
            passInfo: '',
        },
    };
    return blockContextMap[blockerChar] || { effect: '', challengeInfo: '', passInfo: '' };
}

interface Props {
    state: FilteredGameState;
    playerId: string;
    myCards: Card[];
    onAction: (action: object) => Promise<void>;
}

function ResponseModal({ state, playerId, myCards, onAction }: Props) {
    const [loading, setLoading] = useState(false);
    const [remainingMs, setRemainingMs] = useState(30000);
    const [showDetail, setShowDetail] = useState(false);

    const pending = state.pendingAction!;
    const actor = state.players.find((p) => p.id === pending.actorId);
    const isBlockPhase = state.phase === 'awaiting_block_response';
    const blocker = isBlockPhase ? state.players.find((p) => p.id === pending.blockerId) : null;
    const target = pending.targetId ? state.players.find((p) => p.id === pending.targetId) : null;

    const blockableChars = BLOCK_CHARACTERS[pending.type] ?? [];
    const liveCards = myCards.filter((c) => !c.revealed);

    // 컨텍스트 정보
    const actionCtx = ACTION_CONTEXT[pending.type];
    const blockCtx = isBlockPhase && pending.blockerCharacter
        ? getBlockContext(pending.type, pending.blockerCharacter)
        : null;

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

    // 자동 패스 이중 호출 방지
    const autoPassSent = useRef(false);

    // responseDeadline이 변경되면 (새 라운드) 플래그 리셋
    useEffect(() => {
        autoPassSent.current = false;
    }, [pending.responseDeadline]);

    // 시간 초과 시 자동 패스
    useEffect(() => {
        if (remainingMs <= 0 && !loading && !autoPassSent.current) {
            autoPassSent.current = true;
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
                    className="rounded-xl border border-border-subtle overflow-y-auto max-h-[80vh]"
                    style={{ backgroundColor: '#1A1A1A' }}
                >
                    {/* 상단 섹션: 경고 아이콘 + 타이머 + 제목 + 부제목 */}
                    <div className="flex flex-col items-center text-center px-4 sm:px-6 pt-6 pb-4">
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

                    {/* 내 카드 상태 */}
                    <div className="px-4 sm:px-6 pb-3">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                            {myCards.map((card, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${card.revealed ? 'opacity-40' : ''}`}
                                    style={{
                                        backgroundColor: 'var(--bg-surface, #242424)',
                                        border: `1px solid ${card.revealed ? 'var(--border-subtle, #333)' : 'var(--border-subtle, #444)'}`,
                                    }}
                                >
                                    {/* 카드 이미지 미니 */}
                                    <div
                                        className={`relative w-8 h-11 rounded overflow-hidden shrink-0 ${card.revealed ? 'grayscale' : ''}`}
                                    >
                                        <img
                                            src={`/cards/${card.character.toLowerCase()}.jpg`}
                                            alt={CHARACTER_NAMES[card.character]}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-semibold ${card.revealed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                                            {CHARACTER_NAMES[card.character]}
                                        </span>
                                        {card.revealed ? (
                                            <span className="text-[10px] text-red-400">제거됨</span>
                                        ) : (
                                            <span className="text-[10px] text-emerald-400">생존</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 액션 설명 섹션 */}
                    <div className="px-4 sm:px-6 pb-4">
                        <div
                            className="rounded-lg overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-surface, #242424)', border: '1px solid var(--border-subtle, #333)' }}
                        >
                            {/* 요약 정보 (항상 표시) */}
                            <div className="p-3 space-y-1.5">
                                {/* 주장하는 역할 */}
                                {!isBlockPhase && actionCtx.claimedRole && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-[11px] text-text-secondary shrink-0 w-14">역할 주장</span>
                                        <span className="text-[12px] text-text-primary font-semibold">{actionCtx.claimedRole}</span>
                                    </div>
                                )}
                                {/* 효과 */}
                                <div className="flex items-start gap-2">
                                    <span className="text-[11px] text-text-secondary shrink-0 w-14">효과</span>
                                    <span className="text-[12px] text-text-primary">
                                        {isBlockPhase && blockCtx ? blockCtx.effect : actionCtx.effect}
                                    </span>
                                </div>
                                {/* 블록 가능 여부 (액션 단계만) */}
                                {!isBlockPhase && actionCtx.blockInfo && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-[11px] text-text-secondary shrink-0 w-14">방어</span>
                                        <span className="text-[12px] text-text-primary">{actionCtx.blockInfo}</span>
                                    </div>
                                )}
                            </div>

                            {/* 상세 보기 토글 */}
                            <button
                                onClick={() => setShowDetail(!showDetail)}
                                className="w-full flex items-center justify-center gap-1 py-2 text-text-secondary hover:text-text-primary transition-colors"
                                style={{ borderTop: '1px solid var(--border-subtle, #333)' }}
                            >
                                <Info size={12} />
                                <span className="text-[11px]">{showDetail ? '간략히 보기' : '도전/패스하면?'}</span>
                            </button>

                            {/* 상세 정보 (펼치기) */}
                            {showDetail && (
                                <div
                                    className="p-3 space-y-2"
                                    style={{ borderTop: '1px solid var(--border-subtle, #333)' }}
                                >
                                    <div>
                                        <span className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--red-light, #E74C3C)' }}>⚡ 도전 시</span>
                                        <p className="text-[11px] text-text-secondary whitespace-pre-line leading-relaxed">
                                            {isBlockPhase && blockCtx ? blockCtx.challengeInfo : actionCtx.challengeInfo}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold block mb-1 text-text-secondary">✋ 패스 시</span>
                                        <p className="text-[11px] text-text-secondary whitespace-pre-line leading-relaxed">
                                            {isBlockPhase && blockCtx ? blockCtx.passInfo : actionCtx.passInfo}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 버튼 섹션 */}
                    <div className="flex flex-col gap-2 px-4 sm:px-6 pb-6">
                        {/* 도전 버튼 */}
                        <button
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-xs sm:text-sm transition-opacity disabled:opacity-50"
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
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-xs sm:text-sm text-text-primary transition-opacity disabled:opacity-50"
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
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora font-semibold text-xs sm:text-sm transition-opacity disabled:opacity-50"
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
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-sora text-xs sm:text-sm text-text-secondary transition-opacity disabled:opacity-50"
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
