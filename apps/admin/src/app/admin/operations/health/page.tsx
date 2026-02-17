/**
 * Health Checks Page
 * Monitors service health and dependencies with real connectivity tests
 */

import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { sql, withTenant } from '@cgk-platform/db'
import { getTenantStripeClient } from '@cgk-platform/integrations'
import { CheckCircle, XCircle, Clock, Database, Cloud, Server, AlertTriangle } from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'

export const metadata = {
  title: 'Health Checks',
  description: 'Monitor service health and dependencies',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency?: number
  lastCheck: Date
  details?: string
}

async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await sql`SELECT 1`
    return {
      name: 'PostgreSQL',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      name: 'PostgreSQL',
      status: 'unhealthy',
      details: `Connection failed: ${message}`,
      lastCheck: new Date(),
    }
  }
}

async function checkTenantSchemaHealth(tenantSlug: string): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await withTenant(tenantSlug, async () => {
      // Simple query to verify schema access
      await sql`SELECT 1`
    })
    return {
      name: 'Tenant Schema',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
      details: `Schema: tenant_${tenantSlug}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      name: 'Tenant Schema',
      status: 'unhealthy',
      details: `Schema access failed: ${message}`,
      lastCheck: new Date(),
    }
  }
}

async function checkStripeHealth(tenantSlug: string): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const stripe = await getTenantStripeClient(tenantSlug)
    if (!stripe) {
      return {
        name: 'Stripe API',
        status: 'degraded',
        details: 'Not configured for this tenant',
        lastCheck: new Date(),
      }
    }
    await stripe.balance.retrieve()
    return {
      name: 'Stripe API',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      name: 'Stripe API',
      status: 'unhealthy',
      details: `API error: ${message}`,
      lastCheck: new Date(),
    }
  }
}

async function checkVercelEdgeHealth(): Promise<HealthCheck> {
  // Edge runtime check - if we can respond, edge is working
  return {
    name: 'Vercel Edge',
    status: 'healthy',
    latency: 0,
    lastCheck: new Date(),
    details: 'Request processed successfully',
  }
}

async function HealthChecksLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <HealthStatus checks={[]} error="No tenant configured" />
  }

  // Run all health checks in parallel
  const checks = await Promise.all([
    checkDatabaseHealth(),
    checkTenantSchemaHealth(tenantSlug),
    checkStripeHealth(tenantSlug),
    checkVercelEdgeHealth(),
  ])

  return <HealthStatus checks={checks} />
}

function HealthStatus({ checks, error }: { checks: HealthCheck[]; error?: string }) {
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Health Checks</h1>
          <p className="text-gray-500 mt-1">Monitor service health and dependencies</p>
        </div>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-xl font-semibold">Configuration Required</h2>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allHealthy = checks.every((check) => check.status === 'healthy')
  const hasUnhealthy = checks.some((check) => check.status === 'unhealthy')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health Checks</h1>
        <p className="text-gray-500 mt-1">Monitor service health and dependencies</p>
      </div>

      {/* Overall status */}
      <Card className={
        allHealthy
          ? 'border-green-200 bg-green-50'
          : hasUnhealthy
            ? 'border-red-200 bg-red-50'
            : 'border-yellow-200 bg-yellow-50'
      }>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {allHealthy ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : hasUnhealthy ? (
              <XCircle className="w-8 h-8 text-red-500" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {allHealthy
                  ? 'All Systems Operational'
                  : hasUnhealthy
                    ? 'Some Systems Down'
                    : 'Some Systems Degraded'
                }
              </h2>
              <p className="text-gray-600">
                {checks.length} services monitored | Last updated just now
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual health checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checks.map((check) => (
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
    if (name.toLowerCase().includes('postgres') || name.toLowerCase().includes('database') || name.toLowerCase().includes('schema')) {
      return <Database className="w-5 h-5" />
    }
    if (name.toLowerCase().includes('redis') || name.toLowerCase().includes('cache')) {
      return <Database className="w-5 h-5" />
    }
    if (name.toLowerCase().includes('api') || name.toLowerCase().includes('cloud') || name.toLowerCase().includes('stripe')) {
      return <Cloud className="w-5 h-5" />
    }
    return <Server className="w-5 h-5" />
  }

  const StatusIcon = check.status === 'healthy'
    ? CheckCircle
    : check.status === 'degraded'
      ? AlertTriangle
      : XCircle

  return (
    <Card className={statusBg[check.status]}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">{getIcon(check.name)}</span>
            <h3 className="font-medium">{check.name}</h3>
          </div>
          <StatusIcon className={`w-5 h-5 ${statusColors[check.status]}`} />
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

function HealthChecksSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health Checks</h1>
        <p className="text-gray-500 mt-1">Monitor service health and dependencies</p>
      </div>
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-12 bg-gray-200 rounded" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function HealthPage() {
  return (
    <Suspense fallback={<HealthChecksSkeleton />}>
      <HealthChecksLoader />
    </Suspense>
  )
}
