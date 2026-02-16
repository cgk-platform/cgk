// Environment validation - must be first import to fail fast on missing env vars
import '@/lib/env-validation'

import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from '@cgk-platform/ui'
import { TooltipProvider } from '@cgk-platform/ui'

import './globals.css'

/**
 * Display font - Instrument Serif
 * Used for headlines, hero text, and editorial elements
 */
const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

/**
 * Body font - Geist Sans
 * Used for headings, navigation, and body text
 */
const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

/**
 * Mono font - Geist Mono
 * Used for code, numbers, and IDs
 */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'Creator Portal',
    template: '%s | Creator Portal',
  },
  description: 'Manage your projects, earnings, and payouts',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1320' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  )
}
