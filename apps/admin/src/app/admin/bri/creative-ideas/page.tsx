import { headers } from 'next/headers'

import { CreativeIdeasView } from './creative-ideas-view'
import { getCreativeIdeas } from '@/lib/bri/db'

export const metadata = {
  title: 'Creative Ideas - Bri',
  description: 'Manage content hooks, scripts, and concepts',
}

export default async function CreativeIdeasPage() {
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

  const ideas = await getCreativeIdeas(tenantSlug)

  return <CreativeIdeasView tenantSlug={tenantSlug} initialIdeas={ideas} />
}
