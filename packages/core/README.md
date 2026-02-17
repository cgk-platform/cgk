# @cgk-platform/core

Core utilities, types, and configuration schemas for the CGK platform.

## Installation

```bash
pnpm add @cgk-platform/core
```

## Features

- **Platform Configuration** - Centralized config schema and validation
- **Environment Validation** - Type-safe environment variable checking
- **ID Generation** - Consistent ID creation across platform
- **Fetch Utilities** - Timeout-aware HTTP requests
- **Type Definitions** - Shared types for tenant context, pagination, API responses
- **Invariant Assertions** - Runtime type checking

## Quick Start

### Define Configuration

```typescript
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  name: 'my-brand',
  database: {
    url: process.env.DATABASE_URL!,
  },
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  },
  commerce: {
    provider: 'shopify',
    currencyCode: 'USD',
  },
})
```

### Validate Environment

```typescript
import { validateRequiredEnv, getRequiredEnv } from '@cgk-platform/core'

// Validate multiple variables
validateRequiredEnv([
  'DATABASE_URL',
  'SHOPIFY_STOREFRONT_TOKEN',
  'RESEND_API_KEY',
])

// Get single required variable
const apiKey = getRequiredEnv('RESEND_API_KEY')
```

### Generate IDs

```typescript
import { createId } from '@cgk-platform/core'

const userId = createId('user')
// => "user_2mK9jX4pQ7vR8sL3nD"

const orderId = createId('order')
// => "order_5tP2wN9xY1bH6mC4kJ"
```

### Fetch with Timeout

```typescript
import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'

// Default timeout (10s)
const response = await fetchWithTimeout('https://api.example.com/data')

// Custom timeout
const response = await fetchWithTimeout(
  'https://api.example.com/data',
  { timeout: 5000 }
)

// Use predefined timeout types
const response = await fetchWithTimeout(
  'https://api.example.com/data',
  { timeout: FETCH_TIMEOUTS.api } // 30s for API calls
)
```

### Invariant Assertions

```typescript
import { invariant } from '@cgk-platform/core'

function processOrder(order: Order | null) {
  invariant(order, 'Order not found')
  invariant(order.status === 'paid', 'Order must be paid')
  
  // TypeScript knows order is non-null here
  console.log(order.id)
}
```

### Type-Safe API Responses

```typescript
import type { ApiResponse, PaginatedResponse } from '@cgk-platform/core'

// Standard API response
const response: ApiResponse<User> = {
  success: true,
  data: user,
}

// Error response
const errorResponse: ApiResponse<never> = {
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'User not found',
  },
}

// Paginated response
const paginatedResponse: PaginatedResponse<Product> = {
  success: true,
  data: products,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 156,
    hasNext: true,
  },
}
```

### Tenant Context

```typescript
import type { TenantContext } from '@cgk-platform/core'

function withTenant<T>(
  fn: (context: TenantContext) => Promise<T>
): Promise<T> {
  return fn({
    tenantId: 'tenant_123',
    userId: 'user_456',
    organizationId: 'org_789',
  })
}
```

## Key Exports

### Configuration
- `defineConfig(config)` - Define platform config
- `validateConfig(config)` - Validate config schema

### Environment
- `validateRequiredEnv(vars)` - Validate multiple variables
- `getRequiredEnv(key)` - Get required variable (throws if missing)
- `getEnvOrDefault(key, defaultValue)` - Get with fallback
- `isEnvSet(key)` - Check if variable is set
- `validateAppEnv(appName)` - Validate app-specific env

### Utilities
- `createId(prefix)` - Generate prefixed ID
- `invariant(condition, message)` - Runtime assertion
- `fetchWithTimeout(url, options)` - Timeout-aware fetch
- `createFetchWithTimeout(defaultTimeout)` - Custom fetch factory

### Types
- `TenantContext`, `TenantId`, `UserId`, `OrganizationId`
- `ApiResponse<T>`, `ApiError`
- `PaginatedResponse<T>`, `PaginationParams`
- `PlatformConfig`, `EnvValidationResult`

### Constants
- `FETCH_TIMEOUTS` - Predefined timeout values
  - `default: 10000` (10s)
  - `api: 30000` (30s)
  - `long: 60000` (60s)
  - `short: 5000` (5s)

## App-Specific Environment

Validate environment for specific apps:

```typescript
import { validateAppEnv, APP_ENV_CONFIGS } from '@cgk-platform/core'

// Validate admin app environment
validateAppEnv('admin')

// Available apps
console.log(APP_ENV_CONFIGS)
// { admin: [...], brand: [...], checkout: [...] }
```

## License

MIT
