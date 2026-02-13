import { withTenant } from '@cgk-platform/db'
import { Card, CardContent, Button } from '@cgk-platform/ui'
import { Mail, Send, RotateCcw, Ban } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { EmailStatusBadge } from '@/components/admin/gift-cards/status-badge'
import { getGiftCardEmails, getEmailStats, type GiftCardEmail } from '@/lib/gift-card'
import { formatDateTime } from '@/lib/format'
import { buildFilterUrl } from '@/lib/search-params'
import { StatCard } from '@/components/admin/gift-cards/StatCard'

const EMAIL_STATUSES = ['pending', 'sent', 'failed', 'skipped']

interface EmailFilters {
  status: string
  search: string
  page: number
  limit: number
  offset: number
}

function parseFilters(params: Record<string, string | string[] | undefined>): EmailFilters {
  const str = (val: string | string[] | undefined): string =>
    Array.isArray(val) ? val[0] || '' : val || ''

  const page = Math.max(1, parseInt(str(params.page), 10) || 1)
  const limit = 20
  return {
    status: str(params.status),
    search: str(params.search),
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseFilters(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Card Emails</h1>
          <p className="text-muted-foreground">
            Manage gift card notification email queue
          </p>
        </div>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <EmailStatsSection />
      </Suspense>

      <FilterBar filters={filters} />

      <Suspense fallback={<EmailsSkeleton />}>
        <EmailsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function EmailStatsSection() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) return null

  const stats = await withTenant(tenantSlug, async () => {
    return getEmailStats()
  })

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Pending"
        value={stats.pending_count}
        icon={Mail}
        iconColor="bg-yellow-100 text-yellow-600"
      />
      <StatCard
        title="Sent"
        value={stats.sent_count}
        icon={Send}
        iconColor="bg-green-100 text-green-600"
      />
      <StatCard
        title="Failed"
        value={stats.failed_count}
        icon={Mail}
        iconColor="bg-red-100 text-red-600"
      />
      <StatCard
        title="Skipped"
        value={stats.skipped_count}
        icon={Ban}
        iconColor="bg-gray-100 text-gray-600"
      />
    </div>
  )
}

function FilterBar({ filters }: { filters: EmailFilters }) {
  const base = '/admin/gift-cards/emails'

  const filterParams: Record<string, string | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search by email..." />
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
          {EMAIL_STATUSES.map((status) => (
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

async function EmailsLoader({ filters }: { filters: EmailFilters }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    return getGiftCardEmails({
      status: filters.status as 'pending' | 'sent' | 'failed' | 'skipped' | undefined,
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
      offset: filters.offset,
    })
  })

  if (rows.length === 0 && !filters.search && !filters.status) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No emails yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Gift card notification emails will appear here when transactions are
              created.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/gift-cards/emails'
  const currentFilters: Record<string, string | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
  }

  const columns: Column<GiftCardEmail>[] = [
    {
      key: 'to_email',
      header: 'Recipient',
      render: (row) => (
        <div>
          <div className="truncate max-w-[200px]">{row.to_email}</div>
          {row.to_name && (
            <div className="text-xs text-muted-foreground">{row.to_name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <span className="truncate max-w-[200px] block">{row.subject}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <EmailStatusBadge status={row.status} />,
    },
    {
      key: 'scheduled_for',
      header: 'Scheduled',
      render: (row) => formatDateTime(row.scheduled_for),
    },
    {
      key: 'sent_at',
      header: 'Sent',
      render: (row) =>
        row.sent_at ? (
          formatDateTime(row.sent_at)
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'attempt_count',
      header: 'Attempts',
      render: (row) => row.attempt_count,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => <EmailActions email={row} />,
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort="created_at"
        currentDir="desc"
      />
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

function EmailActions({ email }: { email: GiftCardEmail }) {
  if (email.status === 'pending') {
    return (
      <div className="flex gap-1">
        <EmailActionButton emailId={email.id} action="send" icon={Send} title="Send now" />
        <EmailActionButton emailId={email.id} action="skip" icon={Ban} title="Skip" />
      </div>
    )
  }

  if (email.status === 'failed') {
    return (
      <EmailActionButton emailId={email.id} action="retry" icon={RotateCcw} title="Retry" />
    )
  }

  return null
}

function EmailActionButton({
  emailId,
  action,
  icon: Icon,
  title,
}: {
  emailId: string
  action: 'send' | 'retry' | 'skip'
  icon: typeof Send
  title: string
}) {
  return (
    <form
      action={`/api/admin/gift-cards/emails/${emailId}/send`}
      method="POST"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        window.location.reload()
      }}
    >
      <Button type="submit" variant="ghost" size="sm" title={title}>
        <Icon className="h-4 w-4" />
      </Button>
    </form>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-12 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmailsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
