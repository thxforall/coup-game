'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getUISettings } from '@/lib/settings';

export default function GlobalBackground() {
    const [show, setShow] = useState(() => {
        if (typeof window === 'undefined') return true;
        return getUISettings().showBgImage;
    });

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && typeof detail.showBgImage === 'boolean') {
                setShow(detail.showBgImage);
            }
        };
        window.addEventListener('coup_settings_updated', handler);
        return () => window.removeEventListener('coup_settings_updated', handler);
    }, []);

    // body에 has-bg-image 클래스 토글
    useEffect(() => {
        document.body.classList.toggle('has-bg-image', show);
    }, [show]);

    if (!show) return null;

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
