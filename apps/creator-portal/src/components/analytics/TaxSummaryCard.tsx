'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from '@cgk-platform/ui'
import Link from 'next/link'

interface TaxSummaryData {
  year: number
  ytd: {
    totalEarnedCents: number
    commissionsCents: number
    projectsCents: number
    bonusesCents: number
  }
  threshold1099Cents: number
  meetsThreshold: boolean
  progressToThreshold: number
  w9: {
    status: string
    submittedAt: string | null
    needsSubmission: boolean
    taxIdLastFour: string | null
    taxClassification: string | null
  }
  annualSummaries: Array<{
    year: number
    totalEarnedCents: number
    requires1099: boolean
    form1099Status: string
  }>
  quarterlyBreakdown: Array<{
    quarter: string
    totalCents: number
  }>
}

interface TaxSummaryCardProps {
  data: TaxSummaryData
  onDownloadSummary?: (year: number) => void
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Get status badge variant
 */
function getW9StatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default'
    case 'pending':
    case 'submitted':
      return 'secondary'
    case 'rejected':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get status label
 */
function getW9StatusLabel(status: string): string {
  const labels: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending Review',
    submitted: 'Submitted',
    rejected: 'Rejected',
    not_submitted: 'Not Submitted',
  }
  return labels[status] || status
}

export function TaxSummaryCard({
  data,
  onDownloadSummary,
}: TaxSummaryCardProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* YTD Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data.year} Tax Summary</span>
            <Badge variant={data.meetsThreshold ? 'default' : 'secondary'}>
              {data.meetsThreshold ? '1099 Required' : 'Below 1099 Threshold'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* YTD Earnings */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Year-to-Date Earnings</span>
              <span className="text-2xl font-bold">{formatCurrency(data.ytd.totalEarnedCents)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">1099 Threshold</span>
                <span>{formatCurrency(data.threshold1099Cents)}</span>
              </div>
              <Progress value={data.progressToThreshold} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.meetsThreshold
                  ? 'You will receive a 1099-NEC form for this year'
                  : `${formatCurrency(data.threshold1099Cents - data.ytd.totalEarnedCents)} more to reach 1099 threshold`}
              </p>
            </div>
          </div>

          {/* W-9 Status */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">W-9 Form Status</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.w9.taxIdLastFour
                    ? `Tax ID ending in ${data.w9.taxIdLastFour}`
                    : 'No tax information on file'}
                </p>
              </div>
              <Badge variant={getW9StatusVariant(data.w9.status)}>
                {getW9StatusLabel(data.w9.status)}
              </Badge>
            </div>
            {data.w9.needsSubmission && (
              <div className="mt-4">
                <Link href="/settings/tax">
                  <Button size="sm">Submit W-9</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Quarterly Breakdown */}
          <div>
            <h4 className="mb-3 font-medium">Quarterly Breakdown</h4>
            <div className="grid grid-cols-4 gap-2">
              {data.quarterlyBreakdown.map((q) => (
                <div key={q.quarter} className="rounded-lg border p-3 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{q.quarter}</p>
                  <p className="mt-1 font-bold">{formatCurrency(q.totalCents)}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annual Summaries */}
      {data.annualSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Annual Summaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.annualSummaries.map((summary) => (
                <div
                  key={summary.year}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{summary.year}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(summary.totalEarnedCents)} earned
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {summary.requires1099 && (
                      <Badge
                        variant={summary.form1099Status === 'sent' ? 'default' : 'secondary'}
                      >
                        1099: {summary.form1099Status}
                      </Badge>
                    )}
                    {onDownloadSummary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadSummary(summary.year)}
                      >
                        Download Summary
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
