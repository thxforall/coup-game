'use client';
/**
 * Firebase Realtime Database - 클라이언트 전용 (SDK onValue)
 * 브라우저에서만 사용: 실시간 구독 + 초기 로드
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initializeApp, getApps } = require('firebase/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDatabase, ref, onValue, get } = require('firebase/database');
import { FilteredGameState } from './game/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

function getApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

function getDb() {
  return getDatabase(getApp());
}

export async function getRoom(roomId: string, playerId?: string): Promise<{ id: string; state: FilteredGameState } | null> {
  // playerId가 있으면 views/{playerId}에서 읽기, 없으면 state에서 읽기 (대기실 등)
  const path = playerId
    ? `game_rooms/${roomId}/views/${playerId}`
    : `game_rooms/${roomId}/state`;
  const snapshot = await get(ref(getDb(), path));
  if (!snapshot.exists()) return null;
  return { id: roomId, state: snapshot.val() as FilteredGameState };
}

export function subscribeToRoom(
  roomId: string,
  playerId: string,
  callback: (state: FilteredGameState) => void
): () => void {
  // views/{playerId} 경로 구독
  const viewRef = ref(getDb(), `game_rooms/${roomId}/views/${playerId}`);
  const unsubView = onValue(viewRef, (snapshot: { exists: () => boolean; val: () => FilteredGameState }) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });

  // fallback: views가 아직 없을 수 있으므로 state도 구독 (waiting 단계)
  const stateRef = ref(getDb(), `game_rooms/${roomId}/state`);
  const unsubState = onValue(stateRef, (snapshot: { exists: () => boolean; val: () => FilteredGameState }) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      // views가 쓰여지면 state 구독은 무시 (views가 우선)
      if (val.phase === 'waiting') {
        callback(val);
      }
    }
  });

  return () => {
    unsubView();
    unsubState();
  };
}
