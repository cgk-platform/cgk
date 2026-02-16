// Environment validation - must be first import to fail fast on missing env vars
import '@/lib/env-validation'

import { Toaster } from '@cgk-platform/ui'
import { TooltipProvider } from '@cgk-platform/ui'
import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google'

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
    default: 'CGK Orchestrator',
    template: '%s | Orchestrator',
  },
  description: 'Super Admin Dashboard - Internal Platform Management',
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c1320',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="bottom-right" richColors closeButton theme="dark" />
        </TooltipProvider>
      </body>
    </html>
  )
}
