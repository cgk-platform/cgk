'use client'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { useState } from 'react'

interface ExportActionsProps {
  onExportTransactions: (startDate?: string, endDate?: string, types?: string[]) => Promise<void>
  onExportAnnualSummary: (year: number) => Promise<void>
}

export function ExportActions({
  onExportTransactions,
  onExportAnnualSummary,
}: ExportActionsProps): React.JSX.Element {
  const [isExportingTransactions, setIsExportingTransactions] = useState(false)
  const [isExportingSummary, setIsExportingSummary] = useState(false)
  const [exportYear, setExportYear] = useState(new Date().getFullYear() - 1)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const handleExportTransactions = async (): Promise<void> => {
    setIsExportingTransactions(true)
    try {
      await onExportTransactions()
    } finally {
      setIsExportingTransactions(false)
    }
  }

  const handleExportSummary = async (): Promise<void> => {
    setIsExportingSummary(true)
    try {
      await onExportAnnualSummary(exportYear)
    } finally {
      setIsExportingSummary(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Export */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium">Transaction History</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Download all transactions as a CSV file. Includes dates, amounts, types, and
                reference IDs.
              </p>
            </div>
            <Button
              onClick={handleExportTransactions}
              disabled={isExportingTransactions}
              variant="outline"
            >
              {isExportingTransactions ? (
                <>
                  <DownloadingIcon className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Download CSV
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Annual Summary Export */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-medium">Annual Earnings Summary</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Download a detailed summary for a specific year. Useful for tax records.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={exportYear}
                onChange={(e) => setExportYear(parseInt(e.target.value, 10))}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                aria-label="Select year"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleExportSummary}
                disabled={isExportingSummary}
                variant="outline"
              >
                {isExportingSummary ? (
                  <>
                    <DownloadingIcon className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileIcon className="mr-2 h-4 w-4" />
                    Download Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* GDPR Export Notice */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium">Full Data Export</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Need a complete export of all your data? Contact support to request a full data
            package (GDPR compliant). Processing may take up to 30 days.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DownloadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function DownloadingIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2v4" />
      <path d="m16.24 7.76-2.12 2.12" />
      <path d="M20.49 12h-4" />
      <path d="m16.24 16.24-2.12-2.12" />
      <path d="M12 20.49v-4" />
      <path d="m7.76 16.24 2.12-2.12" />
      <path d="M3.51 12h4" />
      <path d="m7.76 7.76 2.12 2.12" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
