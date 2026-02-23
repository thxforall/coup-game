'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

const BGM_SRC = '/audio/Juan Sebastian - Inaban _ Nabani.mp3';
const STORAGE_KEY = 'coup_bgm_volume';

function BgmPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(() => {
        if (typeof window === 'undefined') return 0.3;
        return parseFloat(localStorage.getItem(STORAGE_KEY) ?? '0.3');
    });
    const [showSlider, setShowSlider] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    // 오디오 엘리먼트 초기화
    useEffect(() => {
        const audio = new Audio(BGM_SRC);
        audio.loop = true;
        audio.volume = volume;
        audioRef.current = audio;

        audio.addEventListener('pause', () => setPlaying(false));
        audio.addEventListener('play', () => setPlaying(true));

        return () => {
            audio.pause();
            audio.src = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 슬라이더 외부 클릭 시 닫기
    useEffect(() => {
        if (!showSlider) return;
        const handler = (e: MouseEvent) => {
            if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
                setShowSlider(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showSlider]);

    const toggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
        } else {
            audio.play().catch(() => { });
        }
    }, [playing]);

    const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
        localStorage.setItem(STORAGE_KEY, String(v));
    }, []);

    const isMuted = volume === 0;

    const VolumeIcon = isMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div className="relative flex items-center gap-0.5" ref={sliderRef}>
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

            {/* 볼륨 버튼 — 재생 중일 때만 표시 */}
            {playing && (
                <button
                    onClick={() => setShowSlider(s => !s)}
                    className={`p-2 rounded-lg transition-colors ${showSlider
                        ? 'text-gold bg-gold/10'
                        : isMuted
                            ? 'text-contessa'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
                        }`}
                    aria-label="볼륨 조절"
                    title="볼륨 조절"
                >
                    <VolumeIcon className="w-[18px] h-[18px]" />
                </button>
            )}

            {/* 볼륨 슬라이더 팝업 */}
            {playing && showSlider && (
                <div className="absolute top-full right-0 mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-xl p-3 flex flex-col items-center gap-2 z-50">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">볼륨</span>
                    {/* 수직 슬라이더 */}
                    <div className="flex flex-col items-center gap-1 h-24">
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={volume}
                            onChange={handleVolume}
                            className="bgm-slider appearance-none cursor-pointer"
                            style={{
                                writingMode: 'vertical-lr',
                                direction: 'rtl',
                                width: '4px',
                                height: '88px',
                                background: `linear-gradient(to top, var(--gold) ${volume * 100}%, #3A3A3A ${volume * 100}%)`,
                                borderRadius: '4px',
                                outline: 'none',
                                border: 'none',
                            }}
                            aria-label="배경음악 볼륨"
                        />
                    </div>
                    <span className="text-[11px] font-bold text-gold tabular-nums">
                        {Math.round(volume * 100)}
                    </span>
                </div>
            )}
        </div>
    );
}

export default memo(BgmPlayer);
