import { headers } from 'next/headers'

import { TeamMemoriesView } from './team-memories-view'
import { getTeamWithMemories } from '@/lib/bri/db'

export const metadata = {
  title: 'Team Memories - Bri',
  description: 'Manage knowledge Bri has about team members',
}

export default async function TeamMemoriesPage() {
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

  const teamMembers = await getTeamWithMemories(tenantSlug)

  return <TeamMemoriesView tenantSlug={tenantSlug} initialTeamMembers={teamMembers} />
}
