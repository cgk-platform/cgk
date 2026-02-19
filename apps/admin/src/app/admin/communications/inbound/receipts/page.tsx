import { Card, CardContent } from '@cgk-platform/ui'
import { CheckCircle2, Clock, DollarSign, FileText, Link2, XCircle } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { withTenant, sql } from '@cgk-platform/db'

interface ReceiptRow {
  id: string
  from_address: string
  subject: string | null
  status: string
  vendor_name: string | null
  amount_cents: number | null
  currency: string
  linked_expense_id: string | null
  receipt_date: string | null
  created_at: string
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = (params.status as string) || undefined
  const page = parseInt((params.page as string) || '1', 10)
  const limit = 25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipt Processing Queue</h1>
          <p className="text-sm text-muted-foreground">
            Inbound receipts awaiting categorization and expense linking
          </p>
        </div>
        <Link
          href="/admin/communications/inbound"
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <FileText className="h-4 w-4" />
          All Inbound
        </Link>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <FiltersBar status={status} />

      <Suspense fallback={<TableSkeleton />}>
        <ReceiptsLoader status={status} page={page} limit={limit} />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  let stats = { total: 0, pending: 0, linked: 0, unlinked: 0 }

  try {
    const result = await withTenant(tenantSlug, async () =>
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE linked_expense_id IS NOT NULL) as linked,
          COUNT(*) FILTER (WHERE linked_expense_id IS NULL AND status != 'pending') as unlinked
        FROM treasury_receipts
      `
    )
    const row = result.rows[0]
    if (row) {
      stats = {
        total: Number(row.total) || 0,
        pending: Number(row.pending) || 0,
        linked: Number(row.linked) || 0,
        unlinked: Number(row.unlinked) || 0,
      }
    }
  } catch {
    // Table may not exist yet
  }

  const cards = [
    { title: 'Total Receipts', value: stats.total, icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Linked', value: stats.linked, icon: Link2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Unlinked', value: stats.unlinked, icon: XCircle, color: stats.unlinked > 0 ? 'text-rose-600' : 'text-muted-foreground', bgColor: stats.unlinked > 0 ? 'bg-rose-50' : 'bg-muted' },
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
  const basePath = '/admin/communications/inbound/receipts'
  const statuses = [
    { value: undefined, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Processed' },
    { value: 'linked', label: 'Linked' },
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

async function ReceiptsLoader({
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
  let rows: ReceiptRow[] = []
  let totalCount = 0

  try {
    const result = await withTenant(tenantSlug, async () => {
      if (status) {
        return sql.query(
          `SELECT * FROM treasury_receipts WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [status, limit, offset],
        )
      }
      return sql.query(
        `SELECT * FROM treasury_receipts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      )
    })

    const countResult = await withTenant(tenantSlug, async () => {
      if (status) {
        return sql.query(
          `SELECT COUNT(*) as total FROM treasury_receipts WHERE status = $1`,
          [status],
        )
      }
      return sql`SELECT COUNT(*) as total FROM treasury_receipts`
    })

    rows = result.rows as ReceiptRow[]
    totalCount = Number(countResult.rows[0]?.total) || 0
  } catch {
    // Table may not exist yet
  }

  const formatAmount = (cents: number | null, currency: string) => {
    if (!cents) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100)
  }

  const getStatusBadge = (s: string, linked: string | null) => {
    if (linked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Linked
        </span>
      )
    }
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      processed: 'bg-blue-100 text-blue-700',
      failed: 'bg-rose-100 text-rose-700',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[s] || 'bg-slate-100 text-slate-700'}`}
      >
        {s}
      </span>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No receipts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Treasury receipts will appear here when received via email.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-[1fr,1fr,100px,120px,120px,150px] items-center gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div>From</div>
        <div>Subject / Vendor</div>
        <div>Amount</div>
        <div>Status</div>
        <div>Receipt Date</div>
        <div>Received</div>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr,1fr,100px,120px,120px,150px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{row.from_address}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.vendor_name || row.subject || '(no subject)'}</p>
              {row.vendor_name && row.subject && (
                <p className="truncate text-xs text-muted-foreground">{row.subject}</p>
              )}
            </div>
            <div className="text-sm font-medium">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {formatAmount(row.amount_cents, row.currency)}
              </span>
            </div>
            <div>{getStatusBadge(row.status, row.linked_expense_id)}</div>
            <div className="text-sm text-muted-foreground">
              {row.receipt_date
                ? new Date(row.receipt_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '-'}
            </div>
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
