import { headers } from 'next/headers'

import { BriDashboard } from './bri-dashboard'
import { getBriSettings, getBriStats, getActions, getIntegrationStatus } from '@/lib/bri/db'

export const metadata = {
  title: 'Bri - AI Agent Dashboard',
  description: 'Configure and monitor your AI agent',
}

export default async function BriPage() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Tenant not found</h2>
          <p className="text-muted-foreground mt-2">Please select a tenant to continue.</p>
        </div>
      </div>
    )
  }

  const [settings, stats, recentActions, integrations] = await Promise.all([
    getBriSettings(tenantSlug),
    getBriStats(tenantSlug),
    getActions(tenantSlug, { limit: 8 }),
    getIntegrationStatus(tenantSlug),
  ])

  return (
    <BriDashboard
      tenantSlug={tenantSlug}
      initialSettings={settings}
      stats={stats}
      recentActions={recentActions}
      integrations={integrations}
    />
  )
}
