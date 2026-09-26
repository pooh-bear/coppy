import type { Metadata } from 'next';
import { Bricolage_Grotesque, Martian_Mono } from 'next/font/google';
import './globals.css';

const sans = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-sans' });
const mono = Martian_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Coppy — Expiring Clipboard',
  description: 'Temporary clipboard items with auto-expiry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
