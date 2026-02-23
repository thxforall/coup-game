'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Character, CHARACTER_NAMES } from '@/lib/game/types';

const CARD_IMAGES: Record<Character, string> = {
    Duke: '/cards/duke.jpg',
    Contessa: '/cards/contessa.jpg',
    Captain: '/cards/captain.jpg',
    Assassin: '/cards/assassin.jpg',
    Ambassador: '/cards/ambassador.jpg',
};

const CHAR_COLOR: Record<Character, string> = {
    Duke: 'text-violet-400',
    Contessa: 'text-red-400',
    Captain: 'text-blue-400',
    Assassin: 'text-slate-300',
    Ambassador: 'text-emerald-400',
};

const CHAR_BORDER_COLOR: Record<Character, string> = {
    Duke: 'border-violet-500/50',
    Contessa: 'border-red-500/50',
    Captain: 'border-blue-500/50',
    Assassin: 'border-slate-500/50',
    Ambassador: 'border-emerald-500/50',
};

interface CharacterInfo {
    action: string | null;
    actionDesc: string | null;
    actionCost: string | null;
    blocks: string | null;
    blocksDesc: string | null;
    tip: string;
}

const CHARACTER_INFO: Record<Character, CharacterInfo> = {
    Duke: {
        action: '세금 💰',
        actionDesc: '국고에서 코인 3개를 가져옵니다.',
        actionCost: null,
        blocks: '외국 원조 차단 🛡️',
        blocksDesc: '다른 플레이어의 외국 원조(+2코인)를 막습니다.',
        tip: '초반에 빠르게 자금을 확보하세요. 외국 원조 차단도 강력합니다!',
    },
    Contessa: {
        action: null,
        actionDesc: null,
        actionCost: null,
        blocks: '암살 차단 🛡️',
        blocksDesc: '다른 플레이어의 암살을 막습니다. 코인 3개는 돌아오지 않습니다.',
        tip: '고유 액션은 없지만, 암살 방어가 매우 강력합니다. 생존의 핵심!',
    },
    Captain: {
        action: '강탈 ⚔️',
        actionDesc: '대상 플레이어의 코인 2개를 빼앗습니다.',
        actionCost: null,
        blocks: '강탈 차단 🛡️',
        blocksDesc: '다른 사령관의 강탈로부터 자신을 보호합니다.',
        tip: '공격과 방어 모두 가능한 만능 캐릭터! 상대의 쿠를 늦추세요.',
    },
    Assassin: {
        action: '암살 🗡️',
        actionDesc: '코인 3개를 지불하고 대상의 카드 1장을 제거합니다.',
        actionCost: '비용: 3코인',
        blocks: null,
        blocksDesc: null,
        tip: '코인이 모이면 즉시 위협이 됩니다. 백작부인을 조심하세요!',
    },
    Ambassador: {
        action: '교환 🔄',
        actionDesc: '덱에서 카드 2장을 보고, 원하는 카드를 선택해 교체합니다.',
        actionCost: null,
        blocks: '강탈 차단 🛡️',
        blocksDesc: '사령관의 강탈로부터 자신을 보호합니다.',
        tip: '카드 교환으로 상황에 맞는 캐릭터를 얻으세요. 전략의 핵심!',
    },
};

interface Props {
    character: Character;
    onClose: () => void;
}

export default function CardInfoModal({ character, onClose }: Props) {
    const info = CHARACTER_INFO[character];
    const color = CHAR_COLOR[character];
    const borderColor = CHAR_BORDER_COLOR[character];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
            <div
                className={`glass-panel w-full max-w-sm p-0 animate-slide-up overflow-y-auto max-h-[90vh] sm:max-h-[85vh] border rounded-t-2xl sm:rounded-xl ${borderColor}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더: 이미지 + 이름 */}
                <div className="relative h-36 sm:h-48 w-full flex-shrink-0">
                    <Image
                        src={CARD_IMAGES[character]}
                        alt={CHARACTER_NAMES[character]}
                        fill
                        className="object-cover object-top"
                        sizes="400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                        <h2 className={`text-2xl font-black ${color}`}>{CHARACTER_NAMES[character]}</h2>
                        <p className="text-slate-400 text-xs">{character}</p>
                    </div>
                </div>

                {/* 능력 정보 */}
                <div className="p-4 space-y-3">
                    {/* 고유 액션 */}
                    {info.action ? (
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className={`font-bold text-sm ${color}`}>고유 액션: {info.action}</span>
                                {info.actionCost && (
                                    <span className="text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">
                                        {info.actionCost}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">{info.actionDesc}</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <span className="font-bold text-sm text-slate-500">고유 액션 없음</span>
                        </div>
                    )}

                    {/* 블록 능력 */}
                    {info.blocks ? (
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <span className={`font-bold text-sm ${color} block mb-1`}>방어: {info.blocks}</span>
                            <p className="text-slate-300 text-xs leading-relaxed">{info.blocksDesc}</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <span className="font-bold text-sm text-slate-500">방어 능력 없음</span>
                        </div>
                    )}

                    {/* 팁 */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <span className="text-amber-400 text-xs font-bold block mb-1">💡 전략 팁</span>
                        <p className="text-amber-200/80 text-xs leading-relaxed">{info.tip}</p>
                    </div>
                </div>

                {/* 닫기 */}
                <div className="p-3 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
