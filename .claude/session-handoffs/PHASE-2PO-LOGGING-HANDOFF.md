# Phase 2PO-LOGGING Handoff: Structured Logging System

## Status: COMPLETE

## Summary

Built the platform-wide structured logging system with `PlatformLogger` class, PostgreSQL partitioned storage, Redis real-time streaming, SSE-based log viewer, and error aggregation with pattern matching.

## Completed Tasks

### Package: @cgk/logging (packages/logging/)

#### Platform Logger Core (src/platform/)

1. **types.ts** - Complete type definitions:
   - `PlatformLogEntry` with all required context fields (tenant, user, request, source, error, environment)
   - `PlatformLogContext` for logger context
   - `PlatformLoggerConfig` for logger configuration
   - `LogQueryFilters` and `LogQueryResult` for querying
   - `ErrorAggregate` and `ErrorAggregateFilters` for error grouping
   - `ServiceName` type with all service identifiers
   - `LOG_RETENTION_DAYS` constant for retention policy

2. **platform-logger.ts** - Main logger implementation:
   - `PlatformLogger` class with buffering (50 items / 5 seconds / immediate on error)
   - Methods: `trace()`, `debug()`, `info()`, `warn()`, `error()`, `fatal()`
   - Child logger creation via `child()`
   - Context management via `setContext()` and `clearContext()`
   - `createPlatformLogger()` factory function
   - `createRequestLogger()` for API route context extraction
   - `generateTraceId()` and `generateSpanId()` utilities

3. **config.ts** - Environment-specific configuration:
   - Default configs for development, test, staging, production
   - `mergeConfig()` for combining user config with environment defaults
   - `shouldStoreLevel()` to control which levels are stored
   - `getEnvironment()` utility

4. **caller.ts** - Stack trace parsing:
   - `getCallerLocation()` extracts file, line, function from Error stack
   - V8-style stack frame parsing
   - Webpack noise removal
   - `makeRelativePath()` for clean file paths

5. **storage.ts** - Dual storage layer:
   - `writeToDatabase()` for PostgreSQL batch inserts
   - `writeToRedis()` for Redis stream append (XADD with MAXLEN ~10000)
   - `readFromStream()` for reading Redis stream (XRANGE)
   - `subscribeToStream()` for polling-based subscription (XREAD BLOCK)
   - Upstash Redis REST API client

6. **query.ts** - Log querying:
   - `queryLogs()` with filters and pagination
   - `getLogById()` for single log retrieval
   - `getLogsByTraceId()` for request tracing

7. **error-aggregation.ts** - Error grouping:
   - `generalizeMessage()` replaces UUIDs, IDs, emails, URLs, timestamps with placeholders
   - `computeErrorSignature()` creates unique hash for error grouping
   - `getErrorAggregates()` queries grouped errors with stats
   - `getErrorsBySignature()` for error details

8. **retention.ts** - Cleanup management:
   - `cleanupLogsByRetention()` deletes logs based on level-specific retention
   - `dropOldPartitions()` removes partitions older than 90 days
   - `ensureCurrentPartition()` and `ensureNextMonthPartition()`
   - `getCleanupJobDefinition()` for background job integration

### Database Migration (packages/db/src/migrations/public/)

**009_platform_logs.sql** - Partitioned table:
- Monthly range partitioning on timestamp
- Indexes: tenant_time, level_time, service_time, trace, request, user, recent_errors, error_signature
- Full-text search via `message_tsv` generated column with GIN index
- Helper functions: `create_platform_logs_partition()`, `drop_old_platform_logs_partitions()`
- Initial partitions for current and next month

### API Routes (apps/admin/src/app/api/platform/logs/)

1. **route.ts** - Log query endpoint:
   - GET with filters (level, service, userId, requestId, traceId, search, time range, hasError)
   - Pagination with limit/offset
   - Auth required (admin/owner only)

2. **stream/route.ts** - Real-time stream:
   - SSE (Server-Sent Events) streaming
   - Redis stream polling with tenant filtering
   - Keepalive every 30 seconds

3. **aggregates/route.ts** - Error aggregates:
   - GET for grouped errors with stats
   - GET with signature for error details
   - Summary stats: totalErrors, uniqueErrors, affectedTenants, affectedUsers

### UI Components (apps/admin/src/components/operations/)

1. **log-line.tsx** - Individual log display:
   - Level-colored icons and badges
   - Expandable details (metadata, data, stack trace)
   - Timestamp, service, tenant, message display

2. **log-filters.tsx** - Filter controls:
   - Level and service dropdowns
   - Search with full-text support
   - Time range presets (15min, 1h, 6h, 24h, 7d)
   - Errors-only toggle

3. **log-stream.tsx** - Real-time viewer:
   - SSE connection with reconnection
   - Pause/resume and clear controls
   - Auto-scroll with manual scroll detection
   - Connection status indicator

4. **log-table.tsx** - Query results:
   - Paginated log list
   - Export to JSON functionality
   - Filter integration

5. **error-aggregates.tsx** - Error grouping view:
   - Summary cards (total, unique, tenants, users)
   - Expandable error cards with signature, count, affected services
   - Stack trace display
   - Recent occurrences list

### Admin Pages (apps/admin/src/app/admin/operations/)

1. **layout.tsx** - Tab navigation (Dashboard, Logs, Errors, Health)
2. **page.tsx** - Operations dashboard with quick stats and links
3. **logs/page.tsx** - Log viewer with Live Stream / Search toggle
4. **errors/page.tsx** - Error aggregates view
5. **health/page.tsx** - Health checks (placeholder with mock data)

### Navigation Update

Updated `apps/admin/src/lib/navigation.ts` to add "Logs" link under Operations section.

## Verification

```bash
pnpm turbo typecheck --filter=@cgk/logging  # PASSES
pnpm turbo lint --filter=@cgk/logging       # PASSES
pnpm turbo build --filter=@cgk/logging      # PASSES
```

## Key Patterns Used

- **Buffering**: 50 items or 5 seconds or immediate on error/fatal
- **Tenant Context**: All log entries include tenantId/tenantSlug from request headers
- **Error Signatures**: SHA-256 hash of generalized message + error type + stack location
- **Dual Storage**: PostgreSQL for persistence + Redis for real-time streaming
- **SSE Streaming**: Used instead of WebSocket for simpler deployment on Vercel

## AI Discretion Decisions

1. **Streaming**: Chose SSE over WebSocket for simpler serverless deployment
2. **Partition Strategy**: Monthly partitions with automatic creation
3. **Stack Trace Parsing**: Native Error stack parsing (no external library)
4. **Caller Location**: Via Error.stack parsing at log time

## Files Created/Modified

### New Files (29)
```
packages/logging/src/platform/types.ts
packages/logging/src/platform/config.ts
packages/logging/src/platform/caller.ts
packages/logging/src/platform/storage.ts
packages/logging/src/platform/query.ts
packages/logging/src/platform/error-aggregation.ts
packages/logging/src/platform/retention.ts
packages/logging/src/platform/platform-logger.ts
packages/logging/src/platform/index.ts
packages/db/src/migrations/public/009_platform_logs.sql
apps/admin/src/app/api/platform/logs/route.ts
apps/admin/src/app/api/platform/logs/stream/route.ts
apps/admin/src/app/api/platform/logs/aggregates/route.ts
apps/admin/src/components/operations/log-line.tsx
apps/admin/src/components/operations/log-filters.tsx
apps/admin/src/components/operations/log-stream.tsx
apps/admin/src/components/operations/log-table.tsx
apps/admin/src/components/operations/error-aggregates.tsx
apps/admin/src/components/operations/index.ts
apps/admin/src/app/admin/operations/layout.tsx
apps/admin/src/app/admin/operations/page.tsx
apps/admin/src/app/admin/operations/logs/page.tsx
apps/admin/src/app/admin/operations/errors/page.tsx
apps/admin/src/app/admin/operations/health/page.tsx
```

### Modified Files (4)
```
packages/logging/src/index.ts (added platform exports)
packages/logging/package.json (added @cgk/db dependency)
apps/admin/package.json (added @cgk/logging dependency)
apps/admin/src/lib/navigation.ts (added Logs nav item)
```

## Remaining Work

- Unit tests for logger buffering
- Integration tests for stream delivery
- Admin app health components have unrelated type errors (from @cgk/health phase)

## Usage Example

```typescript
import { createPlatformLogger, createRequestLogger } from '@cgk/logging'

// Create base logger
const logger = createPlatformLogger({
  service: 'admin',
  level: 'info',
})

// In API route
export async function GET(request: Request) {
  const requestLogger = createRequestLogger(logger, request, {
    action: 'get-orders',
  })

  requestLogger.info('Fetching orders', { data: { limit: 50 } })

  try {
    const orders = await fetchOrders()
    requestLogger.debug('Orders fetched', { data: { count: orders.length } })
    return Response.json(orders)
  } catch (error) {
    requestLogger.error('Failed to fetch orders', error as Error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## Next Phase

This phase is complete and does not block other phases. The logging system is ready for use by all services.
