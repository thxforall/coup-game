'use client';

import Image from 'next/image';

export default function GlobalBackground() {
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
