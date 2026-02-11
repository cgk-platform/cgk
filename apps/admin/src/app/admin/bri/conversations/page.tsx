import { headers } from 'next/headers'

import { ConversationsView } from './conversations-view'
import { getConversations } from '@/lib/bri/db'

export const metadata = {
  title: 'Conversations - Bri',
  description: 'View and analyze conversation history',
}

export default async function ConversationsPage() {
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

  const conversations = await getConversations(tenantSlug)

  return <ConversationsView conversations={conversations} />
}
