# @cgk-platform/health

Platform health monitoring for the CGK multi-tenant platform - service checks, alerts, and observability.

## Installation

```bash
pnpm add @cgk-platform/health
```

## Features

- **Service Health Checks** - Monitor database, cache, APIs, jobs
- **Alert System** - Configurable thresholds and notifications
- **Tenant-Level Monitoring** - Per-tenant service health
- **Platform Dashboard** - Overall platform health view
- **Scheduler** - Automated health check runs
- **Alert Channels** - Slack, email, webhook notifications
- **Historical Data** - Track health trends over time

## Quick Start

### Run Health Checks

```typescript
import { runHealthChecks, checkDatabaseHealth } from '@cgk-platform/health'

// Check all services
const results = await runHealthChecks({
  tenantId: 'tenant_123',
})

console.log(results.overall) // 'healthy', 'degraded', 'unhealthy'
console.log(results.services.database.status)
console.log(results.services.cache.status)

// Check specific service
const dbHealth = await checkDatabaseHealth({
  tenantId: 'tenant_123',
})

if (dbHealth.status !== 'healthy') {
  console.error(dbHealth.message)
}
```

### Configure Alerts

```typescript
import { createAlert, setThreshold } from '@cgk-platform/health'

// Set alert threshold
await setThreshold({
  tenantId: 'tenant_123',
  service: 'api',
  metric: 'response_time',
  warningThreshold: 500, // ms
  criticalThreshold: 1000, // ms
})

// Create alert
await createAlert({
  tenantId: 'tenant_123',
  service: 'database',
  severity: 'critical',
  message: 'Database connection pool exhausted',
  metadata: {
    poolSize: 20,
    activeConnections: 20,
  },
})
```

### Platform Health Dashboard

```typescript
import { getPlatformHealth, getTenantHealthSummary } from '@cgk-platform/health'

// Platform-wide health
const platformHealth = await getPlatformHealth()

console.log(platformHealth.overallStatus)
console.log(platformHealth.totalTenants)
console.log(platformHealth.healthyTenants)
console.log(platformHealth.degradedTenants)

// Tenant health summary
const tenantHealth = await getTenantHealthSummary('tenant_123')

console.log(tenantHealth.services)
console.log(tenantHealth.activeAlerts)
console.log(tenantHealth.uptime)
```

### Schedule Health Checks

```typescript
import { createHealthMonitor } from '@cgk-platform/health'

const monitor = createHealthMonitor({
  tenantId: 'tenant_123',
  interval: 60000, // 1 minute
  services: ['database', 'cache', 'api', 'jobs'],
  onUnhealthy: async (result) => {
    console.error(`Service ${result.service} is unhealthy`)
    // Send alert
  },
})

monitor.start()

// Later...
monitor.stop()
```

### Alert Channels

```typescript
import { configureAlertChannel } from '@cgk-platform/health'

// Slack alerts
await configureAlertChannel({
  tenantId: 'tenant_123',
  channel: 'slack',
  config: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: '#alerts',
  },
  severities: ['critical', 'warning'],
})

// Email alerts
await configureAlertChannel({
  tenantId: 'tenant_123',
  channel: 'email',
  config: {
    recipients: ['ops@my-brand.com'],
  },
  severities: ['critical'],
})
```

## Key Exports

### Health Checks
- `runHealthChecks(options)` - Run all checks
- `checkDatabaseHealth()` - Database connectivity
- `checkCacheHealth()` - Redis/cache connectivity
- `checkApiHealth()` - External API availability
- `checkJobsHealth()` - Background job system

### Alerts
- `createAlert(payload)` - Create alert
- `updateAlertStatus(id, status)` - Update alert
- `listAlerts(filters)` - List alerts
- `acknowledgeAlert(id)` - Acknowledge alert
- `resolveAlert(id)` - Resolve alert

### Thresholds
- `setThreshold(config)` - Configure threshold
- `getThresholds(tenantId)` - Get all thresholds
- `evaluateThreshold(metric, value)` - Check threshold

### Monitoring
- `createHealthMonitor(config)` - Create monitor
- `getPlatformHealth()` - Platform-wide health
- `getTenantHealthSummary(tenantId)` - Tenant health
- `getServiceHealthHistory(service, range)` - Historical data

### Alert Channels
- `configureAlertChannel(config)` - Setup channel
- `sendAlert(alert, channel)` - Send alert
- `testAlertChannel(channel)` - Test configuration

### Types
- `HealthStatus` - 'healthy', 'degraded', 'unhealthy'
- `AlertSeverity` - 'info', 'warning', 'critical'
- `ServiceTier` - 'core', 'feature', 'integration'
- `HealthCheckResult`, `Alert`, `ThresholdConfig`

## Service Tiers

Services are categorized by importance:

- **Core** - Database, cache, authentication (high priority)
- **Feature** - Email, payments, jobs (medium priority)
- **Integration** - Third-party APIs (lower priority)

Platform is marked degraded if any core service is unhealthy.

## Alert Severities

- **Info** - FYI, no action needed
- **Warning** - Degraded performance, monitor closely
- **Critical** - Service down, immediate action required

## License

MIT
