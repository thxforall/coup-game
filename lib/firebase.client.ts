'use client';
/**
 * Firebase Realtime Database - 클라이언트 전용 (SDK onValue)
 * 브라우저에서만 사용: 실시간 구독 + 초기 로드
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, onChildAdded, onDisconnect, set, get, update, serverTimestamp, query, orderByChild, startAt, endAt } from 'firebase/database';
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
  callback: (state: FilteredGameState) => void,
  onRoomDeleted?: () => void
): () => void {
  // views/{playerId} 경로 구독
  const viewRef = ref(getDb(), `game_rooms/${roomId}/views/${playerId}`);
  const unsubView = onValue(
    viewRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as FilteredGameState);
      } else {
        // 게임 중 방 삭제 감지 (stateRef는 게임 시작 후 unsubscribe되므로 viewRef에서 처리)
        onRoomDeleted?.();
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
      } else {
        // 방이 삭제됨 (snapshot이 null)
        onRoomDeleted?.();
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

// ============================================================
// Presence (접속 상태)
// ============================================================

export type PresenceMap = Record<string, { online: boolean; lastSeen: number }>;

export function setupPresence(roomId: string, playerId: string): () => void {
  const db = getDb();
  const presenceRef = ref(db, `game_rooms/${roomId}/presence/${playerId}`);
  const connectedRef = ref(db, '.info/connected');

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // 연결 시 online 설정
      set(presenceRef, { online: true, lastSeen: Date.now() });
      // 연결 끊길 때 offline 설정
      onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now() });
    }
  });

  return () => {
    unsub();
    set(presenceRef, { online: false, lastSeen: Date.now() });
  };
}

export function subscribeToPresence(
  roomId: string,
  callback: (presence: PresenceMap) => void
): () => void {
  const db = getDb();
  const presenceRef = ref(db, `game_rooms/${roomId}/presence`);

  const unsub = onValue(presenceRef, (snap) => {
    if (snap.exists()) {
      callback(snap.val() as PresenceMap);
    } else {
      callback({});
    }
  });

  return unsub;
}

// ============================================================
// Quick Chat
// ============================================================

export const CHAT_MESSAGES = ['드루와', '공작 업', 'ㅠㅠ', '넌 뒤졌다', '봐줘', '👍', '빨리해'] as const;

export interface ChatMessage {
  playerId: string;
  messageId: number;
  text?: string;      // 자유 텍스트 (messageId === -1일 때)
  timestamp: number;
}

export function sendChatMessage(roomId: string, playerId: string, messageId: number): void {
  const db = getDb();
  const key = `${playerId}_${Date.now()}`;
  const chatRef = ref(db, `game_rooms/${roomId}/chat/${key}`);
  set(chatRef, { playerId, messageId, timestamp: Date.now() });
  // 오래된 메시지 정리 (백그라운드, 60초 이상 경과)
  cleanupOldChatMessages(roomId);
}

export function sendChatTextMessage(roomId: string, playerId: string, text: string): void {
  const db = getDb();
  const key = `${playerId}_${Date.now()}`;
  const chatRef = ref(db, `game_rooms/${roomId}/chat/${key}`);
  set(chatRef, { playerId, messageId: -1, text, timestamp: Date.now() });
  cleanupOldChatMessages(roomId);
}

/**
 * 60초 이상 지난 채팅 메시지 삭제 (Firebase 데이터 비대화 방지).
 * 쓰로틀링: 30초에 1회만 실행.
 */
let lastCleanupTs = 0;
function cleanupOldChatMessages(roomId: string): void {
  const now = Date.now();
  if (now - lastCleanupTs < 30_000) return;
  lastCleanupTs = now;

  const db = getDb();
  const chatRef = ref(db, `game_rooms/${roomId}/chat`);
  const cutoff = now - 60_000;
  const q = query(chatRef, orderByChild('timestamp'), endAt(cutoff));
  get(q).then((snap) => {
    if (!snap.exists()) return;
    const updates: Record<string, null> = {};
    snap.forEach((child) => {
      updates[child.key!] = null;
    });
    // 한 번에 일괄 삭제
    update(ref(db, `game_rooms/${roomId}/chat`), updates);
  }).catch(() => { /* 무시 */ });
}

/**
 * 새 채팅 메시지가 추가될 때마다 콜백 호출.
 * onChildAdded + startAt으로 구독 시점 이후 메시지만 수신.
 */
export function subscribeToChatMessages(
  roomId: string,
  callback: (msg: ChatMessage, key: string) => void
): () => void {
  const db = getDb();
  const chatRef = ref(db, `game_rooms/${roomId}/chat`);
  // 구독 시작 시점 이후 메시지만 수신 (과거 메시지 중복 방지)
  const subscribeTs = Date.now();
  const q = query(chatRef, orderByChild('timestamp'), startAt(subscribeTs));
  const unsub = onChildAdded(q, (snap) => {
    if (!snap.exists()) return;
    const msg = snap.val() as ChatMessage;
    callback(msg, snap.key ?? '');
  });
  return unsub;
}
