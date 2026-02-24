'use client';

import { memo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Repeat } from 'lucide-react';
import { FilteredPlayer, Card, Character, CHARACTER_NAMES } from '@/lib/game/types';
import BottomSheet from '@/components/ui/BottomSheet';

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
    Inquisitor: '/cards/inquisitor.jpg',
};

const CHAR_BORDER: Record<Character, string> = {
    Duke: 'border-duke',
    Contessa: 'border-contessa',
    Captain: 'border-captain',
    Assassin: 'border-assassin',
    Ambassador: 'border-ambassador',
    Inquisitor: 'border-teal-500',
};

interface Props {
    player: FilteredPlayer;
    exchangeCards: Character[];
    onSelect: (keptIndices: number[]) => void;
    exchangeDeadline?: number;
}

function ExchangeModal({ player, exchangeCards, onSelect, exchangeDeadline }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [remainingMs, setRemainingMs] = useState(45000);
    const liveCards = (player.cards as Card[]).filter((c) => !c.revealed);
    const liveCount = liveCards.length;
    const allOptions: Character[] = [
        ...liveCards.map((c) => c.character),
        ...exchangeCards,
    ];

    useEffect(() => {
        if (!exchangeDeadline) return;
        const update = () => setRemainingMs(Math.max(0, exchangeDeadline - Date.now()));
        update();
        const interval = setInterval(update, 200);
        return () => clearInterval(interval);
    }, [exchangeDeadline]);

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const progress = exchangeDeadline ? Math.max(0, remainingMs / 45000) : 1;
    const isCritical = remainingSeconds <= 5;
    const isUrgent = remainingSeconds <= 15;
    const timerColor = isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

    const toggle = (i: number) => {
        setSelected((prev) => {
            if (prev.includes(i)) return prev.filter((x) => x !== i);
            // 여유 있으면 추가, 꽉 찼으면 마지막 선택을 새 카드로 교체
            if (prev.length >= liveCount) return [...prev.slice(0, -1), i];
            return [...prev, i];
        });
    };

    return (
        // closeOnBackdrop=false: 반드시 교환을 완료해야 함
        <BottomSheet closeOnBackdrop={false} mobileMaxHeight="80vh">
            <div className="px-5 py-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Repeat size={20} color="var(--ambassador-color)" />
                    <h2 className="text-xl font-black text-text-primary">카드 교환</h2>
                </div>
                <p className="text-text-secondary text-sm mb-1">대사 능력 — 카드를 교환합니다</p>

                {exchangeDeadline && (
                    <div className="mb-3">
                        <div className="flex justify-between text-xs text-text-muted mb-1">
                            <span>남은 시간</span>
                            <span className={isCritical ? 'text-red-400 font-bold' : isUrgent ? 'text-amber-400' : 'text-text-muted'}>
                                {remainingSeconds}초
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-200 ${timerColor}`}
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <p className="text-amber-400 text-xs mb-5">유지할 카드 {liveCount}장을 선택하세요</p>

                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-5">
                    {allOptions.map((char, i) => {
                        const isOwned = i < liveCards.length;
                        const isSelected = selected.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => toggle(i)}
                                className={`relative rounded-xl border-2 overflow-hidden w-[80px] h-[112px] sm:w-[88px] sm:h-[122px] ${CHAR_BORDER[char]} will-change-transform transition-transform transition-opacity duration-150 shadow ${isSelected ? 'ring-2 ring-gold scale-105' : 'opacity-70 hover:opacity-100'}`}
                            >
                                <Image
                                    src={CARD_IMAGES[char]}
                                    alt={CHARACTER_NAMES[char]}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 80px, 88px"
                                />
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center z-10">
                                        <span className="text-[10px] font-black text-black">{selected.indexOf(i) + 1}</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                                    <span className="text-[10px] font-bold text-white block text-center">
                                        {CHARACTER_NAMES[char]}
                                    </span>
                                    {isOwned && !isSelected && (
                                        <span className="text-[9px] text-white/60 block text-center">현재</span>
                                    )}
                                    {!isOwned && (
                                        <span className="text-[9px] text-ambassador block text-center">새 카드</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button
                    className="w-full btn-gold py-3"
                    onClick={() => onSelect(selected)}
                    disabled={selected.length !== liveCount}
                >
                    {selected.length === liveCount ? '교환 완료' : `${liveCount - selected.length}장 더 선택하세요`}
                </button>
            </div>
        </BottomSheet>
    );
}

export default memo(ExchangeModal, (prev, next) => {
    return (
        prev.player === next.player &&
        prev.exchangeCards === next.exchangeCards &&
        prev.onSelect === next.onSelect &&
        prev.exchangeDeadline === next.exchangeDeadline
    );
});
