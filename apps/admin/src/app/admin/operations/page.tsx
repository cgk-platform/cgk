import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Activity, AlertTriangle, Clock, Server } from 'lucide-react'

export const metadata = {
  title: 'Operations Dashboard',
  description: 'Monitor platform health and performance',
}

export default function OperationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor platform health and performance</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="System Status"
          value="Healthy"
          icon={<Activity className="w-5 h-5 text-green-500" />}
          trend="All systems operational"
        />
        <StatCard
          title="Errors (24h)"
          value="12"
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          trend="-3 from yesterday"
        />
        <StatCard
          title="Avg Response Time"
          value="124ms"
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          trend="+2ms from last hour"
        />
        <StatCard
          title="Active Services"
          value="7/7"
          icon={<Server className="w-5 h-5 text-purple-500" />}
          trend="All services running"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLinkCard
          title="View Logs"
          description="Browse and search platform logs in real-time"
          href="/admin/operations/logs"
        />
        <QuickLinkCard
          title="Error Tracking"
          description="View aggregated errors and their trends"
          href="/admin/operations/errors"
        />
        <QuickLinkCard
          title="Health Checks"
          description="Monitor service health and dependencies"
          href="/admin/operations/health"
        />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string
  value: string
  icon: React.ReactNode
  trend: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{title}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{trend}</div>
      </CardContent>
    </Card>
  )
}

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a href={href} className="block">
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <h3 className="font-medium">{title}</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-500">{description}</p>
        </CardContent>
      </Card>
    </a>
  )
}
