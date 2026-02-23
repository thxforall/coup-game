'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
    /** 닫기 함수. undefined면 백드롭 클릭/ESC로 닫기 불가 */
    onClose?: () => void;
    children: ReactNode;
    /** 모바일에서의 최대 높이 (기본 85vh) */
    mobileMaxHeight?: string;
    /** 바깥을 클릭했을 때 닫을지 여부 (기본 true, onClose가 있어야 동작) */
    closeOnBackdrop?: boolean;
    /** z-index (기본 z-50) */
    zIndex?: string;
}

/**
 * BottomSheet
 * - 모바일(< lg): 화면 하단 슬라이드업 시트
 * - 데스크톱(lg+): 화면 중앙 다이얼로그
 * - 공통: 딤 배경, body 스크롤 잠금, ESC 닫기
 */
export default function BottomSheet({
    onClose,
    children,
    mobileMaxHeight = '85vh',
    closeOnBackdrop = true,
    zIndex = 'z-50',
}: Props) {
    const sheetRef = useRef<HTMLDivElement>(null);

    // body 스크롤 잠금
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // ESC 키 닫기
    useEffect(() => {
        if (!onClose) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdropClick = () => {
        if (closeOnBackdrop && onClose) onClose();
    };

    return (
        <div
            className={`fixed inset-0 ${zIndex} flex flex-col justify-end lg:justify-center lg:items-center`}
            aria-modal="true"
            role="dialog"
        >
            {/* 딤 배경 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* 시트 / 다이얼로그 */}
            <div
                ref={sheetRef}
                className="relative w-full lg:max-w-lg lg:mx-4 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 모바일: 드래그 핸들 영역 */}
                <div className="lg:hidden flex justify-center pt-2 pb-1 bg-bg-dark rounded-t-2xl">
                    <div className="w-10 h-1 rounded-full bg-border-subtle" />
                </div>

                {/* 컨텐츠 래퍼 */}
                <div
                    className={`
                        overflow-y-auto bg-bg-dark
                        lg:rounded-xl lg:max-h-[85vh]
                        rounded-b-none rounded-t-none
                        pb-6 lg:pb-0
                    `}
                    style={{ maxHeight: `var(--sheet-max-h, ${mobileMaxHeight})` }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
