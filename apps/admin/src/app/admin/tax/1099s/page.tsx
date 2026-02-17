import { Badge, Button, Card, CardContent } from '@cgk-platform/ui'
import { sql, withTenant } from '@cgk-platform/db'
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

interface TaxForm {
  id: string
  recipientName: string
  payeeType: string
  formType: string
  totalAmountCents: number
  status: string
  createdAt: string
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

  const limit = 50
  const offset = (page - 1) * limit

  const { forms, totalCount } = await withTenant(tenantSlug, async () => {
    // Query with or without status filter
    if (status) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM tax_forms
        WHERE tax_year = ${taxYear} AND status = ${status}
      `
      const result = await sql`
        SELECT
          tf.id,
          tf.recipient_name,
          tf.payee_type,
          tf.form_type,
          tf.total_amount_cents,
          tf.status,
          tf.created_at
        FROM tax_forms tf
        WHERE tf.tax_year = ${taxYear}
          AND tf.status = ${status}
        ORDER BY tf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countRow = countResult.rows[0]
      return {
        forms: result.rows.map((row) => ({
          id: String(row.id),
          recipientName: String(row.recipient_name || ''),
          payeeType: String(row.payee_type || ''),
          formType: String(row.form_type || ''),
          totalAmountCents: Number(row.total_amount_cents || 0),
          status: String(row.status || ''),
          createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        })) as TaxForm[],
        totalCount: Number(countRow?.count || 0),
      }
    } else {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM tax_forms
        WHERE tax_year = ${taxYear}
      `
      const result = await sql`
        SELECT
          tf.id,
          tf.recipient_name,
          tf.payee_type,
          tf.form_type,
          tf.total_amount_cents,
          tf.status,
          tf.created_at
        FROM tax_forms tf
        WHERE tf.tax_year = ${taxYear}
        ORDER BY tf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countRow = countResult.rows[0]
      return {
        forms: result.rows.map((row) => ({
          id: String(row.id),
          recipientName: String(row.recipient_name || ''),
          payeeType: String(row.payee_type || ''),
          formType: String(row.form_type || ''),
          totalAmountCents: Number(row.total_amount_cents || 0),
          status: String(row.status || ''),
          createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        })) as TaxForm[],
        totalCount: Number(countRow?.count || 0),
      }
    }
  })

  const totalPages = Math.ceil(totalCount / limit)

  if (forms.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          No 1099 forms found for tax year {taxYear}.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate 1099 forms from the Annual Payments page for payees who exceeded the $600 threshold.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} forms found
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
            {forms.map((form) => (
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
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
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
