import { withTenant } from '@cgk-platform/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import {
  getGoogleFeedSettings,
  getLatestSyncHistory,
  getProductCoverage,
  getFeedHealth,
} from '@/lib/google-feed/db'

export default function GoogleFeedPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Google Shopping Feed</h1>
          <p className="text-muted-foreground">
            Manage your Google Merchant Center product feed
          </p>
        </div>
        <div className="flex gap-2">
          <SyncButton />
          <Link
            href="/admin/google-feed/settings"
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Settings
          </Link>
        </div>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <FeedOverview />
      </Suspense>
    </div>
  )
}

function SyncButton() {
  return (
    <form action="/api/admin/google-feed/sync" method="POST">
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Sync Now
      </button>
    </form>
  )
}

async function FeedOverview() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No tenant configured.</p>
        </CardContent>
      </Card>
    )
  }

  const { settings, lastSync, coverage, health, feedUrl } = await withTenant(
    tenantSlug,
    async () => {
      const [settings, lastSync, coverage, health] = await Promise.all([
        getGoogleFeedSettings(),
        getLatestSyncHistory(),
        getProductCoverage(),
        getFeedHealth(),
      ])

      let feedUrl: string | null = null
      if (settings?.feedToken) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
        if (!baseUrl) {
          throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
        }
        feedUrl = `${baseUrl}/api/feeds/google/${settings.feedToken}/products.${settings.feedFormat || 'xml'}`
      }

      return { settings, lastSync, coverage, health, feedUrl }
    }
  )

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Get Started with Google Shopping</CardTitle>
          <CardDescription>
            Configure your Google Merchant Center feed to start advertising your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/google-feed/settings"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Configure Feed
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Feed Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Status</CardTitle>
            <StatusIndicator status={lastSync?.status || 'pending'} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {lastSync?.status || 'Not synced'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSync?.completedAt
                ? `Last sync: ${new Date(lastSync.completedAt).toLocaleString()}`
                : 'Never synced'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products in Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverage.productsInFeed}</div>
            <p className="text-xs text-muted-foreground">
              of {coverage.totalProducts} total products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.approvalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {health.disapprovedCount} disapproved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health.warningsCount + health.disapprovedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {health.pendingCount} pending review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feed URL */}
      {feedUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feed URL</CardTitle>
            <CardDescription>
              Use this URL in Google Merchant Center
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-sm">{feedUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(feedUrl)}
                className="rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
              >
                Copy
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/google-feed/products">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
              <CardDescription>
                View and manage all products in your feed
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/google-feed/images">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Images</CardTitle>
              <CardDescription>
                Manage product images for Google Shopping
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/google-feed/preview">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                Preview your feed before publishing
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Sync History */}
      {lastSync && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sync Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>{new Date(lastSync.startedAt).toLocaleString()}</span>
              </div>
              {lastSync.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{new Date(lastSync.completedAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products Synced</span>
                <span>{lastSync.productsSynced}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products Excluded</span>
                <span>{lastSync.productsExcluded}</span>
              </div>
              {lastSync.durationMs && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{(lastSync.durationMs / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-500',
    running: 'bg-blue-500',
    failed: 'bg-red-500',
    pending: 'bg-yellow-500',
  }

  return (
    <div className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
  )
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
