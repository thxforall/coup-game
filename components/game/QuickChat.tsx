'use client';

import { memo, useRef, useCallback, useEffect, useState } from 'react';
import { CHAT_MESSAGES, sendChatMessage } from '@/lib/firebase.client';

interface Props {
  roomId: string;
  playerId: string;
  disabled?: boolean;
  turnId?: string;
  maxChats?: number;
  onSend?: (messageId: number) => void;
}

const CHAT_BUTTONS = CHAT_MESSAGES.map((label, id) => ({ id, label }));

const COOLDOWN_MS = 1500;

function QuickChat({ roomId, playerId, disabled, turnId, maxChats = 3, onSend }: Props) {
  // useRef로 쿨다운 관리 — state 변경 없이 리렌더 방지
  const cooldownUntilRef = useRef(0);
  const chatCountRef = useRef(0);
  const [limitReached, setLimitReached] = useState(false);

  // 턴 변경 시 카운트 리셋
  useEffect(() => {
    chatCountRef.current = 0;
    setLimitReached(false);
  }, [turnId]);

  const handleClick = useCallback(
    (messageId: number) => {
      if (disabled) return;
      if (chatCountRef.current >= maxChats) return;
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;

      // 낙관적 UI: 부모에게 즉시 알림
      onSend?.(messageId);

      sendChatMessage(roomId, playerId, messageId);
      cooldownUntilRef.current = now + COOLDOWN_MS;
      chatCountRef.current += 1;
      if (chatCountRef.current >= maxChats) {
        setLimitReached(true);
      }
    },
    [roomId, playerId, disabled, maxChats, onSend]
  );

  const isDisabled = disabled || limitReached;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-1.5 items-center">
      {CHAT_BUTTONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          disabled={isDisabled}
          className={[
            'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
            'border border-border-subtle bg-bg-surface text-text-secondary',
            'hover:bg-gold/20 hover:text-gold hover:border-gold/40',
            'active:scale-95 transition-all',
            isDisabled ? 'opacity-50 pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </button>
      ))}
      {limitReached && (
        <span className="flex-shrink-0 text-[10px] text-text-muted whitespace-nowrap">
          채팅 {maxChats}회 제한
        </span>
      )}
    </div>
  );
}

export default memo(QuickChat);

