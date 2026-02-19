import { Card, CardContent } from '@cgk-platform/ui'
import { AlertCircle, CheckCircle2, Clock, DollarSign, Mail, XCircle } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import {
  getEmailQueueEntries,
  getEmailQueueStats,
  mapRowToQueueEntry,
} from '@/lib/email-queues/db'
import type { QueueStatus } from '@/lib/email-queues/db'
import { QueueTable, QueueTableSkeleton } from '../_components/queue-table'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TreasuryQueuePage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status as QueueStatus | undefined
  const page = parseInt((params.page as string) || '1', 10)
  const limit = 25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Treasury Email Queue</h1>
          <p className="text-sm text-muted-foreground">
            Monitor treasury approval requests and payout notification emails
          </p>
        </div>
        <Link
          href="/admin/communications/queues/treasury?status=failed"
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <AlertCircle className="h-4 w-4" />
          View Failed
        </Link>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <FiltersBar status={status} />

      <Suspense fallback={<QueueTableSkeleton />}>
        <QueueLoader status={status} page={page} limit={limit} />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const stats = await getEmailQueueStats(tenantSlug, 'treasury')

  const cards = [
    { title: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Sent Today', value: stats.sentToday, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    {
      title: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: stats.failed > 0 ? 'text-rose-600' : 'text-muted-foreground',
      bgColor: stats.failed > 0 ? 'bg-rose-50' : 'bg-muted',
    },
    { title: 'Scheduled', value: stats.scheduled, icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Total', value: stats.total, icon: DollarSign, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FiltersBar({ status }: { status: QueueStatus | undefined }) {
  const basePath = '/admin/communications/queues/treasury'
  const statuses: Array<{ value: QueueStatus | undefined; label: string }> = [
    { value: undefined, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div className="flex w-fit items-center rounded-lg border bg-card p-1">
      {statuses.map((s) => {
        const isActive = status === s.value
        const href = s.value ? `${basePath}?status=${s.value}` : basePath
        return (
          <Link
            key={s.label}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}

async function QueueLoader({
  status,
  page,
  limit,
}: {
  status: QueueStatus | undefined
  page: number
  limit: number
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getEmailQueueEntries(tenantSlug, 'treasury', {
    status,
    page,
    limit,
  })

  const totalPages = Math.ceil(totalCount / limit)
  const entries = rows.map(mapRowToQueueEntry)

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No emails in queue</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {status ? `No ${status} emails found.` : 'Treasury email queue entries will appear here.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <QueueTable entries={entries} queueType="treasury" />
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
        basePath="/admin/communications/queues/treasury"
        currentFilters={{ status: status as string | undefined }}
      />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
