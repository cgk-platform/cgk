import { getUserById } from '@cgk/auth'
import { headers } from 'next/headers'

import { AdminShell } from './admin-shell'

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <AdminShell tenant={tenant} user={user}>
        {children}
      </AdminShell>
    </>
  )
}
