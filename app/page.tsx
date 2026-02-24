'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skull, Play, Crown, Crosshair, Anchor, Repeat, Shield, BookOpen, Github, Users, RefreshCw, LogIn } from 'lucide-react';
import { getOrCreatePlayerId, getPlayerStorage, setPlayerStorage, getActiveRoom, clearActiveRoom } from '@/lib/storage';
import BgmPlayer from '@/components/game/BgmPlayer';

type RuleTab = 'basic' | 'action' | 'character' | 'challenge';

interface RoomListItem {
    roomId: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    gameMode: string;
    createdAt: number;
    status: 'waiting' | 'playing';
    alivePlayers?: number;
}

export default function LobbyPage() {
    const router = useRouter();
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'create' | 'join' | 'rooms'>('create');
    const [gameMode, setGameMode] = useState<'standard' | 'guess' | 'reformation'>('standard');
    const [useInquisitor, setUseInquisitor] = useState(true);
    const [checkingRoom, setCheckingRoom] = useState(true);
    const [ruleTab, setRuleTab] = useState<RuleTab>('basic');
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(false);

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

    // 방 목록 폴링 (rooms 탭일 때만)
    useEffect(() => {
        if (tab !== 'rooms') return;

        const fetchRooms = async () => {
            setRoomsLoading(true);
            try {
                const res = await fetch('/api/game/list');
                if (res.ok) {
                    const data = await res.json();
                    setRooms(data);
                }
            } catch {
                // silent fail
            } finally {
                setRoomsLoading(false);
            }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    }, [tab]);

    const handleJoinRoom = async (roomId: string) => {
        if (!playerName.trim()) return setError('닉네임을 입력해주세요');
        setLoading(true);
        setError('');
        const playerId = getOrCreatePlayerId();
        const res = await fetch('/api/game/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerName: playerName.trim(), playerId }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.error);
        router.push(`/game/${roomId}`);
    };

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
            body: JSON.stringify({
                playerName: playerName.trim(),
                playerId,
                gameMode,
                ...(gameMode === 'reformation' && { useInquisitor }),
            }),
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
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Skull size={48} className="text-gold mb-4 mx-auto animate-pulse" />
                    <p className="text-text-muted text-sm font-mono">게임 확인 중...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-x-hidden overflow-y-auto">
            {/* Header controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <BgmPlayer />
            </div>

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
                <Skull size={48} className="text-gold mb-3" />
                <h1 className="font-sora text-4xl sm:text-5xl font-bold text-gold tracking-tight">COUP</h1>
                <p className="font-mono text-text-muted text-sm mt-1">거짓말과 심리전의 게임</p>
            </div>

            {/* Lobby card */}
            <div className="glass-panel w-full max-w-[500px] p-6 sm:p-8 animate-slide-up mb-10">
                {/* Nickname */}
                <div className="mb-5">
                    <label className="block text-xs text-text-muted mb-1.5 font-mono uppercase tracking-widest">
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
                    {(['create', 'join', 'rooms'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t
                                ? 'bg-gold text-bg-dark shadow'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            {t === 'create' ? '방 만들기' : t === 'join' ? '방 참가' : '방 목록'}
                        </button>
                    ))}
                </div>

                {/* Game mode selector (create only) */}
                {tab === 'create' && (
                    <div className="mb-5">
                        <label className="block text-xs text-text-muted mb-2 font-mono uppercase tracking-widest">
                            게임 모드
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setGameMode('standard')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${gameMode === 'standard'
                                    ? 'border-gold bg-gold/10 text-text-primary'
                                    : 'border-border-subtle bg-bg-surface text-text-muted hover:border-gold/50'
                                    }`}
                            >
                                <div className="font-bold">Standard</div>
                                <div className="text-[10px] text-text-muted mt-0.5">기본 룰</div>
                            </button>
                            <button
                                onClick={() => setGameMode('guess')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${gameMode === 'guess'
                                    ? 'border-gold bg-gold/10 text-text-primary'
                                    : 'border-border-subtle bg-bg-surface text-text-muted hover:border-gold/50'
                                    }`}
                            >
                                <div className="font-bold">Guess</div>
                                <div className="text-[10px] text-text-muted mt-0.5">카드 추측</div>
                            </button>
                            <button
                                onClick={() => setGameMode('reformation')}
                                className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left ${gameMode === 'reformation'
                                    ? 'border-purple-500 bg-purple-500/10 text-text-primary'
                                    : 'border-border-subtle bg-bg-surface text-text-muted hover:border-purple-500/50'
                                    }`}
                            >
                                <div className="font-bold">종교개혁</div>
                                <div className="text-[10px] text-text-muted mt-0.5">확장판</div>
                            </button>
                        </div>

                        {/* 종교개혁 서브 옵션 */}
                        {gameMode === 'reformation' && (
                            <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-purple-300">종교재판관 사용</div>
                                        <div className="text-[10px] text-text-muted mt-0.5">대사 대신 종교재판관 (심문 + 1장 교환)</div>
                                    </div>
                                    <button
                                        onClick={() => setUseInquisitor(!useInquisitor)}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${useInquisitor ? 'bg-purple-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${useInquisitor ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="mt-2 text-[10px] text-text-muted space-y-1">
                                    <p>• 진영 시스템: 충성파 vs 개혁파</p>
                                    <p>• 같은 진영 공격 불가</p>
                                    <p>• 전향/횡령 액션 추가</p>
                                    <p>• 최대 10인 지원</p>
                                </div>
                            </div>
                        )}
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

                {/* Room list */}
                {tab === 'rooms' && (
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs text-text-muted font-mono uppercase tracking-widest">
                                방 목록
                            </label>
                            <button
                                onClick={async () => {
                                    setRoomsLoading(true);
                                    try {
                                        const res = await fetch('/api/game/list');
                                        if (res.ok) setRooms(await res.json());
                                    } catch { /* silent */ } finally {
                                        setRoomsLoading(false);
                                    }
                                }}
                                className="text-text-muted hover:text-gold transition-colors"
                                disabled={roomsLoading}
                            >
                                <RefreshCw size={14} className={roomsLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {roomsLoading && rooms.length === 0 ? (
                                <div className="text-center py-8 text-text-muted text-sm font-mono">
                                    로딩 중...
                                </div>
                            ) : rooms.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users size={32} className="text-text-muted mx-auto mb-3 opacity-50" />
                                    <p className="text-text-muted text-sm">열려있는 방이 없습니다</p>
                                    <button
                                        onClick={() => setTab('create')}
                                        className="text-gold text-xs mt-2 hover:underline font-medium"
                                    >
                                        방 만들기
                                    </button>
                                </div>
                            ) : (
                                rooms.map((room) => (
                                    <div
                                        key={room.roomId}
                                        className={`bg-bg-surface border border-border-subtle rounded-lg p-3 flex items-center justify-between gap-3 ${room.status === 'playing' ? 'opacity-70' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-text-primary truncate">
                                                    {room.hostName}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${room.gameMode === 'guess'
                                                        ? 'bg-violet-500/20 text-violet-300'
                                                        : room.gameMode === 'reformation'
                                                            ? 'bg-purple-500/20 text-purple-300'
                                                            : 'bg-gold/20 text-gold'
                                                    }`}>
                                                    {room.gameMode === 'guess' ? 'Guess' : room.gameMode === 'reformation' ? '종교개혁' : 'Standard'}
                                                </span>
                                                {room.status === 'waiting' ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 bg-emerald-500/20 text-emerald-300">
                                                        대기 중
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 bg-orange-500/20 text-orange-300">
                                                        게임 중
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-text-muted">
                                                <span className="font-mono">{room.roomId}</span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={11} />
                                                    {room.status === 'playing' && room.alivePlayers !== undefined
                                                        ? `생존 ${room.alivePlayers}/${room.playerCount}`
                                                        : `${room.playerCount}/${room.maxPlayers}`}
                                                </span>
                                            </div>
                                        </div>
                                        {room.status === 'waiting' ? (
                                            <button
                                                onClick={() => handleJoinRoom(room.roomId)}
                                                disabled={loading}
                                                className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1 shrink-0"
                                            >
                                                <LogIn size={12} />
                                                입장
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-text-muted font-mono shrink-0">
                                                게임 중
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center font-mono">
                        {error}
                    </div>
                )}

                {/* Action button (create/join only) */}
                {tab !== 'rooms' && (
                    <button
                        className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-base"
                        onClick={tab === 'create' ? handleCreate : handleJoin}
                        disabled={loading}
                    >
                        <Play size={18} />
                        {loading ? '처리 중...' : tab === 'create' ? '방 만들기' : '입장하기'}
                    </button>
                )}
            </div>

            {/* Game Rules Section */}
            <div className="w-full max-w-[500px] animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <BookOpen size={16} className="text-gold" />
                    <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest font-mono">게임 규칙</h2>
                </div>

                <div className="glass-panel overflow-hidden">
                    {/* Inner Tabs */}
                    <div className="flex border-b border-border-subtle bg-bg-surface/30">
                        {(['basic', 'action', 'character', 'challenge'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setRuleTab(t)}
                                className={`flex-1 py-3 text-[10px] font-bold transition-colors uppercase tracking-tight ${ruleTab === t
                                    ? 'text-gold border-b-2 border-gold -mb-[1px] bg-gold/5'
                                    : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                {t === 'basic' ? '기본' : t === 'action' ? '일반액션' : t === 'character' ? '캐릭터' : '도전/블록'}
                            </button>
                        ))}
                    </div>

                    {/* Rule Content */}
                    <div className="p-5 min-h-[160px]">
                        {ruleTab === 'basic' && (
                            <ul className="space-y-2.5 text-xs text-text-secondary leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                                <li className="flex gap-2">
                                    <span className="text-gold shrink-0">•</span>
                                    <span>각 플레이어는 <span className="text-text-primary font-medium">카드 2장, 코인 2개</span>로 시작</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-gold shrink-0">•</span>
                                    <span>마지막까지 살아남는 플레이어가 승리</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-gold shrink-0">•</span>
                                    <span>카드 2장 모두 공개되면 <span className="text-red-400">탈락</span></span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-gold shrink-0">•</span>
                                    <span><span className="text-amber-400 font-medium">10코인</span> 이상이면 반드시 쿠데타를 실행</span>
                                </li>
                            </ul>
                        )}

                        {ruleTab === 'action' && (
                            <div className="space-y-3 text-xs text-text-secondary animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-start gap-4">
                                    <span className="text-gold font-bold shrink-0 w-12">소득</span>
                                    <span>+1 코인 <span className="text-[10px] text-text-muted">(막기/도전 불가)</span></span>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-gold font-bold shrink-0 w-12">해외원조</span>
                                    <span>+2 코인 <span className="text-[10px] text-text-muted">(공작이 차단 가능)</span></span>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-gold font-bold shrink-0 w-12">쿠데타</span>
                                    <span>7코인 지불, 상대 카드 1장 제거 <span className="text-[10px] text-text-muted">(절대 방어 불가)</span></span>
                                </div>
                            </div>
                        )}

                        {ruleTab === 'character' && (
                            <div className="grid grid-cols-1 gap-3 text-[11px] animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                        <Crown size={12} className="text-violet-400" />
                                    </div>
                                    <span className="text-violet-400 font-bold w-12">공작</span>
                                    <span className="text-text-secondary">세금징수(+3코인) / 해외원조 차단</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
                                        <Crosshair size={12} className="text-slate-300" />
                                    </div>
                                    <span className="text-slate-300 font-bold w-12">암살자</span>
                                    <span className="text-text-secondary">3코인으로 암살 (상대 카드 제거)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Anchor size={12} className="text-blue-400" />
                                    </div>
                                    <span className="text-blue-400 font-bold w-12">사령관</span>
                                    <span className="text-text-secondary">갈취(상대 2코인 탈취) / 갈취 차단</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <Repeat size={12} className="text-emerald-400" />
                                    </div>
                                    <span className="text-emerald-400 font-bold w-12">대사</span>
                                    <span className="text-text-secondary">교환(덱과 카드 교체) / 갈취 차단</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <Shield size={12} className="text-red-400" />
                                    </div>
                                    <span className="text-red-400 font-bold w-12">백작부인</span>
                                    <span className="text-text-secondary">암살 차단</span>
                                </div>
                            </div>
                        )}

                        {ruleTab === 'challenge' && (
                            <div className="space-y-4 text-xs text-text-secondary leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                                <div>
                                    <div className="text-text-primary font-bold mb-1 flex items-center gap-1.5">
                                        도전 (Challenge)
                                    </div>
                                    <p>상대가 행동할 때 해당 능력이 있는지 의심되면 선언. 거짓말이면 상대가 카드를 잃고, 진짜면 공격자가 카드를 잃습니다.</p>
                                </div>
                                <div>
                                    <div className="text-text-primary font-bold mb-1 flex items-center gap-1.5">
                                        블록 (Block)
                                    </div>
                                    <p>해외원조나 암살, 갈취를 차단합니다. 블록에도 도전할 수 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center pb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <a
                    href="https://github.com/thxforall/coup-game"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-text-muted hover:text-gold transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
                >
                    <img src="/profile/platypus.png" alt="thxforall" className="w-5 h-5 rounded-full border border-border-subtle" />
                    <span>thxforall</span>
                </a>
            </footer>
        </main>
    );
}
