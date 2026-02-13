'use client'

import { useState, useCallback } from 'react'

import { Header } from '@/components/admin/header'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { MobileNav } from '@/components/admin/mobile-nav'
import { Sidebar } from '@/components/admin/sidebar'
import type { TenantConfig } from '@/lib/tenant'

interface ImpersonationInfo {
  impersonatorEmail: string
  expiresAt: string
  sessionId: string
}

interface AdminShellProps {
  tenant: TenantConfig
  user: { id: string; name: string | null; email: string; role: string }
  impersonationInfo?: ImpersonationInfo | null
  children: React.ReactNode
}

export function AdminShell({ tenant, user, impersonationInfo, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Impersonation Banner - displayed at top when session is impersonated */}
      <ImpersonationBanner impersonationInfo={impersonationInfo ?? null} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div
            className="fixed inset-y-0 left-0 w-64"
            style={{ top: impersonationInfo ? '44px' : 0 }}
          >
            <Sidebar tenant={tenant} user={user} />
          </div>
        </div>

        {/* Mobile navigation */}
        <MobileNav
          open={mobileNavOpen}
          onClose={closeMobileNav}
          tenant={tenant}
          user={user}
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col lg:pl-64">
          <Header
            tenantName={tenant.name}
            onMenuToggle={() => setMobileNavOpen(true)}
          />
          <main className="flex-1 p-4 lg:p-6 xl:p-8">
            <div className="mx-auto max-w-7xl animate-fade-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
