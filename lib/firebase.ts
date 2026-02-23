import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, update, onValue, Database } from 'firebase/database';
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

// Next.js 핫 리로드 시 중복 초기화 방지
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let db: Database;
function getDb(): Database {
  if (!db) db = getDatabase(app);
  return db;
}

// ============================================================
// 서버/클라이언트 공용 DB 함수
// ============================================================

export async function getRoom(roomId: string): Promise<{ id: string; state: GameState } | null> {
  const snapshot = await get(ref(getDb(), `game_rooms/${roomId}`));
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  return { id: roomId, state: data.state as GameState };
}

export async function createRoom(roomId: string, state: GameState): Promise<void> {
  await set(ref(getDb(), `game_rooms/${roomId}`), { state });
}

export async function updateRoom(roomId: string, state: GameState): Promise<void> {
  await update(ref(getDb(), `game_rooms/${roomId}`), { state });
}

// ============================================================
// 클라이언트 전용: Realtime 구독
// ============================================================

export function subscribeToRoom(
  roomId: string,
  callback: (state: GameState) => void
): () => void {
  const roomRef = ref(getDb(), `game_rooms/${roomId}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val().state as GameState);
    }
  });
  return unsubscribe; // 컴포넌트 언마운트 시 호출
}
