import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCcw,
  Send,
  XCircle,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import { getQueueEntries, getQueueStats } from '@/lib/creator-communications/db'
import type { QueueFilters, QueueStatus } from '@/lib/creator-communications/types'

import { QueueTable } from './queue-table'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmailQueuePage({ searchParams }: PageProps) {
  const params = await searchParams

  const filters: QueueFilters = {
    status: (params.status as QueueStatus) || undefined,
    page: parseInt((params.page as string) || '1', 10),
    limit: 25,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Queue</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage scheduled creator emails
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/creators/communications/queue?status=failed">
            <AlertCircle className="mr-1.5 h-4 w-4" />
            View Failed
          </Link>
        </Button>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <QueueStatsCards />
      </Suspense>

      <QueueFiltersBar filters={filters} />

      <Suspense fallback={<TableSkeleton />}>
        <QueueLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function QueueStatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return null
  }

  const stats = await getQueueStats(tenantSlug)

  const cards = [
    {
      title: 'Pending',
      value: stats.total_pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Sent Today',
      value: stats.sent_today,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Failed',
      value: stats.failed_count,
      icon: XCircle,
      color: stats.failed_count > 0 ? 'text-rose-600' : 'text-muted-foreground',
      bgColor: stats.failed_count > 0 ? 'bg-rose-50' : 'bg-muted',
    },
    {
      title: 'Open Rate (7d)',
      value: `${stats.open_rate_7d}%`,
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Click Rate (7d)',
      value: `${stats.click_rate_7d}%`,
      icon: Send,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
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

function QueueFiltersBar({ filters }: { filters: QueueFilters }) {
  const basePath = '/admin/creators/communications/queue'

  const statuses: Array<{ value: QueueStatus | undefined; label: string }> = [
    { value: undefined, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div className="flex items-center gap-3">
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
    </div>
  )
}

async function QueueLoader({ filters }: { filters: QueueFilters }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows, totalCount } = await getQueueEntries(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No emails in queue</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.status
              ? `No ${filters.status} emails found.`
              : 'Email queue entries will appear here.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <QueueTable entries={rows} />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath="/admin/creators/communications/queue"
        currentFilters={{ status: filters.status }}
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

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
