'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatCurrency,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cgk/ui'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { BrandSettings } from '@/components/brands/BrandSettings'
import { DiscountCodeShare } from '@/components/brands/DiscountCodeShare'
import type { BrandDetail } from '@/lib/types'

/**
 * Get badge variant based on membership status
 */
function getStatusVariant(status: BrandDetail['status']): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'paused':
      return 'secondary'
    case 'terminated':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * Get project status badge variant
 */
function getProjectStatusVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'success'
    case 'in_progress':
    case 'submitted':
      return 'default'
    case 'revision_requested':
      return 'warning'
    case 'pending':
      return 'secondary'
    default:
      return 'secondary'
  }
}

/**
 * Format project status for display
 */
function formatProjectStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get initials from brand name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Brand Detail Page
 *
 * Shows comprehensive brand information including:
 * - Brand header with status
 * - Earnings breakdown
 * - Discount code with sharing
 * - Terms and conditions
 * - Recent projects
 * - Per-brand settings
 */
export default function BrandDetailPage(): React.JSX.Element {
  const params = useParams()
  const router = useRouter()
  const brandSlug = params.brandSlug as string

  const [brand, setBrand] = useState<BrandDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/creator/brands/${brandSlug}`)

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          if (response.status === 404) {
            setError('Brand not found or you do not have access')
            return
          }
          throw new Error('Failed to load brand')
        }

        const data = await response.json()
        setBrand(data.brand)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brand')
      } finally {
        setIsLoading(false)
      }
    }

    if (brandSlug) {
      fetchBrand()
    }
  }, [brandSlug])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push('/brands')}>
          Back to Brands
        </Button>
      </div>
    )
  }

  if (!brand) {
    return <div>No brand data available</div>
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/brands"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Brands
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Brand logo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted ring-2 ring-border">
            {brand.brandLogo ? (
              <img
                src={brand.brandLogo}
                alt={brand.brandName}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {getInitials(brand.brandName)}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{brand.brandName}</h1>
              <Badge variant={getStatusVariant(brand.status)} className="capitalize">
                {brand.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Member since {formatDate(brand.joinedAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {brand.status === 'active' && brand.balanceCents >= 1000 && (
          <Button
            onClick={() => router.push(`/earnings/withdraw?brand=${brand.brandId}`)}
          >
            Withdraw Funds
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Earnings Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EarningsCard
              label="Available Balance"
              value={brand.balanceCents}
              variant="success"
            />
            <EarningsCard
              label="Pending"
              value={brand.pendingCents}
              variant="warning"
            />
            <EarningsCard label="YTD Earnings" value={brand.ytdEarningsCents} />
            <EarningsCard
              label="Lifetime Earnings"
              value={brand.lifetimeEarningsCents}
            />
          </div>

          {/* Discount Code */}
          {brand.discountCode && (
            <DiscountCodeShare
              code={brand.discountCode}
              shareLink={brand.shareLink}
              usageCount={brand.discountCodeUsageCount}
              revenueAttributedCents={brand.discountCodeRevenueAttributedCents}
            />
          )}

          {/* Terms & Coordinator */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Terms Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Terms</CardTitle>
                <CardDescription>
                  Commission and payment details for this brand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <TermRow
                    label="Commission Rate"
                    value={`${brand.commissionPercent}%`}
                  />
                  <TermRow label="Payment Terms" value={brand.paymentTerms} />
                  <TermRow
                    label="Sample Products"
                    value={brand.sampleProductEntitlement ? 'Eligible' : 'Not eligible'}
                  />
                  <TermRow
                    label="Contract"
                    value={
                      brand.contractSigned
                        ? `Signed ${formatDate(brand.contractSignedAt)}`
                        : 'Pending signature'
                    }
                    warning={!brand.contractSigned}
                  />
                </dl>
              </CardContent>
            </Card>

            {/* Coordinator Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Coordinator</CardTitle>
                <CardDescription>
                  Contact for questions about projects and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {brand.coordinatorName ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <PersonIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{brand.coordinatorName}</p>
                        {brand.coordinatorEmail && (
                          <a
                            href={`mailto:${brand.coordinatorEmail}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {brand.coordinatorEmail}
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        router.push(`/messages?brand=${brand.brandId}`)
                      }
                    >
                      Send Message
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No coordinator assigned yet. Contact support for assistance.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          {brand.recentProjects.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Projects</CardTitle>
                  <CardDescription>
                    Your latest projects with {brand.brandName}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('projects')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {brand.recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.dueDate
                            ? `Due ${formatDate(project.dueDate)}`
                            : project.completedAt
                              ? `Completed ${formatDate(project.completedAt)}`
                              : 'No deadline'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getProjectStatusVariant(project.status)}>
                          {formatProjectStatus(project.status)}
                        </Badge>
                        <span className="font-mono text-sm tabular-nums">
                          {formatCurrency(project.earningsCents / 100)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Projects</CardTitle>
              <CardDescription>
                Your complete project history with {brand.brandName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brand.recentProjects.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No projects yet. Projects will appear here when assigned.
                </p>
              ) : (
                <div className="divide-y">
                  {brand.recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.dueDate
                            ? `Due ${formatDate(project.dueDate)}`
                            : project.completedAt
                              ? `Completed ${formatDate(project.completedAt)}`
                              : 'No deadline'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getProjectStatusVariant(project.status)}>
                          {formatProjectStatus(project.status)}
                        </Badge>
                        <span className="font-mono text-sm font-medium tabular-nums">
                          {formatCurrency(project.earningsCents / 100)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/projects/${project.id}`)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {brand.activeProjectsCount}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Completed Projects</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {brand.completedProjectsCount}
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <BrandSettings
            brandSlug={brand.brandSlug}
            brandName={brand.brandName}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Earnings card component
 */
function EarningsCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: 'success' | 'warning'
}): React.JSX.Element {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
          variant === 'success'
            ? 'text-green-600 dark:text-green-400'
            : variant === 'warning'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground'
        }`}
      >
        {formatCurrency(value / 100)}
      </p>
    </Card>
  )
}

/**
 * Term row component for displaying key-value pairs
 */
function TermRow({
  label,
  value,
  warning,
}: {
  label: string
  value: string
  warning?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`text-sm font-medium ${warning ? 'text-amber-600 dark:text-amber-400' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function PersonIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
