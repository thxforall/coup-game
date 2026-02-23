'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const BGM_SRC = '/audio/Juan Sebastian - Inaban _ Nabani.mp3';

function BgmPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);

    // 오디오 엘리먼트 초기화 (한 번만)
    useEffect(() => {
        const audio = new Audio(BGM_SRC);
        audio.loop = true;
        audio.volume = 0.3;
        audioRef.current = audio;

        // 재생 종료 시 상태 동기화
        audio.addEventListener('pause', () => setPlaying(false));
        audio.addEventListener('play', () => setPlaying(true));

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    const toggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (playing) {
            audio.pause();
        } else {
            audio.play().catch(() => {
                // 자동 재생 차단 시 무시
            });
        }
    }, [playing]);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !audio.muted;
        setMuted(!muted);
    }, [muted]);

    return (
        <div className="flex items-center gap-0.5">
            {/* 재생/정지 */}
            <button
                onClick={toggle}
                className={`p-2 rounded-lg transition-colors ${playing
                        ? 'text-gold bg-gold/10'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
                    }`}
                aria-label={playing ? '음악 정지' : '음악 재생'}
                title={playing ? '음악 정지' : '음악 재생'}
            >
                {playing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5.14v14l11-7-11-7z" />
                    </svg>
                )}
            </button>

            {/* 음소거/해제 — 재생 중일 때만 표시 */}
            {playing && (
                <button
                    onClick={toggleMute}
                    className={`p-2 rounded-lg transition-colors ${muted
                            ? 'text-contessa'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
                        }`}
                    aria-label={muted ? '음소거 해제' : '음소거'}
                    title={muted ? '음소거 해제' : '음소거'}
                >
                    {muted ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
                </button>
            )}
        </div>
    );
}

export default memo(BgmPlayer);
