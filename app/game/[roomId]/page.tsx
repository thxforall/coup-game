'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameState } from '@/lib/game/types';
import WaitingRoom from '@/components/game/WaitingRoom';
import GameBoard from '@/components/game/GameBoard';

function getPlayerId(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('coup_player_id') || '';
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

    // 초기 상태 로드
    useEffect(() => {
        if (!roomId) return;
        supabase
            .from('game_rooms')
            .select('state')
            .eq('id', roomId)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    router.push('/');
                    return;
                }
                setState(data.state as GameState);
                setLoading(false);
            });
    }, [roomId, router]);

    // Realtime 구독
    useEffect(() => {
        const channel = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    setState((payload.new as { state: GameState }).state);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

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
                    <div className="text-4xl mb-4 animate-spin">🃏</div>
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
            />
        );
    }

    return (
        <GameBoard
            state={state}
            playerId={playerId}
            roomId={roomId}
            onAction={sendAction}
        />
    );
}
