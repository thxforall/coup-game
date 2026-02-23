'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skull, Play, Crown, Crosshair, Anchor, Repeat, Shield } from 'lucide-react';
import { getOrCreatePlayerId, getPlayerStorage, setPlayerStorage, getActiveRoom, clearActiveRoom } from '@/lib/storage';

const CHARACTERS = [
    { name: '공작', icon: Crown, color: 'var(--duke-color)' },
    { name: '암살자', icon: Crosshair, color: 'var(--assassin-color)' },
    { name: '사령관', icon: Anchor, color: 'var(--captain-color)' },
    { name: '대사', icon: Repeat, color: 'var(--ambassador-color)' },
    { name: '백작부인', icon: Shield, color: 'var(--contessa-color)' },
] as const;

export default function LobbyPage() {
    const router = useRouter();
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'create' | 'join'>('create');
    const [gameMode, setGameMode] = useState<'standard' | 'guess'>('standard');
    const [checkingRoom, setCheckingRoom] = useState(true);

    // 재접속: activeRoom이 있으면 유효성 확인 후 리다이렉트
    useEffect(() => {
        const activeRoom = getActiveRoom();
        if (!activeRoom) {
            setCheckingRoom(false);
            return;
        }
        const playerId = getOrCreatePlayerId();
        fetch(`/api/game/check?roomId=${activeRoom}&playerId=${playerId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.active) {
                    router.push(`/game/${activeRoom}`);
                } else {
                    clearActiveRoom();
                    setCheckingRoom(false);
                }
            })
            .catch(() => {
                clearActiveRoom();
                setCheckingRoom(false);
            });
    }, [router]);

    useEffect(() => {
        const saved = getPlayerStorage('coup_player_name');
        if (saved) setPlayerName(saved);
    }, []);

    const saveName = (name: string) => {
        setPlayerName(name);
        setPlayerStorage('coup_player_name', name);
    };

    const handleCreate = async () => {
        if (!playerName.trim()) return setError('닉네임을 입력해주세요');
        setLoading(true);
        setError('');
        const playerId = getOrCreatePlayerId();
        const res = await fetch('/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName: playerName.trim(), playerId, gameMode }),
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

    if (checkingRoom) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-bg-dark">
                <div className="text-center">
                    <Skull size={48} className="text-gold mb-4 mx-auto animate-pulse" />
                    <p className="text-text-muted text-sm font-mono">게임 확인 중...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-bg-dark">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
                <Skull size={48} className="text-gold mb-4" />
                <h1 className="font-sora text-4xl sm:text-5xl font-bold text-gold tracking-tight">COUP</h1>
                <p className="font-mono text-text-muted text-sm mt-2">거짓말과 심리전의 게임</p>
            </div>

            {/* Lobby card */}
            <div className="glass-panel w-full max-w-[520px] p-5 sm:p-8 animate-slide-up">
                {/* Nickname */}
                <div className="mb-5">
                    <label className="block text-xs text-text-muted mb-1 font-mono uppercase tracking-widest">
                        닉네임
                    </label>
                    <input
                        className="input-field"
                        placeholder="게임에서 사용할 닉네임"
                        value={playerName}
                        onChange={(e) => saveName(e.target.value)}
                        maxLength={12}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-5 p-1 bg-bg-surface rounded-lg">
                    {(['create', 'join'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                                tab === t
                                    ? 'bg-gold text-bg-dark shadow'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            {t === 'create' ? '방 만들기' : '방 참가'}
                        </button>
                    ))}
                </div>

                {/* Game mode selector (create only) */}
                {tab === 'create' && (
                    <div className="mb-5">
                        <label className="block text-xs text-text-muted mb-2 font-mono uppercase tracking-widest">
                            게임 모드
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setGameMode('standard')}
                                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${
                                    gameMode === 'standard'
                                        ? 'border-gold bg-gold/10 text-text-primary'
                                        : 'border-border-subtle bg-bg-surface text-text-muted hover:border-gold/50'
                                }`}
                            >
                                <div className="font-bold">Standard</div>
                                <div className="text-[10px] text-text-muted mt-0.5">기본 쿠데타 룰</div>
                            </button>
                            <button
                                onClick={() => setGameMode('guess')}
                                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${
                                    gameMode === 'guess'
                                        ? 'border-gold bg-gold/10 text-text-primary'
                                        : 'border-border-subtle bg-bg-surface text-text-muted hover:border-gold/50'
                                }`}
                            >
                                <div className="font-bold">Guess</div>
                                <div className="text-[10px] text-text-muted mt-0.5">쿠데타 시 카드 추측</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Join code input */}
                {tab === 'join' && (
                    <div className="mb-5">
                        <label className="block text-xs text-text-muted mb-1 font-mono uppercase tracking-widest">
                            방 코드
                        </label>
                        <input
                            className="input-field text-center text-xl font-mono font-bold tracking-[0.4em] uppercase"
                            placeholder="ABCD"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={4}
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center font-mono">
                        {error}
                    </div>
                )}

                {/* Action button */}
                <button
                    className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base"
                    onClick={tab === 'create' ? handleCreate : handleJoin}
                    disabled={loading}
                >
                    <Play size={18} />
                    {loading ? '처리 중...' : tab === 'create' ? '방 만들기' : '입장하기'}
                </button>
            </div>

            {/* The Court */}
            <div className="mt-10 text-center">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">캐릭터 소개</p>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                    {CHARACTERS.map(({ name, icon: Icon, color }) => (
                        <div key={name} className="flex flex-col items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
                            >
                                <Icon size={18} style={{ color }} />
                            </div>
                            <span className="font-mono text-[10px] text-text-muted">{name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
