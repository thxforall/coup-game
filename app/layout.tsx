import type { Metadata } from 'next';
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

export const metadata: Metadata = {
    title: 'Coup Online',
    description: 'Bluff. Deceive. Survive.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" className={`${sora.variable} ${spaceMono.variable}`}>
            <body className="bg-bg-dark text-text-primary min-h-screen font-sora">{children}</body>
        </html>
    );
}
