# Master Prompt Template for Fix Agents

> Use this template when spawning agents or starting new sessions to fix issues.

---

## Standard Agent Prompt Format

```
You are fixing frontend gaps in the CGK multi-tenant e-commerce platform.

**CRITICAL RULES:**
1. Always use `withTenant()` for database queries in tenant-scoped data
2. Import UI components from `@cgk-platform/ui` (main entry point only)
3. Use `lucide-react` for all icons
4. Follow existing patterns in the codebase
5. Verify with `npx tsc --noEmit` after changes

**CODEBASE CONTEXT:**
- Monorepo at `/Users/holdenthemic/Documents/cgk/`
- Apps: orchestrator, admin, storefront, creator-portal, contractor-portal
- Shared packages at `/packages/`
- Database: PostgreSQL with schema-per-tenant isolation
- Auth: Custom JWT via `@cgk-platform/auth`

**YOUR TASK:**
[INSERT SPECIFIC TASK FROM PHASE FILE]

**FILES TO CREATE/MODIFY:**
[INSERT FILE LIST FROM PHASE FILE]

**VERIFICATION:**
After completing, run:
```bash
cd /Users/holdenthemic/Documents/cgk/apps/[APP_NAME]
npx tsc --noEmit
```

Report any errors and fix them before marking complete.
```

---

## API Route Template

```typescript
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  // 1. Get tenant context from headers (set by middleware)
  const tenantSlug = request.headers.get('x-tenant-slug')
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  // 2. Get customer ID from session (for customer portal routes)
  const customerId = request.headers.get('x-customer-id')
  if (!customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Query with tenant isolation
  const data = await withTenant(tenantSlug, async () => {
    return sql`SELECT * FROM table WHERE customer_id = ${customerId}`
  })

  return NextResponse.json({ data: data.rows })
}
```

---

## Page Component Template

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, Button } from '@cgk-platform/ui'
import { RefreshCw } from 'lucide-react'

interface PageData {
  // Define your data type
}

export default function MyPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/endpoint')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={fetchData} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Page Title</h1>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      {/* Page content */}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-xl border bg-card" />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{message}</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## Block Component Template

```typescript
'use client'

import { cn } from '@cgk-platform/ui'
import type { BlockProps } from '../types'

export interface MyBlockConfig {
  title?: string
  items?: Array<{
    id: string
    label: string
  }>
  layout?: 'grid' | 'list'
}

export function MyBlock({ config, className }: BlockProps<MyBlockConfig>) {
  const { title, items = [], layout = 'grid' } = config

  return (
    <section className={cn('py-12', className)}>
      {title && (
        <h2 className="mb-8 text-center text-3xl font-bold">{title}</h2>
      )}
      <div className={cn(
        layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : 'space-y-4'
      )}>
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            {item.label}
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

## Common Imports Reference

```typescript
// UI Components
import {
  Button, Card, CardContent, CardHeader,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Badge, Switch, Tabs, TabsContent, TabsList, TabsTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Alert, AlertDescription,
  cn
} from '@cgk-platform/ui'

// Icons (lucide-react)
import {
  RefreshCw, Settings, User, CreditCard, ShoppingBag,
  ChevronLeft, ChevronRight, Plus, Trash2, Edit, Eye,
  Check, X, AlertTriangle, Info, Loader2
} from 'lucide-react'

// Database
import { sql, withTenant } from '@cgk-platform/db'

// Auth
import { requireAuth, checkPermissionOrRespond } from '@cgk-platform/auth'

// Next.js
import { NextResponse } from 'next/server'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
```

---

## Verification Checklist

Before marking a task complete:

- [ ] All files created/modified as specified
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] No hardcoded/mock data (uses real DB queries)
- [ ] Proper error handling (loading states, error states)
- [ ] Uses `withTenant()` for tenant-scoped queries
- [ ] Uses `@cgk-platform/ui` components
- [ ] Uses `lucide-react` icons
- [ ] Follows existing patterns in codebase

---

## Progress Tracking (IMPORTANT)

**As you complete tasks, update the phase documentation to reflect progress.**

### How to Track Progress

1. **After completing each task**, edit the corresponding phase file in `/FRONTEND-FIX-PLAN/phases/`
2. **Update the completion checklist** at the bottom of each phase file by changing `[ ]` to `[x]`
3. **Update the MASTER-PLAN.md** completion tracking table when an entire phase is complete

### Example: Marking a Task Complete

**Before:**
```markdown
## Completion Checklist

### Orders API
- [ ] `api/account/orders/route.ts` created
- [ ] `api/account/orders/[id]/route.ts` created
```

**After completing the orders API routes:**
```markdown
## Completion Checklist

### Orders API
- [x] `api/account/orders/route.ts` created
- [x] `api/account/orders/[id]/route.ts` created
```

### When a Phase is Complete

After all checklist items in a phase are marked `[x]`:

1. Edit `/FRONTEND-FIX-PLAN/MASTER-PLAN.md`
2. Update the Completion Tracking table:

```markdown
| Phase | Status | Completed By | Date |
|-------|--------|--------------|------|
| Phase 1 | ✅ Complete | Agent | 2026-02-16 |
| Phase 2 | ⏳ Pending | | |
```

### Why This Matters

- **Prevents duplicate work** - Future agents know what's already done
- **Enables incremental progress** - Can stop and resume across sessions
- **Provides audit trail** - Know exactly what was completed and when
- **Coordinates parallel work** - Multiple agents can track shared state
