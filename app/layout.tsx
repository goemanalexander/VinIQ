import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import ClientInit from '@/components/ClientInit';

export const metadata: Metadata = {
  title: 'VinIQ — Your personal wine advisor',
  description: 'A personal AI sommelier: scan, score and decide in seconds.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B1422',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <ClientInit />
        <div className="mx-auto min-h-screen max-w-md pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
