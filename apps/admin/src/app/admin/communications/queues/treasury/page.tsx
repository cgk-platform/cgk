import { Card, CardContent } from '@cgk-platform/ui'
import { AlertCircle, CheckCircle2, Clock, Mail, XCircle } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getEmailQueueStats, getEmailQueueEntries, mapRowToQueueEntry } from '@/lib/email-queues/db'
import type { EmailQueueType } from '@/lib/email-queues/db'
import { QueueTable, QueueTableSkeleton } from '../_components/queue-table'

const QUEUE_TYPE: EmailQueueType = 'treasury'
const BASE_PATH = '/admin/communications/queues/treasury'
const PAGE_TITLE = 'Treasury Email Queue'
const PAGE_DESC = 'Monitor treasury approval request emails'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewQueuePage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = (params.status as string) || undefined
  const page = parseInt((params.page as string) || '1', 10)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin/communications" className="text-sm text-muted-foreground hover:text-foreground">
            Communications
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{PAGE_TITLE}</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{PAGE_TITLE}</h1>
        <p className="text-sm text-muted-foreground">{PAGE_DESC}</p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <FiltersBar status={status} />

      <Suspense fallback={<QueueTableSkeleton />}>
        <EntriesLoader status={status} page={page} />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  let stats = { pending: 0, scheduled: 0, sentToday: 0, failedToday: 0, failed: 0, total: 0 }
  try { stats = await getEmailQueueStats(tenantSlug, QUEUE_TYPE) } catch {}

  const cards = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Scheduled', value: stats.scheduled, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sent Today', value: stats.sentToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Failed Today', value: stats.failed, icon: XCircle, color: stats.failed > 0 ? 'text-rose-600' : 'text-muted-foreground', bg: stats.failed > 0 ? 'bg-rose-50' : 'bg-muted' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FiltersBar({ status }: { status?: string }) {
  const statuses = [
    { value: undefined, label: 'All', href: BASE_PATH },
    { value: 'pending', label: 'Pending', href: `${BASE_PATH}?status=pending` },
    { value: 'scheduled', label: 'Scheduled', href: `${BASE_PATH}?status=scheduled` },
    { value: 'sent', label: 'Sent', href: `${BASE_PATH}?status=sent` },
    { value: 'failed', label: 'Failed', href: `${BASE_PATH}?status=failed` },
  ]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-lg border bg-card p-1">
        {statuses.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${status === s.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <Link href={`${BASE_PATH}?status=failed`} className="ml-auto flex items-center gap-1.5 text-sm text-rose-600 hover:underline">
        <AlertCircle className="h-3.5 w-3.5" />
        View Failed
      </Link>
    </div>
  )
}

async function EntriesLoader({ status, page }: { status?: string; page: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-sm text-muted-foreground">No tenant configured.</p>

  const limit = 50
  let entries: ReturnType<typeof mapRowToQueueEntry>[] = []
  let totalCount = 0

  try {
    const result = await getEmailQueueEntries(tenantSlug, QUEUE_TYPE, { status: status as never, page, limit })
    entries = result.rows.map(mapRowToQueueEntry)
    totalCount = result.totalCount
  } catch {}

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</p>
      <QueueTable entries={entries} queueType={QUEUE_TYPE} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && <Link href={`${BASE_PATH}?page=${page - 1}${status ? `&status=${status}` : ''}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">Previous</Link>}
            {page < totalPages && <Link href={`${BASE_PATH}?page=${page + 1}${status ? `&status=${status}` : ''}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">Next</Link>}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 animate-pulse rounded-lg bg-muted" /><div className="space-y-2"><div className="h-4 w-16 animate-pulse rounded bg-muted" /><div className="h-6 w-12 animate-pulse rounded bg-muted" /></div></div></CardContent></Card>
      ))}
    </div>
  )
}
