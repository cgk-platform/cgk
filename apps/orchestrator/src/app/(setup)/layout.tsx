import { Toaster } from '@cgk-platform/ui'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Setup - CGK Orchestrator',
  description: 'First-run configuration wizard for the CGK platform',
}

/**
 * Setup Layout
 *
 * Minimal layout for the setup wizard pages.
 * No authentication required - this is for fresh installations.
 *
 * Note: This is a route group layout - it should NOT include <html> or <body>
 * tags. Those are only in the root layout.tsx.
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#0a0e14]">
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
    </div>
  )
}
