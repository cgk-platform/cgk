# @cgk-platform/logging

Structured logging for the CGK platform - JSON-formatted logs with context and multi-transport support.

## Installation

```bash
pnpm add @cgk-platform/logging
```

## Features

- **Structured Logging** - JSON-formatted log entries
- **Log Levels** - debug, info, warn, error, fatal
- **Contextual Logging** - Attach metadata to all logs
- **Child Loggers** - Inherit context from parent
- **Multiple Transports** - Console, file, database
- **Pretty Formatting** - Human-readable dev mode
- **Request Tracing** - Track requests across services
- **Tenant Scoping** - Automatic tenant context

## Quick Start

### Create a Logger

```typescript
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  name: 'my-app',
  level: 'info',
})

logger.info('Application started')
logger.error('Something went wrong', { error })
```

### Log with Context

```typescript
logger.info('User logged in', {
  userId: 'user_123',
  tenantId: 'tenant_456',
  ipAddress: '192.168.1.1',
})

// Output:
// {
//   "level": "info",
//   "time": 1709856000000,
//   "name": "my-app",
//   "msg": "User logged in",
//   "userId": "user_123",
//   "tenantId": "tenant_456",
//   "ipAddress": "192.168.1.1"
// }
```

### Child Loggers

```typescript
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({ name: 'api' })

const requestLogger = logger.child({
  requestId: 'req_abc123',
  userId: 'user_456',
})

requestLogger.info('Processing request') // Includes requestId and userId
requestLogger.error('Request failed') // Also includes requestId and userId
```

### Log Levels

```typescript
import { LogLevel } from '@cgk-platform/logging'

logger.debug('Debugging info', { details })
logger.info('Something happened', { event })
logger.warn('Warning: rate limit approaching', { count })
logger.error('Error occurred', { error })
logger.fatal('Critical error', { error }) // Auto-exits process
```

### Request Context

```typescript
import { withLogContext, getLogContext } from '@cgk-platform/logging'

export async function middleware(request: Request) {
  return withLogContext({
    requestId: crypto.randomUUID(),
    tenantId: request.headers.get('x-tenant-id'),
  }, async () => {
    // All logs in this scope include requestId and tenantId
    logger.info('Request received')
    
    const response = await handleRequest(request)
    
    logger.info('Request completed', {
      status: response.status,
    })
    
    return response
  })
}
```

### Pretty Formatting (Development)

```typescript
import { createLogger, prettyFormatter } from '@cgk-platform/logging'

const logger = createLogger({
  name: 'dev',
  level: 'debug',
  formatter: prettyFormatter(), // Colorized, human-readable
})

logger.info('User created', { userId: 'user_123' })
// [2024-03-07 10:30:45] INFO (dev): User created
//   userId: "user_123"
```

### Custom Transport

```typescript
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  name: 'app',
  transports: [
    {
      level: 'info',
      write: (entry) => {
        // Send to external service
        sendToDatadog(entry)
      },
    },
  ],
})
```

### Platform Logger (Database + Redis)

```typescript
import { createPlatformLogger } from '@cgk-platform/logging'

const logger = await createPlatformLogger({
  tenantId: 'tenant_123',
  level: 'info',
})

// Logs stored in database and Redis
logger.info('Order processed', { orderId: 'order_456' })

// Query logs later
const logs = await logger.query({
  since: Date.now() - 3600000, // Last hour
  level: 'error',
})
```

## Key Exports

### Logger
- `createLogger(config)` - Create logger instance
- `Logger.debug()`, `Logger.info()`, `Logger.warn()`, `Logger.error()`, `Logger.fatal()`
- `Logger.child(context)` - Create child logger

### Levels
- `LogLevel.DEBUG`, `LogLevel.INFO`, `LogLevel.WARN`, `LogLevel.ERROR`, `LogLevel.FATAL`
- Type: `LogLevelName` - 'debug' | 'info' | 'warn' | 'error' | 'fatal'

### Context
- `withLogContext(context, fn)` - Execute with context
- `getLogContext()` - Get current context

### Formatters
- `jsonFormatter()` - JSON output (default)
- `prettyFormatter()` - Human-readable colorized output

### Transports
- `consoleTransport()` - Log to console
- Custom transports via `LogTransport` interface

### Platform
- `createPlatformLogger(config)` - Database + Redis logger
- Query and aggregate logs from storage

### Types
- `Logger`, `LoggerConfig`, `LogEntry`, `LogContext`
- `LogFormatter`, `LogTransport`, `ChildLoggerOptions`

## Configuration

```typescript
type LoggerConfig = {
  name: string
  level?: LogLevelName
  formatter?: LogFormatter
  transports?: LogTransport[]
  defaultContext?: Record<string, any>
}
```

## Log Entry Structure

```typescript
type LogEntry = {
  level: LogLevelName
  time: number // Unix timestamp
  name: string // Logger name
  msg: string // Log message
  [key: string]: any // Additional metadata
}
```

## Best Practices

1. **Use structured metadata** - Don't concatenate strings
   ```typescript
   // ✅ Good
   logger.info('User created', { userId, email })
   
   // ❌ Bad
   logger.info(`User ${userId} created with email ${email}`)
   ```

2. **Set appropriate levels**
   - `debug` - Verbose debugging info
   - `info` - Notable events
   - `warn` - Potentially problematic situations
   - `error` - Error events
   - `fatal` - Critical errors (app should exit)

3. **Include tenant context** - Always log tenantId for multi-tenant apps

4. **Use child loggers** - For request/operation-scoped logging

5. **Don't log sensitive data** - Passwords, tokens, PII

## License

MIT
