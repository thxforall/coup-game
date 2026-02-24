'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen, X, Swords, Shield, Users } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import CardInfoModal from '@/components/game/CardInfoModal';
import { Character, GameMode } from '@/lib/game/types';

interface Props {
    onClose: () => void;
    gameMode?: GameMode;
    useInquisitor?: boolean;
}

const CHAR_COLORS: Record<string, string> = {
    Duke: 'text-violet-400',
    Assassin: 'text-slate-300',
    Captain: 'text-blue-400',
    Ambassador: 'text-emerald-400',
    Contessa: 'text-red-400',
    Inquisitor: 'text-yellow-400',
};

const CARD_IMAGES: Record<string, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

const CHARACTERS: { key: string; kr: string; en: string; ability: string }[] = [
    { key: 'Duke', kr: '공작', en: 'Duke', ability: '세금징수 +3코인 / 해외원조 차단' },
    { key: 'Assassin', kr: '암살자', en: 'Assassin', ability: '3코인으로 암살 (대상 카드 1장 제거)' },
    { key: 'Captain', kr: '사령관', en: 'Captain', ability: '갈취 (상대 코인 2개 탈취) / 갈취 차단' },
    { key: 'Ambassador', kr: '대사', en: 'Ambassador', ability: '교환 (덱에서 카드 교체) / 갈취 차단' },
    { key: 'Contessa', kr: '백작부인', en: 'Contessa', ability: '암살 차단' },
];

const INQUISITOR_CHAR = {
    key: 'Inquisitor', kr: '종교재판관', en: 'Inquisitor',
    ability: '심문 (상대 카드 확인 후 교체 강제) / 교환 (덱에서 카드 1장 교체) / 갈취 차단',
};

function CharCard({ char, onSelect }: { char: typeof CHARACTERS[0]; onSelect: (c: Character) => void }) {
    const hasImage = char.key in CARD_IMAGES;
    return (
        <div className="flex items-start gap-3">
            <button
                onClick={() => hasImage && onSelect(char.key as Character)}
                className={`shrink-0 w-12 h-16 relative rounded overflow-hidden border transition-colors ${hasImage ? 'border-white/10 hover:border-white/30 cursor-pointer' : 'border-white/5 bg-bg-surface/80 cursor-default'}`}
                aria-label={`${char.kr} 카드 상세보기`}
                disabled={!hasImage}
            >
                {hasImage ? (
                    <Image
                        src={CARD_IMAGES[char.key]}
                        alt={char.kr}
                        fill
                        className="object-cover"
                        sizes="48px"
                    />
                ) : (
                    <span className="flex items-center justify-center h-full text-[10px] text-text-muted">?</span>
                )}
            </button>
            <div className="min-w-0">
                <span className={`font-bold ${CHAR_COLORS[char.key] || 'text-text-primary'}`}>{char.kr} ({char.en})</span>
                <p className="text-text-secondary mt-0.5">{char.ability}</p>
            </div>
        </div>
    );
}

export default function GameRulesModal({ onClose, gameMode, useInquisitor }: Props) {
    const [selectedChar, setSelectedChar] = useState<Character | null>(null);

    const isReformation = gameMode === 'reformation';
    const isGuess = gameMode === 'guess';

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

                    {/* 0. 게임 모드 설명 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2.5">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-gold" />
                            게임 모드
                        </h3>
                        <div className="space-y-2 text-xs">
                            {/* 스탠다드 */}
                            <div className={`rounded-md p-2.5 border ${!isReformation && !isGuess ? 'border-gold/40 bg-gold/5' : 'border-border-subtle bg-transparent'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-bold ${!isReformation && !isGuess ? 'text-gold' : 'text-text-primary'}`}>스탠다드</span>
                                    {!isReformation && !isGuess && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-medium">현재</span>}
                                </div>
                                <p className="text-text-secondary leading-relaxed">기본 쿠 규칙. 5가지 캐릭터(공작, 암살자, 사령관, 대사, 백작부인)로 진행. 2~6인.</p>
                            </div>
                            {/* 추측 모드 */}
                            <div className={`rounded-md p-2.5 border ${isGuess ? 'border-amber-500/40 bg-amber-500/5' : 'border-border-subtle bg-transparent'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-bold ${isGuess ? 'text-amber-400' : 'text-text-primary'}`}>추측 모드</span>
                                    {isGuess && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">현재</span>}
                                </div>
                                <p className="text-text-secondary leading-relaxed">쿠데타 시 대상의 카드를 추측. 맞추면 추가 카드 제거, 틀리면 일반 쿠데타로 진행. 2~6인.</p>
                            </div>
                            {/* 종교개혁 */}
                            <div className={`rounded-md p-2.5 border ${isReformation ? 'border-purple-500/40 bg-purple-500/5' : 'border-border-subtle bg-transparent'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-bold ${isReformation ? 'text-purple-400' : 'text-text-primary'}`}>종교개혁</span>
                                    {isReformation && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">현재</span>}
                                </div>
                                <p className="text-text-secondary leading-relaxed">
                                    충성파/개혁파 진영 시스템. 같은 진영은 공격 불가.
                                    전향(진영 변경), 횡령(국고 탈취) 액션 추가.
                                    {' '}종교재판관 캐릭터 선택 가능. 2~10인.
                                </p>
                            </div>
                        </div>
                    </section>

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

                    {/* 종교개혁 전용 액션 */}
                    {isReformation && (
                        <section className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                종교개혁 액션
                            </h3>
                            <p className="text-[10px] text-text-muted">종교개혁 모드 전용</p>
                            <div className="space-y-2 text-xs text-text-secondary">
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-400 font-bold shrink-0 w-16">전향</span>
                                    <span>자신(1코인→국고) 또는 상대(2코인→국고)의 진영을 변경</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-400 font-bold shrink-0 w-16">횡령</span>
                                    <span>국고의 모든 코인을 가져옴 <span className="text-text-muted">(공작 능력, 역도전 가능)</span></span>
                                </div>
                                {useInquisitor && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-400 font-bold shrink-0 w-16">심문</span>
                                        <span>상대 카드 1장 확인 후 교체 강제 가능 <span className="text-text-muted">(종교재판관 능력)</span></span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 3. 캐릭터 능력 */}
                    <section className="bg-bg-surface/50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-gold" />
                            캐릭터 능력
                        </h3>
                        <p className="text-[10px] text-text-muted">이미지를 탭하면 상세 정보를 볼 수 있습니다</p>
                        <div className="space-y-2.5 text-xs">
                            {CHARACTERS.map((c) => {
                                // 종교개혁 + 종교재판관 사용 시 대사 대신 종교재판관 표시
                                if (isReformation && useInquisitor && c.key === 'Ambassador') {
                                    return <CharCard key={INQUISITOR_CHAR.key} char={INQUISITOR_CHAR} onSelect={setSelectedChar} />;
                                }
                                return <CharCard key={c.key} char={c} onSelect={setSelectedChar} />;
                            })}
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
