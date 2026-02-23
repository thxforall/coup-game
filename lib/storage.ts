/**
 * Dev 환경에서는 sessionStorage(탭별 독립), Prod에서는 localStorage(탭 간 공유) 사용.
 * 멀티탭 테스트 시 각 탭이 별도 플레이어로 접속 가능.
 */

const isDev = process.env.NODE_ENV === 'development';

function getStorage(): Storage {
  return isDev ? sessionStorage : localStorage;
}

export function getPlayerStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  // dev: sessionStorage 우선, fallback으로 localStorage (기존 세션 호환)
  if (isDev) {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  }
  return localStorage.getItem(key);
}

export function setPlayerStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  getStorage().setItem(key, value);
}

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = getPlayerStorage('coup_player_id');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    setPlayerStorage('coup_player_id', id);
  }
  return id;
}

// ============================================================
// Active Room (재접속 지원)
// ============================================================

export function getActiveRoom(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('coup_active_room');
}

export function setActiveRoom(roomId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('coup_active_room', roomId);
}

export function clearActiveRoom(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('coup_active_room');
}
