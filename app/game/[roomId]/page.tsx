'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToRoom, getRoom } from '@/lib/firebase';
import { GameState } from '@/lib/game/types';
import WaitingRoom from '@/components/game/WaitingRoom';
import GameBoard from '@/components/game/GameBoard';

function getPlayerId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('coup_player_id');
    if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('coup_player_id', id);
    }
    return id;
}

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const roomId = (params.roomId as string).toUpperCase();
    const [state, setState] = useState<GameState | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPlayerId(getPlayerId());
    }, []);

    // 초기 상태 로드 + Realtime 구독
    useEffect(() => {
        if (!roomId) return;

        // 방 존재 여부 먼저 확인
        getRoom(roomId).then((room) => {
            if (!room) {
                router.push('/');
                return;
            }
            setState(room.state);
            setLoading(false);
        });

        // Firebase onValue 실시간 구독
        const unsubscribe = subscribeToRoom(roomId, (newState) => {
            setState(newState);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, router]);

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
