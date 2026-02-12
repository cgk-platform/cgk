'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from '@cgk/ui'

interface Balance {
  pendingCents: number
  availableCents: number
  paidCents: number
}

interface PaymentRequest {
  id: string
  amountCents: number
  description: string
  workType: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  createdAt: string
  reviewedAt: string | null
  paidAt: string | null
  rejectionReason: string | null
}

interface Withdrawal {
  id: string
  amountCents: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payoutMethod: {
    type: string
    paypalEmail?: string
    venmoHandle?: string
    accountLastFour?: string
  } | null
  createdAt: string
  processedAt: string | null
  failureReason: string | null
}

interface PayoutMethod {
  id: string
  type: string
  isDefault: boolean
  status: string
  stripePayoutsEnabled: boolean
  stripeRequirementsDue: string[]
}

interface W9Status {
  required: boolean
  submitted: boolean
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'approved':
    case 'completed':
      return 'success'
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return 'destructive'
    case 'paid':
    case 'processing':
      return 'info'
    default:
      return 'default'
  }
}

export default function PaymentsPage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([])
  const [w9Status, setW9Status] = useState<W9Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, requestsRes, withdrawalsRes, methodsRes] = await Promise.all([
          fetch('/api/contractor/payments/balance'),
          fetch('/api/contractor/payments/request?limit=10'),
          fetch('/api/contractor/payments/withdraw?limit=10'),
          fetch('/api/contractor/payments/methods'),
        ])

        if (!balanceRes.ok || !requestsRes.ok || !withdrawalsRes.ok || !methodsRes.ok) {
          throw new Error('Failed to fetch payment data')
        }

        const [balanceData, requestsData, withdrawalsData, methodsData] = await Promise.all([
          balanceRes.json(),
          requestsRes.json(),
          withdrawalsRes.json(),
          methodsRes.json(),
        ])

        setBalance(balanceData.balance)
        setPaymentRequests(requestsData.requests)
        setWithdrawals(withdrawalsData.withdrawals)
        setPayoutMethods(methodsData.methods)
        setW9Status(methodsData.w9Status)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const hasPayoutMethod = payoutMethods.length > 0
  const hasActivePayoutMethod = payoutMethods.some(
    (m) => m.status === 'active' && (m.type !== 'stripe_connect' || m.stripePayoutsEnabled)
  )
  const needsStripeSetup = payoutMethods.some(
    (m) => m.type === 'stripe_connect' && !m.stripePayoutsEnabled && m.stripeRequirementsDue.length > 0
  )
  const needsW9 = w9Status?.required && !w9Status?.submitted

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage your balance and payment requests</p>
        </div>
        <div className="flex gap-3">
          <Link href="/request-payment">
            <Button>Request Payment</Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {needsW9 && (
        <Alert variant="warning">
          <AlertTitle>W-9 Required</AlertTitle>
          <AlertDescription>
            You need to submit a W-9 form before you can receive payouts.{' '}
            <Link href="/settings/tax" className="font-medium underline">
              Submit W-9
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!hasPayoutMethod && (
        <Alert variant="warning">
          <AlertTitle>No Payout Method</AlertTitle>
          <AlertDescription>
            Add a payout method to receive payments.{' '}
            <Link href="/settings/payout-methods" className="font-medium underline">
              Add Payout Method
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {needsStripeSetup && (
        <Alert variant="warning">
          <AlertTitle>Complete Stripe Setup</AlertTitle>
          <AlertDescription>
            Your Stripe account needs additional information before you can receive payouts.{' '}
            <Link href="/settings/payout-methods/stripe-setup" className="font-medium underline">
              Complete Setup
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {balance ? formatCents(balance.pendingCents) : '$0.00'}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {balance ? formatCents(balance.availableCents) : '$0.00'}
            </p>
            <p className="text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {balance ? formatCents(balance.paidCents) : '$0.00'}
            </p>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      {balance && balance.availableCents > 0 && hasActivePayoutMethod && !needsW9 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Ready to withdraw</p>
              <p className="text-sm text-muted-foreground">
                You have {formatCents(balance.availableCents)} available
              </p>
            </div>
            <WithdrawButton
              availableCents={balance.availableCents}
              defaultMethodId={payoutMethods.find((m) => m.isDefault)?.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Requests</CardTitle>
          <Link href="/request-payment">
            <Button variant="outline" size="sm">New Request</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {paymentRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payment requests yet.{' '}
              <Link href="/request-payment" className="text-primary underline">
                Submit your first request
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {paymentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{formatCents(request.amountCents)}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {request.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                    {request.rejectionReason && (
                      <p className="text-xs text-destructive mt-1">{request.rejectionReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No withdrawals yet</p>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{formatCents(withdrawal.amountCents)}</p>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.payoutMethod?.type === 'paypal'
                        ? `PayPal (${withdrawal.payoutMethod.paypalEmail})`
                        : withdrawal.payoutMethod?.type === 'venmo'
                          ? `Venmo (@${withdrawal.payoutMethod.venmoHandle})`
                          : withdrawal.payoutMethod?.type === 'stripe_connect'
                            ? `Bank (...${withdrawal.payoutMethod.accountLastFour || 'XXXX'})`
                            : withdrawal.payoutMethod?.type || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(withdrawal.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(withdrawal.status)}>
                      {withdrawal.status}
                    </Badge>
                    {withdrawal.failureReason && (
                      <p className="text-xs text-destructive mt-1">{withdrawal.failureReason}</p>
                    )}
                    {withdrawal.processedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Processed {formatDate(withdrawal.processedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WithdrawButton({
  availableCents,
  defaultMethodId,
}: {
  availableCents: number
  defaultMethodId?: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleWithdraw() {
    if (!defaultMethodId) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/contractor/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutMethodId: defaultMethodId,
          withdrawAll: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to request withdrawal')
      }

      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request withdrawal')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleWithdraw} disabled={isLoading || !defaultMethodId}>
      {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
      Withdraw {formatCents(availableCents)}
    </Button>
  )
}
