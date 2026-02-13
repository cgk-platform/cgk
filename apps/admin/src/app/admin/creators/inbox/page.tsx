import { Card, CardContent } from '@cgk-platform/ui'
import { MessageSquare } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { MessageComposer } from '@/components/admin/creators/message-composer'
import { ThreadDetail } from '@/components/admin/creators/thread-detail'
import { ThreadList } from '@/components/admin/creators/thread-list'
import { EmptyState } from '@/components/commerce/empty-state'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { getThreads, getThread, getMessages, markThreadRead } from '@/lib/messaging/db'
import { THREAD_STATUSES } from '@/lib/messaging/types'
import { parseThreadFilters, buildFilterUrl } from '@/lib/search-params'

export default async function CreatorInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseThreadFilters(params as Record<string, string | undefined>)
  const activeThreadId = (params.thread as string) || undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Inbox</h1>
      </div>

      <InboxFilterBar filters={filters} />

      <Suspense fallback={<InboxSkeleton />}>
        <InboxLoader filters={filters} activeThreadId={activeThreadId} />
      </Suspense>
    </div>
  )
}

function InboxFilterBar({ filters }: { filters: ReturnType<typeof parseThreadFilters> }) {
  const base = '/admin/creators/inbox'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search conversations..." />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {THREAD_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, { ...filterParams, status, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function InboxLoader({
  filters,
  activeThreadId,
}: {
  filters: ReturnType<typeof parseThreadFilters>
  activeThreadId?: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows: threads, totalCount } = await getThreads(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/creators/inbox'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    thread: activeThreadId,
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations"
        description="Creator messages will appear here when they contact you."
      />
    )
  }

  let activeThread = null
  let messages: Awaited<ReturnType<typeof getMessages>> = []

  if (activeThreadId) {
    activeThread = await getThread(tenantSlug, activeThreadId)
    if (activeThread) {
      messages = await getMessages(tenantSlug, activeThreadId)
      await markThreadRead(tenantSlug, activeThreadId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <ThreadList threads={threads} activeThreadId={activeThreadId} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="flex h-[500px] flex-col p-0">
            {activeThread ? (
              <>
                <div className="flex-1 overflow-y-auto">
                  <ThreadDetail thread={activeThread} messages={messages} />
                </div>
                <MessageComposer threadId={activeThreadId!} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a conversation to view messages
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="divide-y p-0">
          {Array.from({ length: 5 }).map((_, i) => (
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
      <Card className="lg:col-span-2">
        <CardContent className="flex h-[500px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    </div>
  )
}
