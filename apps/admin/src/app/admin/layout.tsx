import { getUserById, getUserTenants, type TenantContext } from '@cgk/auth'
import { headers } from 'next/headers'

import { AdminShell } from './admin-shell'
import { AdminProviders } from './admin-providers'

import { getTenantConfig, type TenantConfig } from '@/lib/tenant'
import { generateThemeCSS } from '@/lib/theme'

const DEFAULT_TENANT: TenantConfig = {
  id: '',
  name: 'Admin Portal',
  slug: 'default',
  logo: null,
  favicon: null,
  colors: {
    primary: '222.2 47.4% 11.2%',
    secondary: '210 40% 96.1%',
    accent: '210 40% 96.1%',
  },
  features: {
    creators: true,
    subscriptions: true,
    abTesting: false,
    attribution: false,
    scheduling: true,
  },
  shopifyDomain: null,
  status: 'active',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const userRole = headerList.get('x-user-role') || 'member'

  let tenant = DEFAULT_TENANT
  if (tenantSlug) {
    const config = await getTenantConfig(tenantSlug)
    if (config) {
      tenant = config
    }
  }

  const themeCSS = generateThemeCSS(tenant)

  let userName: string | null = null
  let userEmail = ''
  if (userId) {
    const dbUser = await getUserById(userId)
    if (dbUser) {
      userName = dbUser.name
      userEmail = dbUser.email
    }
  }

  const user = {
    id: userId || '',
    name: userName,
    email: userEmail,
    role: userRole,
  }

  // Fetch user's tenants for context switching
  let userTenants: TenantContext[] = []
  let currentTenantContext: TenantContext | null = null
  if (userId) {
    userTenants = await getUserTenants(userId)
    // Find current tenant in the list
    const tenantId = headerList.get('x-tenant-id')
    if (tenantId) {
      currentTenantContext = userTenants.find((t) => t.id === tenantId) || null
    }
  }

  // Check for impersonation info from headers (set by middleware when impersonation JWT detected)
  const impersonatorEmail = headerList.get('x-impersonator-email')
  const impersonatorSessionId = headerList.get('x-impersonator-session-id')
  const impersonationExpiresAt = headerList.get('x-impersonation-expires-at')

  const impersonationInfo = impersonatorEmail
    ? {
        impersonatorEmail,
        sessionId: impersonatorSessionId || '',
        expiresAt: impersonationExpiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    : null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <AdminProviders
        initialTenant={currentTenantContext}
        initialTenants={userTenants}
      >
        <AdminShell tenant={tenant} user={user} impersonationInfo={impersonationInfo}>
          {children}
        </AdminShell>
      </AdminProviders>
    </>
  )
}
