import { headers } from 'next/headers'

import { ActionLogView } from './action-log-view'
import { getActions, getActionStats } from '@/lib/bri/db'

export const metadata = {
  title: 'Action Log - Bri',
  description: 'Monitor and approve AI agent actions',
}

export default async function ActionLogPage() {
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

  const [actions, stats] = await Promise.all([
    getActions(tenantSlug, { limit: 100 }),
    getActionStats(tenantSlug),
  ])

  return <ActionLogView tenantSlug={tenantSlug} initialActions={actions} stats={stats} />
}
