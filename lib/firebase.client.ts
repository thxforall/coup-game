'use client';
/**
 * Firebase Realtime Database - 클라이언트 전용 (SDK onValue)
 * 브라우저에서만 사용: 실시간 구독 + 초기 로드
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initializeApp, getApps } = require('firebase/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDatabase, ref, onValue, get } = require('firebase/database');
import { GameState } from './game/types';

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

export async function getRoom(roomId: string): Promise<{ id: string; state: GameState } | null> {
  const snapshot = await get(ref(getDb(), `game_rooms/${roomId}`));
  if (!snapshot.exists()) return null;
  return { id: roomId, state: snapshot.val().state as GameState };
}

export function subscribeToRoom(
  roomId: string,
  callback: (state: GameState) => void
): () => void {
  const roomRef = ref(getDb(), `game_rooms/${roomId}`);
  return onValue(roomRef, (snapshot: { exists: () => boolean; val: () => { state: GameState } }) => {
    if (snapshot.exists()) {
      callback(snapshot.val().state);
    }
  });
}
