import { Suspense } from 'react'
import { headers } from 'next/headers'

import { InboxSidebar } from '../../_components/inbox-sidebar'
import { ThreadList } from '../../_components/thread-list'
import { ThreadDetail } from '../../_components/thread-detail'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    status?: string
    priority?: string
  }>
}

async function getThreads(
  tenantId: string,
  params: { status?: string; priority?: string }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const searchParams = new URLSearchParams()

  searchParams.set('status', params.status || 'open')
  if (params.priority) searchParams.set('priority', params.priority)

  const res = await fetch(`${baseUrl}/api/admin/inbox/threads?${searchParams}`, {
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  })

  if (!res.ok) {
    return { threads: [], total: 0 }
  }

  return res.json()
}

async function getStats(tenantId: string) {
  return {
    openThreads: 12,
    snoozedThreads: 3,
    closedThreads: 45,
    unreadCount: 5,
  }
}

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id') || ''
  const { id } = await params
  const filterParams = await searchParams

  const [threadsData, stats] = await Promise.all([
    getThreads(tenantId, filterParams),
    getStats(tenantId),
  ])

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="w-56 animate-pulse bg-muted/20" />}>
        <InboxSidebar stats={stats} />
      </Suspense>

      {/* Thread List (narrower when viewing detail) */}
      <div className="w-80 flex-shrink-0 overflow-hidden border-r">
        <div className="h-full overflow-y-auto">
          <ThreadList threads={threadsData.threads || []} selectedThreadId={id} />
        </div>
      </div>

      {/* Thread Detail */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Loading...
            </div>
          }
        >
          <ThreadDetail threadId={id} />
        </Suspense>
      </div>
    </div>
  )
}
