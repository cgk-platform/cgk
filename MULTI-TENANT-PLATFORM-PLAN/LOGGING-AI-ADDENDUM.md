# Logging Specification - AI & Production Addendum

**Created**: 2025-02-10
**Extends**: LOGGING-SPEC-2025-02-10.md
**Purpose**: AI-friendly logging patterns and production sampling strategies

---

## Overview

This addendum extends the core logging specification with:

1. **AI-Parseable Log Structure**: Semantic action naming for AI debugging
2. **Production Sampling**: Reduce log volume without losing signal
3. **AI Query Interface**: Structured queries for AI agents
4. **Session Tracking**: Track AI agent work across sessions

---

## AI-Parseable Action Naming

### Semantic Action Format

Use the pattern: `{resource}.{verb}.{phase}`

```typescript
// GOOD - Structured, parseable
logger.info('order.sync.start', { orderId: '123' })
logger.info('order.sync.complete', { orderId: '123', duration: 450 })
logger.error('order.sync.failed', { orderId: '123', error: 'Shopify timeout' })

// BAD - Free-form text
logger.info('Starting to sync order 123')
logger.info('Order sync done')
```

### Standard Actions by Category

```typescript
// Database operations
'db.query.execute'
'db.mutation.execute'
'db.transaction.start'
'db.transaction.commit'
'db.transaction.rollback'

// External API calls
'shopify.order.fetch'
'shopify.product.sync'
'stripe.charge.create'
'stripe.payout.process'
'wise.transfer.initiate'

// Background jobs
'job.enqueue'
'job.start'
'job.complete'
'job.failed'
'job.retry'

// Auth operations
'auth.login.attempt'
'auth.login.success'
'auth.login.failed'
'auth.session.create'
'auth.session.expire'

// Business operations
'order.create'
'order.fulfill'
'payment.capture'
'creator.commission.calculate'
'creator.payout.request'
```

### Extended Log Entry for AI

Add these fields to the base LogEntry:

```typescript
interface AIEnhancedLogEntry extends LogEntry {
  // === AI DEBUGGING CONTEXT ===
  actionCategory: 'database' | 'api' | 'shopify' | 'stripe' | 'auth' | 'job' | 'business'
  actionVerb: string           // 'query', 'create', 'sync', 'fetch'
  actionResource: string       // 'orders', 'customers', 'products'

  // === OUTCOME (for AI decision-making) ===
  outcome: 'success' | 'failure' | 'partial' | 'skipped'
  outcomeReason?: string       // Brief reason for failure/skip

  // === CAUSALITY ===
  parentLogId?: string         // For tracing call chains
  triggerEvent?: string        // What initiated this (webhook, cron, user action)

  // === PERFORMANCE ===
  durationMs?: number          // Operation duration
  itemCount?: number           // Items processed (for batch operations)

  // === AI HINTS ===
  retryable?: boolean          // Is this error retryable?
  humanActionRequired?: boolean // Does this need human intervention?
}
```

---

## Production Sampling Strategy

### Why Sample?

At scale, logging every operation becomes expensive and overwhelming. Sampling strategies reduce volume while preserving signal.

**Goals:**
- 100% of errors logged (always)
- 100% of slow operations logged (> 5s)
- Critical paths fully logged (orders, payments)
- High-volume, low-signal operations sampled (cache, health checks)

### Sampling Configuration

```typescript
// packages/logging/src/sampling.ts
export const SAMPLING_CONFIG = {
  production: {
    // By level
    levelRates: {
      error: 1.0,    // 100% - all errors
      warn: 1.0,     // 100% - all warnings
      info: 0.1,     // 10% - sample most info
      debug: 0,      // 0% - no debug in prod
    },

    // By action (overrides level rates)
    actionRates: {
      // Critical paths - always log
      'order.*': 1.0,
      'payment.*': 1.0,
      'auth.*': 1.0,
      'creator.payout.*': 1.0,

      // High-volume, low-signal - sample heavily
      'cache.hit': 0.001,      // 0.1%
      'cache.miss': 0.01,      // 1%
      'health.check': 0.01,    // 1%
      'db.query.execute': 0.1, // 10%

      // Sync operations - moderate sampling
      'shopify.product.sync': 0.5,  // 50%
      'shopify.order.sync': 1.0,    // 100% (important)
    },

    // Force-include rules (override sampling)
    forceInclude: {
      hasError: true,           // Any log with error context
      slowOperationMs: 5000,    // Operations > 5 seconds
      specificTenants: [],      // Can add tenant IDs for debugging
      specificUsers: [],        // Can add user IDs for debugging
    },

    // Deterministic sampling
    useDeterministicSampling: true,  // Same requestId = same decision
  },

  staging: {
    levelRates: { error: 1.0, warn: 1.0, info: 1.0, debug: 0.1 },
    actionRates: {},  // Log everything
    forceInclude: { hasError: true, slowOperationMs: 3000 },
    useDeterministicSampling: true,
  },

  development: {
    levelRates: { error: 1.0, warn: 1.0, info: 1.0, debug: 1.0 },
    actionRates: {},  // Log everything
    forceInclude: {},
    useDeterministicSampling: false,
  }
}
```

### Sampling Implementation

```typescript
// packages/logging/src/sampler.ts
import { createHash } from 'crypto'

export function shouldLog(
  entry: LogEntry,
  config: SamplingConfig
): boolean {
  // Rule 1: Always log errors
  if (entry.level === 'error') return true

  // Rule 2: Check force-include rules
  if (config.forceInclude.hasError && entry.errorStack) return true
  if (config.forceInclude.slowOperationMs &&
      (entry.data?.durationMs ?? 0) > config.forceInclude.slowOperationMs) return true
  if (config.forceInclude.specificTenants?.includes(entry.tenantId ?? '')) return true
  if (config.forceInclude.specificUsers?.includes(entry.userId ?? '')) return true

  // Rule 3: Get sample rate (action-specific or level-based)
  const actionRate = getActionRate(entry.action, config.actionRates)
  const levelRate = config.levelRates[entry.level] ?? 0
  const sampleRate = actionRate ?? levelRate

  if (sampleRate >= 1.0) return true
  if (sampleRate <= 0) return false

  // Rule 4: Deterministic sampling by requestId
  if (config.useDeterministicSampling) {
    const hash = createHash('sha256')
      .update(entry.requestId + entry.action)
      .digest('hex')
    const hashValue = parseInt(hash.slice(0, 8), 16) / 0xffffffff
    return hashValue < sampleRate
  }

  // Random sampling fallback
  return Math.random() < sampleRate
}

function getActionRate(
  action: string,
  actionRates: Record<string, number>
): number | null {
  // Exact match
  if (action in actionRates) return actionRates[action]

  // Wildcard match (e.g., 'order.*' matches 'order.sync.complete')
  for (const pattern of Object.keys(actionRates)) {
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2)
      if (action.startsWith(prefix)) {
        return actionRates[pattern]
      }
    }
  }

  return null  // Use level-based rate
}
```

---

## AI Query Interface

### Query API for AI Agents

```typescript
// GET /api/platform/logs/ai-query
interface AILogQueryRequest {
  // Time range
  since?: string              // '5m', '1h', '24h', '7d'
  from?: string               // ISO timestamp
  to?: string                 // ISO timestamp

  // Filters
  action?: string             // Glob pattern: 'order.*', '*.failed'
  outcome?: 'success' | 'failure' | 'partial' | 'skipped'
  level?: 'error' | 'warn' | 'info'
  tenantId?: string
  service?: string

  // AI options
  includeContext?: boolean    // Include full data payload
  groupByAction?: boolean     // Aggregate by action
  showCausality?: boolean     // Include parent/child chain
  maxResults?: number         // Default 100
}

interface AILogQueryResponse {
  // Summary for quick understanding
  summary: {
    totalCount: number
    errorCount: number
    warningCount: number
    timeRange: { from: string; to: string }
    topActions: Array<{
      action: string
      count: number
      errorRate: number
      avgDurationMs: number
    }>
    affectedTenants: string[]
    affectedServices: string[]
  }

  // Actual log entries
  logs: AIEnhancedLogEntry[]

  // AI-detected patterns
  patterns: {
    commonErrorTypes: Array<{ type: string; count: number }>
    correlatedFailures: Array<{
      action: string
      triggersFailureIn: string
      correlation: number
    }>
    performanceIssues: Array<{
      action: string
      p95DurationMs: number
      threshold: number
    }>
  }

  // Suggested next queries
  suggestedQueries: Array<{
    description: string
    query: AILogQueryRequest
  }>
}
```

### CLI for AI Log Queries

```bash
# Quick error summary
npx @cgk-platform/cli logs --action="*.failed" --since="1h"

# Specific tenant debugging
npx @cgk-platform/cli logs --tenant=rawdog --level=error --since="24h"

# Performance analysis
npx @cgk-platform/cli logs --action="db.*" --slow=5000 --since="1h"

# Full causality trace for a request
npx @cgk-platform/cli logs --request-id="abc123" --show-chain

# Export for AI analysis
npx @cgk-platform/cli logs --since="24h" --format=json > logs.json
```

---

## Session Tracking for AI Agents

### AI Session Directory

Create `.ai-session/` (gitignored) for tracking AI work:

```
.ai-session/
├── current-task.json       # What the AI is currently working on
├── explored-files.json     # Files the AI has read
├── decisions.json          # Decisions made in this session
└── context-snapshot.json   # Cached context for resumption
```

### Current Task Schema

```typescript
interface AISessionTask {
  id: string
  description: string
  phase: string                    // 'PHASE-2-ADMIN'
  startedAt: string
  status: 'in_progress' | 'blocked' | 'completed'

  // What the AI has learned
  exploredPaths: string[]
  relevantPatterns: string[]

  // Decisions made
  decisions: Array<{
    question: string
    decision: string
    reasoning: string
    timestamp: string
  }>

  // Blockers/questions for human
  blockers: Array<{
    description: string
    needsHumanInput: boolean
  }>
}
```

### Git Commit Integration

Track AI work in git commits:

```
feat(admin): Add order list component

[AI-SESSION]
Agent: Claude Opus 4.5
Phase: PHASE-2-ADMIN
Patterns-Used: admin-table, tenant-query, batch-save
Files-Explored: 12
Decisions:
  - Used DataTable from @cgk-platform/ui (existing pattern)
  - Added pagination (matching orders page pattern)
[/AI-SESSION]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Logging Budgets

### Per-Tenant Log Budgets

Prevent any single tenant from overwhelming the logging system:

```typescript
// packages/logging/src/budgets.ts
interface TenantLogBudget {
  tier: 'starter' | 'growth' | 'enterprise'
  dailyLogLimit: number
  errorLogLimit: number  // Higher for errors
  warningIfExceeded: boolean
  dropIfExceeded: boolean
}

const TIER_BUDGETS: Record<string, TenantLogBudget> = {
  starter: {
    tier: 'starter',
    dailyLogLimit: 100_000,
    errorLogLimit: 10_000,
    warningIfExceeded: true,
    dropIfExceeded: false,  // Don't drop, just warn
  },
  growth: {
    tier: 'growth',
    dailyLogLimit: 1_000_000,
    errorLogLimit: 50_000,
    warningIfExceeded: true,
    dropIfExceeded: false,
  },
  enterprise: {
    tier: 'enterprise',
    dailyLogLimit: 10_000_000,
    errorLogLimit: 500_000,
    warningIfExceeded: false,
    dropIfExceeded: false,
  }
}

async function checkLogBudget(tenantId: string): Promise<{
  allowed: boolean
  remaining: number
  warning: string | null
}> {
  const tenant = await getTenant(tenantId)
  const budget = TIER_BUDGETS[tenant.tier]
  const today = new Date().toISOString().slice(0, 10)

  const currentCount = await redis.get(`log-count:${tenantId}:${today}`) || 0

  if (currentCount >= budget.dailyLogLimit) {
    if (budget.dropIfExceeded) {
      return { allowed: false, remaining: 0, warning: 'Log budget exceeded' }
    }
    return {
      allowed: true,
      remaining: 0,
      warning: `Tenant ${tenantId} exceeded daily log budget`
    }
  }

  return {
    allowed: true,
    remaining: budget.dailyLogLimit - currentCount,
    warning: null
  }
}
```

---

## Production Log Volume Estimates

### Expected Volumes by Deployment Size

| Profile | Tenants | Daily Logs (Raw) | After Sampling | Storage/Month |
|---------|---------|-----------------|----------------|---------------|
| small | 1-10 | 100K | 100K (no sampling) | 5 GB |
| medium | 10-100 | 5M | 500K | 25 GB |
| large | 100-1000 | 100M | 5M | 250 GB |
| enterprise | 1000+ | 1B | 25M | 1.25 TB |

### Cost Optimization

1. **Sampling**: Reduces volume 10-20x
2. **Compression**: JSONB with compression ~5x
3. **Partitioning**: Easy to drop old partitions
4. **Retention**: ERROR 30d, WARN 14d, INFO 7d = ~50% less than flat 30d

---

## Success Criteria

- [ ] Action names follow `{resource}.{verb}.{phase}` pattern
- [ ] Production sampling reduces log volume by 10x+
- [ ] AI query endpoint returns structured summaries
- [ ] CLI provides useful log exploration commands
- [ ] Per-tenant budgets prevent runaway logging
- [ ] Errors always logged regardless of sampling

---

## Integration with LOGGING-SPEC

This addendum adds to the base LOGGING-SPEC:

1. **Types**: Add AIEnhancedLogEntry to LogEntry union
2. **Sampler**: Add sampling layer before storage
3. **API**: Add `/api/platform/logs/ai-query` endpoint
4. **CLI**: Add `logs` command to @cgk-platform/cli
5. **Budgets**: Add per-tenant log counting
