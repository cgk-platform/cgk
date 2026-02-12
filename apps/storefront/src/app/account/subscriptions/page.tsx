/**
 * Subscriptions List Page
 *
 * Shows all customer subscriptions with status, next order date, and quick actions.
 * Server-rendered with client-side interactivity for actions.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'

import { Container, Tabs, TabsContent, TabsList, TabsTrigger } from '@cgk/ui'

import { listSubscriptions } from '@/lib/subscriptions/api'
import type { SubscriptionStatus } from '@/lib/subscriptions/types'

import {
  EmptySubscriptionsState,
  SubscriptionCard,
  SubscriptionCardSkeleton,
} from './components'

export const metadata: Metadata = {
  title: 'My Subscriptions',
  description: 'Manage your subscription orders',
}

// Force dynamic rendering for personalized content
export const dynamic = 'force-dynamic'

interface SubscriptionsPageProps {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams
  const statusFilter = (params.status as SubscriptionStatus | 'all') || 'all'

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <Container className="py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              My Subscriptions
            </h1>
            <a
              href="/account"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Account
            </a>
          </div>
          <p className="text-muted-foreground">
            Manage your recurring orders and delivery preferences
          </p>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue={statusFilter} className="mb-8">
          <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
            <TabsTrigger value="all" asChild>
              <a href="/account/subscriptions">All</a>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <a href="/account/subscriptions?status=active">Active</a>
            </TabsTrigger>
            <TabsTrigger value="paused" asChild>
              <a href="/account/subscriptions?status=paused">Paused</a>
            </TabsTrigger>
            <TabsTrigger value="cancelled" asChild>
              <a href="/account/subscriptions?status=cancelled">Cancelled</a>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Subscriptions List */}
        <Suspense fallback={<SubscriptionListSkeleton />}>
          <SubscriptionList status={statusFilter} />
        </Suspense>
      </Container>
    </div>
  )
}

interface SubscriptionListProps {
  status: SubscriptionStatus | 'all'
}

async function SubscriptionList({ status }: SubscriptionListProps) {
  const { subscriptions } = await listSubscriptions({
    status: status === 'all' ? undefined : status,
  })

  if (subscriptions.length === 0) {
    return <EmptySubscriptionsState />
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <SubscriptionCard key={subscription.id} subscription={subscription} />
      ))}
    </div>
  )
}

function SubscriptionListSkeleton() {
  return (
    <div className="space-y-4">
      <SubscriptionCardSkeleton />
      <SubscriptionCardSkeleton />
      <SubscriptionCardSkeleton />
    </div>
  )
}
