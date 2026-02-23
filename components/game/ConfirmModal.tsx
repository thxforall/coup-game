'use client';

import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

// CSS 변수나 hex 색상의 밝기를 판단하여 어두운 배경에 흰 텍스트 사용
const DARK_COLORS = ['var(--assassin)', 'var(--assassin-color)', '#2C3E50'];
function isDarkColor(color?: string): boolean {
    if (!color) return false;
    return DARK_COLORS.includes(color);
}

interface Props {
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    confirmIcon?: React.ElementType;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

function ConfirmModal({ title, message, confirmLabel, confirmColor, confirmIcon: ConfirmIcon, onConfirm, onCancel, loading }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
            <div className="glass-panel p-5 max-w-xs w-full animate-slide-up rounded-t-2xl sm:rounded-xl space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0" />
                    <h3 className="font-sora font-bold text-base text-text-primary">{title}</h3>
                </div>

                {/* Message */}
                <p className="text-sm text-text-secondary leading-relaxed">{message}</p>

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold border border-border-subtle bg-bg-surface text-text-secondary hover:bg-border-subtle transition-all disabled:opacity-40"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 active:scale-95 flex items-center justify-center gap-1.5"
                        style={{
                            backgroundColor: confirmColor ?? 'var(--gold)',
                            color: isDarkColor(confirmColor) ? '#FFFFFF' : 'var(--bg-dark)',
                            border: `1px solid ${confirmColor ?? 'var(--gold)'}`,
                        }}
                    >
                        {loading ? (
                            '...'
                        ) : (
                            <>
                                {ConfirmIcon && <ConfirmIcon size={14} strokeWidth={2.5} />}
                                {confirmLabel}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(ConfirmModal);
