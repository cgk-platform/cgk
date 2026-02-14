import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - CGK Orchestrator',
  description: 'Super Admin Authentication',
}

/**
 * Auth Layout
 *
 * Minimal layout for authentication pages (login, MFA, unauthorized).
 * These pages don't have the main navigation sidebar.
 *
 * Note: This is a route group layout - it should NOT include <html> or <body>
 * tags. Those are only in the root layout.tsx.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
