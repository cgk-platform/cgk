import { Badge, Button, Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import { formatMoney } from '@/lib/format'

// Server component for 1099 forms list page

export default async function Forms1099Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = (params.status as string) || ''
  const taxYear = Number(params.tax_year) || new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">1099 Forms</h2>
          <p className="text-sm text-muted-foreground">
            Manage 1099-NEC forms for tax year {taxYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/tax/1099s?tax_year=${taxYear - 1}`}>
            <Button variant="outline" size="sm">
              {taxYear - 1}
            </Button>
          </Link>
          <Link href={`/admin/tax/1099s?tax_year=${taxYear}`}>
            <Button
              variant={taxYear === new Date().getFullYear() ? 'default' : 'outline'}
              size="sm"
            >
              {new Date().getFullYear()}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <StatusFilter status={status} taxYear={taxYear} />
      </div>

      <Suspense fallback={<FormsListSkeleton />}>
        <FormsListLoader page={page} status={status} taxYear={taxYear} />
      </Suspense>
    </div>
  )
}

function StatusFilter({ status, taxYear }: { status: string; taxYear: number }) {
  const statuses = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'filed', label: 'Filed' },
  ]

  return (
    <div className="flex gap-1">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={`/admin/tax/1099s?tax_year=${taxYear}${s.value ? `&status=${s.value}` : ''}`}
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
  )
}

async function FormsListLoader({
  page,
  status,
  taxYear,
}: {
  page: number
  status: string
  taxYear: number
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  // Mock data for now - would use @cgk-platform/tax package
  const forms = [
    {
      id: '1099_abc123',
      recipientName: 'John Creator',
      payeeType: 'creator',
      formType: '1099-NEC',
      totalAmountCents: 125000,
      status: 'draft',
      createdAt: new Date().toISOString(),
    },
    {
      id: '1099_def456',
      recipientName: 'Jane Smith',
      payeeType: 'creator',
      formType: '1099-NEC',
      totalAmountCents: 85000,
      status: 'approved',
      createdAt: new Date().toISOString(),
    },
  ]

  const filteredForms = status
    ? forms.filter((f) => f.status === status)
    : forms

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredForms.length} forms found
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Generate All
          </Button>
          <Button size="sm" variant="outline">
            Approve Selected
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-4 py-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left font-medium">Recipient</th>
              <th className="px-4 py-3 text-left font-medium">Form Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredForms.map((form) => (
              <tr key={form.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{form.recipientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {form.payeeType}
                  </div>
                </td>
                <td className="px-4 py-3">{form.formType}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(form.totalAmountCents)}
                </td>
                <td className="px-4 py-3">
                  <FormStatusBadge status={form.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(form.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/tax/1099s/${form.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                    {form.status === 'draft' && (
                      <Button size="sm" variant="outline">
                        Approve
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
        totalCount={filteredForms.length}
        limit={50}
        basePath="/admin/tax/1099s"
        currentFilters={{ tax_year: taxYear, status }}
      />
    </div>
  )
}

function FormStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    pending_review: 'secondary',
    approved: 'default',
    filed: 'default',
    voided: 'destructive',
  }

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    filed: 'Filed',
    voided: 'Voided',
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

function FormsListSkeleton() {
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
