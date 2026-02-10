# Logging Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Platform-wide structured logging and error tracking

---

## Overview

The logging system provides centralized, structured logging across all platform services and tenants. It builds on the existing RAWDOG `OpsLogger` implementation and extends it for multi-tenant operation with cross-tenant visibility in the super admin dashboard.

### Existing RAWDOG Implementation

From `/src/lib/ops/logs/logger.ts`:
- `OpsLogger` class with buffering (50 items, 5s flush)
- Request-scoped loggers with context
- Log levels: debug, info, warn, error
- Log sources: vercel, api, frontend, background, mcp, webhook

This specification extends these patterns for multi-tenant operation.

---

## Log Levels

| Level | Use Case | Stored | Dashboard | Retention |
|-------|----------|--------|-----------|-----------|
| ERROR | Failures requiring action | Yes | Real-time stream | 30 days |
| WARN | Degraded performance, potential issues | Yes | Aggregated view | 14 days |
| INFO | Normal operations, audit trail | Yes | On-demand query | 7 days |
| DEBUG | Development diagnostics | Conditional | No | 1 day |

### Level Configuration

```typescript
// packages/logging/src/config.ts
export const LOG_LEVEL_CONFIG = {
  production: {
    minLevel: 'info',
    debugEnabled: false,
    sampleRate: {
      info: 1.0,    // Log all info
      debug: 0,     // No debug in prod
    }
  },
  development: {
    minLevel: 'debug',
    debugEnabled: true,
    sampleRate: {
      info: 1.0,
      debug: 1.0,
    }
  },
  staging: {
    minLevel: 'debug',
    debugEnabled: true,
    sampleRate: {
      info: 1.0,
      debug: 0.1,   // Sample 10% of debug logs
    }
  }
}
```

---

## Required Log Context

Every log entry MUST include these fields:

```typescript
// packages/logging/src/types.ts
export interface LogEntry {
  // === IDENTIFICATION ===
  id: string                      // Unique log ID (UUID)
  timestamp: string               // ISO8601 with milliseconds
  level: 'error' | 'warn' | 'info' | 'debug'

  // === TENANT CONTEXT ===
  tenantId: string | null         // null for platform-level logs
  tenantSlug: string | null       // Human-readable tenant identifier

  // === USER CONTEXT ===
  userId: string | null           // Authenticated user ID
  sessionId: string | null        // Session identifier
  impersonatorId: string | null   // If impersonation active

  // === REQUEST CONTEXT ===
  requestId: string               // Correlation ID for request tracing
  traceId: string | null          // Distributed tracing ID (if available)
  spanId: string | null           // Span ID for distributed tracing

  // === SOURCE LOCATION ===
  service: LogService             // Which app/service
  action: string                  // What operation (e.g., 'order.sync', 'payout.process')
  file: string | null             // Source file path
  line: number | null             // Line number
  function: string | null         // Function/method name

  // === CONTENT ===
  message: string                 // Human-readable message
  data: Record<string, unknown>   // Structured data (JSON-serializable)

  // === ERROR CONTEXT (error level only) ===
  errorType?: string              // Error class name
  errorCode?: string              // Application error code
  errorStack?: string             // Stack trace

  // === ENVIRONMENT ===
  environment: 'production' | 'staging' | 'development'
  version: string                 // App version/git commit
  region: string                  // Deployment region
}

export type LogService =
  | 'orchestrator'
  | 'admin'
  | 'storefront'
  | 'creator-portal'
  | 'mcp-server'
  | 'inngest'
  | 'webhook-handler'
```

---

## Log Storage

### Primary Storage: PostgreSQL

Structured, queryable storage for all logs.

```sql
-- Main logs table with partitioning
CREATE TABLE public.platform_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level VARCHAR(10) NOT NULL,

  -- Tenant context
  tenant_id UUID REFERENCES public.organizations(id),

  -- User context
  user_id UUID,
  session_id VARCHAR(36),
  impersonator_id UUID,

  -- Request context
  request_id VARCHAR(36) NOT NULL,
  trace_id VARCHAR(36),
  span_id VARCHAR(36),

  -- Source
  service VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  file VARCHAR(255),
  line INTEGER,
  function_name VARCHAR(100),

  -- Content
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',

  -- Error fields
  error_type VARCHAR(100),
  error_code VARCHAR(50),
  error_stack TEXT,

  -- Environment
  environment VARCHAR(20) NOT NULL,
  version VARCHAR(40),
  region VARCHAR(20)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE platform_logs_2025_02 PARTITION OF public.platform_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE platform_logs_2025_03 PARTITION OF public.platform_logs
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
-- ... continue for future months

-- Indexes for common queries
CREATE INDEX idx_logs_timestamp ON public.platform_logs(timestamp DESC);
CREATE INDEX idx_logs_level ON public.platform_logs(level) WHERE level IN ('error', 'warn');
CREATE INDEX idx_logs_tenant ON public.platform_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_logs_request ON public.platform_logs(request_id);
CREATE INDEX idx_logs_action ON public.platform_logs(action);
CREATE INDEX idx_logs_service ON public.platform_logs(service);
CREATE INDEX idx_logs_user ON public.platform_logs(user_id) WHERE user_id IS NOT NULL;

-- Full-text search on message
CREATE INDEX idx_logs_message_search ON public.platform_logs
  USING GIN (to_tsvector('english', message));

-- Partial index for errors (most common query)
CREATE INDEX idx_logs_errors_recent ON public.platform_logs(timestamp DESC)
  WHERE level = 'error';
```

### Secondary Storage: Redis

Real-time stream for dashboard updates.

```typescript
// packages/logging/src/redis-stream.ts
const STREAM_KEY = 'logs:stream'
const STREAM_MAX_LEN = 10000 // Keep last 10k logs in stream

export async function pushToStream(log: LogEntry): Promise<void> {
  const redis = getRedis()

  await redis.xadd(
    STREAM_KEY,
    'MAXLEN', '~', STREAM_MAX_LEN,
    '*', // Auto-generate ID
    'data', JSON.stringify(log)
  )

  // Also publish for real-time subscribers
  await redis.publish('logs:realtime', JSON.stringify(log))
}

export async function getRecentLogs(
  count: number = 100,
  filters?: LogFilters
): Promise<LogEntry[]> {
  const redis = getRedis()

  // Read from stream (newest first)
  const entries = await redis.xrevrange(STREAM_KEY, '+', '-', 'COUNT', count * 2)

  let logs = entries.map(([id, fields]) => {
    const log = JSON.parse(fields.data)
    return { ...log, streamId: id }
  })

  // Apply filters
  if (filters) {
    logs = logs.filter(log => matchesFilters(log, filters))
  }

  return logs.slice(0, count)
}
```

### Log Retention Management

```typescript
// packages/logging/src/retention.ts
export const RETENTION_DAYS = {
  error: 30,
  warn: 14,
  info: 7,
  debug: 1,
}

// Inngest job for log cleanup
export const cleanupLogs = inngest.createFunction(
  { id: 'cleanup-platform-logs' },
  { cron: '0 3 * * *' }, // 3 AM UTC daily
  async ({ step }) => {
    for (const [level, days] of Object.entries(RETENTION_DAYS)) {
      await step.run(`cleanup-${level}`, async () => {
        const result = await sql`
          DELETE FROM public.platform_logs
          WHERE level = ${level}
            AND timestamp < NOW() - INTERVAL '${days} days'
        `
        return { level, deleted: result.rowCount }
      })
    }

    // Drop old partitions (older than 90 days)
    await step.run('drop-old-partitions', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 90)
      const partitionName = `platform_logs_${oldDate.toISOString().slice(0, 7).replace('-', '_')}`

      try {
        await sql.query(`DROP TABLE IF EXISTS ${partitionName}`)
        return { dropped: partitionName }
      } catch (error) {
        return { error: 'Failed to drop partition' }
      }
    })
  }
)
```

---

## Logger Implementation

### Request-Scoped Logger

```typescript
// packages/logging/src/logger.ts
export class PlatformLogger {
  private buffer: LogEntry[] = []
  private flushTimeout: NodeJS.Timeout | null = null
  private readonly maxBufferSize = 50
  private readonly flushIntervalMs = 5000

  constructor(private context: LogContext) {}

  private createEntry(
    level: LogEntry['level'],
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    const error = new Error()
    const stackLines = error.stack?.split('\n') || []
    const callerLine = stackLines[3] || ''
    const match = callerLine.match(/at\s+(\S+)\s+\((.+):(\d+):\d+\)/)

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      tenantId: this.context.tenantId,
      tenantSlug: this.context.tenantSlug,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      impersonatorId: this.context.impersonatorId,
      requestId: this.context.requestId,
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      service: this.context.service,
      action: this.context.action || 'unknown',
      file: match?.[2] || null,
      line: match?.[3] ? parseInt(match[3]) : null,
      function: match?.[1] || null,
      message,
      data: data || {},
      environment: process.env.NODE_ENV as any || 'development',
      version: process.env.GIT_COMMIT || 'unknown',
      region: process.env.VERCEL_REGION || 'local',
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return
    this.addToBuffer(this.createEntry('debug', message, data))
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.addToBuffer(this.createEntry('info', message, data))
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.addToBuffer(this.createEntry('warn', message, data))
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const entry = this.createEntry('error', message, data)

    if (error) {
      entry.errorType = error.constructor.name
      entry.errorStack = error.stack
      entry.errorCode = (error as any).code
    }

    this.addToBuffer(entry)

    // Immediately flush on errors
    this.flush()
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry)

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      this.logToConsole(entry)
    }

    // Schedule flush
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.flushIntervalMs)
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.service}] [${entry.action}]`
    const message = `${prefix} ${entry.message}`

    switch (entry.level) {
      case 'error':
        console.error(message, entry.data)
        if (entry.errorStack) console.error(entry.errorStack)
        break
      case 'warn':
        console.warn(message, entry.data)
        break
      case 'debug':
        console.debug(message, entry.data)
        break
      default:
        console.log(message, entry.data)
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout)
      this.flushTimeout = null
    }

    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    try {
      // Parallel: write to PostgreSQL and Redis
      await Promise.all([
        this.writeToDatabase(entries),
        this.writeToRedis(entries),
      ])
    } catch (error) {
      // Fallback: at least log to console
      console.error('Failed to flush logs:', error)
      entries.forEach(e => console.log(JSON.stringify(e)))
    }
  }

  private async writeToDatabase(entries: LogEntry[]): Promise<void> {
    // Batch insert
    const values = entries.map(e => [
      e.id, e.timestamp, e.level,
      e.tenantId, e.userId, e.sessionId, e.impersonatorId,
      e.requestId, e.traceId, e.spanId,
      e.service, e.action, e.file, e.line, e.function,
      e.message, JSON.stringify(e.data),
      e.errorType, e.errorCode, e.errorStack,
      e.environment, e.version, e.region,
    ])

    await sql.query(`
      INSERT INTO public.platform_logs (
        id, timestamp, level,
        tenant_id, user_id, session_id, impersonator_id,
        request_id, trace_id, span_id,
        service, action, file, line, function_name,
        message, data,
        error_type, error_code, error_stack,
        environment, version, region
      )
      SELECT * FROM UNNEST($1::uuid[], $2::timestamptz[], $3::varchar[], ...)
    `, [
      values.map(v => v[0]),
      values.map(v => v[1]),
      // ... continue for all columns
    ])
  }

  private async writeToRedis(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      await pushToStream(entry)
    }
  }
}
```

### Logger Factory

```typescript
// packages/logging/src/factory.ts
import { headers } from 'next/headers'

export interface LogContext {
  tenantId: string | null
  tenantSlug: string | null
  userId: string | null
  sessionId: string | null
  impersonatorId: string | null
  requestId: string
  traceId: string | null
  spanId: string | null
  service: LogService
  action?: string
}

export function createLogger(context: Partial<LogContext> & { service: LogService }): PlatformLogger {
  const hdrs = headers()

  const fullContext: LogContext = {
    tenantId: context.tenantId ?? hdrs.get('x-tenant-id'),
    tenantSlug: context.tenantSlug ?? hdrs.get('x-tenant-slug'),
    userId: context.userId ?? hdrs.get('x-user-id'),
    sessionId: context.sessionId ?? hdrs.get('x-session-id'),
    impersonatorId: context.impersonatorId ?? hdrs.get('x-impersonator-id'),
    requestId: context.requestId ?? hdrs.get('x-request-id') ?? crypto.randomUUID(),
    traceId: context.traceId ?? hdrs.get('x-trace-id'),
    spanId: context.spanId ?? hdrs.get('x-span-id'),
    service: context.service,
    action: context.action,
  }

  return new PlatformLogger(fullContext)
}

// Convenience for request handlers
export function createRequestLogger(
  req: Request,
  service: LogService,
  action?: string
): PlatformLogger {
  const headers = Object.fromEntries(req.headers.entries())

  return createLogger({
    tenantId: headers['x-tenant-id'],
    tenantSlug: headers['x-tenant-slug'],
    userId: headers['x-user-id'],
    requestId: headers['x-request-id'] || crypto.randomUUID(),
    service,
    action,
  })
}
```

---

## Error Aggregation

Group similar errors for dashboard display.

```typescript
// packages/logging/src/error-aggregation.ts
export interface ErrorAggregate {
  signature: string             // Hash of error_type + action + message pattern
  errorType: string
  action: string
  messagePattern: string        // Generalized pattern (IDs removed)

  firstSeen: string
  lastSeen: string
  count: number

  affectedTenants: string[]
  affectedUsers: string[]

  sampleLogIds: string[]        // Up to 5 sample logs
  sampleStack: string | null    // Representative stack trace

  status: 'new' | 'acknowledged' | 'resolved' | 'ignored'
  assignedTo: string | null
  notes: string | null
}

export function computeErrorSignature(log: LogEntry): string {
  const pattern = generalizeMessage(log.message)
  const components = [
    log.errorType || 'UnknownError',
    log.action,
    pattern,
  ].join('|')

  return crypto.createHash('sha256').update(components).digest('hex').slice(0, 16)
}

function generalizeMessage(message: string): string {
  return message
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // Replace numeric IDs
    .replace(/\b\d{6,}\b/g, '<ID>')
    // Replace emails
    .replace(/[^\s]+@[^\s]+/g, '<EMAIL>')
    // Replace URLs
    .replace(/https?:\/\/[^\s]+/g, '<URL>')
    // Replace timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
}

// Database operations for aggregates
export async function getErrorAggregates(filters: AggregateFilters): Promise<ErrorAggregate[]> {
  return sql`
    WITH error_logs AS (
      SELECT
        *,
        -- Compute signature in query for consistency
        md5(COALESCE(error_type, 'Unknown') || action || regexp_replace(
          message,
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
          '<UUID>',
          'gi'
        )) as signature
      FROM public.platform_logs
      WHERE level = 'error'
        AND timestamp > NOW() - INTERVAL '${filters.hours || 24} hours'
        ${filters.tenantId ? sql`AND tenant_id = ${filters.tenantId}` : sql``}
    )
    SELECT
      signature,
      MAX(error_type) as error_type,
      MAX(action) as action,
      MODE() WITHIN GROUP (ORDER BY message) as message_pattern,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen,
      COUNT(*) as count,
      ARRAY_AGG(DISTINCT tenant_id) FILTER (WHERE tenant_id IS NOT NULL) as affected_tenants,
      ARRAY_AGG(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as affected_users,
      (ARRAY_AGG(id ORDER BY timestamp DESC))[1:5] as sample_log_ids,
      MAX(error_stack) as sample_stack
    FROM error_logs
    GROUP BY signature
    ORDER BY count DESC, last_seen DESC
    LIMIT ${filters.limit || 50}
  `
}
```

---

## Log Viewer UI

### Real-Time Log Stream

```typescript
// apps/orchestrator/src/components/logs/log-stream.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export function LogStream({ filters }: { filters: LogFilters }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  // WebSocket connection for real-time logs
  useEffect(() => {
    if (isPaused) return

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/logs`)

    ws.onmessage = (event) => {
      const log = JSON.parse(event.data)

      // Apply client-side filters
      if (matchesFilters(log, filters)) {
        setLogs(prev => [log, ...prev.slice(0, 999)])
      }
    }

    return () => ws.close()
  }, [filters, isPaused])

  // Virtual scrolling for performance
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 20,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <LogFiltersBar filters={filters} />
        <Button
          variant="outline"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      <div
        ref={parentRef}
        className="h-[600px] overflow-auto bg-black rounded-lg p-4 font-mono text-sm"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const log = logs[virtualItem.index]
            return (
              <LogLine
                key={log.id}
                log={log}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LogLine({ log, style }: { log: LogEntry; style: React.CSSProperties }) {
  const levelColors = {
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    debug: 'text-gray-400',
  }

  return (
    <div style={style} className="flex gap-2 hover:bg-white/5 px-2">
      <span className="text-gray-500 shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={cn('shrink-0 w-12', levelColors[log.level])}>
        [{log.level.toUpperCase()}]
      </span>
      <span className="text-purple-400 shrink-0">
        [{log.tenantSlug || 'platform'}]
      </span>
      <span className="text-cyan-400 shrink-0">
        [{log.action}]
      </span>
      <span className="text-white truncate">
        {log.message}
      </span>
    </div>
  )
}
```

### Log Query Interface

```typescript
// apps/orchestrator/src/app/ops/logs/page.tsx
export default async function LogsPage({
  searchParams,
}: {
  searchParams: LogQueryParams
}) {
  const logs = await queryLogs(searchParams)
  const tenants = await getAllTenants()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Logs</h1>
        <div className="flex gap-2">
          <ViewModeToggle />
          <ExportButton query={searchParams} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <LogFilters
            tenants={tenants}
            current={searchParams}
          />
        </CardContent>
      </Card>

      {/* View Modes */}
      <Tabs defaultValue={searchParams.view || 'stream'}>
        <TabsList>
          <TabsTrigger value="stream">Live Stream</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="aggregated">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="stream">
          <LogStream filters={searchParams} />
        </TabsContent>

        <TabsContent value="query">
          <LogTable logs={logs} />
        </TabsContent>

        <TabsContent value="aggregated">
          <ErrorAggregatesView filters={searchParams} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Log Filters Component

```typescript
// apps/orchestrator/src/components/logs/log-filters.tsx
export function LogFilters({ tenants, current }: Props) {
  const router = useRouter()
  const [filters, setFilters] = useState(current)

  const applyFilters = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v.toString())
    })
    router.push(`/ops/logs?${params.toString()}`)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Level */}
      <Select
        value={filters.level}
        onValueChange={(v) => setFilters({ ...filters, level: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="warn">Warning</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="debug">Debug</SelectItem>
        </SelectContent>
      </Select>

      {/* Tenant */}
      <Select
        value={filters.tenantId}
        onValueChange={(v) => setFilters({ ...filters, tenantId: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Tenant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tenants</SelectItem>
          <SelectItem value="platform">Platform Only</SelectItem>
          {tenants.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service */}
      <Select
        value={filters.service}
        onValueChange={(v) => setFilters({ ...filters, service: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          <SelectItem value="orchestrator">Orchestrator</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="storefront">Storefront</SelectItem>
          <SelectItem value="mcp-server">MCP Server</SelectItem>
          <SelectItem value="inngest">Inngest</SelectItem>
        </SelectContent>
      </Select>

      {/* Time Range */}
      <Select
        value={filters.timeRange}
        onValueChange={(v) => setFilters({ ...filters, timeRange: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Time Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1h">Last Hour</SelectItem>
          <SelectItem value="6h">Last 6 Hours</SelectItem>
          <SelectItem value="24h">Last 24 Hours</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="col-span-2">
        <Input
          type="search"
          placeholder="Search messages..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <Button onClick={applyFilters}>Apply Filters</Button>
    </div>
  )
}
```

---

## API Endpoints

### Log Query API

```typescript
// apps/orchestrator/src/app/api/platform/logs/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const filters: LogQueryFilters = {
    level: searchParams.get('level') || undefined,
    tenantId: searchParams.get('tenantId') || undefined,
    service: searchParams.get('service') || undefined,
    action: searchParams.get('action') || undefined,
    search: searchParams.get('search') || undefined,
    startTime: searchParams.get('startTime') || undefined,
    endTime: searchParams.get('endTime') || undefined,
    limit: parseInt(searchParams.get('limit') || '100'),
    offset: parseInt(searchParams.get('offset') || '0'),
  }

  const logs = await queryLogs(filters)

  return Response.json({
    data: logs,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      hasMore: logs.length === filters.limit,
    }
  })
}

async function queryLogs(filters: LogQueryFilters): Promise<LogEntry[]> {
  let query = sql`
    SELECT * FROM public.platform_logs
    WHERE 1=1
  `

  if (filters.level && filters.level !== 'all') {
    query = sql`${query} AND level = ${filters.level}`
  }

  if (filters.tenantId) {
    if (filters.tenantId === 'platform') {
      query = sql`${query} AND tenant_id IS NULL`
    } else {
      query = sql`${query} AND tenant_id = ${filters.tenantId}`
    }
  }

  if (filters.service && filters.service !== 'all') {
    query = sql`${query} AND service = ${filters.service}`
  }

  if (filters.search) {
    query = sql`${query} AND to_tsvector('english', message) @@ plainto_tsquery('english', ${filters.search})`
  }

  if (filters.startTime) {
    query = sql`${query} AND timestamp >= ${filters.startTime}`
  }

  if (filters.endTime) {
    query = sql`${query} AND timestamp <= ${filters.endTime}`
  }

  query = sql`
    ${query}
    ORDER BY timestamp DESC
    LIMIT ${filters.limit}
    OFFSET ${filters.offset}
  `

  return query
}
```

### WebSocket Stream API

```typescript
// apps/orchestrator/src/app/api/platform/logs/stream/route.ts
import { WebSocket } from 'ws'

export async function GET(req: Request) {
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected websocket', { status: 400 })
  }

  // Create WebSocket connection
  const ws = new WebSocket(/* ... */)

  // Subscribe to Redis pub/sub
  const redis = getRedis()
  const subscriber = redis.duplicate()
  await subscriber.subscribe('logs:realtime')

  subscriber.on('message', (channel, message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  })

  ws.on('close', () => {
    subscriber.unsubscribe()
    subscriber.quit()
  })

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    }
  })
}
```

---

## Usage Examples

### In API Routes

```typescript
// apps/admin/src/app/api/orders/[id]/route.ts
import { createRequestLogger } from '@repo/logging'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const log = createRequestLogger(req, 'admin', 'order.get')

  try {
    log.info('Fetching order', { orderId: params.id })

    const order = await getOrder(params.id)

    if (!order) {
      log.warn('Order not found', { orderId: params.id })
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    log.info('Order fetched successfully', { orderId: params.id })
    await log.flush()

    return Response.json(order)
  } catch (error) {
    log.error('Failed to fetch order', error as Error, { orderId: params.id })
    await log.flush()
    throw error
  }
}
```

### In Inngest Functions

```typescript
// apps/admin/src/inngest/functions/order-sync.ts
import { createLogger } from '@repo/logging'

export const syncOrder = inngest.createFunction(
  { id: 'sync-order' },
  { event: 'shopify/order.created' },
  async ({ event, step }) => {
    const log = createLogger({
      service: 'inngest',
      action: 'order.sync',
      tenantId: event.data.tenantId,
      requestId: event.id,
    })

    log.info('Starting order sync', { orderId: event.data.orderId })

    await step.run('fetch-order', async () => {
      log.info('Fetching from Shopify')
      // ...
    })

    await step.run('save-order', async () => {
      log.info('Saving to database')
      // ...
    })

    log.info('Order sync completed')
    await log.flush()
  }
)
```

### In React Server Components

```typescript
// apps/admin/src/app/admin/orders/page.tsx
import { createLogger } from '@repo/logging'

export default async function OrdersPage() {
  const log = createLogger({ service: 'admin', action: 'orders.list' })

  try {
    log.info('Loading orders page')
    const orders = await getOrders()
    log.info('Orders loaded', { count: orders.length })
    await log.flush()

    return <OrdersTable orders={orders} />
  } catch (error) {
    log.error('Failed to load orders', error as Error)
    await log.flush()
    throw error
  }
}
```

---

## Success Criteria

- [ ] All services using structured logging
- [ ] Tenant context in every log entry
- [ ] Real-time log stream working in dashboard
- [ ] Error aggregation with pattern matching
- [ ] Full-text search on log messages
- [ ] Retention policies enforced automatically
- [ ] Log export functionality
- [ ] <1 second query response for recent logs

---

## Dependencies

- PostgreSQL with partitioning support
- Redis for real-time streaming
- Inngest for retention cleanup jobs
- WebSocket support in Vercel
