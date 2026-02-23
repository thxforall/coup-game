'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getOrCreatePlayerId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('coup_player_id');
    if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('coup_player_id', id);
    }
    return id;
}

export default function LobbyPage() {
    const router = useRouter();
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'create' | 'join'>('create');

    useEffect(() => {
        const saved = localStorage.getItem('coup_player_name');
        if (saved) setPlayerName(saved);
    }, []);

    const saveName = (name: string) => {
        setPlayerName(name);
        localStorage.setItem('coup_player_name', name);
    };

    const handleCreate = async () => {
        if (!playerName.trim()) return setError('닉네임을 입력해주세요');
        setLoading(true);
        setError('');
        const playerId = getOrCreatePlayerId();
        const res = await fetch('/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName: playerName.trim(), playerId }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.error);
        router.push(`/game/${data.roomId}`);
    };

    const handleJoin = async () => {
        if (!playerName.trim()) return setError('닉네임을 입력해주세요');
        if (!joinCode.trim()) return setError('방 코드를 입력해주세요');
        setLoading(true);
        setError('');
        const playerId = getOrCreatePlayerId();
        const res = await fetch('/api/game/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: joinCode.trim().toUpperCase(), playerName: playerName.trim(), playerId }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.error);
        router.push(`/game/${joinCode.trim().toUpperCase()}`);
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
            {/* 타이틀 */}
            <div className="text-center mb-10">
                <div className="text-6xl mb-3">🃏</div>
                <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    COUP
                </h1>
                <p className="text-slate-400 mt-2 text-sm">거짓말과 심리전의 게임</p>
            </div>

            {/* 카드 */}
            <div className="glass-panel w-full max-w-sm p-6 animate-slide-up">
                {/* 닉네임 */}
                <div className="mb-5">
                    <label className="block text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">닉네임</label>
                    <input
                        className="input-field"
                        placeholder="게임에서 사용할 닉네임"
                        value={playerName}
                        onChange={(e) => saveName(e.target.value)}
                        maxLength={12}
                    />
                </div>

                {/* 탭 */}
                <div className="flex gap-2 mb-5 p-1 bg-white/5 rounded-xl">
                    {(['create', 'join'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t === 'create' ? '방 만들기' : '방 참가'}
                        </button>
                    ))}
                </div>

                {tab === 'join' && (
                    <div className="mb-4">
                        <label className="block text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">방 코드</label>
                        <input
                            className="input-field text-center text-xl font-bold tracking-[0.4em] uppercase"
                            placeholder="ABCD"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={4}
                        />
                    </div>
                )}

                {error && (
                    <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                <button
                    className="w-full py-3 rounded-xl font-bold text-base btn-primary"
                    onClick={tab === 'create' ? handleCreate : handleJoin}
                    disabled={loading}
                >
                    {loading ? '처리 중...' : tab === 'create' ? '방 만들기 🎮' : '입장하기 →'}
                </button>
            </div>

            <p className="mt-6 text-slate-600 text-xs text-center">
                2~6명 · 각자 기기로 접속 · 방 코드 공유
            </p>
        </main>
    );
}
