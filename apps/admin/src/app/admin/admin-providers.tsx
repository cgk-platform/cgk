'use client'

import * as React from 'react'

import { TenantProvider, type TenantInfo } from '@cgk-platform/ui'

interface AdminProvidersProps {
  initialTenant: TenantInfo | null
  initialTenants: TenantInfo[]
  children: React.ReactNode
}

/**
 * Client-side providers for the admin shell
 *
 * Includes TenantProvider for context switching functionality.
 */
export function AdminProviders({
  initialTenant,
  initialTenants,
  children,
}: AdminProvidersProps) {
  return (
    <TenantProvider
      initialTenant={initialTenant}
      initialTenants={initialTenants}
      tenantsUrl="/api/auth/context/tenants"
      switchUrl="/api/auth/context/switch"
      defaultUrl="/api/auth/context/default"
    >
      {children}
    </TenantProvider>
  )
}
