'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge,
} from '@cgk-platform/ui'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Mail,
  MapPin,
  Pause,
  Play,
  SkipForward,
  User,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { formatDateTime, formatMoney } from '@/lib/format'

import type {
  Subscription,
  SubscriptionOrder,
  SubscriptionActivity,
} from '@/lib/subscriptions/types'

interface SubscriptionDetailData {
  subscription: Subscription
  orders: SubscriptionOrder[]
  activity: SubscriptionActivity[]
}

export default function SubscriptionDetailPage() {
  const params = useParams()
  const subscriptionId = params.id as string

  const [data, setData] = useState<SubscriptionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`)
        if (!response.ok) {
          throw new Error('Failed to load subscription')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [subscriptionId])

  async function handleAction(action: string, body?: Record<string, unknown>) {
    setActionLoading(action)
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || `Failed to ${action}`)
      }
      // Reload data
      const dataResponse = await fetch(`/api/admin/subscriptions/${subscriptionId}`)
      const result = await dataResponse.json()
      setData(result)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="h-40 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/commerce/subscriptions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Subscriptions
        </Link>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error || 'Subscription not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscription, orders, activity } = data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/commerce/subscriptions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Subscription Details</h1>
          <StatusBadge status={subscription.status} showDot />
        </div>
        <div className="flex gap-2">
          {subscription.status === 'active' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('skip')}
                disabled={actionLoading !== null}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {actionLoading === 'skip' ? 'Skipping...' : 'Skip Next Order'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const reason = prompt('Pause reason:')
                  if (reason) handleAction('pause', { reason })
                }}
                disabled={actionLoading !== null}
              >
                <Pause className="mr-2 h-4 w-4" />
                {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const reason = prompt('Cancellation reason:')
                  if (reason) handleAction('cancel', { reason })
                }}
                disabled={actionLoading !== null}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
              </Button>
            </>
          )}
          {subscription.status === 'paused' && (
            <Button
              size="sm"
              onClick={() => handleAction('resume')}
              disabled={actionLoading !== null}
            >
              <Play className="mr-2 h-4 w-4" />
              {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{subscription.productTitle}</div>
                  {subscription.variantTitle && (
                    <div className="text-muted-foreground">{subscription.variantTitle}</div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">Quantity: {subscription.quantity}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {formatMoney(subscription.priceCents, subscription.currency)}
                  </div>
                  {subscription.discountCents > 0 && (
                    <div className="text-sm text-success">
                      -{formatMoney(subscription.discountCents, subscription.currency)} discount
                    </div>
                  )}
                  <Badge variant="secondary" className="mt-2">
                    {subscription.frequency}
                    {subscription.frequencyInterval > 1 && ` (every ${subscription.frequencyInterval})`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Next Billing</dt>
                  <dd className="font-medium">
                    {subscription.nextBillingDate
                      ? formatDateTime(subscription.nextBillingDate)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Billing</dt>
                  <dd className="font-medium">
                    {subscription.lastBillingDate
                      ? formatDateTime(subscription.lastBillingDate)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total Orders</dt>
                  <dd className="font-medium">{subscription.totalOrders}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total Spent</dt>
                  <dd className="font-medium">
                    {formatMoney(subscription.totalSpentCents, subscription.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Skipped Orders</dt>
                  <dd className="font-medium">{subscription.skippedOrders}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd className="font-medium">{formatDateTime(subscription.startedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>{orders.length} orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground">No orders yet</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium">
                          {formatDateTime(order.scheduledAt)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(order.amountCents, order.currency)}
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-muted-foreground">No activity recorded</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <div className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">{entry.activityType}</span>
                        {entry.description && (
                          <span className="text-muted-foreground"> - {entry.description}</span>
                        )}
                        {entry.actorName && (
                          <span className="text-muted-foreground"> by {entry.actorName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                {subscription.customerName && (
                  <div className="font-medium">{subscription.customerName}</div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {subscription.customerEmail}
                </div>
              </div>
              <Link
                href={`/admin/commerce/customers/${subscription.customerId}`}
                className="text-sm text-primary hover:underline"
              >
                View Customer Profile
              </Link>
            </CardContent>
          </Card>

          {/* Payment Method */}
          {subscription.paymentMethodLast4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">
                    {subscription.paymentMethodBrand || 'Card'}
                  </span>
                  <span className="text-muted-foreground">
                    **** {subscription.paymentMethodLast4}
                  </span>
                </div>
                {subscription.paymentMethodExpMonth && subscription.paymentMethodExpYear && (
                  <div className="text-sm text-muted-foreground">
                    Expires {subscription.paymentMethodExpMonth}/{subscription.paymentMethodExpYear}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {subscription.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="text-sm not-italic">
                  {subscription.shippingAddress.firstName} {subscription.shippingAddress.lastName}
                  <br />
                  {subscription.shippingAddress.address1}
                  {subscription.shippingAddress.address2 && (
                    <>
                      <br />
                      {subscription.shippingAddress.address2}
                    </>
                  )}
                  <br />
                  {subscription.shippingAddress.city}, {subscription.shippingAddress.provinceCode}{' '}
                  {subscription.shippingAddress.zip}
                  <br />
                  {subscription.shippingAddress.country}
                </address>
              </CardContent>
            </Card>
          )}

          {/* Status Info (for paused/cancelled) */}
          {subscription.status === 'paused' && (
            <Card>
              <CardHeader>
                <CardTitle>Pause Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Paused at: </span>
                  {subscription.pausedAt ? formatDateTime(subscription.pausedAt) : '—'}
                </div>
                {subscription.pauseReason && (
                  <div>
                    <span className="text-muted-foreground">Reason: </span>
                    {subscription.pauseReason}
                  </div>
                )}
                {subscription.autoResumeAt && (
                  <div>
                    <span className="text-muted-foreground">Auto-resume: </span>
                    {formatDateTime(subscription.autoResumeAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {subscription.status === 'cancelled' && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cancelled at: </span>
                  {subscription.cancelledAt ? formatDateTime(subscription.cancelledAt) : '—'}
                </div>
                {subscription.cancelReason && (
                  <div>
                    <span className="text-muted-foreground">Reason: </span>
                    {subscription.cancelReason}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {subscription.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{subscription.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {subscription.tags && subscription.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {subscription.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
