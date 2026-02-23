/**
 * Firebase Realtime Database - 서버 전용 (REST API)
 * 서버리스 환경에서 안정적인 fetch 기반 통신
 */

import { GameState } from './game/types';

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
  return { id: roomId, state: data.state as GameState };
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
