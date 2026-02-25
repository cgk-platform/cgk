import { getUserById } from '@cgk-platform/auth'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { Sidebar } from '../../components/nav/sidebar'

export const metadata: Metadata = {
  title: 'openCLAW Command Center',
  description: 'Multi-profile gateway dashboard',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  let userName = 'Super Admin'
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
      <Sidebar userName={userName} userEmail={userEmail} />
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
