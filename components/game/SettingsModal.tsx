'use client';

import { memo, useState, useEffect } from 'react';
import { Settings, RotateCcw, LogOut, X, Image as ImageIcon } from 'lucide-react';
import { FilteredGameState } from '@/lib/game/types';
import { clearActiveRoom } from '@/lib/storage';
import { getUISettings, updateUISetting } from '@/lib/settings';
import BottomSheet from '@/components/ui/BottomSheet';

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [restartLoading, setRestartLoading] = useState(false);
    const [restartError, setRestartError] = useState('');
    const [uiSettings, setUiSettings] = useState(getUISettings());

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

    const handleLeave = async () => {
        try {
            await fetch('/api/game/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId }),
            });
        } catch {
            // API 실패해도 나가기는 진행
        }
        clearActiveRoom();
        window.location.href = '/';
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        setDeleteError('');
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
                setDeleteError('방 삭제에 실패했습니다.');
            }
        } catch {
            setDeleteError('네트워크 오류가 발생했습니다.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <BottomSheet onClose={onClose} mobileMaxHeight="75vh">
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

                {/* UI 설정 */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                        UI 설정
                    </p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-bg-surface rounded-lg px-4 py-3 border border-border-subtle">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-bg-card border border-border-subtle text-text-secondary">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-primary">배경 이미지</span>
                                    <span className="text-[11px] text-text-muted">게임 배경에 은은한 메인 이미지 표시</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const next = !uiSettings.showBgImage;
                                    setUiSettings(updateUISetting('showBgImage', next));
                                }}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${uiSettings.showBgImage ? 'bg-gold' : 'bg-bg-card'
                                    }`}
                                role="switch"
                                aria-checked={uiSettings.showBgImage}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${uiSettings.showBgImage ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
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
                        {!showDeleteConfirm ? (
                            <button
                                className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-lg text-sm font-semibold transition-colors border border-red-500/50 text-red-400 hover:bg-red-500/10"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <LogOut className="w-4 h-4" />
                                방 없애기
                            </button>
                        ) : (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 mt-3 space-y-3">
                                <p className="text-xs text-red-300 text-center leading-relaxed">
                                    정말 방을 없애시겠습니까?<br />
                                    모든 플레이어가 튕겨 나갑니다.
                                </p>
                                {deleteError && (
                                    <p className="text-xs text-red-400 text-center">{deleteError}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-red-500/60 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                                        onClick={handleDelete}
                                        disabled={deleteLoading}
                                    >
                                        {deleteLoading ? '처리 중...' : '확인'}
                                    </button>
                                    <button
                                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border-subtle text-text-secondary hover:bg-bg-surface transition-colors"
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeleteError('');
                                        }}
                                        disabled={deleteLoading}
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
        </BottomSheet>
    );
}

export default memo(SettingsModal);
