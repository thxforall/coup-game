'use client';

import { Skull, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <Skull className="w-16 h-16 text-contessa" />
                        <span className="absolute -top-1 -right-1 text-2xl">💥</span>
                    </div>
                </div>

                <h1 className="text-3xl font-black mb-2 text-text-primary">오류 발생</h1>
                <p className="text-contessa font-bold text-sm mb-1">
                    예기치 않은 문제가 발생했습니다
                </p>
                <p className="text-text-muted text-xs mb-6 break-all">
                    {error.message || '알 수 없는 오류'}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base"
                    >
                        <RotateCcw size={18} />
                        다시 시도
                    </button>
                    <a
                        href="/"
                        className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-sm"
                    >
                        <Home size={16} />
                        로비로 돌아가기
                    </a>
                </div>
            </div>
        </div>
    );
}
