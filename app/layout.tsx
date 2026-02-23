import type { Metadata, Viewport } from 'next';
import { Sora, Space_Mono } from 'next/font/google';
import './globals.css';

const sora = Sora({
    subsets: ['latin'],
    variable: '--font-sora',
    display: 'swap',
});

const spaceMono = Space_Mono({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-space-mono',
    display: 'swap',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const metadata: Metadata = {
    title: '쿠 온라인 | Coup Online - 거짓말과 심리전의 보드게임',
    description:
        '친구들과 함께 즐기는 온라인 쿠(Coup) 보드게임. 블러핑, 도전, 쿠데타로 최후의 1인이 되세요! 2~6인 실시간 멀티플레이어.',
    applicationName: '쿠 온라인',
    keywords: ['쿠', 'Coup', '보드게임', '온라인 보드게임', '블러핑 게임', '심리전', '멀티플레이어', '카드게임'],
    openGraph: {
        title: '쿠 온라인 | Coup Online',
        description: '거짓말과 심리전의 보드게임 — 친구들과 실시간으로 플레이하세요!',
        siteName: '쿠 온라인',
        images: [
            {
                url: '/og/coup_og.jpeg',
                width: 1200,
                height: 630,
                alt: '쿠 온라인 - 거짓말과 심리전의 보드게임',
            },
        ],
        locale: 'ko_KR',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: '쿠 온라인 | Coup Online',
        description: '거짓말과 심리전의 보드게임 — 친구들과 실시간으로 플레이하세요!',
        images: ['/og/coup_og.jpeg'],
    },
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" className={`${sora.variable} ${spaceMono.variable}`}>
            <body className="bg-bg-dark text-text-primary min-h-screen font-sora">{children}</body>
        </html>
    );
}
