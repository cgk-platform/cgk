import { Button, Card, CardContent } from '@cgk/ui'
import { Archive, Filter, MessageSquare, Plus, Star } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getConversation, getConversationMessages, getConversations, markConversationRead } from '@/lib/creator-communications/db'
import type { ConversationFilters } from '@/lib/creator-communications/types'

import { ConversationList } from './conversation-list'
import { ThreadView } from './thread-view'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CreatorInboxPage({ searchParams }: PageProps) {
  const params = await searchParams

  const filters: ConversationFilters = {
    status: (params.status as 'open' | 'pending' | 'closed') || undefined,
    search: (params.search as string) || undefined,
    is_starred: params.starred === 'true' ? true : undefined,
    is_archived: params.archived === 'true' ? true : false,
    page: parseInt((params.page as string) || '1', 10),
    limit: 25,
  }

  const activeConversationId = (params.conversation as string) || undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Manage conversations with creators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/creators/communications/bulk">
              <Plus className="mr-1.5 h-4 w-4" />
              Bulk Send
            </Link>
          </Button>
        </div>
      </div>

      <InboxFilters filters={filters} />

      <Suspense fallback={<InboxSkeleton />}>
        <InboxLoader filters={filters} activeConversationId={activeConversationId} />
      </Suspense>
    </div>
  )
}

function InboxFilters({ filters }: { filters: ConversationFilters }) {
  const basePath = '/admin/creators/communications/inbox'

  const statuses = [
    { value: undefined, label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-lg border bg-card p-1">
        {statuses.map((status) => {
          const isActive = filters.status === status.value
          const href = status.value
            ? `${basePath}?status=${status.value}`
            : basePath

          return (
            <Link
              key={status.label}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {status.label}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <Link
          href={filters.is_starred ? basePath : `${basePath}?starred=true`}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            filters.is_starred
              ? 'bg-amber-100 text-amber-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Star className="h-4 w-4" />
          Starred
        </Link>

        <Link
          href={filters.is_archived ? basePath : `${basePath}?archived=true`}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            filters.is_archived
              ? 'bg-slate-100 text-slate-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Archive className="h-4 w-4" />
          Archived
        </Link>
      </div>

      <div className="ml-auto">
        <div className="relative">
          <input
            type="search"
            placeholder="Search conversations..."
            defaultValue={filters.search}
            className="h-9 w-64 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  )
}

async function InboxLoader({
  filters,
  activeConversationId,
}: {
  filters: ConversationFilters
  activeConversationId?: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows: conversations, totalCount } = await getConversations(tenantSlug, filters)

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No conversations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Creator messages will appear here when they contact you.
          </p>
        </CardContent>
      </Card>
    )
  }

  let activeConversation = null
  let messages: Awaited<ReturnType<typeof getConversationMessages>> = []

  if (activeConversationId) {
    activeConversation = await getConversation(tenantSlug, activeConversationId)
    if (activeConversation) {
      messages = await getConversationMessages(tenantSlug, activeConversationId)
      await markConversationRead(tenantSlug, activeConversationId)
    }
  }

  return (
    <div className="grid h-[calc(100vh-16rem)] gap-4 lg:grid-cols-[360px,1fr]">
      <Card className="flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
          />
        </CardContent>
        {totalCount > filters.limit && (
          <div className="border-t p-3 text-center text-xs text-muted-foreground">
            Showing {conversations.length} of {totalCount}
          </div>
        )}
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col p-0">
          {activeConversation ? (
            <ThreadView
              conversation={activeConversation}
              messages={messages}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 opacity-20" />
                <p className="mt-2">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="grid h-[calc(100vh-16rem)] gap-4 lg:grid-cols-[360px,1fr]">
      <Card className="overflow-hidden">
        <CardContent className="divide-y p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex h-full items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    </div>
  )
}
