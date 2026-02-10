# Health Monitoring Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Platform-wide health monitoring and alerting system

---

## Overview

The health monitoring system provides real-time visibility into all platform services across all tenants. It builds on the existing RAWDOG ops health check infrastructure and extends it for multi-tenant monitoring.

### Existing RAWDOG Implementation

From `/src/lib/ops/health/`, the current system includes:
- Individual health checks for 12+ services
- Scheduler with batch execution
- Redis caching for fast reads
- Consecutive failure tracking
- Response time metrics

This specification extends these patterns for multi-tenant operation.

---

## Health Check Endpoints

### Master Health Endpoint

```
GET /api/platform/health
```

Returns aggregated health status for all services across all tenants.

```typescript
// Response schema
interface PlatformHealthResponse {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string // ISO8601
  summary: {
    healthy: number
    degraded: number
    unhealthy: number
    unknown: number
  }
  tenants: TenantHealthSummary[]
  services: ServiceHealthSummary[]
  alerts: ActiveAlert[]
}

interface TenantHealthSummary {
  tenantId: string
  tenantSlug: string
  status: HealthStatus
  unhealthyServices: string[]
  lastChecked: string
}

interface ServiceHealthSummary {
  service: string
  status: HealthStatus
  avgLatencyMs: number
  failingTenants: string[]
  lastChecked: string
}
```

### Per-Service Health Endpoints

```
GET /api/platform/health/database
GET /api/platform/health/redis
GET /api/platform/health/shopify
GET /api/platform/health/stripe
GET /api/platform/health/inngest
GET /api/platform/health/mcp
GET /api/platform/health/wise
GET /api/platform/health/meta
GET /api/platform/health/google-ads
GET /api/platform/health/mux
GET /api/platform/health/assemblyai
GET /api/platform/health/slack
GET /api/platform/health/yotpo
GET /api/platform/health/loop
GET /api/platform/health/vercel
```

Each returns:

```typescript
interface ServiceHealthResponse {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  timestamp: string
  latencyMs: number
  details: {
    // Service-specific metrics
    connectionsActive?: number
    lastError?: string | null
    uptimeSeconds?: number
    rateLimit?: {
      remaining: number
      limit: number
      resetsAt: string
    }
    [key: string]: unknown
  }
  tenantStatuses?: Record<string, TenantServiceStatus>
}

interface TenantServiceStatus {
  status: HealthStatus
  latencyMs: number
  lastChecked: string
  consecutiveFailures: number
  lastError?: string
}
```

### Health Check by Tenant

```
GET /api/platform/health/tenant/[tenantId]
```

Returns all service health for a specific tenant.

---

## Service Monitors

### Database Monitor

Checks PostgreSQL connectivity and performance.

```typescript
// packages/health/src/monitors/database.ts
export async function checkDatabase(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Test connection
    if (tenantId) {
      // Tenant-specific check (uses tenant schema)
      await sql`SELECT 1 FROM ${sql.identifier(['tenant_' + tenantId, 'orders'])} LIMIT 1`
    } else {
      // Platform check
      await sql`SELECT 1 FROM public.organizations LIMIT 1`
    }

    const latencyMs = Date.now() - startTime

    // Get connection pool stats
    const poolStats = await getPoolStats()

    return {
      status: latencyMs < 100 ? 'healthy' : latencyMs < 500 ? 'degraded' : 'unhealthy',
      latencyMs,
      details: {
        poolSize: poolStats.size,
        activeConnections: poolStats.active,
        idleConnections: poolStats.idle,
        waitingQueries: poolStats.waiting,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
```

### Redis Monitor

```typescript
// packages/health/src/monitors/redis.ts
export async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const redis = getRedisClient()

    // Ping test
    await redis.ping()

    // Get info
    const info = await redis.info()
    const memoryUsage = parseRedisInfo(info, 'used_memory')
    const maxMemory = parseRedisInfo(info, 'maxmemory')
    const connectedClients = parseRedisInfo(info, 'connected_clients')
    const keyCount = parseRedisInfo(info, 'db0:keys')

    const latencyMs = Date.now() - startTime
    const memoryPercent = maxMemory > 0 ? (memoryUsage / maxMemory) * 100 : 0

    return {
      status: memoryPercent < 70 ? 'healthy' : memoryPercent < 90 ? 'degraded' : 'unhealthy',
      latencyMs,
      details: {
        memoryUsedMB: Math.round(memoryUsage / 1024 / 1024),
        memoryPercent: Math.round(memoryPercent),
        connectedClients,
        keyCount,
        evictedKeys: parseRedisInfo(info, 'evicted_keys'),
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### Shopify Monitor (Per-Tenant)

```typescript
// packages/health/src/monitors/shopify.ts
export async function checkShopify(tenantId: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const credentials = await getShopifyCredentials(tenantId)
    if (!credentials) {
      return {
        status: 'unknown',
        latencyMs: 0,
        details: { error: 'No Shopify credentials configured' }
      }
    }

    // Test API call
    const response = await fetch(
      `https://${credentials.storeDomain}/admin/api/2024-10/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
        }
      }
    )

    const latencyMs = Date.now() - startTime

    // Check rate limits
    const rateLimitRemaining = parseInt(
      response.headers.get('X-Shopify-Shop-Api-Call-Limit')?.split('/')[0] || '0'
    )
    const rateLimitTotal = parseInt(
      response.headers.get('X-Shopify-Shop-Api-Call-Limit')?.split('/')[1] || '40'
    )
    const rateLimitPercent = (rateLimitRemaining / rateLimitTotal) * 100

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: await response.text(),
        }
      }
    }

    return {
      status: rateLimitPercent > 20 ? 'healthy' : rateLimitPercent > 5 ? 'degraded' : 'unhealthy',
      latencyMs,
      details: {
        storeDomain: credentials.storeDomain,
        rateLimitRemaining,
        rateLimitTotal,
        rateLimitPercent: Math.round(rateLimitPercent),
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### Stripe Monitor

```typescript
// packages/health/src/monitors/stripe.ts
export async function checkStripe(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Use Stripe's balance endpoint as a lightweight health check
    const balance = await stripe.balance.retrieve()

    const latencyMs = Date.now() - startTime

    return {
      status: 'healthy',
      latencyMs,
      details: {
        availableBalance: balance.available.reduce((sum, b) => sum + b.amount, 0),
        pendingBalance: balance.pending.reduce((sum, b) => sum + b.amount, 0),
        currencies: balance.available.map(b => b.currency),
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Check if it's a rate limit error
    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return {
        status: 'degraded',
        latencyMs,
        details: { error: 'Rate limited', retryAfter: error.headers?.['retry-after'] }
      }
    }

    return {
      status: 'unhealthy',
      latencyMs,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### Inngest Monitor

```typescript
// packages/health/src/monitors/inngest.ts
export async function checkInngest(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Use Inngest REST API to get function status
    const response = await fetch('https://api.inngest.com/v1/functions', {
      headers: {
        'Authorization': `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
      }
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: { error: `API returned ${response.status}` }
      }
    }

    const functions = await response.json()

    // Get pending/failed job counts
    const stats = await getInngestStats()

    const failedCount = stats.failedLast24h
    const status = failedCount === 0 ? 'healthy' : failedCount < 10 ? 'degraded' : 'unhealthy'

    return {
      status,
      latencyMs,
      details: {
        totalFunctions: functions.data?.length || 0,
        pendingJobs: stats.pending,
        runningJobs: stats.running,
        failedLast24h: failedCount,
        completedLast24h: stats.completedLast24h,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### MCP Server Monitor

```typescript
// packages/health/src/monitors/mcp.ts
export async function checkMCP(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const baseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001'

    // Send initialize message
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId && { 'X-Tenant-ID': tenantId }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'health-check', version: '1.0.0' }
        }
      })
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: { error: `MCP returned ${response.status}` }
      }
    }

    const result = await response.json()

    return {
      status: 'healthy',
      latencyMs,
      details: {
        protocolVersion: result.result?.protocolVersion,
        serverName: result.result?.serverInfo?.name,
        toolCount: result.result?.capabilities?.tools?.listChanged ? 'dynamic' : 'static',
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### Wise API Monitor

```typescript
// packages/health/src/monitors/wise.ts
export async function checkWise(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Get profiles to verify connectivity
    const response = await fetch('https://api.wise.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
      }
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: await response.text(),
        }
      }
    }

    const profiles = await response.json()

    // Get balance for primary profile
    const balanceResponse = await fetch(
      `https://api.wise.com/v4/profiles/${profiles[0]?.id}/balances?types=STANDARD`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
        }
      }
    )

    const balances = await balanceResponse.json()

    return {
      status: 'healthy',
      latencyMs,
      details: {
        profileCount: profiles.length,
        primaryProfileId: profiles[0]?.id,
        balances: balances.map((b: any) => ({
          currency: b.currency,
          amount: b.amount.value,
        })),
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

### External Ad Platform Monitors

```typescript
// packages/health/src/monitors/meta.ts
export async function checkMeta(tenantId: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const credentials = await getMetaCredentials(tenantId)
    if (!credentials) {
      return {
        status: 'unknown',
        latencyMs: 0,
        details: { error: 'No Meta credentials configured' }
      }
    }

    // Simple account info request
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${credentials.accessToken}`
    )

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const error = await response.json()
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: error.error?.message || 'Unknown error',
          errorCode: error.error?.code,
        }
      }
    }

    return {
      status: 'healthy',
      latencyMs,
      details: {
        accountId: credentials.adAccountId,
        connected: true,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// packages/health/src/monitors/google-ads.ts
export async function checkGoogleAds(tenantId: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const credentials = await getGoogleAdsCredentials(tenantId)
    if (!credentials) {
      return {
        status: 'unknown',
        latencyMs: 0,
        details: { error: 'No Google Ads credentials configured' }
      }
    }

    // Verify OAuth token is valid
    const tokenValid = await verifyGoogleToken(credentials.refreshToken)

    const latencyMs = Date.now() - startTime

    return {
      status: tokenValid ? 'healthy' : 'unhealthy',
      latencyMs,
      details: {
        customerId: credentials.customerId,
        tokenValid,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

---

## Alert Thresholds

### Threshold Configuration

```typescript
// packages/health/src/thresholds.ts
export const DEFAULT_THRESHOLDS = {
  database: {
    connectionPool: { warning: 70, critical: 90 },    // percent
    queryLatencyP95: { warning: 200, critical: 500 }, // ms
    failedQueries: { warning: 5, critical: 20 },      // per minute
  },
  redis: {
    memoryUsage: { warning: 70, critical: 90 },       // percent
    connectionCount: { warning: 100, critical: 200 },
    evictionRate: { warning: 10, critical: 100 },     // per minute
  },
  api: {
    errorRate: { warning: 1, critical: 5 },           // percent
    latencyP95: { warning: 500, critical: 2000 },     // ms
    latencyP99: { warning: 1000, critical: 5000 },    // ms
  },
  inngest: {
    failedJobsHour: { warning: 10, critical: 50 },
    pendingJobs: { warning: 1000, critical: 5000 },
    avgExecutionTime: { warning: 30000, critical: 60000 }, // ms
  },
  webhooks: {
    deliveryFailure: { warning: 5, critical: 20 },    // percent
    queueDepth: { warning: 100, critical: 500 },
    avgDeliveryTime: { warning: 5000, critical: 30000 }, // ms
  },
  shopify: {
    rateLimitRemaining: { warning: 20, critical: 5 }, // percent
    syncLag: { warning: 300, critical: 900 },         // seconds
  },
  stripe: {
    webhookDelay: { warning: 60, critical: 300 },     // seconds
    failedPayments: { warning: 5, critical: 20 },     // percent
  },
  mcp: {
    responseTime: { warning: 1000, critical: 5000 },  // ms
    errorRate: { warning: 5, critical: 20 },          // percent
  },
} as const

export type ThresholdConfig = typeof DEFAULT_THRESHOLDS
```

### Threshold Evaluation

```typescript
// packages/health/src/evaluator.ts
export function evaluateThreshold(
  metric: string,
  value: number,
  thresholds: { warning: number; critical: number }
): 'healthy' | 'warning' | 'critical' {
  // For metrics where higher is worse (default)
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.warning) return 'warning'
  return 'healthy'
}

export function evaluateThresholdInverse(
  metric: string,
  value: number,
  thresholds: { warning: number; critical: number }
): 'healthy' | 'warning' | 'critical' {
  // For metrics where lower is worse (e.g., rate limit remaining)
  if (value <= thresholds.critical) return 'critical'
  if (value <= thresholds.warning) return 'warning'
  return 'healthy'
}
```

---

## Alert Delivery

### Alert Channels

```typescript
// packages/health/src/alerts/channels.ts
export interface AlertChannel {
  type: 'dashboard' | 'email' | 'slack' | 'pagerduty' | 'webhook'
  enabled: boolean
  config: Record<string, string>
  severities: AlertSeverity[]
}

export const DEFAULT_CHANNELS: AlertChannel[] = [
  {
    type: 'dashboard',
    enabled: true,
    config: {},
    severities: ['p1', 'p2', 'p3'],
  },
  {
    type: 'email',
    enabled: true,
    config: {
      recipients: 'ops@platform.com',
    },
    severities: ['p1', 'p2'],
  },
  {
    type: 'slack',
    enabled: true,
    config: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL!,
      channel: '#platform-alerts',
    },
    severities: ['p1', 'p2', 'p3'],
  },
  {
    type: 'pagerduty',
    enabled: false,
    config: {
      routingKey: process.env.PAGERDUTY_ROUTING_KEY!,
    },
    severities: ['p1'],
  },
]
```

### Alert Schema

```sql
-- Database schema for alerts
CREATE TABLE public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('p1', 'p2', 'p3')),
  source VARCHAR(50) NOT NULL, -- 'health_check', 'error_tracker', 'threshold', 'manual'
  service VARCHAR(50) NOT NULL,

  -- Context
  tenant_id UUID REFERENCES public.organizations(id),
  metric VARCHAR(100),
  current_value NUMERIC,
  threshold_value NUMERIC,

  -- Content
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,

  -- Delivery tracking
  delivery_status JSONB DEFAULT '{}' -- { slack: 'sent', email: 'sent', pagerduty: 'failed' }
);

CREATE INDEX idx_alerts_status ON public.platform_alerts(status) WHERE status = 'open';
CREATE INDEX idx_alerts_severity ON public.platform_alerts(severity);
CREATE INDEX idx_alerts_tenant ON public.platform_alerts(tenant_id);
CREATE INDEX idx_alerts_created ON public.platform_alerts(created_at DESC);
CREATE INDEX idx_alerts_service ON public.platform_alerts(service);
```

### Alert Dispatch

```typescript
// packages/health/src/alerts/dispatch.ts
export async function dispatchAlert(alert: Alert): Promise<void> {
  const channels = await getEnabledChannels(alert.severity)

  const results: Record<string, 'sent' | 'failed'> = {}

  await Promise.allSettled(
    channels.map(async (channel) => {
      try {
        switch (channel.type) {
          case 'dashboard':
            await sendDashboardAlert(alert)
            results.dashboard = 'sent'
            break

          case 'email':
            await sendEmailAlert(alert, channel.config.recipients)
            results.email = 'sent'
            break

          case 'slack':
            await sendSlackAlert(alert, channel.config)
            results.slack = 'sent'
            break

          case 'pagerduty':
            await sendPagerDutyAlert(alert, channel.config)
            results.pagerduty = 'sent'
            break

          case 'webhook':
            await sendWebhookAlert(alert, channel.config.url)
            results.webhook = 'sent'
            break
        }
      } catch (error) {
        results[channel.type] = 'failed'
        console.error(`Failed to send ${channel.type} alert:`, error)
      }
    })
  )

  // Update delivery status
  await sql`
    UPDATE public.platform_alerts
    SET delivery_status = ${JSON.stringify(results)}
    WHERE id = ${alert.id}
  `
}

async function sendSlackAlert(alert: Alert, config: SlackConfig) {
  const color = alert.severity === 'p1' ? '#dc2626' :
                alert.severity === 'p2' ? '#f59e0b' : '#3b82f6'

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: config.channel,
      attachments: [{
        color,
        title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        text: alert.message,
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Tenant', value: alert.tenantSlug || 'Platform', short: true },
          ...(alert.currentValue !== undefined ? [{
            title: 'Current Value',
            value: `${alert.currentValue} (threshold: ${alert.thresholdValue})`,
            short: true
          }] : []),
        ],
        footer: 'Platform Orchestrator',
        ts: Math.floor(Date.now() / 1000),
      }]
    })
  })
}
```

---

## Health Check Scheduler

### Scheduling Strategy

```typescript
// packages/health/src/scheduler.ts
export const HEALTH_CHECK_SCHEDULE = {
  // Critical services - check every minute
  critical: {
    interval: 60_000,
    services: ['database', 'redis'],
  },

  // Core services - check every 5 minutes
  core: {
    interval: 300_000,
    services: ['shopify', 'stripe', 'inngest'],
  },

  // Integration services - check every 15 minutes
  integrations: {
    interval: 900_000,
    services: ['meta', 'google-ads', 'wise', 'mcp'],
  },

  // External services - check every 30 minutes
  external: {
    interval: 1800_000,
    services: ['mux', 'assemblyai', 'slack', 'yotpo', 'loop'],
  },
}

export async function scheduleHealthChecks() {
  const inngest = getInngest()

  // Schedule each tier
  for (const [tier, config] of Object.entries(HEALTH_CHECK_SCHEDULE)) {
    await inngest.send({
      name: 'platform/health-check',
      data: { tier, services: config.services },
      ts: Date.now(),
    })
  }
}

// Inngest function for health checks
export const runHealthChecks = inngest.createFunction(
  { id: 'platform-health-checks' },
  { cron: '* * * * *' }, // Every minute, scheduler determines what to run
  async ({ step }) => {
    const now = Date.now()

    // Determine which tiers to run based on time
    const tiersToRun = Object.entries(HEALTH_CHECK_SCHEDULE)
      .filter(([_, config]) => {
        const lastRun = await getLastRunTime(config.services[0])
        return now - lastRun >= config.interval
      })

    for (const [tier, config] of tiersToRun) {
      await step.run(`health-${tier}`, async () => {
        const results = await runHealthChecksForServices(config.services)
        await storeHealthResults(results)
        await checkThresholdsAndAlert(results)
      })
    }
  }
)
```

### Multi-Tenant Health Checks

```typescript
// packages/health/src/tenant-checks.ts
export async function runTenantHealthChecks(tenantId: string): Promise<TenantHealthReport> {
  const tenantChecks = ['shopify', 'stripe', 'meta', 'google-ads']

  const results = await Promise.allSettled(
    tenantChecks.map(async (service) => {
      const checker = getTenantChecker(service)
      const result = await checker(tenantId)
      return { service, ...result }
    })
  )

  const report: TenantHealthReport = {
    tenantId,
    timestamp: new Date().toISOString(),
    overallStatus: 'healthy',
    services: {},
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const service = tenantChecks[i]

    if (result.status === 'fulfilled') {
      report.services[service] = result.value
      if (result.value.status === 'unhealthy') {
        report.overallStatus = 'unhealthy'
      } else if (result.value.status === 'degraded' && report.overallStatus === 'healthy') {
        report.overallStatus = 'degraded'
      }
    } else {
      report.services[service] = {
        status: 'unhealthy',
        latencyMs: 0,
        details: { error: result.reason?.message || 'Check failed' }
      }
      report.overallStatus = 'unhealthy'
    }
  }

  return report
}
```

---

## Storage and Caching

### Redis Caching

```typescript
// packages/health/src/cache.ts
const CACHE_TTL = {
  critical: 30,    // 30 seconds
  core: 120,       // 2 minutes
  integrations: 300, // 5 minutes
  external: 600,   // 10 minutes
}

export async function cacheHealthResult(
  service: string,
  tenantId: string | null,
  result: HealthCheckResult
): Promise<void> {
  const redis = getRedis()
  const key = tenantId
    ? `health:${service}:${tenantId}`
    : `health:${service}:platform`

  const tier = getServiceTier(service)
  const ttl = CACHE_TTL[tier]

  await redis.setex(key, ttl, JSON.stringify({
    ...result,
    cachedAt: new Date().toISOString(),
  }))
}

export async function getCachedHealth(
  service: string,
  tenantId: string | null
): Promise<HealthCheckResult | null> {
  const redis = getRedis()
  const key = tenantId
    ? `health:${service}:${tenantId}`
    : `health:${service}:platform`

  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}
```

### Database Storage for History

```sql
-- Health check history for trending and analysis
CREATE TABLE public.health_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  tenant_id UUID REFERENCES public.organizations(id),

  status VARCHAR(20) NOT NULL,
  latency_ms INTEGER NOT NULL,
  details JSONB,

  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX idx_health_history_service_time
  ON public.health_check_history(service, checked_at DESC);
CREATE INDEX idx_health_history_tenant_time
  ON public.health_check_history(tenant_id, checked_at DESC);

-- Retention: Keep 30 days of detailed history
CREATE OR REPLACE FUNCTION cleanup_health_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.health_check_history
  WHERE checked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## Health Dashboard UI

### Health Matrix Component

```typescript
// apps/orchestrator/src/components/health/health-matrix.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function HealthMatrix() {
  const { data: matrix, isLoading } = useQuery({
    queryKey: ['health-matrix'],
    queryFn: () => fetch('/api/platform/health/matrix').then(r => r.json()),
    refetchInterval: 30_000, // Refresh every 30 seconds
  })

  if (isLoading) return <HealthMatrixSkeleton />

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-medium">Service</th>
            {matrix.tenants.map((tenant: string) => (
              <th key={tenant} className="p-3 text-center font-medium">
                {tenant}
              </th>
            ))}
            <th className="p-3 text-center font-medium">Platform</th>
          </tr>
        </thead>
        <tbody>
          {matrix.services.map((service: string) => (
            <tr key={service} className="border-b hover:bg-muted/50">
              <td className="p-3 font-medium">{formatServiceName(service)}</td>
              {matrix.tenants.map((tenant: string) => (
                <td key={tenant} className="p-3 text-center">
                  <StatusDot
                    status={matrix.statuses[tenant]?.[service] || 'unknown'}
                    showLabel={false}
                  />
                </td>
              ))}
              <td className="p-3 text-center">
                <StatusDot
                  status={matrix.platformStatuses[service] || 'unknown'}
                  showLabel={false}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusDot({
  status,
  showLabel = true,
}: {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  showLabel?: boolean
}) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
    unknown: 'bg-gray-400',
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <span className={cn('w-3 h-3 rounded-full', colors[status])} />
      {showLabel && <span className="text-sm capitalize">{status}</span>}
    </div>
  )
}
```

### Service Detail Panel

```typescript
// apps/orchestrator/src/components/health/service-detail.tsx
export function ServiceDetail({ service, tenantId }: Props) {
  const { data: health } = useQuery({
    queryKey: ['health', service, tenantId],
    queryFn: () => fetchServiceHealth(service, tenantId),
  })

  const { data: history } = useQuery({
    queryKey: ['health-history', service, tenantId],
    queryFn: () => fetchHealthHistory(service, tenantId, '24h'),
  })

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusDot status={health?.status} />
            {formatServiceName(service)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Response Time</dt>
              <dd className="text-2xl font-bold">{health?.latencyMs}ms</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last Checked</dt>
              <dd className="text-sm">{formatRelative(health?.timestamp)}</dd>
            </div>
          </dl>

          {/* Service-specific details */}
          {health?.details && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(health.details, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponseTimeChart data={history} />
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertList service={service} tenantId={tenantId} limit={5} />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Success Criteria

- [ ] All service monitors implemented and tested
- [ ] Health matrix showing cross-tenant status
- [ ] Alert thresholds configurable per service
- [ ] Slack/email alerts delivering reliably
- [ ] 30-day health history retention
- [ ] <5 second dashboard refresh
- [ ] Real-time WebSocket alert stream working
- [ ] PagerDuty integration (optional) configured

---

## Dependencies

- Phase 1 database schema (organizations table)
- Inngest setup for scheduled checks
- Redis for caching
- Existing RAWDOG health check patterns as reference
