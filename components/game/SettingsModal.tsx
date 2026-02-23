'use client';

import { memo, useState } from 'react';
import { Settings, RotateCcw, LogOut, X } from 'lucide-react';
import { FilteredGameState } from '@/lib/game/types';
import { clearActiveRoom } from '@/lib/storage';

interface Props {
    state: FilteredGameState;
    playerId: string;
    roomId: string;
    onClose: () => void;
    onRestart: () => Promise<void>;
}

function SettingsModal({ state, playerId, roomId, onClose }: Props) {
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [restartLoading, setRestartLoading] = useState(false);
    const [restartError, setRestartError] = useState('');

    const isHost = state.players[0]?.id === playerId;
    const isGameOver = state.phase === 'game_over';
    const gameModeName = state.gameMode === 'guess' ? '추측 모드' : '스탠다드 모드';
    const gameModeDesc =
        state.gameMode === 'guess'
            ? '상대방의 카드를 추측하는 확장 규칙이 적용됩니다.'
            : '기본 쿠 규칙으로 진행됩니다.';

    const handleRestart = async () => {
        setRestartLoading(true);
        setRestartError('');
        try {
            const res = await fetch('/api/game/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, force: true }),
            });
            if (!res.ok) {
                const data = await res.json();
                setRestartError(data.error ?? '재시작에 실패했습니다');
            } else {
                onClose();
            }
        } catch {
            setRestartError('네트워크 오류가 발생했습니다');
        } finally {
            setRestartLoading(false);
        }
    };

    const handleLeave = () => {
        clearActiveRoom();
        window.location.href = '/';
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-sm animate-slide-up">
                <div className="glass-panel rounded-xl overflow-y-auto max-h-[85vh]">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-text-secondary" />
                            <span className="font-sora font-bold text-text-primary">설정</span>
                        </div>
                        <button
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                            onClick={onClose}
                            aria-label="닫기"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-5 py-4 space-y-5">
                        {/* 게임 모드 (읽기 전용) */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                                게임 모드
                            </p>
                            <div className="flex items-center gap-3 bg-bg-surface rounded-lg px-4 py-3 border border-border-subtle">
                                <span className="text-sm font-bold text-gold">{gameModeName}</span>
                                <span className="text-xs text-text-secondary">{gameModeDesc}</span>
                            </div>
                        </div>

                        {/* 게임 재시작 (호스트 전용) */}
                        {isHost && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                                    게임 관리
                                </p>
                                {!showRestartConfirm ? (
                                    <button
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                                        onClick={() => setShowRestartConfirm(true)}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        {isGameOver ? '다시 시작' : '게임 강제 재시작'}
                                    </button>
                                ) : (
                                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
                                        <p className="text-xs text-amber-300 text-center leading-relaxed">
                                            정말 게임을 재시작하시겠습니까?<br />
                                            모든 진행이 초기화됩니다.
                                        </p>
                                        {restartError && (
                                            <p className="text-xs text-red-400 text-center">{restartError}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-amber-500/60 text-amber-400 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                                                onClick={handleRestart}
                                                disabled={restartLoading}
                                            >
                                                {restartLoading ? '처리 중...' : '확인'}
                                            </button>
                                            <button
                                                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border-subtle text-text-secondary hover:bg-bg-surface transition-colors"
                                                onClick={() => {
                                                    setShowRestartConfirm(false);
                                                    setRestartError('');
                                                }}
                                                disabled={restartLoading}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 로비로 돌아가기 */}
                        <div>
                            {!isHost && (
                                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                                    게임 나가기
                                </p>
                            )}
                            {!showLeaveConfirm ? (
                                <button
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-bg-surface transition-colors"
                                    onClick={() => setShowLeaveConfirm(true)}
                                >
                                    <LogOut className="w-4 h-4" />
                                    로비로 돌아가기
                                </button>
                            ) : (
                                <div className="rounded-lg border border-border-subtle bg-bg-surface p-3 space-y-3">
                                    <p className="text-xs text-text-secondary text-center">
                                        방을 나가시겠습니까?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border-subtle text-text-primary hover:bg-bg-card transition-colors"
                                            onClick={handleLeave}
                                        >
                                            확인
                                        </button>
                                        <button
                                            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border-subtle text-text-secondary hover:bg-bg-card transition-colors"
                                            onClick={() => setShowLeaveConfirm(false)}
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 닫기 버튼 */}
                    <div className="px-5 pb-5">
                        <button
                            className="w-full py-2.5 rounded-lg text-sm text-text-muted hover:text-text-primary border border-border-subtle hover:bg-bg-surface transition-colors"
                            onClick={onClose}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(SettingsModal);
