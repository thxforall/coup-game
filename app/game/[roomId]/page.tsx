'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToRoom, getRoom, setupPresence, subscribeToPresence, PresenceMap } from '@/lib/firebase.client';
import { FilteredGameState } from '@/lib/game/types';
import WaitingRoom from '@/components/game/WaitingRoom';
import GameBoard from '@/components/game/GameBoard';
import { getOrCreatePlayerId as getPlayerId, setActiveRoom } from '@/lib/storage';

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const roomId = (params.roomId as string).toUpperCase();
    const [state, setState] = useState<FilteredGameState | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(true);
    const [presence, setPresence] = useState<PresenceMap>({});
    const playerIdRef = useRef('');

    useEffect(() => {
        const pid = getPlayerId();
        setPlayerId(pid);
        playerIdRef.current = pid;
        setActiveRoom(roomId);
    }, [roomId]);

    // Presence: 현재 플레이어를 online으로 등록
    useEffect(() => {
        if (!roomId || !playerId) return;
        return setupPresence(roomId, playerId);
    }, [roomId, playerId]);

    // Presence: 모든 플레이어 접속 상태 구독
    useEffect(() => {
        if (!roomId) return;
        return subscribeToPresence(roomId, (p) => setPresence(p));
    }, [roomId]);

    // 초기 상태 로드 + Realtime 구독
    useEffect(() => {
        if (!roomId || !playerId) return;

        // 방 존재 여부 먼저 확인
        getRoom(roomId, playerId).then((room) => {
            if (!room) {
                // views가 아직 없을 수 있으므로 state에서도 시도
                getRoom(roomId).then((fallback) => {
                    if (!fallback) {
                        router.push('/');
                        return;
                    }
                    setState(fallback.state);
                    setLoading(false);
                });
                return;
            }
            setState(room.state);
            setLoading(false);
        });

        // Firebase onValue 실시간 구독 (views/{playerId})
        const unsubscribe = subscribeToRoom(roomId, playerId, (newState) => {
            // 대기실에서 내가 플레이어 목록에 없으면 추방된 것
            if (newState.phase === 'waiting') {
                const currentPid = playerIdRef.current;
                const stillInRoom = newState.players.some((p) => p.id === currentPid);
                if (!stillInRoom && currentPid) {
                    alert('방에서 추방되었습니다');
                    router.push('/');
                    return;
                }
            }
            setState(newState);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, playerId, router]);

    const sendAction = useCallback(
        async (action: object) => {
            await fetch('/api/game/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, action }),
            });
        },
        [roomId, playerId]
    );

    const handleStart = async () => {
        await fetch('/api/game/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId }),
        });
    };

    const handleKick = useCallback(
        async (targetId: string) => {
            await fetch('/api/game/kick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, targetId }),
            });
        },
        [roomId, playerId]
    );

    const handleReady = useCallback(async () => {
        await fetch('/api/game/ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId }),
        });
    }, [roomId, playerId]);

    const handleRestart = useCallback(async () => {
        await fetch('/api/game/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId }),
        });
    }, [roomId, playerId]);

    if (loading || !state) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-bounce">🃏</div>
                    <p className="text-slate-400">연결 중...</p>
                </div>
            </div>
        );
    }

    if (state.phase === 'waiting') {
        return (
            <WaitingRoom
                state={state}
                playerId={playerId}
                roomId={roomId}
                onStart={handleStart}
                onKick={handleKick}
                onReady={handleReady}
                presence={presence}
            />
        );
    }

    return <GameBoard state={state} playerId={playerId} roomId={roomId} onAction={sendAction} onRestart={handleRestart} presence={presence} />;
}
