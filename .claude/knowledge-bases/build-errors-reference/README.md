# Common Build Error Patterns

**Purpose**: Troubleshooting guide for common Next.js, TypeScript, and Vercel build errors
**Last Updated**: 2026-02-27

---

## Overview

This guide documents the most common build errors in the CGK platform and their solutions. These patterns prevent deployment failures and local development issues.

---

## Error 1: Top-level SDK Initialization

### Problem

Initializing SDKs (Stripe, Shopify, etc.) at module level causes build-time failures when environment variables are not available during the build phase.

### Error Message

```
Error: Environment variable STRIPE_SECRET_KEY is not set
  at Module.<anonymous> (lib/stripe.ts:3:1)
```

### BAD Pattern

```typescript
// lib/stripe.ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
})

export { stripe }
```

**Why this fails**:

- Module is evaluated at build time
- `process.env.STRIPE_SECRET_KEY` might not exist during build
- Build fails before runtime

### CORRECT Pattern

```typescript
// lib/stripe.ts
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return _stripe
}

export { getStripe }

// Usage in API routes
export async function POST(req: Request) {
  const stripe = getStripe() // Lazy initialization at runtime
  // ...
}
```

**Benefits**:

- SDK initialized only when first used (runtime)
- Build completes without env vars
- Single instance cached after first use

---

## Error 2: next/headers in Client Components

### Problem

`next/headers` can only be used in Server Components, not Client Components.

### Error Message

```
Error: You're importing a component that needs next/headers. That only works in a Server Component but one of its parents is marked with "use client"
```

### BAD Pattern

```typescript
// components/UserProfile.tsx
'use client'

import { headers } from 'next/headers' // ❌ Not allowed in client components

export function UserProfile() {
  const headersList = headers() // Error!
  // ...
}
```

### CORRECT Pattern

**Option 1: Split into Server Component**

```typescript
// components/UserProfile.server.tsx (Server Component)
import { headers } from 'next/headers'

export async function UserProfile() {
  const headersList = headers()
  const userAgent = headersList.get('user-agent')

  return <UserProfileClient userAgent={userAgent} />
}

// components/UserProfileClient.tsx
'use client'

export function UserProfileClient({ userAgent }: { userAgent: string }) {
  // Client-side logic here
  return <div>User Agent: {userAgent}</div>
}
```

**Option 2: Use in API Route**

```typescript
// app/api/session/route.ts
import { headers } from 'next/headers'

export async function GET() {
  const headersList = headers()
  const sessionToken = headersList.get('authorization')
  // ...
}
```

---

## Error 3: styled-jsx Requires 'use client'

### Problem

`styled-jsx` uses React context and requires client-side rendering.

### Error Message

```
Error: styled-jsx/style is a client-only component and cannot be used in Server Components
```

### BAD Pattern

```typescript
// components/Card.tsx (Server Component by default)
export function Card() {
  return (
    <div className="card">
      <style jsx>{`
        .card { padding: 1rem; }
      `}</style>
    </div>
  )
}
```

### CORRECT Pattern

```typescript
// components/Card.tsx
'use client'  // ✅ Add directive

export function Card() {
  return (
    <div className="card">
      <style jsx>{`
        .card { padding: 1rem; }
      `}</style>
    </div>
  )
}
```

**Better Alternative**: Use Tailwind CSS instead of styled-jsx to avoid client-side JS

```typescript
export function Card() {
  return <div className="p-4">Content</div>
}
```

---

## Error 4: useSearchParams Needs Suspense Boundary (Next.js 15+)

### Problem

Next.js 15+ requires `useSearchParams()` to be wrapped in a Suspense boundary.

### Error Message

```
Error: useSearchParams() should be wrapped in a suspense boundary
```

### BAD Pattern

```typescript
// app/products/page.tsx
'use client'
import { useSearchParams } from 'next/navigation'

export default function ProductsPage() {
  const searchParams = useSearchParams() // ❌ Not in Suspense
  const category = searchParams.get('category')
  // ...
}
```

### CORRECT Pattern

```typescript
// app/products/page.tsx
import { Suspense } from 'react'

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsContent />
    </Suspense>
  )
}

function ProductsContent() {
  const searchParams = useSearchParams()  // ✅ Inside Suspense
  const category = searchParams.get('category')
  // ...
}

function Loading() {
  return <div>Loading products...</div>
}
```

---

## Error 5: workspace:\* Protocol in Non-pnpm Contexts

### Problem

Shopify CLI and other tools use npm internally, which doesn't understand pnpm's `workspace:*` protocol.

### Error Message

```
npm ERR! Invalid dependency specifier: workspace:*
```

### BAD Pattern

```json
// apps/shopify-app/package.json
{
  "dependencies": {
    "@cgk-platform/db": "workspace:*" // ❌ Breaks when Shopify CLI runs npm
  },
  "scripts": {
    "build": "remix vite:build"
  }
}
```

### CORRECT Pattern

**Option 1: Use workspace:^ instead**

```json
{
  "dependencies": {
    "@cgk-platform/db": "workspace:^" // ✅ More compatible
  }
}
```

**Option 2: Override build script for external tools**

```json
{
  "scripts": {
    "build": "echo 'Built via Shopify CLI'" // No-op for turbo
  }
}
```

**Why**: Shopify CLI handles building directly, so turbo doesn't need to build it.

---

## Error 6: Edge Runtime Compatibility (MIDDLEWARE_INVOCATION_FAILED)

### Problem

Next.js middleware runs on **Edge Runtime** by default. Node.js `crypto` module is NOT available.

### Error Message

```
MIDDLEWARE_INVOCATION_FAILED
Error: The edge runtime does not support Node.js 'crypto' module
```

### BAD Pattern

```typescript
// middleware.ts
import { createHash, randomBytes } from 'crypto' // ❌ Node.js crypto

export function middleware(req: NextRequest) {
  const token = req.headers.get('authorization')
  const hash = createHash('sha256').update(token).digest('hex') // Error!
  // ...
}
```

### CORRECT Pattern

Use **Web Crypto API** (Edge-compatible):

```typescript
// middleware.ts

// SHA-256 hashing
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Random token generation
function generateToken(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function middleware(req: NextRequest) {
  const token = req.headers.get('authorization')
  const hash = await sha256(token) // ✅ Web Crypto API
  // ...
}
```

**Note**: `@cgk-platform/auth` uses Edge-compatible crypto utilities in `packages/auth/src/crypto.ts`.

---

## Error 7: turbo.json Env Var Declaration

### Problem

Turbo caches builds based on env vars. If an env var affects the build but isn't declared in `turbo.json`, you'll get warnings and incorrect cache hits.

### Warning Message

```
Warning: JWT_SECRET is set on Vercel but missing from turbo.json env array
```

### BAD Pattern

```json
// turbo.json
{
  "tasks": {
    "build": {
      "env": [
        "DATABASE_URL"
        // ❌ Missing JWT_SECRET, SESSION_SECRET, etc.
      ]
    }
  }
}
```

### CORRECT Pattern

```json
// turbo.json
{
  "tasks": {
    "build": {
      "env": [
        "DATABASE_URL",
        "JWT_SECRET", // ✅ Add all env vars that affect runtime
        "SESSION_SECRET",
        "SHOPIFY_CLIENT_ID",
        "SHOPIFY_CLIENT_SECRET",
        "STRIPE_SECRET_KEY"
      ]
    }
  }
}
```

**Rule**: If you add a new env var that affects runtime behavior, add it to `turbo.json` `build.env` array.

---

## Error 8: Edge Runtime Entry Point Separation (CRITICAL)

### Problem

Next.js middleware runs in **Edge Runtime**, which does NOT support Node.js APIs like `fs`, `path`, or `url`. Barrel exports that transitively import these modules will cause `MIDDLEWARE_INVOCATION_FAILED` errors.

### Error Message

```
MIDDLEWARE_INVOCATION_FAILED
Error: The edge runtime does not support Node.js 'fs' module
```

### BAD Pattern

```typescript
// packages/db/src/index.ts (Barrel export)
export { sql } from './client.js'
export { runMigrations } from './migrations/index.js' // ❌ Pulls in fs/path

// middleware.ts
import { sql } from '@cgk-platform/db' // ❌ Imports migrations code too!
```

**Why this fails**:

- Barrel export imports ALL exports, including `runMigrations`
- `runMigrations` imports `fs` and `path` (Node.js only)
- Edge Runtime chokes on Node.js modules

### CORRECT Pattern

**Separate package entry points using conditional exports:**

```json
// packages/db/package.json
{
  "exports": {
    ".": "./dist/index.js", // Edge-safe (no fs/path)
    "./migrations": "./dist/migrations.js" // Node.js only
  }
}
```

```typescript
// packages/db/src/index.ts (Edge-safe)
export { sql } from './client.js'
export { withTenant } from './tenant.js'
export { createTenantCache } from './cache.js'
// ❌ NO: export { runMigrations } from './migrations/index.js'

// packages/db/src/migrations.ts (Node.js only)
export { runMigrations } from './migrations/index.js'
export { runPublicMigrations } from './migrations/public.js'
```

```typescript
// middleware.ts (Edge Runtime) - OK
import { sql, withTenant } from '@cgk-platform/db' // ✓ Safe

// CLI/API routes (Node.js) - OK
import { runPublicMigrations } from '@cgk-platform/db/migrations' // ✓ Safe

// middleware.ts - BREAKS
import { runMigrations } from '@cgk-platform/db/migrations' // ❌ NEVER in middleware
```

### CGK Package Entry Points

| Package                       | Entry Point | Runtime        | Purpose                    |
| ----------------------------- | ----------- | -------------- | -------------------------- |
| `@cgk-platform/db`            | Main        | Edge + Node.js | `sql`, `withTenant`, cache |
| `@cgk-platform/db/migrations` | Subpath     | Node.js ONLY   | Migration utilities        |

---

## Error 9: Missing Suspense for Async Server Components

### Problem

Next.js 15+ requires async Server Components that fetch data to be wrapped in Suspense.

### Error Message

```
Error: async/await is not yet supported in Client Components
```

### BAD Pattern

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchDashboardData()  // ❌ Not wrapped
  return <div>{data.title}</div>
}
```

### CORRECT Pattern

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  const data = await fetchDashboardData()  // ✅ Inside Suspense
  return <div>{data.title}</div>
}

function Loading() {
  return <div>Loading dashboard...</div>
}
```

---

## Error 10: Import Resolution in Monorepo

### Problem

TypeScript can't resolve workspace packages or uses wrong entry points.

### Error Message

```
Module not found: Can't resolve '@cgk-platform/ui/button'
```

### BAD Pattern

```typescript
// Subpath exports don't exist for @cgk-platform/ui
import { Button } from '@cgk-platform/ui/button' // ❌ Error
import { Card } from '@cgk-platform/ui/card' // ❌ Error
```

### CORRECT Pattern

```typescript
// All exports from main index
import { Button, Card, Input, Badge } from '@cgk-platform/ui' // ✅ Correct
```

**Check package.json exports field**:

```json
// packages/ui/package.json
{
  "exports": {
    ".": "./dist/index.js"
    // ❌ No subpath exports like "./button" defined
  }
}
```

---

## Quick Troubleshooting Checklist

When you encounter a build error:

1. ✅ **Check runtime context**: Is this code running in Edge Runtime (middleware) or Node.js (API routes, build)?
2. ✅ **Verify env vars**: Are all required env vars in Vercel AND `turbo.json`?
3. ✅ **Check imports**: Are you importing from the correct entry point? (no subpaths for `@cgk-platform/ui`)
4. ✅ **Client vs Server**: Does the component need `'use client'` directive?
5. ✅ **Suspense boundaries**: Are async components wrapped in Suspense?
6. ✅ **SDK initialization**: Is the SDK lazily initialized, not at module level?
7. ✅ **Package exports**: Does the package.json define the export path you're using?

---

## Prevention Strategies

### 1. Type Check, Not Build (Faster Feedback)

```bash
# FAST - Type check only (PREFERRED)
npx tsc --noEmit
pnpm turbo typecheck

# SLOW - Full build (only for actual deployment)
pnpm build
```

### 2. Use Pre-Commit Hooks

See `scripts/validate-*.ts` for validators that catch common errors before commit.

### 3. Test in Vercel Preview Deployments

Preview deployments catch Edge Runtime issues before production.

---

**For SQL-specific patterns, see**: `.claude/knowledge-bases/vercel-postgres-patterns/README.md`

**For multi-tenancy patterns, see**: `.claude/knowledge-bases/multi-tenancy-patterns/README.md`

**End of Guide**
