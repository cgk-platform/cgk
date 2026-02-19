import { Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { AlertCircle, CheckCircle2, Clock, Inbox, Mail, RefreshCw, XCircle } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { withTenant, sql } from '@cgk-platform/db'

interface InboundRow {
  id: string
  from_address: string
  from_name: string | null
  to_address: string
  subject: string | null
  email_type: string
  processing_status: string
  created_at: string
  updated_at: string
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InboundEmailPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = (params.status as string) || undefined
  const page = parseInt((params.page as string) || '1', 10)
  const limit = 25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbound Emails</h1>
          <p className="text-sm text-muted-foreground">
            Received emails and thread matching results
          </p>
        </div>
        <Link
          href="/admin/communications/inbound/receipts"
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Mail className="h-4 w-4" />
          Receipt Queue
        </Link>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <FiltersBar status={status} />

      <Suspense fallback={<TableSkeleton />}>
        <InboundLoader status={status} page={page} limit={limit} />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  let stats = { total: 0, pending: 0, processed: 0, failed: 0 }

  try {
    const result = await withTenant(tenantSlug, async () =>
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE processing_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE processing_status = 'processed') as processed,
          COUNT(*) FILTER (WHERE processing_status = 'failed') as failed
        FROM inbound_email_log
      `
    )
    const row = result.rows[0]
    if (row) {
      stats = {
        total: Number(row.total) || 0,
        pending: Number(row.pending) || 0,
        processed: Number(row.processed) || 0,
        failed: Number(row.failed) || 0,
      }
    }
  } catch {
    // Table may not exist yet
  }

  const cards = [
    { title: 'Total Received', value: stats.total, icon: Inbox, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Processed', value: stats.processed, icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    {
      title: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: stats.failed > 0 ? 'text-rose-600' : 'text-muted-foreground',
      bgColor: stats.failed > 0 ? 'bg-rose-50' : 'bg-muted',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

function FiltersBar({ status }: { status: string | undefined }) {
  const basePath = '/admin/communications/inbound'
  const statuses = [
    { value: undefined, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Processed' },
    { value: 'failed', label: 'Failed' },
    { value: 'ignored', label: 'Ignored' },
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

async function InboundLoader({
  status,
  page,
  limit,
}: {
  status: string | undefined
  page: number
  limit: number
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const offset = (page - 1) * limit
  let rows: InboundRow[] = []
  let totalCount = 0

  try {
    const result = await withTenant(tenantSlug, async () => {
      if (status) {
        return sql.query(
          `SELECT * FROM inbound_email_log WHERE processing_status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [status, limit, offset],
        )
      }
      return sql.query(
        `SELECT * FROM inbound_email_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      )
    })

    const countResult = await withTenant(tenantSlug, async () => {
      if (status) {
        return sql.query(
          `SELECT COUNT(*) as total FROM inbound_email_log WHERE processing_status = $1`,
          [status],
        )
      }
      return sql`SELECT COUNT(*) as total FROM inbound_email_log`
    })

    rows = result.rows as InboundRow[]
    totalCount = Number(countResult.rows[0]?.total) || 0
  } catch {
    // Table may not exist yet
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No inbound emails</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Inbound emails will appear here once configured.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      processed: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-rose-100 text-rose-700',
      ignored: 'bg-slate-100 text-slate-500',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[s] || 'bg-slate-100 text-slate-700'}`}
      >
        {s}
      </span>
    )
  }

  const getTypeBadge = (t: string) => (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
      {t.replace('_', ' ')}
    </span>
  )

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-[1fr,1fr,120px,120px,150px] items-center gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div>From</div>
        <div>Subject</div>
        <div>Type</div>
        <div>Status</div>
        <div>Received</div>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr,1fr,120px,120px,150px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.from_name || row.from_address}</p>
              <p className="truncate text-xs text-muted-foreground">{row.from_address}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{row.subject || '(no subject)'}</p>
            </div>
            <div>{getTypeBadge(row.email_type || 'unknown')}</div>
            <div>{getStatusBadge(row.processing_status)}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(row.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
      </div>
      {totalCount > limit && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(offset + 1, totalCount)}–{Math.min(offset + rows.length, totalCount)} of {totalCount}
          </p>
        </div>
      )}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
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
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
