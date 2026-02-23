'use client';

import { useEffect, useRef } from 'react';
import { GameState } from './game/types';
import { soundManager } from './audio';

/**
 * 게임 상태 변화를 감지하여 자동으로 효과음을 재생하는 훅
 */
export function useGameAudio(state: GameState | null, playerId: string) {
  const prevState = useRef<GameState | null>(null);
  const prevLogLength = useRef(0);

  useEffect(() => {
    if (!state || !soundManager) return;

    const prev = prevState.current;

    // 첫 렌더링 — 건너뜀 (초기 로드 시 사운드 없음)
    if (!prev) {
      prevState.current = state;
      prevLogLength.current = state.log.length;
      return;
    }

    // 1. 페이즈 변경 감지
    if (prev.phase !== state.phase) {
      switch (state.phase) {
        case 'action':
          // 내 턴이 시작됐을 때
          if (state.currentTurnId === playerId) {
            soundManager.play('turnStart');
            // 모바일 진동
            triggerHaptic('medium');
          }
          break;
        case 'awaiting_response':
        case 'awaiting_block_response':
          // 내가 응답해야 할 때
          if (
            state.pendingAction?.responses?.[playerId] === null &&
            state.pendingAction?.actorId !== playerId
          ) {
            soundManager.play('notification');
            triggerHaptic('light');
          }
          break;
        case 'lose_influence':
          if (state.pendingAction?.losingPlayerId === playerId) {
            soundManager.play('cardLost');
            triggerHaptic('heavy');
          }
          break;
        case 'exchange_select':
          if (state.pendingAction?.actorId === playerId) {
            soundManager.play('action');
          }
          break;
        case 'game_over':
          if (state.winnerId === playerId) {
            soundManager.play('victory');
            triggerHaptic('heavy');
          } else {
            soundManager.play('defeat');
            triggerHaptic('medium');
          }
          break;
      }
    }

    // 2. 새 로그 분석으로 세부 사운드
    if (state.log.length > prevLogLength.current) {
      const newLogs = state.log.slice(prevLogLength.current);
      for (const log of newLogs) {
        if (log.includes('도전')) {
          if (!log.includes('도전 실패') && !log.includes('도전 성공')) {
            soundManager.play('challenge');
          }
        } else if (log.includes('막습니다') || log.includes('블록')) {
          soundManager.play('block');
        } else if (log.includes('잃었습니다') || log.includes('탈락')) {
          soundManager.play('cardLost');
        } else if (log.includes('코인') && (log.includes('+') || log.includes('받았습니다') || log.includes('걷었습니다'))) {
          soundManager.play('coinGain');
        } else if (log.includes('강탈') || log.includes('쿠')) {
          soundManager.play('coinSpend');
        }
      }
    }

    // 3. 턴 변경 (같은 phase=action이지만 다른 플레이어)
    if (
      prev.currentTurnId !== state.currentTurnId &&
      state.currentTurnId === playerId &&
      state.phase === 'action' &&
      prev.phase === state.phase
    ) {
      soundManager.play('turnStart');
      triggerHaptic('medium');
    }

    prevState.current = state;
    prevLogLength.current = state.log.length;
  }, [state, playerId]);
}

/**
 * 모바일 햅틱 피드백
 */
function triggerHaptic(intensity: 'light' | 'medium' | 'heavy') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  switch (intensity) {
    case 'light':
      navigator.vibrate(30);
      break;
    case 'medium':
      navigator.vibrate(60);
      break;
    case 'heavy':
      navigator.vibrate([50, 30, 80]);
      break;
  }
}
