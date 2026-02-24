'use client';

import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface Props {
    title: string;
    message: string;
    buttonLabel?: string;
    buttonColor?: string;
    onClose: () => void;
}

function AlertModal({ title, message, buttonLabel = '확인', buttonColor, onClose }: Props) {
    return (
        <BottomSheet onClose={onClose} mobileMaxHeight="40vh">
            <div className="px-5 py-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0" />
                    <h3 className="font-sora font-bold text-base text-text-primary">{title}</h3>
                </div>

                {/* Message */}
                <p className="text-sm text-text-secondary leading-relaxed">{message}</p>

                {/* Button */}
                <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{
                        backgroundColor: buttonColor ?? 'var(--gold)',
                        color: 'var(--bg-dark)',
                        border: `1px solid ${buttonColor ?? 'var(--gold)'}`,
                    }}
                >
                    {buttonLabel}
                </button>
            </div>
        </BottomSheet>
    );
}

export default memo(AlertModal);
