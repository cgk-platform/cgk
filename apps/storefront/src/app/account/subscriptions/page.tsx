/**
 * Subscriptions List Page
 *
 * Shows all customer subscriptions with status, next order date, and quick actions.
 * Server-rendered with client-side interactivity for actions.
 */

import { Container, Tabs, TabsList, TabsTrigger } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { EmptySubscriptionsState, SubscriptionCard, SubscriptionCardSkeleton } from './components'

import { listSubscriptionsServer } from '@/lib/subscriptions/api.server'
import type { SubscriptionStatus } from '@/lib/subscriptions/types'
import Link from 'next/link'

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
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">My Subscriptions</h1>
            <Link
              href="/account"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Account
            </Link>
          </div>
          <p className="text-muted-foreground">
            Manage your recurring orders and delivery preferences
          </p>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue={statusFilter} className="mb-8">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="all" asChild>
              <Link href="/account/subscriptions">All</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href="/account/subscriptions?status=active">Active</Link>
            </TabsTrigger>
            <TabsTrigger value="paused" asChild>
              <Link href="/account/subscriptions?status=paused">Paused</Link>
            </TabsTrigger>
            <TabsTrigger value="cancelled" asChild>
              <Link href="/account/subscriptions?status=cancelled">Cancelled</Link>
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
  const { subscriptions } = await listSubscriptionsServer({
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
