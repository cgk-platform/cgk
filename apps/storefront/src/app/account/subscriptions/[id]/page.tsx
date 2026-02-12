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

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { Container, Spinner } from '@cgk/ui'

import { getSubscription, getSubscriptionOrders } from '@/lib/subscriptions/api'

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
  const subscription = await getSubscription(id)

  if (!subscription) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <Container className="py-8 md:py-12">
        {/* Header */}
        <SubscriptionHeader subscription={subscription} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
            <div className="bg-background rounded-xl border p-6">
              <SubscriptionActions subscription={subscription} />
            </div>

            {/* Frequency Changer */}
            <FrequencyChanger subscription={subscription} />

            {/* Shipping Address */}
            <ShippingAddress subscription={subscription} />

            {/* Payment Method */}
            <PaymentMethodDisplay subscription={subscription} />

            {/* Support */}
            <div className="bg-background rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-4">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is here to help with any subscription questions.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center w-full px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Contact Support
              </a>
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
  const orders = await getSubscriptionOrders(subscriptionId)

  return <OrderHistory orders={orders} currencyCode={currencyCode} />
}

function OrderHistoryLoading() {
  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="font-semibold text-lg mb-6">Order History</h3>
      <div className="flex items-center justify-center py-8">
        <Spinner size="default" />
      </div>
    </div>
  )
}
