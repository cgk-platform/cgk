import { headers } from 'next/headers'
import { Suspense } from 'react'

import { InboxSidebar } from './_components/inbox-sidebar'
import { ThreadList } from './_components/thread-list'

interface PageProps {
  searchParams: Promise<{
    status?: string
    priority?: string
    search?: string
  }>
}

async function getThreads(
  tenantId: string,
  params: { status?: string; priority?: string; search?: string }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (!baseUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
  }
  const searchParams = new URLSearchParams()

  searchParams.set('status', params.status || 'open')
  if (params.priority) searchParams.set('priority', params.priority)
  if (params.search) searchParams.set('search', params.search)

  const res = await fetch(`${baseUrl}/api/admin/inbox/threads?${searchParams}`, {
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  })

  if (!res.ok) {
    return { threads: [], total: 0 }
  }

  return res.json()
}

async function getStats(_tenantId: string) {
  // For now, return mock stats - would call a stats API endpoint
  return {
    openThreads: 12,
    snoozedThreads: 3,
    closedThreads: 45,
    unreadCount: 5,
  }
}

export default async function InboxPage({ searchParams }: PageProps) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id') || ''
  const params = await searchParams

  const [threadsData, stats] = await Promise.all([
    getThreads(tenantId, params),
    getStats(tenantId),
  ])

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="w-56 animate-pulse bg-muted/20" />}>
        <InboxSidebar stats={stats} />
      </Suspense>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ThreadList threads={threadsData.threads || []} />
        </div>
      </div>
    </div>
  )
}
