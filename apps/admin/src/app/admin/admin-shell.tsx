'use client'

import { useState, useCallback } from 'react'

import { Header } from '@/components/admin/header'
import { MobileNav } from '@/components/admin/mobile-nav'
import { Sidebar } from '@/components/admin/sidebar'
import type { TenantConfig } from '@/lib/tenant'

interface AdminShellProps {
  tenant: TenantConfig
  user: { id: string; name: string | null; email: string; role: string }
  children: React.ReactNode
}

export function AdminShell({ tenant, user, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar tenant={tenant} user={user} />
        </div>
      </div>

      {/* Mobile navigation */}
      <MobileNav open={mobileNavOpen} onClose={closeMobileNav} tenant={tenant} />

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header
          tenantName={tenant.name}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
