import { Badge, Card, CardContent, CardHeader } from '@cgk/ui'
import { ArrowLeft, Mail, Phone, ExternalLink } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CreatorStatusBadge, CreatorTierBadge } from '@/components/commerce/status-badge'
import { getCreator, getCreatorProjects, getCreatorEarnings } from '@/lib/creators/db'
import { formatMoney, formatDate, formatDateTime } from '@/lib/format'

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const creator = await getCreator(tenantSlug, id)
  if (!creator) {
    notFound()
  }

  const [projects, earnings] = await Promise.all([
    getCreatorProjects(tenantSlug, id),
    getCreatorEarnings(tenantSlug, id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/creators"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Creators
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CreatorProfileCard creator={creator} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <EarningsCard
            totalEarned={Number(creator.total_earned_cents)}
            pendingBalance={Number(creator.pending_balance_cents)}
            availableBalance={Number(creator.available_balance_cents)}
          />
          <ProjectsCard projects={projects} />
          <EarningsHistoryCard earnings={earnings} />
        </div>
      </div>
    </div>
  )
}

function CreatorProfileCard({ creator }: { creator: Awaited<ReturnType<typeof getCreator>> }) {
  if (!creator) return null

  const name = creator.display_name || `${creator.first_name} ${creator.last_name}`
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-medium">
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
          <h2 className="mt-4 text-xl font-semibold">{name}</h2>
          <p className="text-sm text-muted-foreground">{creator.email}</p>

          <div className="mt-4 flex gap-2">
            <CreatorStatusBadge status={creator.status} />
            <CreatorTierBadge tier={creator.tier} />
          </div>

          <div className="mt-6 w-full space-y-3 text-left text-sm">
            {creator.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{creator.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{creator.email}</span>
            </div>
          </div>

          {creator.bio && (
            <div className="mt-4 w-full border-t pt-4 text-left">
              <h4 className="text-sm font-medium">Bio</h4>
              <p className="mt-1 text-sm text-muted-foreground">{creator.bio}</p>
            </div>
          )}

          {creator.social_links && Object.keys(creator.social_links).length > 0 && (
            <div className="mt-4 w-full border-t pt-4 text-left">
              <h4 className="text-sm font-medium">Social Links</h4>
              <div className="mt-2 space-y-1">
                {Object.entries(creator.social_links).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {creator.tags && creator.tags.length > 0 && (
            <div className="mt-4 w-full border-t pt-4 text-left">
              <h4 className="text-sm font-medium">Tags</h4>
              <div className="mt-2 flex flex-wrap gap-1">
                {creator.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {creator.notes && (
            <div className="mt-4 w-full border-t pt-4 text-left">
              <h4 className="text-sm font-medium">Notes</h4>
              <p className="mt-1 text-sm text-muted-foreground">{creator.notes}</p>
            </div>
          )}

          <div className="mt-4 w-full border-t pt-4 text-left text-xs text-muted-foreground">
            <div>Applied: {formatDate(creator.applied_at)}</div>
            {creator.approved_at && <div>Approved: {formatDate(creator.approved_at)}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EarningsCard({
  totalEarned,
  pendingBalance,
  availableBalance,
}: {
  totalEarned: number
  pendingBalance: number
  availableBalance: number
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Earnings Overview</h3>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{formatMoney(totalEarned)}</div>
            <div className="text-sm text-muted-foreground">Total Earned</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{formatMoney(pendingBalance)}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatMoney(availableBalance)}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectsCard({ projects }: { projects: Awaited<ReturnType<typeof getCreatorProjects>> }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Projects ({projects.length})</h3>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {project.completed_deliverables}/{project.deliverables_count} deliverables
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatMoney(Number(project.earned_cents))}</div>
                  <div className="text-xs text-muted-foreground">
                    of {formatMoney(Number(project.total_value_cents))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EarningsHistoryCard({ earnings }: { earnings: Awaited<ReturnType<typeof getCreatorEarnings>> }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
      </CardHeader>
      <CardContent>
        {earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {earnings.slice(0, 10).map((earning) => (
              <div key={earning.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium capitalize">{earning.type}</div>
                  <div className="text-xs text-muted-foreground">{earning.description}</div>
                </div>
                <div className="text-right">
                  <div className={earning.type === 'payout' ? 'text-red-600' : 'text-green-600'}>
                    {earning.type === 'payout' ? '-' : '+'}
                    {formatMoney(Math.abs(Number(earning.amount_cents)))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(earning.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
