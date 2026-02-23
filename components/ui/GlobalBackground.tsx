'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function GlobalBackground() {
    const pathname = usePathname();
    // 게임보드 (/game/[roomId])에서는 배경 숨김
    const isGameBoard = pathname?.startsWith('/game/');

    if (isGameBoard) return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]">
            <Image
                src="/bg/bg.jpeg"
                alt=""
                fill
                className="object-cover"
                priority
            />
        </div>
    );
}
