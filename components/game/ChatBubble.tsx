'use client';

import { memo } from 'react';

interface Props {
  message: string;
  leaving?: boolean;
}

/**
 * ChatBubble - 플레이어 이름 위에 뜨는 말풍선
 * 부모 컨테이너는 relative position이어야 한다.
 */
function ChatBubble({ message, leaving }: Props) {
  return (
    <div
      className={[
        'relative inline-block max-w-[120px]',
        'bg-bg-dark/90 border border-gold/30 rounded-lg px-2 py-1',
        'text-xs text-gold font-medium whitespace-nowrap overflow-hidden text-ellipsis',
        leaving
          ? 'animate-[chatBubbleOut_0.3s_ease-in_forwards]'
          : 'animate-[chatBubbleIn_0.3s_ease-out]',
      ].join(' ')}
    >
      {message}
      {/* 아래 삼각형 포인터 */}
      <span
        className="absolute left-1/2 -bottom-1.5 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '6px solid rgba(200, 169, 96, 0.3)',
        }}
      />
    </div>
  );
}

export default memo(ChatBubble);
