# Phase 1: Foundation

**Duration**: 4 weeks
**Focus**: Database, authentication, core packages, monorepo setup

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| PLAN.md | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md` |
| PROMPT.md | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PROMPT.md` |
| DATABASE-SCHEMA | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` |
| ENV-VARS | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/ENV-VARS-2025-02-10.md` |

---

## Required Skills for This Phase

| Skill | Usage |
|-------|-------|
| Context7 MCP | **REQUIRED** - Turborepo, PostgreSQL, JWT patterns |
| `obra/superpowers@writing-plans` | Structured architecture planning |
| `obra/superpowers@test-driven-development` | TDD for auth and database packages |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(documentation-lookup|writing-plans|test-driven)"

# If missing, install:
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@writing-plans -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### Foundation Development Workflow
1. Use Context7 MCP to look up Turborepo, PostgreSQL schema patterns
2. Use `obra/superpowers@writing-plans` for architecture decisions
3. Follow TDD for critical packages: `@repo/db`, `@repo/auth`
4. Document patterns as you establish them

---

## Objectives

1. Set up Turborepo monorepo structure
2. Implement multi-tenant database with schema-per-tenant
3. Build custom authentication system (replacing Clerk)
4. Create shared packages for common functionality
5. Establish development environment and tooling

---

## Week 1: Monorepo Setup

### Tasks

#### [PARALLEL] Initialize Monorepo
- [ ] Create new repository with Turborepo
- [ ] Configure pnpm workspaces
- [ ] Set up TypeScript configuration
- [ ] Configure ESLint and Prettier
- [ ] Set up Tailwind CSS config package

#### [PARALLEL] Create Package Stubs
- [ ] `packages/ui` - Shared UI components
- [ ] `packages/db` - Database client
- [ ] `packages/auth` - Authentication utilities
- [ ] `packages/commerce` - **Commerce provider abstraction (Shopify + Custom)**
- [ ] `packages/config` - Shared configuration

#### [SEQUENTIAL after above] Create App Stubs
- [ ] `apps/orchestrator` - Internal management
- [ ] `apps/admin` - White-labeled admin
- [ ] `apps/storefront` - Headless storefront
- [ ] `apps/creator-portal` - Creator portal

### Deliverables
- Working monorepo with all packages building
- Turbo pipeline configured for build/test/lint
- Basic CI pipeline (GitHub Actions)

---

## Week 2: Database Foundation

### Tasks

#### [PARALLEL] Database Schema Design
- [ ] Design public schema (organizations, users, sessions)
- [ ] Design tenant schema template
- [ ] Create migration system

#### [PARALLEL] Database Package Implementation
```typescript
// packages/db/src/client.ts
import { sql } from '@vercel/postgres'

export { sql }

export async function query<T>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await sql.query(text, values)
  return result.rows as T[]
}
```

#### [SEQUENTIAL after above] Tenant Context System
```typescript
// packages/db/src/tenant.ts
export async function withTenant<T>(
  tenantSlug: string,
  fn: () => Promise<T>
): Promise<T> {
  const schemaName = `tenant_${tenantSlug}`

  // Set search path for this request
  await sql`SELECT set_config('search_path', ${schemaName} || ',public', false)`

  try {
    return await fn()
  } finally {
    // Reset to public
    await sql`SELECT set_config('search_path', 'public', false)`
  }
}

export function getTenantFromRequest(req: Request): string {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) throw new Error('Missing tenant context')
  return tenantId
}
```

#### [SEQUENTIAL after above] Migration System
```typescript
// packages/db/src/migrations/runner.ts
interface Migration {
  version: number
  name: string
  up: string
  down: string
}

export async function runMigrations(tenantSlug?: string) {
  const migrations = await loadMigrations()

  if (tenantSlug) {
    // Run tenant-specific migrations
    await withTenant(tenantSlug, async () => {
      for (const migration of migrations.tenant) {
        await applyMigration(migration)
      }
    })
  } else {
    // Run public schema migrations
    for (const migration of migrations.public) {
      await applyMigration(migration)
    }
  }
}
```

### Deliverables
- Public schema deployed with organizations, users, sessions
- Tenant schema template ready for deployment
- Migration system working
- Tenant context utility tested

---

## Week 3: Authentication System

### Tasks

#### [PARALLEL] JWT Implementation
```typescript
// packages/auth/src/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as JWTPayload
}
```

#### [PARALLEL] Session Management
```typescript
// packages/auth/src/session.ts
import { sql } from '@repo/db'
import { nanoid } from 'nanoid'
import { hash, compare } from 'bcryptjs'

export async function createSession(
  userId: string,
  orgId: string,
  req: Request
): Promise<Session> {
  const token = nanoid(64)
  const tokenHash = await hash(token, 10)

  const [session] = await sql`
    INSERT INTO public.sessions (
      user_id, organization_id, token_hash, expires_at, ip_address, user_agent
    ) VALUES (
      ${userId}, ${orgId}, ${tokenHash},
      NOW() + INTERVAL '30 days',
      ${req.headers.get('x-forwarded-for')},
      ${req.headers.get('user-agent')}
    )
    RETURNING id, expires_at
  `

  return { ...session, token }
}

export async function validateSession(token: string): Promise<Session | null> {
  const sessions = await sql`
    SELECT s.*, u.email, u.role, o.slug as org_slug
    FROM public.sessions s
    JOIN public.users u ON s.user_id = u.id
    JOIN public.organizations o ON s.organization_id = o.id
    WHERE s.expires_at > NOW()
  `

  for (const session of sessions) {
    if (await compare(token, session.token_hash)) {
      return session
    }
  }

  return null
}
```

#### [PARALLEL] Magic Link System
```typescript
// packages/auth/src/magic-link.ts
export async function createMagicLink(
  email: string,
  purpose: 'login' | 'signup'
): Promise<string> {
  const token = nanoid(32)
  const tokenHash = await hash(token, 10)

  await sql`
    INSERT INTO public.magic_links (email, token_hash, purpose, expires_at)
    VALUES (${email}, ${tokenHash}, ${purpose}, NOW() + INTERVAL '24 hours')
  `

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  return `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`
}

export async function verifyMagicLink(
  email: string,
  token: string
): Promise<boolean> {
  const links = await sql`
    SELECT token_hash FROM public.magic_links
    WHERE email = ${email}
      AND purpose = 'login'
      AND expires_at > NOW()
      AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (links.length === 0) return false

  const valid = await compare(token, links[0].token_hash)

  if (valid) {
    await sql`
      UPDATE public.magic_links
      SET used_at = NOW()
      WHERE email = ${email} AND token_hash = ${links[0].token_hash}
    `
  }

  return valid
}
```

#### [SEQUENTIAL after above] Auth Middleware
```typescript
// packages/auth/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, validateSession } from './index'

export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value

  if (!token) {
    return redirectToLogin(req)
  }

  try {
    const payload = await verifyJWT(token)
    const session = await validateSession(payload.sessionId)

    if (!session) {
      return redirectToLogin(req)
    }

    // Inject tenant context
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', session.org_slug)
    requestHeaders.set('x-user-id', session.user_id)
    requestHeaders.set('x-user-role', session.role)

    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  } catch {
    return redirectToLogin(req)
  }
}

function redirectToLogin(req: NextRequest) {
  const url = new URL('/login', req.url)
  url.searchParams.set('redirect', req.pathname)
  return NextResponse.redirect(url)
}
```

### Deliverables
- JWT signing/verification working
- Session management with database
- Magic link authentication
- Middleware for protected routes
- Password hashing utilities

---

## Week 4: Shared Packages & Testing

### Tasks

#### [PARALLEL] UI Package
```typescript
// packages/ui/src/button.tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

#### [PARALLEL] Commerce Package (Provider Abstraction)

The commerce package provides a unified interface for Shopify (default) and Custom+Stripe (opt-in) checkout.

```typescript
// packages/commerce/src/types.ts
export interface CommerceProvider {
  readonly name: 'shopify' | 'custom'
  products: ProductOperations
  cart: CartOperations
  checkout: CheckoutOperations
  orders: OrderOperations
  customers: CustomerOperations
  discounts: DiscountOperations
  webhooks: WebhookHandler
}

// packages/commerce/src/factory.ts
export async function createCommerceProvider(
  tenantId: string,
  config: CommerceProviderConfig
): Promise<CommerceProvider> {
  const { value: providerType } = await evaluateFlag('commerce.provider', { tenantId })

  if (providerType === 'custom') {
    return createCustomProvider(config.customConfig)
  }
  return createShopifyProvider(config.shopifyConfig)
}
```

**Phase 1 Scope**: Define interfaces and Shopify provider implementation.
**Phase 3 Scope**: Build storefront components using provider abstraction.
**Future**: Implement Custom provider when needed.

See [COMMERCE-PROVIDER-SPEC-2025-02-10.md](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) for full specification.

#### [PARALLEL] Shopify Package
```typescript
// packages/shopify/src/admin.ts
interface ShopifyCredentials {
  storeDomain: string
  accessToken: string
}

export function createShopifyAdminClient(credentials: ShopifyCredentials) {
  const endpoint = `https://${credentials.storeDomain}/admin/api/2024-01/graphql.json`

  return {
    async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': credentials.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      })

      const { data, errors } = await response.json()

      if (errors?.length) {
        throw new Error(errors[0].message)
      }

      return data
    }
  }
}
```

#### [PARALLEL] Testing Setup
```typescript
// vitest.config.ts (workspace root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/']
    }
  }
})
```

#### [SEQUENTIAL after above] Integration Tests
```typescript
// packages/db/src/__tests__/tenant.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql, withTenant } from '../index'

describe('Tenant Context', () => {
  const testTenant = 'test_tenant_' + Date.now()

  beforeAll(async () => {
    await sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier([`tenant_${testTenant}`])}`
  })

  afterAll(async () => {
    await sql`DROP SCHEMA IF EXISTS ${sql.identifier([`tenant_${testTenant}`])} CASCADE`
  })

  it('should isolate queries to tenant schema', async () => {
    await withTenant(testTenant, async () => {
      const result = await sql`SELECT current_schema()`
      expect(result[0].current_schema).toBe(`tenant_${testTenant}`)
    })
  })

  it('should reset to public after execution', async () => {
    await withTenant(testTenant, async () => {})
    const result = await sql`SELECT current_schema()`
    expect(result[0].current_schema).toBe('public')
  })
})
```

### Deliverables
- UI component library with core components
- Shopify admin/storefront clients
- Test infrastructure configured
- All packages have basic tests
- CI running tests on every PR

---

## File Structure After Phase 1

```
multi-tenant-platform/
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── vitest.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── apps/
│   ├── orchestrator/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── login/
│   │   │   │       └── page.tsx
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── admin/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   └── (stub)
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── storefront/
│   │   └── (stub)
│   │
│   └── creator-portal/
│       └── (stub)
│
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── utils.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── tenant.ts
│   │   │   ├── migrations/
│   │   │   │   ├── runner.ts
│   │   │   │   ├── public/
│   │   │   │   │   ├── 001_organizations.sql
│   │   │   │   │   ├── 002_users.sql
│   │   │   │   │   └── 003_sessions.sql
│   │   │   │   └── tenant/
│   │   │   │       ├── 001_orders.sql
│   │   │   │       ├── 002_customers.sql
│   │   │   │       └── 003_products.sql
│   │   │   ├── __tests__/
│   │   │   │   └── tenant.test.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── auth/
│   │   ├── src/
│   │   │   ├── jwt.ts
│   │   │   ├── session.ts
│   │   │   ├── magic-link.ts
│   │   │   ├── middleware.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── jwt.test.ts
│   │   │   │   └── session.test.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shopify/
│   │   ├── src/
│   │   │   ├── admin.ts
│   │   │   ├── storefront.ts
│   │   │   ├── queries.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── tailwind/
│           └── tailwind.config.js
│
└── tooling/
    ├── scripts/
    │   ├── create-tenant.ts
    │   └── run-migrations.ts
    └── migrations/
        └── (SQL files)
```

---

## Success Criteria

- [ ] `pnpm turbo build` completes successfully
- [ ] `pnpm turbo test` passes all tests
- [ ] `pnpm turbo lint` has no errors
- [ ] Can create new tenant via script
- [ ] Can authenticate user via magic link
- [ ] Tenant isolation verified in tests
- [ ] CI pipeline running on GitHub Actions

---

## Dependencies for Next Phase

Phase 2 (Admin Portal) requires:
- [x] Authentication middleware working
- [x] Tenant context system working
- [x] UI components library
- [x] Shopify client package
