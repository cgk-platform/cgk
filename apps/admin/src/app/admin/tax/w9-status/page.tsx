import { Badge, Button, Card, CardContent } from '@cgk/ui'
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
  // Headers available for future tenant context
  void (await headers())

  // Mock stats
  const stats = {
    total: 150,
    notSubmitted: 25,
    pendingReview: 10,
    approved: 110,
    expired: 5,
  }

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

async function W9ListLoader({
  page,
  status,
  payeeType,
}: {
  page: number
  status: string
  payeeType: string
}) {
  // Headers available for future tenant context
  void (await headers())

  // Mock data
  const payees = [
    {
      id: '1',
      payeeId: 'creator_123',
      payeeType: 'creator',
      name: 'John Creator',
      email: 'john@example.com',
      w9Status: 'approved',
      tinLastFour: '1234',
      certifiedAt: '2024-06-15',
      remindersSent: 0,
    },
    {
      id: '2',
      payeeId: 'creator_456',
      payeeType: 'creator',
      name: 'Jane Smith',
      email: 'jane@example.com',
      w9Status: 'not_submitted',
      tinLastFour: null,
      certifiedAt: null,
      remindersSent: 2,
    },
    {
      id: '3',
      payeeId: 'contractor_789',
      payeeType: 'contractor',
      name: 'Bob Contractor',
      email: 'bob@example.com',
      w9Status: 'pending_review',
      tinLastFour: '5678',
      certifiedAt: null,
      remindersSent: 0,
    },
  ]

  let filteredPayees = payees
  if (status) {
    filteredPayees = filteredPayees.filter((p) => p.w9Status === status)
  }
  if (payeeType) {
    filteredPayees = filteredPayees.filter((p) => p.payeeType === payeeType)
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
            {filteredPayees.map((payee) => (
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
        totalPages={1}
        totalCount={filteredPayees.length}
        limit={50}
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
