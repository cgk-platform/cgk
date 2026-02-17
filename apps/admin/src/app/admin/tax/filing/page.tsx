import { Badge, Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

// IRS IRIS Filing Workflow Page

export default async function IRSFilingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const taxYear = Number(params.tax_year) || new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">IRS Filing Workflow</h2>
        <p className="text-sm text-muted-foreground">
          File 1099 forms with IRS IRIS for tax year {taxYear}
        </p>
      </div>

      <Suspense fallback={<FilingStatsSkeleton />}>
        <FilingStatsLoader taxYear={taxYear} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Step 1: Validate Forms</h3>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Verify all approved forms have complete W-9 data and valid amounts
              before generating the IRIS CSV file.
            </p>
            <Suspense fallback={<div className="h-24 animate-pulse rounded bg-muted" />}>
              <ValidationSection taxYear={taxYear} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Step 2: Generate IRIS CSV</h3>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Generate the IRS IRIS-compatible CSV file for uploading to the IRS
              Information Returns Intake System.
            </p>
            <div className="flex gap-2">
              <Button>Generate CSV</Button>
              <Button variant="outline">Download Previous</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Step 3: Upload to IRS</h3>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload the generated CSV file to the IRS IRIS system. After
              successful upload, enter the confirmation number below.
            </p>
            <div className="space-y-3">
              <a
                href="https://iris.irs.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button variant="outline">Open IRS IRIS Portal</Button>
              </a>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="IRS Confirmation Number"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                />
                <Button>Mark Filed</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Step 4: Deliver to Recipients</h3>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              After filing with IRS, deliver 1099 forms to recipients via email,
              portal access, or mail.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">Email All</Button>
              <Button variant="outline">Make Available in Portal</Button>
              <Button variant="outline">Queue for Mail</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Filing History</h3>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-32 animate-pulse rounded bg-muted" />}>
            <FilingHistoryLoader taxYear={taxYear} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function FilingStatsLoader({ taxYear }: { taxYear: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">No tenant configured</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(CASE WHEN status = 'approved' AND irs_filed_at IS NULL THEN 1 END) as ready_to_file,
        COUNT(CASE WHEN irs_filed_at IS NOT NULL THEN 1 END) as filed_with_irs,
        COUNT(CASE WHEN state_filed_at IS NOT NULL THEN 1 END) as filed_with_state,
        COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as delivered
      FROM tax_forms
      WHERE tax_year = ${taxYear}
    `
    const row = result.rows[0]
    return {
      readyToFile: Number(row?.ready_to_file || 0),
      filedWithIRS: Number(row?.filed_with_irs || 0),
      filedWithState: Number(row?.filed_with_state || 0),
      delivered: Number(row?.delivered || 0),
    }
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.readyToFile}</div>
          <div className="text-sm text-muted-foreground">Ready to File</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{stats.filedWithIRS}</div>
          <div className="text-sm text-muted-foreground">Filed with IRS</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.filedWithState}</div>
          <div className="text-sm text-muted-foreground">Filed with State</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{stats.delivered}</div>
          <div className="text-sm text-muted-foreground">Delivered</div>
        </CardContent>
      </Card>
    </div>
  )
}

async function ValidationSection({ taxYear }: { taxYear: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  // Query approved forms that need validation before filing
  const validation = await withTenant(tenantSlug, async () => {
    // Get count of approved forms ready for filing
    const formCountResult = await sql`
      SELECT COUNT(*) as count FROM tax_forms
      WHERE tax_year = ${taxYear}
        AND status = 'approved'
        AND irs_filed_at IS NULL
    `

    // Find forms with validation issues
    const errorsResult = await sql`
      SELECT
        tf.id,
        tf.recipient_name,
        CASE
          WHEN tp.id IS NULL THEN 'Missing W-9 for payee'
          WHEN tp.address_line1 IS NULL OR tp.city IS NULL OR tp.state IS NULL THEN 'Incomplete address'
          WHEN tp.tin_encrypted IS NULL THEN 'Missing TIN'
          ELSE NULL
        END as error
      FROM tax_forms tf
      LEFT JOIN tax_payees tp ON tp.payee_id = tf.payee_id AND tp.payee_type = tf.payee_type
      WHERE tf.tax_year = ${taxYear}
        AND tf.status = 'approved'
        AND tf.irs_filed_at IS NULL
        AND (
          tp.id IS NULL
          OR tp.address_line1 IS NULL
          OR tp.city IS NULL
          OR tp.state IS NULL
          OR tp.tin_encrypted IS NULL
        )
      LIMIT 20
    `

    const errors: string[] = []
    for (const row of errorsResult.rows) {
      if (row.error) {
        errors.push(`${row.id}: ${row.error}`)
      }
    }

    return {
      valid: errors.length === 0,
      formCount: Number(formCountResult.rows[0]?.count || 0),
      errors,
    }
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={validation.valid ? 'default' : 'destructive'}>
          {validation.valid ? 'Valid' : `${validation.errors.length} Issues`}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {validation.formCount} forms to validate
        </span>
      </div>

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
          <p className="mb-2 text-sm font-medium text-destructive">
            Please fix these issues before filing:
          </p>
          <ul className="space-y-1 text-xs text-destructive/80">
            {validation.errors.slice(0, 5).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
            {validation.errors.length > 5 && (
              <li>... and {validation.errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {validation.formCount === 0 && (
        <p className="text-sm text-muted-foreground">
          No approved forms ready for filing. Generate and approve 1099 forms first.
        </p>
      )}

      <Button variant="outline" size="sm">
        Run Validation
      </Button>
    </div>
  )
}

interface FilingHistoryItem {
  id: string
  date: string
  action: string
  formCount: number
  confirmationNumber: string | null
  user: string
}

async function FilingHistoryLoader({ taxYear }: { taxYear: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const history = await withTenant(tenantSlug, async () => {
    // Query audit log for filing-related actions
    const result = await sql`
      SELECT
        tal.id,
        tal.created_at,
        tal.action,
        tal.performed_by,
        tal.notes,
        COALESCE((tal.changes->>'form_count')::integer, 1) as form_count,
        tal.changes->>'irs_confirmation_number' as confirmation_number
      FROM tax_form_audit_log tal
      WHERE tal.action IN ('form_filed', 'pdf_generated', 'mail_queued', 'form_delivered')
        AND EXISTS (
          SELECT 1 FROM tax_forms tf
          WHERE tf.id = tal.tax_form_id
            AND tf.tax_year = ${taxYear}
        )
      ORDER BY tal.created_at DESC
      LIMIT 50
    `

    const actionLabels: Record<string, string> = {
      form_filed: 'Filed with IRS',
      pdf_generated: 'CSV/PDF Generated',
      mail_queued: 'Queued for Mail',
      form_delivered: 'Delivered to Recipient',
    }

    return result.rows.map((row) => ({
      id: String(row.id),
      date: row.created_at ? new Date(String(row.created_at)).toISOString().split('T')[0] : '',
      action: actionLabels[String(row.action)] || String(row.action),
      formCount: Number(row.form_count || 1),
      confirmationNumber: row.confirmation_number ? String(row.confirmation_number) : null,
      user: String(row.performed_by || 'System'),
    })) as FilingHistoryItem[]
  })

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No filing history for tax year {taxYear}.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
            <th className="px-4 py-3 text-left font-medium">Forms</th>
            <th className="px-4 py-3 text-left font-medium">Confirmation</th>
            <th className="px-4 py-3 text-left font-medium">User</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {history.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">{item.date}</td>
              <td className="px-4 py-3">{item.action}</td>
              <td className="px-4 py-3">{item.formCount}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {item.confirmationNumber || '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{item.user}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FilingStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
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
