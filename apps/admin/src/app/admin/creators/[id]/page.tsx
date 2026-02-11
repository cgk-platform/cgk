import { Badge, Card, CardContent, CardHeader } from '@cgk/ui'
import {
  ArrowLeft,
  Mail,
  Phone,
  ExternalLink,
  Edit,
  MessageSquare,
  Power,
  MoreHorizontal,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CreatorDetailTabs } from './components/creator-detail-tabs'

import { CreatorStatusBadge, CreatorTierBadge } from '@/components/commerce/status-badge'
import { getCreator, getCreatorProjects, getCreatorEarnings, getCreatorStats, getCreatorActivity } from '@/lib/creators/db'
import { formatMoney, formatDate, formatDateTime } from '@/lib/format'

export default async function CreatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const search = await searchParams
  const tab = (search.tab as string) || 'overview'

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const creator = await getCreator(tenantSlug, id)
  if (!creator) {
    notFound()
  }

  const name = creator.display_name || `${creator.first_name} ${creator.last_name}`
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/creators"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Creators
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/creators/${id}?tab=inbox`}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Link>
          <Link
            href={`/admin/creators?modal=edit&id=${id}`}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <Link
            href={`/admin/creators?modal=deactivate&id=${id}`}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Power className="h-4 w-4" />
            {creator.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
          </Link>
        </div>
      </div>

      {/* Profile Header */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-medium">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <a href={`mailto:${creator.email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="h-4 w-4" />
                {creator.email}
              </a>
              {creator.phone && (
                <a href={`tel:${creator.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-4 w-4" />
                  {creator.phone}
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CreatorStatusBadge status={creator.status} />
              <CreatorTierBadge tier={creator.tier} />
              {creator.tags &&
                creator.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Active since {formatDate(creator.applied_at)}
              {creator.approved_at && ` - Approved ${formatDate(creator.approved_at)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <CreatorDetailTabs creatorId={id} activeTab={tab} />

      {/* Tab Content */}
      <Suspense fallback={<TabSkeleton />}>
        <TabContent tenantSlug={tenantSlug} creatorId={id} tab={tab} creator={creator} />
      </Suspense>
    </div>
  )
}

async function TabContent({
  tenantSlug,
  creatorId,
  tab,
  creator,
}: {
  tenantSlug: string
  creatorId: string
  tab: string
  creator: Awaited<ReturnType<typeof getCreator>>
}) {
  if (!creator) return null

  switch (tab) {
    case 'overview':
      return <OverviewTab tenantSlug={tenantSlug} creatorId={creatorId} creator={creator} />
    case 'projects':
      return <ProjectsTab tenantSlug={tenantSlug} creatorId={creatorId} />
    case 'payments':
      return <PaymentsTab tenantSlug={tenantSlug} creatorId={creatorId} />
    case 'inbox':
      return <InboxTab creatorId={creatorId} />
    case 'contracts':
      return <ContractsTab />
    case 'tax':
      return <TaxTab />
    default:
      return <OverviewTab tenantSlug={tenantSlug} creatorId={creatorId} creator={creator} />
  }
}

async function OverviewTab({
  tenantSlug,
  creatorId,
  creator,
}: {
  tenantSlug: string
  creatorId: string
  creator: NonNullable<Awaited<ReturnType<typeof getCreator>>>
}) {
  const [stats, activities] = await Promise.all([
    getCreatorStats(tenantSlug, creatorId),
    getCreatorActivity(tenantSlug, creatorId, 10),
  ])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatMoney(stats.lifetime_earnings_cents)}</div>
              <div className="text-sm text-muted-foreground">Lifetime Earnings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatMoney(stats.this_month_earnings_cents)}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatMoney(stats.pending_balance_cents)}
              </div>
              <div className="text-sm text-muted-foreground">Pending Balance</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.projects_completed}</div>
              <div className="text-sm text-muted-foreground">Projects Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.on_time_delivery_percent.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">On-Time Delivery</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avg_response_hours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      {activity.description && (
                        <div className="text-muted-foreground">{activity.description}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(activity.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Profile Details</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {creator.bio && (
              <div>
                <div className="font-medium text-muted-foreground">Bio</div>
                <div className="mt-1">{creator.bio}</div>
              </div>
            )}
            <div>
              <div className="font-medium text-muted-foreground">Commission</div>
              <div className="mt-1">
                {(creator as { commission_rate_pct?: number }).commission_rate_pct || 10}%
              </div>
            </div>
            {(creator as { referral_code?: string }).referral_code && (
              <div>
                <div className="font-medium text-muted-foreground">Discount Code</div>
                <code className="mt-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {(creator as { referral_code?: string }).referral_code}
                </code>
              </div>
            )}
            {creator.social_links && Object.keys(creator.social_links).length > 0 && (
              <div>
                <div className="font-medium text-muted-foreground">Social Links</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(creator.social_links).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {creator.notes && (
              <div>
                <div className="font-medium text-muted-foreground">Internal Notes</div>
                <div className="mt-1 text-muted-foreground">{creator.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function ProjectsTab({
  tenantSlug,
  creatorId,
}: {
  tenantSlug: string
  creatorId: string
}) {
  const projects = await getCreatorProjects(tenantSlug, creatorId)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Projects ({projects.length})</h3>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Deliverables
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Earned</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{project.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {project.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {project.completed_deliverables}/{project.deliverables_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(Number(project.total_value_cents))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600">
                      {formatMoney(Number(project.earned_cents))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(project.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

async function PaymentsTab({
  tenantSlug,
  creatorId,
}: {
  tenantSlug: string
  creatorId: string
}) {
  const earnings = await getCreatorEarnings(tenantSlug, creatorId, 100)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Payment History</h3>
      </CardHeader>
      <CardContent>
        {earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {earning.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{earning.description}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        earning.type === 'payout' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {earning.type === 'payout' ? '-' : '+'}
                      {formatMoney(Math.abs(Number(earning.amount_cents)))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(earning.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InboxTab({ creatorId }: { creatorId: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Messages</h3>
          <Link
            href={`/admin/creators/${creatorId}/inbox`}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open Full Inbox
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          View and manage all conversations with this creator in the full inbox.
        </p>
      </CardContent>
    </Card>
  )
}

function ContractsTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Contracts & Documents</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          No contracts have been signed yet. Contract management coming soon.
        </p>
      </CardContent>
    </Card>
  )
}

function TaxTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Tax Information</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="font-medium">W-9 Status</div>
            <div className="mt-1 text-sm text-muted-foreground">Not submitted</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="font-medium">1099 Forms</div>
            <div className="mt-1 text-sm text-muted-foreground">No forms generated yet</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TabSkeleton() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </CardContent>
    </Card>
  )
}
