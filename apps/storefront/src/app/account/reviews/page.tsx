/**
 * Customer Reviews Page
 *
 * Displays reviews submitted by the customer and products eligible for review.
 * Server-rendered with client components for interactivity.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { ReviewsListClient, EligibleProductsClient, ReviewsTabs } from './components'

export const metadata: Metadata = {
  title: 'My Reviews',
  description: 'View and manage your product reviews',
}

export const dynamic = 'force-dynamic'

interface ReviewsPageProps {
  searchParams: Promise<{
    tab?: string
    page?: string
  }>
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams
  const activeTab = params.tab || 'submitted'
  const page = parseInt(params.page || '1', 10)

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            My Reviews
          </h1>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </Link>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          Share your experience with products you've purchased
        </p>
      </div>

      {/* Tabs */}
      <ReviewsTabs activeTab={activeTab} />

      {/* Content based on active tab */}
      <Suspense fallback={<ReviewsSkeleton />}>
        {activeTab === 'submitted' ? (
          <SubmittedReviews page={page} />
        ) : (
          <EligibleProducts page={page} />
        )}
      </Suspense>
    </div>
  )
}

async function SubmittedReviews({ page }: { page: number }) {
  return <ReviewsListClient page={page} />
}

async function EligibleProducts({ page }: { page: number }) {
  return <EligibleProductsClient page={page} />
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4"
        >
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-lg bg-[hsl(var(--portal-muted))]" />
            <div className="flex-1">
              <div className="h-5 w-48 rounded bg-[hsl(var(--portal-muted))] mb-2" />
              <div className="h-4 w-32 rounded bg-[hsl(var(--portal-muted))] mb-2" />
              <div className="h-4 w-full rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
