'use client';
/**
 * Firebase Realtime Database - 클라이언트 전용 (SDK onValue)
 * 브라우저에서만 사용: 실시간 구독 + 초기 로드
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, get } from 'firebase/database';
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
  const unsubView = onValue(
    viewRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as FilteredGameState);
      }
    },
    (error) => {
      console.error('[Firebase] view subscription error:', error);
    }
  );

  // fallback: views가 아직 없을 수 있으므로 state도 구독 (waiting 단계)
  // 게임이 시작되면 (phase !== 'waiting') state 구독을 자동 해제
  const stateRef = ref(getDb(), `game_rooms/${roomId}/state`);
  let stateUnsubbed = false;

  const unsubState = onValue(
    stateRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as FilteredGameState;
        if (val.phase === 'waiting') {
          // 게임 시작 전에는 state를 사용 (views가 아직 없음)
          callback(val);
        } else {
          // 게임 시작 후 state 구독 해제 (views가 우선)
          if (!stateUnsubbed) {
            stateUnsubbed = true;
            unsubState();
          }
        }
      }
    },
    (error) => {
      console.error('[Firebase] state subscription error:', error);
    }
  );

  return () => {
    unsubView();
    if (!stateUnsubbed) unsubState();
  };
}
