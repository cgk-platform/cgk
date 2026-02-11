import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { Sidebar } from '../../components/nav/sidebar'

export const metadata: Metadata = {
  title: 'CGK Orchestrator',
  description: 'Super Admin Dashboard - Internal Platform Management',
}

/**
 * Dashboard layout with sidebar navigation
 *
 * This layout wraps all protected dashboard pages and provides:
 * - Sidebar navigation
 * - User context from middleware headers
 * - MFA status display
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user info from middleware-injected headers
  const headersList = await headers()
  const mfaVerified = headersList.get('x-mfa-verified') === 'true'

  // Get user details (would normally come from a user service)
  // In production, this would fetch from user service using userId from headers
  const userName = 'Platform Admin'
  const userEmail = 'admin@platform.com'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        mfaVerified={mfaVerified}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main content area - offset for sidebar on desktop */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
