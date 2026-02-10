# PHASE-2PO-LOGGING: Structured Logging System

**Duration**: Week 8 (5 days)
**Depends On**: Phase 1 (database, auth)
**Parallel With**: PHASE-2PO-HEALTH
**Blocks**: None (other phases can proceed)

---

## Goal

Implement platform-wide structured logging with `PlatformLogger` class, PostgreSQL partitioned storage, Redis real-time streaming, WebSocket log viewer, and error aggregation with pattern matching.

---

## Success Criteria

- [ ] All services using structured `PlatformLogger` with consistent context
- [ ] Every log entry includes tenant context (tenantId, tenantSlug)
- [ ] Real-time log stream working via WebSocket
- [ ] Error aggregation groups similar errors by signature
- [ ] Full-text search on log messages returns results in under 1 second
- [ ] Retention policies enforced automatically (ERROR 30d, WARN 14d, INFO 7d, DEBUG 1d)
- [ ] Log export functionality available

---

## Deliverables

### Log Levels and Retention

| Level | Stored | Dashboard | Retention |
|-------|--------|-----------|-----------|
| ERROR | Yes | Real-time stream | 30 days |
| WARN | Yes | Aggregated view | 14 days |
| INFO | Yes | On-demand query | 7 days |
| DEBUG | Conditional (non-prod) | No | 1 day |

### Required Log Context (Every Entry)

- Identification: `id`, `timestamp`, `level`
- Tenant: `tenantId`, `tenantSlug`
- User: `userId`, `sessionId`, `impersonatorId`
- Request: `requestId`, `traceId`, `spanId`
- Source: `service`, `action`, `file`, `line`, `function`
- Content: `message`, `data` (JSONB)
- Error (if applicable): `errorType`, `errorCode`, `errorStack`
- Environment: `environment`, `version`, `region`

### Database Schema

- `platform_logs` - Partitioned table by month with indexes for common queries
- Monthly partitions for performance
- Full-text search index on message column
- Partial index for recent errors

### API Routes

```
/api/platform/logs/
  route.ts              - GET/query logs with filters
  stream/route.ts       - WebSocket real-time stream
  aggregates/route.ts   - GET error aggregates
```

### Package Structure

```
packages/logging/
  logger.ts           - PlatformLogger class with buffering (50 items, 5s flush)
  factory.ts          - createLogger, createRequestLogger helpers
  types.ts            - LogEntry, LogContext type definitions
  config.ts           - Level config per environment
  redis-stream.ts     - Real-time streaming to Redis
  retention.ts        - Cleanup jobs for retention enforcement
  error-aggregation.ts - Pattern matching and signature computation
```

### UI Components

- Real-time log stream with virtual scrolling
- Log query interface with filters
- Error aggregates view
- Log detail modal

---

## Constraints

- Buffer flush MUST occur on error (immediate) or after 50 items / 5 seconds
- Log service types: `orchestrator`, `admin`, `storefront`, `creator-portal`, `mcp-server`, `inngest`, `webhook-handler`
- Console output enabled in development, disabled in production
- Redis stream max length: 10,000 entries
- Batch inserts for PostgreSQL to minimize connections

---

## Pattern References

**Spec documents:**
- `LOGGING-SPEC-2025-02-10.md` - Complete implementation details
- `LOGGING-AI-ADDENDUM.md` - AI-specific considerations and enhancements

**RAWDOG code to reference:**
- `/src/lib/ops/logs/logger.ts` - Existing OpsLogger pattern with buffering

**MCPs to consult:**
- Context7 MCP: "PostgreSQL partitioned tables"
- Context7 MCP: "Redis streams XADD XRANGE"

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use native WebSocket or Socket.io for streaming
2. Optimal partition strategy (monthly vs weekly for high-volume)
3. Stack trace parsing library choice
4. Whether to store caller location via Error stack or source maps

---

## Tasks

### [PARALLEL] Infrastructure Setup
- [ ] Create `packages/logging/` package structure
- [ ] Create `platform_logs` partitioned table with indexes
- [ ] Create monthly partition management function
- [ ] Set up Redis stream key and pub/sub channel

### [PARALLEL] Core Logger Implementation
- [ ] Implement `LogEntry` type with all required fields
- [ ] Implement `LogContext` type for request scoping
- [ ] Implement `PlatformLogger` class with buffering logic
- [ ] Implement `debug()`, `info()`, `warn()`, `error()` methods
- [ ] Implement caller location extraction from stack trace
- [ ] Implement console output for development

### [SEQUENTIAL after logger] Factory Functions
- [ ] Implement `createLogger()` for general use
- [ ] Implement `createRequestLogger()` for API routes
- [ ] Add header extraction for tenant/user context

### [PARALLEL with factory] Storage Layer
- [ ] Implement `writeToDatabase()` with batch insert
- [ ] Implement `writeToRedis()` with stream append
- [ ] Implement `pushToStream()` for real-time updates
- [ ] Implement `redis.publish()` for subscriber notification

### [PARALLEL with storage] Error Aggregation
- [ ] Implement `computeErrorSignature()` with pattern generalization
- [ ] Implement `generalizeMessage()` to replace UUIDs, IDs, emails, URLs, timestamps
- [ ] Implement `getErrorAggregates()` query with grouping

### [SEQUENTIAL after storage] Retention Management
- [ ] Implement Inngest cleanup job for retention enforcement
- [ ] Implement old partition dropping (90+ days)
- [ ] Add retention config per log level

### [SEQUENTIAL after all above] API Routes
- [ ] Implement log query endpoint with filters
- [ ] Implement WebSocket stream endpoint
- [ ] Implement error aggregates endpoint

### [SEQUENTIAL after APIs] UI Components
- [ ] Build `LogStream` component with virtual scrolling
- [ ] Build `LogLine` component with level colors
- [ ] Build `LogFilters` component (level, tenant, service, time range, search)
- [ ] Build `LogTable` for query results
- [ ] Build `ErrorAggregatesView` for grouped errors

---

## Definition of Done

- [ ] Logger successfully writes to PostgreSQL and Redis
- [ ] WebSocket stream delivers logs in real-time
- [ ] Error aggregation groups similar errors correctly
- [ ] Full-text search returns results under 1 second
- [ ] Retention cleanup runs daily and removes old entries
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for logger buffering pass
- [ ] Integration test for stream delivery passes
