# @cgk-platform/core - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Core utilities, types, and configuration schemas for the CGK platform. This package is required by all other @cgk packages and provides shared type definitions, configuration helpers, and utility functions.

---

## Quick Reference

```typescript
// Configuration
import { defineConfig, type PlatformConfig } from '@cgk-platform/core'

// Types
import type { TenantContext, TenantId, UserId } from '@cgk-platform/core'
import type { ApiResponse, PaginatedResponse } from '@cgk-platform/core'

// Utilities
import { invariant, createId } from '@cgk-platform/core'
```

---

## Key Patterns

### Pattern 1: Platform Configuration

**When to use**: When defining brand site configuration

```typescript
// platform.config.ts
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'mybrand',
    domain: 'mybrand.com',
  },
  features: {
    creators: true,
    attribution: true,
  },
  shopify: {
    storeDomain: 'mybrand.myshopify.com',
  },
})
```

### Pattern 2: Type-Safe IDs

**When to use**: When working with entity IDs

```typescript
import { createId } from '@cgk-platform/core'
import type { TenantId, UserId } from '@cgk-platform/core'

const userId = createId('usr') as UserId      // 'usr_ckl3j2k4m0000'
const tenantId = createId('tnt') as TenantId  // 'tnt_ckl3j2k4m0001'
```

### Pattern 3: API Responses

**When to use**: When defining API route return types

```typescript
import type { ApiResponse, PaginatedResponse, ApiError } from '@cgk-platform/core'

// Success response
const success: ApiResponse<{ order: Order }> = {
  data: { order },
  success: true,
}

// Paginated response
const list: PaginatedResponse<Order> = {
  data: orders,
  pagination: { total: 100, page: 1, pageSize: 20, totalPages: 5, hasMore: true },
  success: true,
}

// Error response
const error: ApiError = {
  error: 'Not found',
  code: 'NOT_FOUND',
  success: false,
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `config.ts` | Configuration schema | `defineConfig`, `PlatformConfig` |
| `config-validator.ts` | Configuration validation | `validateConfig` |
| `types/tenant.ts` | Tenant types | `TenantContext`, `TenantId`, `UserId` |
| `types/api.ts` | API types | `ApiResponse`, `PaginatedResponse` |
| `utils/invariant.ts` | Assertion helper | `invariant` |
| `utils/id.ts` | ID generation | `createId` |

---

## Exports Reference

### Functions

```typescript
defineConfig(config: PlatformConfig): PlatformConfig
validateConfig(config: PlatformConfig): { valid: boolean; errors: string[] }
invariant(condition: unknown, message: string): asserts condition
createId(prefix?: string): string
```

### Types

```typescript
// Tenant types
type TenantId = string & { readonly __brand: 'TenantId' }
type UserId = string & { readonly __brand: 'UserId' }
type OrganizationId = string & { readonly __brand: 'OrganizationId' }

interface TenantContext {
  tenantId: TenantId
  tenantSlug: string
  schemaName: string
}

// API types
interface ApiResponse<T> { data: T; success: true }
interface ApiError { error: string; code?: string; success: false }
interface PaginatedResponse<T> { data: T[]; pagination: {...}; success: true }
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| None | Core has no runtime dependencies |

---

## Common Gotchas

### 1. Branded types require casting

```typescript
// WRONG - TypeScript won't allow direct assignment
const tenantId: TenantId = 'some-id'

// CORRECT - Use type assertion
const tenantId = 'some-id' as TenantId
```

### 2. Always validate config before using

```typescript
// WRONG - Config may be invalid
const config = require('./platform.config')
startServer(config)

// CORRECT - Validate first
const config = require('./platform.config')
const { valid, errors } = validateConfig(config)
if (!valid) throw new Error(errors.join(', '))
startServer(config)
```

---

## Integration Points

### Used by:
- All `@cgk-platform/*` packages use core types
- `@cgk-platform/cli` uses config schema
- `apps/*` use configuration

### Uses:
- No dependencies (leaf package)

---

## Testing

```bash
pnpm test        # Run unit tests
pnpm typecheck   # Type check
```
