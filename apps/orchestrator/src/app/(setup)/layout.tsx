import { Toaster } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '../globals.css'

/**
 * Body font - Geist Sans
 */
const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

/**
 * Mono font - Geist Mono
 */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Platform Setup - CGK Orchestrator',
  description: 'First-run configuration wizard for the CGK platform',
}

/**
 * Setup Layout
 *
 * Minimal layout for the setup wizard pages.
 * No authentication required - this is for fresh installations.
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#0a0e14] font-sans antialiased">
        {/* Subtle grid background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #3b82f6 1px, transparent 1px),
              linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Main content */}
        <div className="relative z-10">{children}</div>

        <Toaster position="bottom-right" richColors closeButton theme="dark" />
      </body>
    </html>
  )
}
