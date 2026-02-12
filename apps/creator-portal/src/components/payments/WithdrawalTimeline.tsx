'use client'

/**
 * Withdrawal Timeline Component
 *
 * Shows the progress of an active withdrawal request.
 */

interface Withdrawal {
  id: string
  amount: number
  currency: string
  payoutType: 'cash' | 'store_credit'
  storeCreditBonus?: number
  status: string
  provider?: string
  estimatedArrival?: string
  createdAt: string
}

interface WithdrawalTimelineProps {
  withdrawal: Withdrawal
}

interface TimelineStep {
  label: string
  description: string
  status: 'completed' | 'current' | 'upcoming' | 'error'
  timestamp?: string
}

export default function WithdrawalTimeline({
  withdrawal,
}: WithdrawalTimelineProps): React.JSX.Element {
  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: withdrawal.currency || 'USD',
    }).format(cents / 100)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getSteps(): TimelineStep[] {
    const baseSteps: TimelineStep[] = [
      {
        label: 'Requested',
        description: 'Withdrawal request submitted',
        status: 'completed',
        timestamp: withdrawal.createdAt,
      },
    ]

    // Add pending topup step for international (Wise) transfers
    const isInternational = withdrawal.provider === 'wise'

    if (isInternational) {
      baseSteps.push({
        label: 'Pending Top-up',
        description: 'Funding transfer in progress',
        status: withdrawal.status === 'pending_topup' ? 'current' :
               ['processing', 'completed'].includes(withdrawal.status) ? 'completed' : 'upcoming',
      })
    }

    // Processing step
    baseSteps.push({
      label: 'Processing',
      description: 'Transfer initiated',
      status: withdrawal.status === 'processing' ? 'current' :
             withdrawal.status === 'completed' ? 'completed' : 'upcoming',
    })

    // Final step depends on status
    if (withdrawal.status === 'rejected') {
      baseSteps.push({
        label: 'Rejected',
        description: 'Withdrawal request was rejected',
        status: 'error',
      })
    } else if (withdrawal.status === 'failed') {
      baseSteps.push({
        label: 'Failed',
        description: 'Transfer could not be completed',
        status: 'error',
      })
    } else {
      baseSteps.push({
        label: 'Completed',
        description: withdrawal.payoutType === 'store_credit'
          ? 'Store credit applied to your account'
          : 'Funds deposited to your account',
        status: withdrawal.status === 'completed' ? 'completed' : 'upcoming',
      })
    }

    return baseSteps
  }

  const steps = getSteps()
  const isError = ['rejected', 'failed'].includes(withdrawal.status)
  const totalAmount = withdrawal.payoutType === 'store_credit' && withdrawal.storeCreditBonus
    ? withdrawal.amount + withdrawal.storeCreditBonus
    : withdrawal.amount

  return (
    <div className="space-y-4">
      {/* Amount Summary */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Withdrawal Amount</p>
          <p className="text-xl font-bold">{formatCurrency(withdrawal.amount)}</p>
          {withdrawal.payoutType === 'store_credit' && withdrawal.storeCreditBonus && (
            <p className="text-sm text-green-600">
              +{formatCurrency(withdrawal.storeCreditBonus)} bonus = {formatCurrency(totalAmount)} total
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="font-medium capitalize">{withdrawal.payoutType.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Estimated Arrival */}
      {withdrawal.estimatedArrival && !isError && withdrawal.status !== 'completed' && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <p>Estimated arrival: {formatDate(withdrawal.estimatedArrival)}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-3 top-6 h-full w-0.5 -translate-x-1/2 ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'error' ? 'bg-red-500' :
                  'bg-muted'
                }`}
              />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                step.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : step.status === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : step.status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.status === 'completed' ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : step.status === 'current' ? (
                <svg className="h-3 w-3 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="6" />
                </svg>
              ) : step.status === 'error' ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <p
                className={`font-medium ${
                  step.status === 'error' ? 'text-red-600' :
                  step.status === 'upcoming' ? 'text-muted-foreground' : ''
                }`}
              >
                {step.label}
              </p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {step.timestamp && (
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(step.timestamp)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {isError && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          <p className="font-medium">
            {withdrawal.status === 'rejected'
              ? 'This withdrawal request was rejected.'
              : 'The transfer could not be completed.'}
          </p>
          <p className="mt-1 text-sm">
            Your funds have been returned to your available balance.
            Please contact support if you have questions.
          </p>
        </div>
      )}
    </div>
  )
}
