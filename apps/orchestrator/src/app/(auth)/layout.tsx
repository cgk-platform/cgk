import type { Metadata } from 'next'

import '../globals.css'

export const metadata: Metadata = {
  title: 'Login - CGK Orchestrator',
  description: 'Super Admin Authentication',
}

/**
 * Auth Layout
 *
 * Minimal layout for authentication pages (login, MFA, unauthorized).
 * These pages don't have the main navigation sidebar.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
