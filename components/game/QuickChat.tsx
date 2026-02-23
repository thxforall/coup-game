'use client';

import { memo, useRef, useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { CHAT_MESSAGES, sendChatMessage, sendChatTextMessage } from '@/lib/firebase.client';
import BottomSheet from '@/components/ui/BottomSheet';

interface Props {
  roomId: string;
  playerId: string;
  disabled?: boolean;
  turnId?: string;
  maxChats?: number;
  onSend?: (messageId: number) => void;
  onSendText?: (text: string) => void;
}

const CHAT_BUTTONS = CHAT_MESSAGES.map((label, id) => ({ id, label }));

const COOLDOWN_MS = 1500;

function QuickChat({ roomId, playerId, disabled, turnId, maxChats = 3, onSend, onSendText }: Props) {
  const cooldownUntilRef = useRef(0);
  const chatCountRef = useRef(0);
  const [limitReached, setLimitReached] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [inputText, setInputText] = useState('');

  // 턴 변경 시 카운트 리셋
  useEffect(() => {
    chatCountRef.current = 0;
    setLimitReached(false);
    setInputText('');
    setShowTextModal(false);
  }, [turnId]);

  const checkLimit = useCallback(() => {
    if (disabled) return false;
    if (chatCountRef.current >= maxChats) return false;
    const now = Date.now();
    if (now < cooldownUntilRef.current) return false;
    return true;
  }, [disabled, maxChats]);

  const incrementCount = useCallback(() => {
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    chatCountRef.current += 1;
    if (chatCountRef.current >= maxChats) {
      setLimitReached(true);
    }
  }, [maxChats]);

  const handleClick = useCallback(
    (messageId: number) => {
      if (!checkLimit()) return;
      onSend?.(messageId);
      sendChatMessage(roomId, playerId, messageId);
      incrementCount();
    },
    [roomId, playerId, checkLimit, incrementCount, onSend]
  );

  const handleTextSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !checkLimit()) return;
    onSendText?.(trimmed);
    sendChatTextMessage(roomId, playerId, trimmed);
    incrementCount();
    setInputText('');
    setShowTextModal(false);
  }, [inputText, roomId, playerId, checkLimit, incrementCount, onSendText]);

  const isDisabled = disabled || limitReached;

  return (
    <>
      {/* 인라인 프리셋 버튼 + 자유입력 열기 버튼 */}
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
        {/* 자유입력 모달 열기 버튼 */}
        <button
          onClick={() => setShowTextModal(true)}
          disabled={isDisabled}
          className={[
            'flex-shrink-0 p-1.5 rounded-full',
            'border border-border-subtle bg-bg-surface text-text-secondary',
            'hover:bg-gold/20 hover:text-gold hover:border-gold/40',
            'active:scale-95 transition-all',
            isDisabled ? 'opacity-50 pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="자유 입력"
        >
          <Pencil size={12} />
        </button>
        {limitReached && (
          <span className="flex-shrink-0 text-[10px] text-text-muted whitespace-nowrap">
            채팅 {maxChats}회 제한
          </span>
        )}
      </div>

      {/* 자유 텍스트 입력 모달 */}
      {showTextModal && (
        <BottomSheet onClose={() => setShowTextModal(false)} mobileMaxHeight="40vh">
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-sm font-medium text-text-secondary">자유 입력</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={10}
                placeholder="10자 이내 입력"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTextSend(); }}
                autoFocus
                className={[
                  'flex-1 px-3 py-2.5 rounded-xl text-sm',
                  'bg-bg-surface border border-border-subtle text-text-primary',
                  'placeholder:text-text-muted focus:outline-none focus:border-gold/40',
                ].join(' ')}
              />
              <button
                onClick={handleTextSend}
                disabled={!inputText.trim()}
                className={[
                  'flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                  !inputText.trim()
                    ? 'opacity-40 pointer-events-none border border-border-subtle text-text-muted'
                    : 'bg-gold text-bg-dark border border-gold',
                ].join(' ')}
              >
                전송
              </button>
            </div>
            {limitReached && (
              <p className="text-center text-[11px] text-text-muted">
                채팅 {maxChats}회 제한에 도달했습니다
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  );
}

export default memo(QuickChat);
