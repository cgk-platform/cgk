import { headers } from 'next/headers'

import { AutonomyView } from './autonomy-view'
import { getAutonomySettings } from '@/lib/bri/db'

export const metadata = {
  title: 'Autonomy - Bri',
  description: 'Control autonomy levels and action permissions',
}

export default async function AutonomyPage() {
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

  const autonomyData = await getAutonomySettings(tenantSlug)

  return <AutonomyView tenantSlug={tenantSlug} initialData={autonomyData} />
}
