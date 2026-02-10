# @cgk/logging - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Structured logging for the CGK platform. Provides JSON-formatted logs with context propagation, multiple log levels, and pluggable transports.

---

## Quick Reference

```typescript
import { createLogger, withLogContext, type Logger } from '@cgk/logging'
```

---

## Key Patterns

### Pattern 1: Basic Logging

```typescript
import { createLogger } from '@cgk/logging'

const logger = createLogger({
  level: 'info',
  meta: { service: 'api', version: '1.0.0' },
})

logger.info('Server started', { port: 3000 })
logger.warn('High memory usage', { usage: '85%' })
logger.error('Request failed', new Error('Connection timeout'), { url: '/api/orders' })
```

### Pattern 2: Child Loggers

```typescript
const logger = createLogger({ meta: { service: 'api' } })

// Create child with additional context
const requestLogger = logger.child({
  meta: { requestId: 'req_123', tenantId: 'rawdog' },
})

requestLogger.info('Processing request') // Includes all meta
```

### Pattern 3: Log Context Propagation

```typescript
import { withLogContext, getLogContext } from '@cgk/logging'

// In middleware
app.use((req, res, next) => {
  withLogContext({
    requestId: req.id,
    tenantId: req.tenantId,
    userId: req.userId,
  }, next)
})

// In handlers - context is automatically available
function handleOrder() {
  const ctx = getLogContext()
  logger.info('Processing order', { ...ctx })
}
```

### Pattern 4: Custom Formatters

```typescript
import { createLogger, jsonFormatter, prettyFormatter } from '@cgk/logging'

// JSON for production
const prodLogger = createLogger({
  formatter: jsonFormatter,
})

// Pretty for development
const devLogger = createLogger({
  formatter: prettyFormatter,
})
```

### Pattern 5: Custom Transports

```typescript
import { createLogger, createMultiTransport, consoleTransport } from '@cgk/logging'

// Send to multiple destinations
const transport = createMultiTransport(
  consoleTransport,
  (level, message) => {
    // Send to external service
    fetch('/logs', { method: 'POST', body: message })
  }
)

const logger = createLogger({ transport })
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | `LogEntry`, `LogMeta` |
| `levels.ts` | Log levels | `LogLevel`, `LogLevelName` |
| `logger.ts` | Logger factory | `createLogger` |
| `context.ts` | Context propagation | `withLogContext`, `getLogContext` |
| `formatters.ts` | Output formatters | `jsonFormatter`, `prettyFormatter` |
| `transports.ts` | Output destinations | `consoleTransport` |

---

## Exports Reference

### Logger

```typescript
createLogger(config?: LoggerConfig): Logger

interface Logger {
  trace(message: string, context?: object): void
  debug(message: string, context?: object): void
  info(message: string, context?: object): void
  warn(message: string, context?: object): void
  error(message: string, error?: Error, context?: object): void
  fatal(message: string, error?: Error, context?: object): void
  child(options: ChildLoggerOptions): Logger
  setLevel(level: LogLevelName): void
}
```

### Context

```typescript
withLogContext<T>(context: LogContext, fn: () => T): T
getLogContext(): LogContext
```

### Levels

```typescript
type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/core` | Shared types |

---

## Common Gotchas

### 1. Error must be second argument

```typescript
// WRONG - Error in context
logger.error('Failed', { error: new Error('oops') })

// CORRECT - Error as second arg
logger.error('Failed', new Error('oops'), { extra: 'context' })
```

### 2. Context is async-scoped

```typescript
// Context only propagates within withLogContext callback
withLogContext({ requestId: '123' }, async () => {
  // requestId available here
  await doWork()
  // Still available after await
})
// Not available here
```

### 3. Use child loggers for consistent context

```typescript
// Instead of passing context to every call
logger.info('Step 1', { orderId: '123' })
logger.info('Step 2', { orderId: '123' })

// Create a child logger
const orderLogger = logger.child({ meta: { orderId: '123' } })
orderLogger.info('Step 1')
orderLogger.info('Step 2')
```

---

## Integration Points

### Used by:
- All services and packages
- API routes
- Background jobs

### Uses:
- `@cgk/core` - Types
