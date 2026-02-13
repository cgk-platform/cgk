import { Badge, Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
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
  // Headers available for future tenant context
  void (await headers())
  void taxYear

  // Mock data - would use @cgk-platform/tax
  const stats = {
    readyToFile: 15,
    filedWithIRS: 8,
    filedWithState: 5,
    delivered: 8,
  }

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
  void taxYear
  // Mock validation result
  const validation = {
    valid: false,
    formCount: 23,
    errors: [
      '1099_abc123: Missing W-9 for payee',
      '1099_def456: Incomplete address',
    ],
  }

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

      <Button variant="outline" size="sm">
        Run Validation
      </Button>
    </div>
  )
}

async function FilingHistoryLoader({ taxYear }: { taxYear: number }) {
  // Mock history
  const history = [
    {
      id: '1',
      date: '2025-01-28',
      action: 'CSV Generated',
      formCount: 23,
      user: 'admin@example.com',
    },
    {
      id: '2',
      date: '2025-01-29',
      action: 'Filed with IRS',
      formCount: 23,
      confirmationNumber: 'IRS-2025-ABC123',
      user: 'admin@example.com',
    },
  ]

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
