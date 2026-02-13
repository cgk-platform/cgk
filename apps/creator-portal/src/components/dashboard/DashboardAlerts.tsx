'use client'

import { Alert, AlertDescription, AlertTitle } from '@cgk-platform/ui'
import Link from 'next/link'


interface DashboardAlertsProps {
  taxFormPending: boolean
  unsignedContractsCount: number
}

export function DashboardAlerts({
  taxFormPending,
  unsignedContractsCount,
}: DashboardAlertsProps): React.JSX.Element | null {
  if (!taxFormPending && unsignedContractsCount === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {taxFormPending && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Tax Form Required
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Please submit your W-9 tax form to receive payouts.{' '}
            <Link
              href="/settings/tax"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Submit now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {unsignedContractsCount > 0 && (
        <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Contracts Pending Signature
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            You have {unsignedContractsCount} unsigned{' '}
            {unsignedContractsCount === 1 ? 'contract' : 'contracts'}.{' '}
            <Link
              href="/contracts"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Review and sign
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
