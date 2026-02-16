import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { getTicketMetrics, getUnacknowledgedAlerts, type TicketMetrics } from '@cgk-platform/support'
import { headers } from 'next/headers'
import Link from 'next/link'
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  MessageSquare,
} from 'lucide-react'

async function getMetrics(tenantId: string): Promise<TicketMetrics | null> {
  try {
    return await getTicketMetrics(tenantId)
  } catch {
    return null
  }
}

export default async function SupportDashboardPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Tenant not found</div>
  }

  const [metrics, alerts] = await Promise.all([
    getMetrics(tenantId),
    getUnacknowledgedAlerts(tenantId).catch((error) => {
      console.error('[support] Failed to load alerts:', error)
      return []
    }),
  ])

  const statCards = [
    {
      title: 'Open Tickets',
      value: metrics?.totalOpen ?? 0,
      icon: Ticket,
      href: '/admin/support/tickets?status=open',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Pending',
      value: metrics?.totalPending ?? 0,
      icon: Clock,
      href: '/admin/support/tickets?status=pending',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      title: 'SLA Breached',
      value: metrics?.slaBreachedCount ?? 0,
      icon: AlertTriangle,
      href: '/admin/support/tickets?slaBreached=true',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Resolved Today',
      value: metrics?.totalResolved ?? 0,
      icon: CheckCircle,
      href: '/admin/support/tickets?status=resolved',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer support tickets and team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/support/tickets"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Ticket className="h-4 w-4" />
            View All Tickets
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sentiment Alerts</h2>
              <span className="text-sm text-muted-foreground">
                {alerts.length} unacknowledged
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2">No sentiment alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/admin/support/tickets/${alert.ticketId}`}
                    className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Negative sentiment detected
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.triggerReason || `Score: ${alert.sentimentScore.toFixed(2)}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Performance (30 days)</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Avg. First Response</span>
                </div>
                <span className="font-medium tabular-nums">
                  {metrics?.avgFirstResponseTimeMinutes
                    ? formatMinutes(metrics.avgFirstResponseTimeMinutes)
                    : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Avg. Resolution Time</span>
                </div>
                <span className="font-medium tabular-nums">
                  {metrics?.avgResolutionTimeMinutes
                    ? formatMinutes(metrics.avgResolutionTimeMinutes)
                    : '--'}
                </span>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">Tickets by Channel</p>
                <div className="space-y-2">
                  {metrics?.ticketsByChannel &&
                    Object.entries(metrics.ticketsByChannel)
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([channel, count]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-muted-foreground">
                            {channel}
                          </span>
                          <span className="text-sm tabular-nums">{count}</span>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/support/tickets">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Ticket Queue</h3>
                <p className="text-sm text-muted-foreground">View and manage tickets</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/support/agents">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Agent Management</h3>
                <p className="text-sm text-muted-foreground">Manage support team</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/support/settings">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">SLA Settings</h3>
                <p className="text-sm text-muted-foreground">Configure SLA rules</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}
