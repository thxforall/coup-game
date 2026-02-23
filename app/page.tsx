'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skull, Play, Crown, Crosshair, Anchor, Repeat, Shield } from 'lucide-react';

function getOrCreatePlayerId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('coup_player_id');
    if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('coup_player_id', id);
    }
    return id;
}

const CHARACTERS = [
    { name: 'Duke', icon: Crown, color: 'var(--duke-color)' },
    { name: 'Assassin', icon: Crosshair, color: 'var(--assassin-color)' },
    { name: 'Captain', icon: Anchor, color: 'var(--captain-color)' },
    { name: 'Ambassador', icon: Repeat, color: 'var(--ambassador-color)' },
    { name: 'Contessa', icon: Shield, color: 'var(--contessa-color)' },
] as const;

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
        if (!playerName.trim()) return setError('Enter a nickname');
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
        if (!playerName.trim()) return setError('Enter a nickname');
        if (!joinCode.trim()) return setError('Enter a room code');
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
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-bg-dark">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
                <Skull size={48} className="text-gold mb-4" />
                <h1 className="font-sora text-5xl font-bold text-gold tracking-tight">COUP</h1>
                <p className="font-mono text-text-muted text-sm mt-2">Bluff. Deceive. Survive.</p>
            </div>

            {/* Lobby card */}
            <div className="glass-panel w-full max-w-[520px] p-8 animate-slide-up">
                {/* Nickname */}
                <div className="mb-5">
                    <label className="block text-xs text-text-muted mb-1 font-mono uppercase tracking-widest">
                        Nickname
                    </label>
                    <input
                        className="input-field"
                        placeholder="Your name in the game"
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
                            {t === 'create' ? 'Create Room' : 'Join Room'}
                        </button>
                    ))}
                </div>

                {/* Join code input */}
                {tab === 'join' && (
                    <div className="mb-5">
                        <label className="block text-xs text-text-muted mb-1 font-mono uppercase tracking-widest">
                            Room Code
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
                    {loading ? 'Loading...' : tab === 'create' ? 'Create Room' : 'Join Room'}
                </button>
            </div>

            {/* The Court */}
            <div className="mt-10 text-center">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">The Court</p>
                <div className="flex items-center gap-4">
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
