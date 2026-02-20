import { Card, CardContent } from '@cgk-platform/ui'
import { Inbox, Mail } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { withTenant, sql } from '@cgk-platform/db'

const STATUS_STYLES: Record<string, string> = {
  processed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
  ignored: 'bg-slate-100 text-slate-600',
}

const BASE_PATH = '/admin/communications/inbound'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InboundEmailPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = (params.status as string) || undefined
  const page = parseInt((params.page as string) || '1', 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/communications" className="text-sm text-muted-foreground hover:text-foreground">Communications</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Inbound Email</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbound Email</h1>
          <p className="text-sm text-muted-foreground">Emails received and processed by the platform</p>
        </div>
        <Link href={`${BASE_PATH}/receipts`} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">
          Receipt Processing →
        </Link>
      </div>

      <FiltersBar status={status} />

      <Suspense fallback={<TableSkeleton />}>
        <InboundLoader status={status} page={page} />
      </Suspense>
    </div>
  )
}

function FiltersBar({ status }: { status?: string }) {
  const statuses = [
    { value: undefined, label: 'All', href: BASE_PATH },
    { value: 'pending', label: 'Pending', href: `${BASE_PATH}?status=pending` },
    { value: 'processed', label: 'Processed', href: `${BASE_PATH}?status=processed` },
    { value: 'failed', label: 'Failed', href: `${BASE_PATH}?status=failed` },
    { value: 'ignored', label: 'Ignored', href: `${BASE_PATH}?status=ignored` },
  ]

  return (
    <div className="flex w-fit items-center rounded-lg border bg-card p-1">
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
  )
}

async function InboundLoader({ status, page }: { status?: string; page: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-sm text-muted-foreground">No tenant configured.</p>

  const limit = 50
  const offset = (page - 1) * limit
  let rows: Record<string, unknown>[] = []
  let totalCount = 0

  try {
    const result = await withTenant(tenantSlug, async () => {
      if (status) {
        return sql`SELECT id, from_address, to_address, subject, email_type, processing_status, received_at FROM inbound_email_log WHERE processing_status = ${status} ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      return sql`SELECT id, from_address, to_address, subject, email_type, processing_status, received_at FROM inbound_email_log ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}`
    })
    const countResult = await withTenant(tenantSlug, async () => {
      if (status) return sql`SELECT COUNT(*) AS cnt FROM inbound_email_log WHERE processing_status = ${status}`
      return sql`SELECT COUNT(*) AS cnt FROM inbound_email_log`
    })
    rows = result.rows as Record<string, unknown>[]
    totalCount = Number(countResult.rows[0]?.cnt ?? 0)
  } catch {}

  const totalPages = Math.ceil(totalCount / limit)

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4"><Inbox className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="mt-4 text-lg font-medium">No inbound emails</h3>
          <p className="mt-1 text-sm text-muted-foreground">{status ? `No ${status} emails found.` : 'Inbound emails will appear here.'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{totalCount} {totalCount === 1 ? 'email' : 'emails'}</p>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr,160px,120px,160px] items-center gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div>From / Subject</div>
          <div>Type</div>
          <div>Status</div>
          <div>Received</div>
        </div>
        <div className="divide-y">
          {rows.map((email) => (
            <div key={String(email.id)} className="grid grid-cols-[1fr,160px,120px,160px] items-center gap-4 px-4 py-3 hover:bg-muted/20">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="truncate text-sm font-medium">{String(email.from_address || '')}</p>
                </div>
                {email.subject && <p className="truncate text-xs text-muted-foreground">{String(email.subject)}</p>}
              </div>
              <div className="text-xs text-muted-foreground">{String(email.email_type || '—')}</div>
              <div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[String(email.processing_status || '')] ?? 'bg-muted text-muted-foreground'}`}>
                  {String(email.processing_status || 'unknown')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {email.received_at ? new Date(String(email.received_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
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

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
