import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import NotificationPrompt from '@/components/NotificationPrompt'
import OfflineBanner from '@/components/OfflineBanner'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: '75 Hard',
  description: 'Tracker personal del reto 75 Hard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '75 Hard',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bg text-text-primary`}
      >
        <div className="min-h-dvh flex flex-col">
          <div className="px-4 pt-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            <NotificationPrompt />
          </div>
          <OfflineBanner />
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
