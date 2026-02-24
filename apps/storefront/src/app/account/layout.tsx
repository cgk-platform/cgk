/**
 * Account Layout
 *
 * Layout for the customer portal / account section.
 * Provides sidebar navigation and consistent styling.
 * Server-side auth guard redirects unauthenticated visitors.
 */

import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCustomerSession } from '@/lib/customer-session'
import { AccountSidebar } from '@/components/account/AccountSidebar'

interface AccountLayoutProps {
  children: ReactNode
}

export default async function AccountLayout({ children }: AccountLayoutProps): Promise<React.ReactElement> {
  // Server-side auth guard: redirect unauthenticated visitors to login
  const session = await getCustomerSession()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Sidebar Navigation */}
        <AccountSidebar />

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
