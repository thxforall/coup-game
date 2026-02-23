'use client';

import { useState, useCallback } from 'react';
import { CHAT_MESSAGES, sendChatMessage } from '@/lib/firebase.client';

interface Props {
  roomId: string;
  playerId: string;
  disabled?: boolean;
}

const CHAT_BUTTONS = CHAT_MESSAGES.map((label, id) => ({ id, label }));

const COOLDOWN_MS = 1500;

export default function QuickChat({ roomId, playerId, disabled }: Props) {
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const handleClick = useCallback(
    (messageId: number) => {
      if (disabled) return;
      const now = Date.now();
      if (now < cooldownUntil) return;

      sendChatMessage(roomId, playerId, messageId);
      setCooldownUntil(now + COOLDOWN_MS);
    },
    [roomId, playerId, disabled, cooldownUntil]
  );

  const isCoolingDown = Date.now() < cooldownUntil;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-1.5">
      {CHAT_BUTTONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          disabled={disabled || isCoolingDown}
          className={[
            'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
            'border border-border-subtle bg-bg-surface text-text-secondary',
            'hover:bg-gold/20 hover:text-gold hover:border-gold/40',
            'active:scale-95 transition-all',
            disabled || isCoolingDown ? 'opacity-50 pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
