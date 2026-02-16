import { getUserById } from '@cgk-platform/auth'
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
  const userId = headersList.get('x-user-id')

  // Fetch actual user details from database
  let userName = 'Unknown User'
  let userEmail = ''

  if (userId) {
    const user = await getUserById(userId)
    if (user) {
      userName = user.name || user.email.split('@')[0] || 'Super Admin'
      userEmail = user.email
    }
  }

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
