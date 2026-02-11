/**
 * E-Signature Dashboard Page
 *
 * Main dashboard for e-signature management.
 */

import { headers } from 'next/headers'
import { Suspense } from 'react'
import {
  EsignDashboardStats,
  EsignDashboardStatsSkeleton,
  EsignQuickActions,
  RecentDocuments,
  RecentDocumentsSkeleton,
} from '@/components/esign'
import { getDashboardStats } from '@/lib/esign'

export default function EsignDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          E-Signatures
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage contracts, agreements, and document signing
        </p>
      </div>

      <Suspense fallback={<EsignDashboardStatsSkeleton />}>
        <StatsLoader />
      </Suspense>

      <EsignQuickActions />

      <Suspense fallback={<RecentDocumentsSkeleton />}>
        <RecentDocumentsLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function getCurrentUserEmail(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-user-email') || 'admin@example.com'
}

async function StatsLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return (
      <EsignDashboardStats
        data={{
          pendingSignatures: 0,
          inProgress: 0,
          completedThisMonth: 0,
          counterSignQueue: 0,
        }}
      />
    )
  }

  const email = await getCurrentUserEmail()
  const stats = await getDashboardStats(tenantSlug, email)

  return (
    <EsignDashboardStats
      data={{
        pendingSignatures: stats.pendingSignatures,
        inProgress: stats.inProgress,
        completedThisMonth: stats.completedThisMonth,
        counterSignQueue: stats.counterSignQueue,
      }}
    />
  )
}

async function RecentDocumentsLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <RecentDocuments documents={[]} />
  }

  const email = await getCurrentUserEmail()
  const stats = await getDashboardStats(tenantSlug, email)

  return <RecentDocuments documents={stats.recentDocuments} />
}
