'use client';

import { Skull, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <Skull className="w-16 h-16 text-text-muted" />
                        <span className="absolute -top-1 -right-1 text-2xl">❓</span>
                    </div>
                </div>

                <h1 className="text-3xl font-black mb-2 text-text-primary">404</h1>
                <p className="text-gold font-bold text-lg mb-1">페이지를 찾을 수 없습니다</p>
                <p className="text-text-secondary text-sm mb-6">
                    요청하신 페이지가 존재하지 않거나 이동되었습니다.
                </p>

                <a
                    href="/"
                    className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base"
                >
                    <Home size={18} />
                    로비로 돌아가기
                </a>
            </div>
        </div>
    );
}
