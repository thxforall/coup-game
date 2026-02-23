import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Coup 온라인',
    description: '친구들과 즐기는 Coup 보드게임',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body className="bg-slate-950 text-slate-100 min-h-screen">{children}</body>
        </html>
    );
}
