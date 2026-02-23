'use client';

import { useEffect, useRef } from 'react';

interface Props {
    log: string[];
}

export default function EventLog({ log }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    return (
        <div className="glass-panel p-3 h-full max-h-40 overflow-y-auto flex flex-col">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 sticky top-0">📜 로그</p>
            <div className="space-y-1 flex-1">
                {log.map((entry, i) => (
                    <p
                        key={i}
                        className={`text-xs transition-all ${i === log.length - 1 ? 'text-white font-semibold' : 'text-slate-400'
                            }`}
                    >
                        {entry}
                    </p>
                ))}
            </div>
            <div ref={bottomRef} />
        </div>
    );
}
