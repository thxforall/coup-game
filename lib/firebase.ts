/**
 * Firebase Realtime Database - 서버 전용 (REST API)
 * 서버리스 환경에서 안정적인 fetch 기반 통신
 */

import { GameState, FilteredGameState } from './game/types';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!DB_URL) {
  throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set');
}

function roomUrl(roomId: string) {
  return `${DB_URL}/game_rooms/${roomId}.json`;
}

export async function getRoom(roomId: string): Promise<{ id: string; state: GameState } | null> {
  const res = await fetch(roomUrl(roomId), { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  const state = data.state as GameState;
  // Firebase drops empty arrays on storage - restore defaults
  state.players = (state.players ?? []).map(p => ({
    ...p,
    cards: p.cards ?? [],
  }));
  state.log = state.log ?? [];
  return { id: roomId, state };
}

export async function createRoom(roomId: string, state: GameState): Promise<void> {
  const res = await fetch(roomUrl(roomId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create room: ${res.status} ${text}`);
  }
}

export async function updateRoom(roomId: string, state: GameState): Promise<void> {
  const res = await fetch(roomUrl(roomId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update room: ${res.status} ${text}`);
  }
}

/**
 * state + 플레이어별 filtered views를 동시에 쓰기 (multi-path PATCH)
 */
export async function updateRoomWithViews(
  roomId: string,
  state: GameState,
  views: Record<string, FilteredGameState>
): Promise<void> {
  const payload: Record<string, unknown> = {
    [`game_rooms/${roomId}/state`]: state,
  };
  for (const [playerId, view] of Object.entries(views)) {
    payload[`game_rooms/${roomId}/views/${playerId}`] = view;
  }
  const res = await fetch(`${DB_URL}/.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update room with views: ${res.status} ${text}`);
  }
}
