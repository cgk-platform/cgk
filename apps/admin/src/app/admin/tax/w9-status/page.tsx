import { Badge, Button, Card, CardContent } from '@cgk-platform/ui'
import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pagination } from '@/components/commerce/pagination'

// W-9 Status Tracking Page

export default async function W9StatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = (params.status as string) || ''
  const payeeType = (params.payee_type as string) || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">W-9 Status Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Monitor W-9 submission status and send reminders
          </p>
        </div>
        <Button>Send Bulk Reminders</Button>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <W9StatsLoader />
      </Suspense>

      <div className="flex gap-2">
        <W9StatusFilter status={status} payeeType={payeeType} />
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <W9ListLoader page={page} status={status} payeeType={payeeType} />
      </Suspense>
    </div>
  )
}

function W9StatusFilter({ status, payeeType }: { status: string; payeeType: string }) {
  const statuses = [
    { value: '', label: 'All' },
    { value: 'not_submitted', label: 'Not Submitted' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'expired', label: 'Expired' },
  ]

  const payeeTypes = [
    { value: '', label: 'All Types' },
    { value: 'creator', label: 'Creator' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'vendor', label: 'Vendor' },
  ]

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={`/admin/tax/w9-status?${new URLSearchParams({
                ...(s.value ? { status: s.value } : {}),
                ...(payeeType ? { payee_type: payeeType } : {}),
              }).toString()}`}
            >
              <Button
                variant={status === s.value ? 'default' : 'outline'}
                size="sm"
              >
                {s.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Type:</span>
        <div className="flex gap-1">
          {payeeTypes.map((t) => (
            <Link
              key={t.value}
              href={`/admin/tax/w9-status?${new URLSearchParams({
                ...(status ? { status } : {}),
                ...(t.value ? { payee_type: t.value } : {}),
              }).toString()}`}
            >
              <Button
                variant={payeeType === t.value ? 'default' : 'outline'}
                size="sm"
              >
                {t.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function W9StatsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">No tenant configured</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Query W-9 status stats
  // We need to count all payees who have received payments and check their W-9 status
  const stats = await withTenant(tenantSlug, async () => {
    // Count creators with W-9 status
    const creatorStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(tp.id) as has_w9,
        COUNT(CASE WHEN wct.completed_at IS NOT NULL THEN 1 END) as approved,
        COUNT(CASE WHEN wct.completed_at IS NULL AND wct.initial_sent_at IS NOT NULL THEN 1 END) as pending,
        COUNT(CASE WHEN tp.w9_certified_at < NOW() - INTERVAL '3 years' THEN 1 END) as expired
      FROM creators c
      LEFT JOIN tax_payees tp ON tp.payee_id = c.id AND tp.payee_type = 'creator'
      LEFT JOIN w9_compliance_tracking wct ON wct.payee_id = c.id AND wct.payee_type = 'creator'
      WHERE c.status IN ('active', 'approved')
    `

    const contractorStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(tp.id) as has_w9,
        COUNT(CASE WHEN wct.completed_at IS NOT NULL THEN 1 END) as approved,
        COUNT(CASE WHEN wct.completed_at IS NULL AND wct.initial_sent_at IS NOT NULL THEN 1 END) as pending,
        COUNT(CASE WHEN tp.w9_certified_at < NOW() - INTERVAL '3 years' THEN 1 END) as expired
      FROM contractors con
      LEFT JOIN tax_payees tp ON tp.payee_id = con.id AND tp.payee_type = 'contractor'
      LEFT JOIN w9_compliance_tracking wct ON wct.payee_id = con.id AND wct.payee_type = 'contractor'
      WHERE con.status = 'active'
    `

    const cRow = creatorStats.rows[0]
    const conRow = contractorStats.rows[0]

    const total = Number(cRow?.total || 0) + Number(conRow?.total || 0)
    const hasW9 = Number(cRow?.has_w9 || 0) + Number(conRow?.has_w9 || 0)
    const approved = Number(cRow?.approved || 0) + Number(conRow?.approved || 0)
    const pending = Number(cRow?.pending || 0) + Number(conRow?.pending || 0)
    const expired = Number(cRow?.expired || 0) + Number(conRow?.expired || 0)
    const notSubmitted = total - hasW9

    return {
      total,
      notSubmitted,
      pendingReview: pending,
      approved,
      expired,
    }
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Payees</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-red-600">{stats.notSubmitted}</div>
          <div className="text-sm text-muted-foreground">Not Submitted</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
          <div className="text-sm text-muted-foreground">Expired</div>
        </CardContent>
      </Card>
    </div>
  )
}

interface W9Payee {
  id: string
  payeeId: string
  payeeType: string
  name: string
  email: string
  w9Status: string
  tinLastFour: string | null
  certifiedAt: string | null
  remindersSent: number
}

async function W9ListLoader({
  page,
  status,
  payeeType,
}: {
  page: number
  status: string
  payeeType: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const limit = 50
  const offset = (page - 1) * limit

  const { payees, totalCount } = await withTenant(tenantSlug, async () => {
    const results: W9Payee[] = []
    let total = 0

    // Query creators (if payeeType is empty or 'creator')
    if (!payeeType || payeeType === 'creator') {
      const creatorResult = await sql`
        SELECT
          c.id,
          c.id as payee_id,
          'creator' as payee_type,
          CONCAT(c.first_name, ' ', c.last_name) as name,
          c.email,
          tp.tin_last_four,
          tp.w9_certified_at,
          wct.completed_at,
          COALESCE(
            (CASE WHEN wct.final_notice_sent_at IS NOT NULL THEN 4
                  WHEN wct.reminder_2_sent_at IS NOT NULL THEN 3
                  WHEN wct.reminder_1_sent_at IS NOT NULL THEN 2
                  WHEN wct.initial_sent_at IS NOT NULL THEN 1
                  ELSE 0 END), 0
          ) as reminders_sent,
          CASE
            WHEN tp.id IS NULL THEN 'not_submitted'
            WHEN wct.completed_at IS NOT NULL THEN 'approved'
            WHEN tp.w9_certified_at < NOW() - INTERVAL '3 years' THEN 'expired'
            WHEN tp.id IS NOT NULL AND wct.completed_at IS NULL THEN 'pending_review'
            ELSE 'not_submitted'
          END as w9_status
        FROM creators c
        LEFT JOIN tax_payees tp ON tp.payee_id = c.id AND tp.payee_type = 'creator'
        LEFT JOIN w9_compliance_tracking wct ON wct.payee_id = c.id AND wct.payee_type = 'creator'
        WHERE c.status IN ('active', 'approved')
        ORDER BY c.created_at DESC
      `

      for (const row of creatorResult.rows) {
        const w9Status = String(row.w9_status || 'not_submitted')
        // Filter by status if provided
        if (!status || w9Status === status) {
          let certifiedAtValue: string | null = null
          if (row.w9_certified_at) {
            const isoDate = new Date(String(row.w9_certified_at)).toISOString()
            certifiedAtValue = isoDate.split('T')[0] ?? null
          }
          results.push({
            id: String(row.id),
            payeeId: String(row.payee_id),
            payeeType: 'creator',
            name: String(row.name || ''),
            email: String(row.email || ''),
            w9Status,
            tinLastFour: row.tin_last_four ? String(row.tin_last_four) : null,
            certifiedAt: certifiedAtValue,
            remindersSent: Number(row.reminders_sent || 0),
          })
        }
      }
    }

    // Query contractors (if payeeType is empty or 'contractor')
    if (!payeeType || payeeType === 'contractor') {
      const contractorResult = await sql`
        SELECT
          con.id,
          con.id as payee_id,
          'contractor' as payee_type,
          con.name,
          con.email,
          tp.tin_last_four,
          tp.w9_certified_at,
          wct.completed_at,
          COALESCE(
            (CASE WHEN wct.final_notice_sent_at IS NOT NULL THEN 4
                  WHEN wct.reminder_2_sent_at IS NOT NULL THEN 3
                  WHEN wct.reminder_1_sent_at IS NOT NULL THEN 2
                  WHEN wct.initial_sent_at IS NOT NULL THEN 1
                  ELSE 0 END), 0
          ) as reminders_sent,
          CASE
            WHEN tp.id IS NULL THEN 'not_submitted'
            WHEN wct.completed_at IS NOT NULL THEN 'approved'
            WHEN tp.w9_certified_at < NOW() - INTERVAL '3 years' THEN 'expired'
            WHEN tp.id IS NOT NULL AND wct.completed_at IS NULL THEN 'pending_review'
            ELSE 'not_submitted'
          END as w9_status
        FROM contractors con
        LEFT JOIN tax_payees tp ON tp.payee_id = con.id AND tp.payee_type = 'contractor'
        LEFT JOIN w9_compliance_tracking wct ON wct.payee_id = con.id AND wct.payee_type = 'contractor'
        WHERE con.status = 'active'
        ORDER BY con.created_at DESC
      `

      for (const row of contractorResult.rows) {
        const w9Status = String(row.w9_status || 'not_submitted')
        if (!status || w9Status === status) {
          let certifiedAtValue: string | null = null
          if (row.w9_certified_at) {
            const isoDate = new Date(String(row.w9_certified_at)).toISOString()
            certifiedAtValue = isoDate.split('T')[0] ?? null
          }
          results.push({
            id: String(row.id),
            payeeId: String(row.payee_id),
            payeeType: 'contractor',
            name: String(row.name || ''),
            email: String(row.email || ''),
            w9Status,
            tinLastFour: row.tin_last_four ? String(row.tin_last_four) : null,
            certifiedAt: certifiedAtValue,
            remindersSent: Number(row.reminders_sent || 0),
          })
        }
      }
    }

    total = results.length
    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit)

    return {
      payees: paginatedResults,
      totalCount: total,
    }
  })

  const totalPages = Math.ceil(totalCount / limit)

  if (payees.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          No payees found matching the selected filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Payee</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">W-9 Status</th>
              <th className="px-4 py-3 text-left font-medium">TIN</th>
              <th className="px-4 py-3 text-left font-medium">Certified</th>
              <th className="px-4 py-3 text-left font-medium">Reminders</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payees.map((payee) => (
              <tr key={payee.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{payee.name}</div>
                  <div className="text-xs text-muted-foreground">{payee.email}</div>
                </td>
                <td className="px-4 py-3 capitalize">{payee.payeeType}</td>
                <td className="px-4 py-3">
                  <W9StatusBadge status={payee.w9Status} />
                </td>
                <td className="px-4 py-3 font-mono">
                  {payee.tinLastFour ? `***-**-${payee.tinLastFour}` : '-'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {payee.certifiedAt || '-'}
                </td>
                <td className="px-4 py-3">
                  {payee.remindersSent > 0 && (
                    <Badge variant="secondary">{payee.remindersSent} sent</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {payee.w9Status === 'pending_review' && (
                      <>
                        <Button size="sm" variant="outline">
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost">
                          Reject
                        </Button>
                      </>
                    )}
                    {payee.w9Status === 'not_submitted' && (
                      <Button size="sm" variant="outline">
                        Send Reminder
                      </Button>
                    )}
                    {payee.w9Status === 'expired' && (
                      <Button size="sm" variant="outline">
                        Request Update
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
        basePath="/admin/tax/w9-status"
        currentFilters={{ status, payee_type: payeeType }}
      />
    </div>
  )
}

function W9StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    not_submitted: 'destructive',
    pending_review: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    expired: 'outline',
  }

  const labels: Record<string, string> = {
    not_submitted: 'Not Submitted',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
