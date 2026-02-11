import { Card, CardContent, CardHeader } from '@cgk/ui'
import { CheckCircle, XCircle, Clock, Database, Cloud, Server } from 'lucide-react'

export const metadata = {
  title: 'Health Checks',
  description: 'Monitor service health and dependencies',
}

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency?: number
  lastCheck: Date
  details?: string
}

// This would normally come from an API
const healthChecks: HealthCheck[] = [
  { name: 'PostgreSQL', status: 'healthy', latency: 5, lastCheck: new Date() },
  { name: 'Redis', status: 'healthy', latency: 2, lastCheck: new Date() },
  { name: 'Shopify API', status: 'healthy', latency: 120, lastCheck: new Date() },
  { name: 'Stripe API', status: 'healthy', latency: 85, lastCheck: new Date() },
  { name: 'Vercel Edge', status: 'healthy', latency: 15, lastCheck: new Date() },
  { name: 'Background Jobs', status: 'healthy', lastCheck: new Date() },
]

export default function HealthPage() {
  const allHealthy = healthChecks.every((check) => check.status === 'healthy')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health Checks</h1>
        <p className="text-gray-500 mt-1">Monitor service health and dependencies</p>
      </div>

      {/* Overall status */}
      <Card className={allHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {allHealthy ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {allHealthy ? 'All Systems Operational' : 'Some Systems Degraded'}
              </h2>
              <p className="text-gray-600">
                {healthChecks.length} services monitored | Last updated just now
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual health checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthChecks.map((check) => (
          <HealthCheckCard key={check.name} check={check} />
        ))}
      </div>
    </div>
  )
}

function HealthCheckCard({ check }: { check: HealthCheck }) {
  const statusColors = {
    healthy: 'text-green-500',
    unhealthy: 'text-red-500',
    degraded: 'text-yellow-500',
  }

  const statusBg = {
    healthy: 'bg-green-50 dark:bg-green-900/20',
    unhealthy: 'bg-red-50 dark:bg-red-900/20',
    degraded: 'bg-yellow-50 dark:bg-yellow-900/20',
  }

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('postgres') || name.toLowerCase().includes('database')) {
      return <Database className="w-5 h-5" />
    }
    if (name.toLowerCase().includes('redis') || name.toLowerCase().includes('cache')) {
      return <Database className="w-5 h-5" />
    }
    if (name.toLowerCase().includes('api') || name.toLowerCase().includes('cloud')) {
      return <Cloud className="w-5 h-5" />
    }
    return <Server className="w-5 h-5" />
  }

  return (
    <Card className={statusBg[check.status]}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">{getIcon(check.name)}</span>
            <h3 className="font-medium">{check.name}</h3>
          </div>
          {check.status === 'healthy' ? (
            <CheckCircle className={`w-5 h-5 ${statusColors[check.status]}`} />
          ) : (
            <XCircle className={`w-5 h-5 ${statusColors[check.status]}`} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className={`capitalize ${statusColors[check.status]}`}>{check.status}</span>
          {check.latency !== undefined && (
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              {check.latency}ms
            </span>
          )}
        </div>
        {check.details && <p className="text-xs text-gray-500 mt-2">{check.details}</p>}
      </CardContent>
    </Card>
  )
}
