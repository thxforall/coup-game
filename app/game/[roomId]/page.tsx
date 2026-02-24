'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Skull, Home, AlertTriangle } from 'lucide-react';
import { subscribeToRoom, getRoom, setupPresence, subscribeToPresence, PresenceMap } from '@/lib/firebase.client';
import { FilteredGameState } from '@/lib/game/types';
import WaitingRoom from '@/components/game/WaitingRoom';
import GameBoard from '@/components/game/GameBoard';
import { getOrCreatePlayerId as getPlayerId, setActiveRoom, clearActiveRoom } from '@/lib/storage';
import AlertModal from '@/components/ui/AlertModal';

type AlertState =
    | { type: 'left' }
    | { type: 'no-nickname'; roomId: string };

export default function GamePage() {
    const params = useParams();
    const roomId = (params.roomId as string).toUpperCase();
    const [state, setState] = useState<FilteredGameState | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [presence, setPresence] = useState<PresenceMap>({});
    const [alertState, setAlertState] = useState<AlertState | null>(null);
    const playerIdRef = useRef('');
    // Track whether the current player has ever been in the room (joined)
    const hasBeenInRoomRef = useRef(false);

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
                        setNotFound(true);
                        setLoading(false);
                        clearActiveRoom();
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
            // 대기실에서 내가 플레이어 목록에 없으면 추방 또는 미참가
            if (newState.phase === 'waiting') {
                const currentPid = playerIdRef.current;
                const stillInRoom = newState.players.some((p) => p.id === currentPid);
                if (!stillInRoom && currentPid) {
                    if (hasBeenInRoomRef.current) {
                        // 방에 있다가 사라진 경우 = 추방 또는 자발적 퇴장
                        setAlertState({ type: 'left' });
                    } else {
                        // 방에 한 번도 없었던 경우 = 닉네임 없이 URL 직접 접속
                        setAlertState({ type: 'no-nickname', roomId });
                    }
                    clearActiveRoom();
                    return;
                }
                // 플레이어 목록에 있으면 참가 중 상태로 표시
                hasBeenInRoomRef.current = true;
            }
            setState(newState);
            setLoading(false);
        }, () => {
            // 방이 삭제됨 - 로비로 이동
            clearActiveRoom();
            window.location.href = '/';
        });

        return () => unsubscribe();
    }, [roomId, playerId]);

    const handleAlertClose = useCallback(() => {
        if (alertState?.type === 'no-nickname') {
            window.location.href = `/?join=${alertState.roomId}`;
        } else {
            window.location.href = '/';
        }
        setAlertState(null);
    }, [alertState]);

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

    const handleAllegiance = useCallback(async (allegiance: 'loyalist' | 'reformist') => {
        await fetch('/api/game/allegiance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId, allegiance }),
        });
    }, [roomId, playerId]);

    const handleRestart = useCallback(async () => {
        await fetch('/api/game/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId }),
        });
    }, [roomId, playerId]);

    const handleLeave = useCallback(async () => {
        try {
            await fetch('/api/game/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId }),
            });
        } catch {
            // API 실패해도 나가기는 진행
        }
        clearActiveRoom();
        window.location.href = '/';
    }, [roomId, playerId]);

    // AlertModal 표시 중 (방 나감/추방 또는 닉네임 없는 접속)
    if (alertState) {
        const isNoNickname = alertState.type === 'no-nickname';
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <AlertModal
                    title={isNoNickname ? '참가 안내' : '방에서 나왔습니다'}
                    message={
                        isNoNickname
                            ? '이 방에 참가하려면 로비에서 닉네임을 입력해주세요.'
                            : '방에서 나왔습니다.'
                    }
                    buttonLabel={isNoNickname ? '로비에서 참가하기' : '로비로'}
                    onClose={handleAlertClose}
                />
            </div>
        );
    }

    // 방을 찾을 수 없는 경우
    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center  px-4">
                <div className="glass-panel p-8 text-center max-w-sm w-full animate-slide-up">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="w-16 h-16 text-gold" />
                    </div>

                    <h1 className="text-2xl font-black mb-2 text-text-primary">방을 찾을 수 없습니다</h1>
                    <p className="text-text-secondary text-sm mb-2">
                        입력하신 방 코드로 게임을 찾을 수 없습니다.
                    </p>
                    <p className="text-text-muted text-xs mb-1">입력한 코드</p>
                    <p className="font-mono text-xl font-black text-gold tracking-widest mb-6">
                        {roomId}
                    </p>

                    <div className="text-left text-xs text-text-muted mb-6 space-y-1 bg-bg-surface rounded-lg p-3 border border-border-subtle">
                        <p>• 방 코드가 정확한지 확인해주세요</p>
                        <p>• 방이 이미 종료되었을 수 있습니다</p>
                        <p>• 대소문자는 자동으로 변환됩니다</p>
                    </div>

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

    // 로딩 중
    if (loading || !state) {
        return (
            <div className="min-h-screen flex items-center justify-center ">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <Skull className="w-10 h-10 text-gold animate-pulse" />
                    </div>
                    <p className="text-text-muted text-sm">연결 중...</p>
                    <p className="text-text-muted text-xs mt-1 font-mono tracking-wider">{roomId}</p>
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
                onAllegiance={handleAllegiance}
                onLeave={handleLeave}
                presence={presence}
            />
        );
    }

    return <GameBoard state={state} playerId={playerId} roomId={roomId} onAction={sendAction} onRestart={handleRestart} presence={presence} />;
}
