# Adding Features

Guide for extending the CGK platform with new packages, API routes, and migrations.

## Adding New Packages

### 1. Create Package Directory

```bash
mkdir -p packages/my-feature/src
cd packages/my-feature
```

### 2. Create package.json

```json
{
  "name": "@cgk-platform/my-feature",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@cgk-platform/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 4. Create Source Files

```typescript
// src/index.ts
export { myFunction } from './my-function.js'
export type { MyType } from './types.js'

// src/types.ts
export interface MyType {
  id: string
  name: string
}

// src/my-function.ts
import type { MyType } from './types.js'

export function myFunction(input: MyType): string {
  return `Hello, ${input.name}!`
}
```

### 5. Create CLAUDE.md

Create a `CLAUDE.md` file documenting the package for AI agents:

```markdown
# @cgk-platform/my-feature - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-16

---

## Purpose

Brief description of what this package does.

---

## Quick Reference

```typescript
import { myFunction } from '@cgk-platform/my-feature'
```

---

## Key Patterns

### Pattern 1: Basic Usage

```typescript
// Example code
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | `MyType` |
| `my-function.ts` | Main implementation | `myFunction` |
```

### 6. Register in Monorepo

Add to `pnpm-workspace.yaml` if needed (usually automatic with `packages/*`).

Add to consuming apps:

```json
// apps/admin/package.json
{
  "dependencies": {
    "@cgk-platform/my-feature": "workspace:*"
  }
}
```

### 7. Build and Test

```bash
pnpm install
pnpm --filter @cgk-platform/my-feature build
pnpm --filter @cgk-platform/my-feature typecheck
```

## Adding API Routes

### Standard API Route Pattern

```typescript
// apps/admin/src/app/api/my-feature/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, checkPermissionOrRespond, type AuthContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  // 1. Authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Authorization (if needed)
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'my-feature.read'
  )
  if (permissionDenied) return permissionDenied

  // 3. Validate tenant context
  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // 4. Execute with tenant isolation
  return withTenant(auth.tenantId, async () => {
    const result = await sql`SELECT * FROM my_table LIMIT 50`
    return NextResponse.json({ data: result.rows })
  })
}

export async function POST(request: Request) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'my-feature.write'
  )
  if (permissionDenied) return permissionDenied

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Parse request body
  const body = await request.json()

  // Validate input
  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  return withTenant(auth.tenantId, async () => {
    const result = await sql`
      INSERT INTO my_table (name, created_by)
      VALUES (${body.name}, ${auth.userId})
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }

    return NextResponse.json({ data: row }, { status: 201 })
  })
}
```

### Dynamic Route Parameters

```typescript
// apps/admin/src/app/api/my-feature/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id } = await params

  return withTenant(auth.tenantId, async () => {
    const result = await sql`SELECT * FROM my_table WHERE id = ${id}`
    const row = result.rows[0]

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data: row })
  })
}
```

### Query Parameters

```typescript
export async function GET(request: Request) {
  // ... auth ...

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const status = searchParams.get('status')
  const offset = (page - 1) * limit

  return withTenant(auth.tenantId, async () => {
    // Use separate queries for different filter combinations
    const result = status
      ? await sql`
          SELECT * FROM my_table
          WHERE status = ${status}
          ORDER BY created_at DESC
          OFFSET ${offset} LIMIT ${limit}
        `
      : await sql`
          SELECT * FROM my_table
          ORDER BY created_at DESC
          OFFSET ${offset} LIMIT ${limit}
        `

    return NextResponse.json({
      data: result.rows,
      page,
      limit,
    })
  })
}
```

## Adding Database Migrations

### 1. Create Migration File

```bash
npx @cgk-platform/cli migrate:create add_my_feature --tenant
```

### 2. Write Migration SQL

```sql
-- packages/db/src/migrations/tenant/015_add_my_feature.sql

-- Migration: add_my_feature
-- Schema: tenant
-- Created: 2026-02-16
-- Description: Add my feature table

-- Create enum (wrap for idempotency)
DO $$ BEGIN
  CREATE TYPE my_feature_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create table
CREATE TABLE IF NOT EXISTS my_feature (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  status my_feature_status NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_my_feature_status ON my_feature(status);
CREATE INDEX IF NOT EXISTS idx_my_feature_created_by ON my_feature(created_by);
CREATE INDEX IF NOT EXISTS idx_my_feature_created_at ON my_feature(created_at DESC);

-- Add updated_at trigger (use public. prefix!)
DROP TRIGGER IF EXISTS update_my_feature_updated_at ON my_feature;
CREATE TRIGGER update_my_feature_updated_at
  BEFORE UPDATE ON my_feature
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 3. Run Migration

```bash
# Check status
npx @cgk-platform/cli migrate --status

# Run for specific tenant
npx @cgk-platform/cli migrate --tenant rawdog

# Or run for all tenants via app
pnpm dev  # Migrations run on app start
```

### Migration Best Practices

**Always use idempotent statements:**

```sql
-- Good
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...

-- Enums need DO block
DO $$ BEGIN
  CREATE TYPE my_enum AS ENUM ('a', 'b');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

**Match ID types correctly:**

```sql
-- Public tables use UUID
user_id UUID REFERENCES public.users(id)

-- Most tenant tables use TEXT
parent_id TEXT REFERENCES other_table(id)
```

**Use public prefix for shared functions:**

```sql
-- In tenant schemas, reference public schema explicitly
EXECUTE FUNCTION public.update_updated_at_column()

-- For vector types
embedding public.vector(1536)
```

## Adding Background Jobs

### 1. Define Job in packages/jobs

```typescript
// packages/jobs/src/tasks/my-feature/process-item.ts
import { task } from '@trigger.dev/sdk/v3'
import { withTenant } from '@cgk-platform/db'

export const processItem = task({
  id: 'my-feature/process-item',
  run: async (payload: { tenantId: string; itemId: string }) => {
    const { tenantId, itemId } = payload

    // ALWAYS use tenant context
    return withTenant(tenantId, async () => {
      // Process the item
      console.log(`Processing item ${itemId} for tenant ${tenantId}`)

      // Return result
      return { processed: true, itemId }
    })
  },
})
```

### 2. Export from Index

```typescript
// packages/jobs/src/tasks/index.ts
export { processItem } from './my-feature/process-item.js'
```

### 3. Trigger Job from API

```typescript
import { processItem } from '@cgk-platform/jobs'

export async function POST(request: Request) {
  // ... auth ...

  // CRITICAL: Always include tenantId
  await processItem.trigger({
    tenantId: auth.tenantId,
    itemId: body.itemId,
  })

  return NextResponse.json({ queued: true })
}
```

## Adding React Components

### 1. Add to UI Package

```typescript
// packages/ui/src/components/my-component.tsx
'use client'

import * as React from 'react'
import { cn } from '../utils'

export interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  variant?: 'default' | 'highlighted'
}

export function MyComponent({
  title,
  variant = 'default',
  className,
  children,
  ...props
}: MyComponentProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant === 'highlighted' && 'border-gold bg-gold/5',
        className
      )}
      {...props}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  )
}
```

### 2. Export from Index

```typescript
// packages/ui/src/index.ts
export { MyComponent, type MyComponentProps } from './components/my-component'
```

### 3. Use in Apps

```typescript
// Always import from main entry point
import { MyComponent, Button, Card } from '@cgk-platform/ui'

function MyPage() {
  return (
    <MyComponent title="Hello" variant="highlighted">
      <p>Content here</p>
    </MyComponent>
  )
}
```

## Best Practices

### File Size Limits

| Type | Target | Max |
|------|--------|-----|
| Components | 200-400 lines | 500 |
| API Routes | 100-200 lines | 300 |
| Utilities | 100-300 lines | 400 |
| Types | 50-150 lines | 200 |

**Hard limit: 650 lines** - split larger files.

### Tenant Isolation

```typescript
// ALWAYS use tenant context
const data = await withTenant(tenantId, () =>
  sql`SELECT * FROM orders`
)

// ALWAYS tenant-prefix cache keys
const cache = createTenantCache(tenantId)

// ALWAYS include tenantId in job payloads
await jobs.send('order/created', { tenantId, orderId })

// NEVER query without tenant context
await sql`SELECT * FROM orders`  // WRONG
```

### SQL Patterns

```typescript
// Arrays -> PostgreSQL array literals
sql`SELECT * FROM items WHERE id = ANY(${`{${ids.join(',')}}`}::text[])`

// Dates -> ISO strings
sql`UPDATE items SET expires_at = ${someDate.toISOString()}`

// No dynamic table names - use switch/case
switch (entityType) {
  case 'project':
    return sql`UPDATE projects SET status = ${status} WHERE id = ${id}`
  case 'task':
    return sql`UPDATE tasks SET status = ${status} WHERE id = ${id}`
}
```

### Type Safety

```typescript
// Check rows before using
const row = result.rows[0]
if (!row) return null
return toCamelCase(row as Record<string, unknown>) as unknown as MyType

// Double cast for config objects
const config = action.config as unknown as MyConfigType
```
