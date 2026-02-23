'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToRoom, getRoom } from '@/lib/firebase.client';
import { FilteredGameState } from '@/lib/game/types';
import WaitingRoom from '@/components/game/WaitingRoom';
import GameBoard from '@/components/game/GameBoard';
import { getOrCreatePlayerId as getPlayerId } from '@/lib/storage';

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const roomId = (params.roomId as string).toUpperCase();
    const [state, setState] = useState<FilteredGameState | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPlayerId(getPlayerId());
    }, []);

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
        return <WaitingRoom state={state} playerId={playerId} roomId={roomId} onStart={handleStart} />;
    }

    return <GameBoard state={state} playerId={playerId} roomId={roomId} onAction={sendAction} />;
}
