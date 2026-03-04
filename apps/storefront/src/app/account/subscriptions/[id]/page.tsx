/**
 * Subscription Detail Page
 *
 * Shows full subscription details with all management options:
 * - Products list with swap/quantity controls
 * - Order summary and pricing
 * - Shipping address
 * - Payment method
 * - Frequency selector
 * - Action buttons (pause, skip, cancel, etc.)
 * - Order history
 */

import { Container, Spinner } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

import {
  FrequencyChanger,
  OrderHistory,
  OrderSummary,
  PaymentMethodDisplay,
  ProductList,
  ShippingAddress,
  SubscriptionActions,
  SubscriptionHeader,
} from '../components'

import { getSubscriptionOrdersServer, getSubscriptionServer } from '@/lib/subscriptions/api.server'

interface SubscriptionDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: SubscriptionDetailPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Subscription #${id.slice(-8).toUpperCase()}`,
    description: 'Manage your subscription',
  }
}

// Force dynamic rendering for personalized content
export const dynamic = 'force-dynamic'

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params
  const subscription = await getSubscriptionServer(id)

  if (!subscription) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <Container className="py-8 md:py-12">
        {/* Header */}
        <SubscriptionHeader subscription={subscription} />

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Products */}
            <ProductList subscription={subscription} />

            {/* Order History */}
            <Suspense fallback={<OrderHistoryLoading />}>
              <SubscriptionOrderHistory
                subscriptionId={subscription.id}
                currencyCode={subscription.currencyCode}
              />
            </Suspense>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <OrderSummary subscription={subscription} />

            {/* Actions */}
            <div className="rounded-xl border bg-background p-6">
              <SubscriptionActions subscription={subscription} />
            </div>

            {/* Frequency Changer */}
            <FrequencyChanger subscription={subscription} />

            {/* Shipping Address */}
            <ShippingAddress subscription={subscription} />

            {/* Payment Method */}
            <PaymentMethodDisplay subscription={subscription} />

            {/* Support */}
            <div className="rounded-xl border bg-background p-6">
              <h3 className="mb-4 text-lg font-semibold">Need Help?</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Our support team is here to help with any subscription questions.
              </p>
              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

interface SubscriptionOrderHistoryProps {
  subscriptionId: string
  currencyCode: string
}

async function SubscriptionOrderHistory({
  subscriptionId,
  currencyCode,
}: SubscriptionOrderHistoryProps) {
  const orders = await getSubscriptionOrdersServer(subscriptionId)

  return <OrderHistory orders={orders} currencyCode={currencyCode} />
}

function OrderHistoryLoading() {
  return (
    <div className="rounded-xl border bg-background p-6">
      <h3 className="mb-6 text-lg font-semibold">Order History</h3>
      <div className="flex items-center justify-center py-8">
        <Spinner size="default" />
      </div>
    </div>
  )
}
