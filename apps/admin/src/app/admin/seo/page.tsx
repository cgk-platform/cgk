import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  Search,
  ArrowRightLeft,
  FileCode,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Settings,
} from 'lucide-react'

import { Card, CardContent, CardHeader, Button } from '@cgk/ui'
import { SEONav } from '@/components/admin/seo/SEONav'
import { getGSCConnection } from '@/lib/seo/google-search-console'
import { getKeywordStats } from '@/lib/seo/keyword-tracker'
import { getRedirectStats } from '@/lib/seo/redirects'
import { getAuditSummary } from '@/lib/seo/site-analyzer'
import { getContentGaps } from '@/lib/seo/content-gap'

export default async function SEODashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SEO Management</h1>
          <p className="text-muted-foreground">
            Monitor keyword rankings, manage redirects, and audit your site
          </p>
        </div>
        <Link href="/admin/seo/settings">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            SEO Settings
          </Button>
        </Link>
      </div>

      <SEONav />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLoader />
      </Suspense>
    </div>
  )
}

async function DashboardLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const [gscConnection, keywordStats, redirectStats, auditSummary, contentGaps] =
    await withTenant(tenantSlug, () =>
      Promise.all([
        getGSCConnection(),
        getKeywordStats(),
        getRedirectStats(),
        getAuditSummary(),
        getContentGaps(),
      ])
    )

  return (
    <div className="space-y-6">
      {/* GSC Connection Status */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-2 ${gscConnection?.is_connected ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <ExternalLink className={`h-5 w-5 ${gscConnection?.is_connected ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="font-medium">Google Search Console</p>
              <p className="text-sm text-muted-foreground">
                {gscConnection?.is_connected
                  ? `Connected to ${gscConnection.site_url}`
                  : 'Not connected - connect to sync keyword data'}
              </p>
            </div>
          </div>
          <Link href="/admin/seo/keywords">
            <Button variant={gscConnection?.is_connected ? 'outline' : 'default'}>
              {gscConnection?.is_connected ? 'Manage Keywords' : 'Connect GSC'}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/seo/keywords">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{keywordStats.totalKeywords}</p>
                  <p className="text-sm text-muted-foreground">Tracked Keywords</p>
                </div>
              </div>
              {keywordStats.avgPosition !== null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Avg. Position: {keywordStats.avgPosition.toFixed(1)}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/seo/redirects">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-100 p-3">
                  <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{redirectStats.totalRedirects}</p>
                  <p className="text-sm text-muted-foreground">Active Redirects</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {redirectStats.totalHits.toLocaleString()} total hits
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/seo/schema">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <FileCode className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contentGaps.length}</p>
                  <p className="text-sm text-muted-foreground">Content Gaps</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Opportunities to improve
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/seo/analysis">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {auditSummary.latestAudit?.average_score ?? '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Audit Score</p>
                </div>
              </div>
              {auditSummary.scoreChange !== 0 && (
                <p className={`mt-2 flex items-center gap-1 text-sm ${auditSummary.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {auditSummary.scoreChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {auditSummary.scoreChange > 0 ? '+' : ''}{auditSummary.scoreChange} from last audit
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Keywords */}
      {keywordStats.topKeywords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="font-semibold">Top Ranking Keywords</h2>
            <Link href="/admin/seo/keywords">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {keywordStats.topKeywords.slice(0, 5).map((kw) => (
                <div key={kw.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{kw.keyword}</p>
                    <p className="text-sm text-muted-foreground">
                      {kw.clicks.toLocaleString()} clicks | {kw.impressions.toLocaleString()} impressions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                      #{kw.current_position?.toFixed(1) ?? '-'}
                    </span>
                    {kw.trend_7d === 'improving' && (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    )}
                    {kw.trend_7d === 'declining' && (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Redirects */}
      {redirectStats.recentlyAdded.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="font-semibold">Recent Redirects</h2>
            <Link href="/admin/seo/redirects">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redirectStats.recentlyAdded.slice(0, 5).map((redirect) => (
                <div key={redirect.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-muted-foreground">{redirect.source}</span>
                    <span className="text-muted-foreground">{'>'}</span>
                    <span>{redirect.destination}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {redirect.hits} hits
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
