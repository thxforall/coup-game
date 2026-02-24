'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen, X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import CardInfoModal from '@/components/game/CardInfoModal';
import { Character } from '@/lib/game/types';

interface Props {
    onClose: () => void;
}

const CHAR_COLORS: Record<string, string> = {
    Duke: 'text-violet-400',
    Assassin: 'text-slate-300',
    Captain: 'text-blue-400',
    Ambassador: 'text-emerald-400',
    Contessa: 'text-red-400',
};

const CARD_IMAGES: Record<string, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

export default function GameRulesModal({ onClose }: Props) {
    const [selectedChar, setSelectedChar] = useState<Character | null>(null);

    return (
        <>
            <BottomSheet onClose={onClose} mobileMaxHeight="85vh">
                {/* 헤더 (sticky) */}
                <div className="sticky top-0 z-10 bg-bg-card/95 backdrop-blur-sm border-b border-border-subtle px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-gold" />
                        <h2 className="text-lg font-bold text-text-primary">게임 규칙</h2>
                    </div>
                    <button
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* 1. 기본 규칙 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-text-primary">기본 규칙</h3>
                        <ul className="space-y-1.5 text-xs text-text-secondary leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-gold shrink-0">*</span>
                                <span>각 플레이어는 <span className="text-text-primary font-medium">카드 2장</span>, <span className="text-text-primary font-medium">코인 2개</span>로 시작</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-gold shrink-0">*</span>
                                <span>마지막까지 살아남는 플레이어가 승리</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-gold shrink-0">*</span>
                                <span>카드 2장 모두 공개되면 탈락</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-gold shrink-0">*</span>
                                <span><span className="text-amber-400 font-medium">10코인</span> 이상이면 반드시 쿠데타를 해야 함</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-gold shrink-0">*</span>
                                <span><span className="text-text-primary font-medium">거짓말:</span> 가지고 있지 않은 캐릭터의 능력을 사용 가능, 도전당하면 카드를 잃음</span>
                            </li>
                        </ul>
                    </section>

                    {/* 2. 일반 액션 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-text-primary">일반 액션</h3>
                        <p className="text-[10px] text-text-muted">누구나 사용 가능</p>
                        <div className="space-y-2 text-xs text-text-secondary">
                            <div className="flex items-start gap-2">
                                <span className="text-gold font-bold shrink-0 w-16">소득</span>
                                <span>+1 코인 <span className="text-text-muted">(막기/도전 불가)</span></span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-gold font-bold shrink-0 w-16">해외원조</span>
                                <span>+2 코인 <span className="text-text-muted">(공작이 막을 수 있음)</span></span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-gold font-bold shrink-0 w-16">쿠데타</span>
                                <span>7코인 지불, 대상 카드 1장 제거 <span className="text-text-muted">(막기/도전 불가)</span></span>
                            </div>
                        </div>
                    </section>

                    {/* 3. 캐릭터 능력 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-text-primary">캐릭터 능력</h3>
                        <p className="text-[10px] text-text-muted">이미지를 탭하면 상세 정보를 볼 수 있습니다</p>
                        <div className="space-y-2.5 text-xs">
                            {/* 공작 */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setSelectedChar('Duke' as Character)}
                                    className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                                    aria-label="공작 카드 상세보기"
                                >
                                    <Image
                                        src={CARD_IMAGES.Duke}
                                        alt="공작"
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <span className={`font-bold ${CHAR_COLORS.Duke}`}>공작 (Duke)</span>
                                    <p className="text-text-secondary mt-0.5">세금징수 +3코인 / 해외원조 차단</p>
                                </div>
                            </div>
                            {/* 암살자 */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setSelectedChar('Assassin' as Character)}
                                    className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                                    aria-label="암살자 카드 상세보기"
                                >
                                    <Image
                                        src={CARD_IMAGES.Assassin}
                                        alt="암살자"
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <span className={`font-bold ${CHAR_COLORS.Assassin}`}>암살자 (Assassin)</span>
                                    <p className="text-text-secondary mt-0.5">3코인으로 암살 (대상 카드 1장 제거)</p>
                                </div>
                            </div>
                            {/* 사령관 */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setSelectedChar('Captain' as Character)}
                                    className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                                    aria-label="사령관 카드 상세보기"
                                >
                                    <Image
                                        src={CARD_IMAGES.Captain}
                                        alt="사령관"
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <span className={`font-bold ${CHAR_COLORS.Captain}`}>사령관 (Captain)</span>
                                    <p className="text-text-secondary mt-0.5">갈취 (상대 코인 2개 탈취) / 갈취 차단</p>
                                </div>
                            </div>
                            {/* 대사 */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setSelectedChar('Ambassador' as Character)}
                                    className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                                    aria-label="대사 카드 상세보기"
                                >
                                    <Image
                                        src={CARD_IMAGES.Ambassador}
                                        alt="대사"
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <span className={`font-bold ${CHAR_COLORS.Ambassador}`}>대사 (Ambassador)</span>
                                    <p className="text-text-secondary mt-0.5">교환 (덱에서 카드 교체) / 갈취 차단</p>
                                </div>
                            </div>
                            {/* 백작부인 */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setSelectedChar('Contessa' as Character)}
                                    className="shrink-0 w-12 h-16 relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                                    aria-label="백작부인 카드 상세보기"
                                >
                                    <Image
                                        src={CARD_IMAGES.Contessa}
                                        alt="백작부인"
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <span className={`font-bold ${CHAR_COLORS.Contessa}`}>백작부인 (Contessa)</span>
                                    <p className="text-text-secondary mt-0.5">암살 차단</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. 도전 & 블록 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-text-primary">도전 & 블록</h3>
                        <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
                            <div>
                                <span className="text-text-primary font-medium">도전:</span>{' '}
                                상대가 거짓말인지 확인. 거짓말이면 상대 카드 잃음, 진짜면 도전자 카드 잃음
                            </div>
                            <div>
                                <span className="text-text-primary font-medium">블록:</span>{' '}
                                해당 캐릭터를 가졌다고 주장하여 액션 차단. 블록에도 도전 가능
                            </div>
                        </div>
                    </section>
                </div>
            </BottomSheet>

            {selectedChar && (
                <CardInfoModal
                    character={selectedChar}
                    onClose={() => setSelectedChar(null)}
                />
            )}
        </>
    );
}
