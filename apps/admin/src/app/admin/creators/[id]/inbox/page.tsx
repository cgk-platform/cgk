import { Card, CardContent } from '@cgk/ui'
import { ArrowLeft } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CreatorInboxClient } from './components/creator-inbox-client'

import {
  getCreator,
  getCreatorConversations,
  getConversationMessages,
} from '@/lib/creators/db'

export default async function CreatorInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const search = await searchParams
  const conversationId = search.conversation as string | undefined

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const creator = await getCreator(tenantSlug, id)
  if (!creator) {
    notFound()
  }

  const name = creator.display_name || `${creator.first_name} ${creator.last_name}`

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/creators/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Messages with {name}</p>
        </div>
      </div>

      <Suspense fallback={<InboxSkeleton />}>
        <InboxLoader
          tenantSlug={tenantSlug}
          creatorId={id}
          creatorName={name}
          activeConversationId={conversationId}
        />
      </Suspense>
    </div>
  )
}

async function InboxLoader({
  tenantSlug,
  creatorId,
  creatorName,
  activeConversationId,
}: {
  tenantSlug: string
  creatorId: string
  creatorName: string
  activeConversationId?: string
}) {
  const conversations = await getCreatorConversations(tenantSlug, creatorId)

  let activeMessages: Awaited<ReturnType<typeof getConversationMessages>> = []
  let activeConversation = conversations.find((c) => c.id === activeConversationId) || null

  if (activeConversationId && activeConversation) {
    activeMessages = await getConversationMessages(tenantSlug, activeConversationId, true)
  }

  return (
    <CreatorInboxClient
      creatorId={creatorId}
      creatorName={creatorName}
      conversations={conversations}
      activeConversationId={activeConversationId}
      initialMessages={activeMessages}
    />
  )
}

function InboxSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="divide-y p-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent className="flex h-[500px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    </div>
  )
}
