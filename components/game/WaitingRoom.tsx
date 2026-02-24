'use client';

import { FilteredGameState } from '@/lib/game/types';
import { PresenceMap } from '@/lib/firebase.client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Skull, Copy, Check, Crown, Play, CheckCircle2, Circle, X, BookOpen, Home, LogOut } from 'lucide-react';
import { clearActiveRoom } from '@/lib/storage';
import ConfirmModal from '@/components/game/ConfirmModal';
import AlertModal from '@/components/ui/AlertModal';

const GameRulesModal = dynamic(() => import('./GameRulesModal'), { ssr: false });
import BgmPlayer from './BgmPlayer';

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onStart: () => void;
    onKick: (targetId: string) => void;
    onReady: () => void;
    onLeave: () => void;
    presence?: PresenceMap;
}

type ConfirmAction =
    | { type: 'kick'; targetId: string; targetName: string }
    | { type: 'leave' }
    | { type: 'delete' };

export default function WaitingRoom({ state, playerId, roomId, onStart, onKick, onReady, onLeave, presence }: Props) {
    const [copied, setCopied] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const isHost = state.players[0]?.id === playerId;

    const currentPlayer = state.players.find((p) => p.id === playerId);
    const isReady = currentPlayer?.isReady ?? false;

    const allNonHostReady = state.players.length >= 2 && state.players.slice(1).every((p) => p.isReady);

    const copyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleKick = (targetId: string, targetName: string) => {
        setConfirmAction({ type: 'kick', targetId, targetName });
    };

    const handleConfirm = async () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'kick') {
            onKick(confirmAction.targetId);
            setConfirmAction(null);
        } else if (confirmAction.type === 'leave') {
            setConfirmAction(null);
            onLeave();
        } else if (confirmAction.type === 'delete') {
            setDeleteLoading(true);
            try {
                const res = await fetch('/api/game/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, playerId }),
                });
                if (res.ok) {
                    clearActiveRoom();
                    window.location.href = '/';
                } else {
                    setDeleteLoading(false);
                    setConfirmAction(null);
                    setAlertMessage('방 삭제에 실패했습니다.');
                }
            } catch (e) {
                console.error(e);
                setDeleteLoading(false);
                setConfirmAction(null);
                setAlertMessage('방 삭제에 실패했습니다.');
            }
        }
    };

    const getConfirmProps = () => {
        if (!confirmAction) return null;
        if (confirmAction.type === 'kick') {
            return {
                title: '플레이어 추방',
                message: `${confirmAction.targetName}을(를) 방에서 추방하시겠습니까?`,
                confirmLabel: '추방',
                confirmColor: 'var(--assassin)',
            };
        }
        if (confirmAction.type === 'leave') {
            return {
                title: '방 나가기',
                message: '방을 나가시겠습니까?',
                confirmLabel: '나가기',
                confirmColor: undefined,
            };
        }
        if (confirmAction.type === 'delete') {
            return {
                title: '방 없애기',
                message: '방을 정말 없애시겠습니까? 모든 플레이어가 튕겨 나갑니다.',
                confirmLabel: '없애기',
                confirmColor: 'var(--assassin)',
            };
        }
        return null;
    };

    const confirmProps = getConfirmProps();

    const startButtonLabel = () => {
        if (state.players.length < 2) return '최소 2명 필요';
        if (!allNonHostReady) return '모두 준비 대기 중';
        return '게임 시작';
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative">
            {/* Header controls left */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <button
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors flex items-center gap-2 text-sm"
                    onClick={() => setConfirmAction({ type: 'leave' })}
                    aria-label="로비로 이동"
                >
                    <Home size={18} />
                    <span className="hidden sm:inline">로비로</span>
                </button>
            </div>

            {/* Header controls right */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <BgmPlayer />
            </div>

            <div className="glass-panel w-full max-w-lg p-5 sm:p-8 animate-slide-up">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <Skull size={32} className="text-gold mb-3" />
                    <h1 className="font-sora text-3xl sm:text-4xl font-bold text-gold tracking-tight">COUP</h1>
                    <p className="font-mono text-text-muted text-sm mt-1">거짓말과 심리전의 게임</p>
                </div>

                {/* Room code */}
                <div className="text-center mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-2 font-mono">방 코드</p>
                    <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest text-text-primary mb-4">
                        {roomId}
                    </div>
                    <button className="btn-ghost flex items-center gap-2 mx-auto px-5 py-2 text-sm" onClick={copyCode}>
                        {copied ? (
                            <>
                                <Check size={15} />
                                <span>복사됨</span>
                            </>
                        ) : (
                            <>
                                <Copy size={15} />
                                <span>코드 복사</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Game mode badge */}
                {state.gameMode && state.gameMode !== 'standard' && (
                    <div className="flex justify-center mb-4">
                        <span className="text-xs font-mono px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
                            Guess 모드 — 쿠데타 시 카드 추측
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-border-subtle mb-6" />

                {/* Player list */}
                <div className="mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">
                        참가자 ({state.players.length}/6)
                    </p>
                    <ul className="space-y-3">
                        {state.players.map((p, i) => (
                            <li key={p.id} className="flex items-center gap-2 sm:gap-3">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center text-sm font-bold text-text-primary shrink-0">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Presence dot */}
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${presence?.[p.id]?.online ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
                                    }`} />

                                <span className="font-semibold text-text-primary flex-1 truncate">{p.name}</span>

                                {/* Ready status icon (방장 제외) */}
                                {i !== 0 && (
                                    p.isReady ? (
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <Circle size={16} className="text-gray-500 shrink-0" />
                                    )
                                )}

                                {/* Host badge */}
                                {i === 0 && (
                                    <Crown size={15} className="text-gold shrink-0" />
                                )}

                                {/* Me badge */}
                                {p.id === playerId && (
                                    <span
                                        className="text-xs font-mono px-2 py-0.5 rounded-full border shrink-0"
                                        style={{
                                            color: 'var(--gold)',
                                            borderColor: 'var(--gold)',
                                            backgroundColor: 'rgba(200, 169, 96, 0.08)',
                                        }}
                                    >
                                        나
                                    </span>
                                )}

                                {/* Kick button (방장 시점, 자신 제외) */}
                                {isHost && p.id !== playerId && (
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                                        onClick={() => handleKick(p.id, p.name)}
                                        title={`${p.name} 추방`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Start / waiting / ready */}
                {isHost ? (
                    <div className="flex gap-2">
                        <button
                            className="btn-gold flex-1 py-3 flex items-center justify-center gap-2 text-base transition-all"
                            onClick={onStart}
                            disabled={state.players.length < 2 || !allNonHostReady}
                        >
                            <Play size={18} />
                            {startButtonLabel()}
                        </button>
                        <button
                            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                            onClick={() => setConfirmAction({ type: 'delete' })}
                            title="방 없애기"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            className={`w-full py-3 flex items-center justify-center gap-2 text-base transition-colors ${isReady
                                ? 'bg-red-600 hover:bg-red-700 text-white btn font-bold shadow-lg'
                                : 'bg-green-600 hover:bg-green-700 text-white btn font-bold shadow-lg'
                                }`}
                            onClick={onReady}
                        >
                            {isReady ? (
                                <>
                                    <CheckCircle2 size={18} />
                                    준비 취소
                                </>
                            ) : (
                                <>
                                    <Circle size={18} />
                                    준비 완료
                                </>
                            )}
                        </button>
                        <button
                            className="btn-ghost w-full py-2.5 flex items-center justify-center gap-2 text-sm border border-border-subtle mt-3 text-text-secondary hover:text-red-400 hover:border-red-500/30"
                            onClick={() => setConfirmAction({ type: 'leave' })}
                        >
                            <LogOut size={16} />
                            방 나가기
                        </button>
                    </>
                )}

                {/* 게임 규칙 버튼 */}
                <button
                    className="btn-ghost w-full py-2.5 flex items-center justify-center gap-2 text-sm border border-border-subtle mt-3"
                    onClick={() => setShowRules(true)}
                >
                    <BookOpen size={16} />
                    게임 규칙
                </button>
            </div>

            {/* 게임 규칙 모달 */}
            {showRules && <GameRulesModal onClose={() => setShowRules(false)} />}

            {/* 확인 모달 */}
            {confirmAction && confirmProps && (
                <ConfirmModal
                    title={confirmProps.title}
                    message={confirmProps.message}
                    confirmLabel={confirmProps.confirmLabel}
                    confirmColor={confirmProps.confirmColor}
                    onConfirm={handleConfirm}
                    onCancel={() => setConfirmAction(null)}
                    loading={deleteLoading}
                />
            )}

            {/* 알림 모달 */}
            {alertMessage && (
                <AlertModal
                    title="오류"
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
}
