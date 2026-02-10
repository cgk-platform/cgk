# Phase 2: Brand Admin Portal

**Duration**: 3 weeks (Weeks 5-7)
**Focus**: White-labeled brand admin portal shell
**Depends On**: Phase 1 (Foundation)

> **Note**: This phase builds the brand-level admin portal. Super Admin (Orchestrator) is in **Phase 2A** and platform operations systems (health, logging, flags, onboarding) are in **Phase 2B**. These phases can run in parallel after Week 6.

---

## Related Phases

| Phase | Duration | Focus | Can Parallelize After |
|-------|----------|-------|----------------------|
| **This Phase (2)** | 3 weeks | Brand Admin shell | - |
| [PHASE-2A-SUPER-ADMIN.md](./PHASE-2A-SUPER-ADMIN.md) | 3 weeks | Orchestrator dashboard | Week 6 |
| [PHASE-2B-PLATFORM-OPS.md](./PHASE-2B-PLATFORM-OPS.md) | 3 weeks | Health, Logs, Flags, Onboarding | Week 6 |

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| ADMIN-FEATURES | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/ADMIN-FEATURES-2025-02-10.md` |
| UI-PREVIEW | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/UI-PREVIEW-2025-02-10.md` |

---

## Required Skills for This Phase

**CRITICAL**: Before any UI development, invoke the appropriate skills:

| Skill | Usage |
|-------|-------|
| `/frontend-design` | **REQUIRED** for all React component creation |
| Context7 MCP | Look up shadcn/ui, Tailwind, React Query best practices |
| `obra/superpowers@test-driven-development` | TDD for all new features |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(frontend-design|documentation-lookup|test-driven)"

# If missing, install:
npx skills add anthropics/skills@frontend-design -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### Component Development Workflow
1. **Always invoke `/frontend-design`** before creating components
2. Use Context7 MCP to look up component library patterns
3. Follow the skill's design guidelines for production-grade UI
4. Avoid generic AI aesthetics - create distinctive interfaces

---

## Objectives

1. Build white-labeled admin portal framework
2. Implement all admin sections from RAWDOG
3. Create tenant configuration system
4. Enable custom domain support
5. Ensure feature parity with current platform

---

## Admin Sections to Implement

### Priority 1: Core Framework (Week 1-2)
- [ ] Admin layout with navigation
- [ ] Dashboard with KPIs
- [ ] Tenant settings management
- [ ] User management within tenant

### Priority 2: Commerce (Week 2-3)
- [ ] Orders dashboard
- [ ] Customer management
- [ ] Subscriptions (Loop integration)
- [ ] Reviews management
- [ ] Analytics overview

### Priority 3: Content (Week 3-4)
- [ ] Blog management
- [ ] Landing page builder
- [ ] SEO tools
- [ ] Brand context documents

### Priority 4: Creators (Week 4-5)
- [ ] Creator directory
- [ ] Applications workflow
- [ ] Pipeline/kanban
- [ ] Communications/inbox

### Priority 5: Finance (Week 5-6)
- [ ] Payouts dashboard
- [ ] Expenses tracking
- [ ] Treasury management
- [ ] Tax/1099 management

> **Note**: Operations (errors, logs, health) has been elevated to the **Super Admin Dashboard (Orchestrator)** for cross-tenant visibility. See [SUPER-ADMIN-ARCHITECTURE-2025-02-10.md](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md) for the complete specification. Brand admins can still see their own tenant's operations data through a simplified view that queries the platform-wide system filtered by tenant.

---

## Week 1-2: Core Framework

### Navigation Structure

```typescript
// apps/admin/src/lib/navigation.ts
export const adminNavigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Content',
    icon: FileText,
    children: [
      { name: 'Blog', href: '/admin/blog' },
      { name: 'Landing Pages', href: '/admin/landing-pages' },
      { name: 'SEO', href: '/admin/seo' },
      { name: 'Brand Context', href: '/admin/brand-context' },
    ],
  },
  {
    name: 'Commerce',
    icon: ShoppingCart,
    children: [
      { name: 'Orders', href: '/admin/orders' },
      { name: 'Customers', href: '/admin/customers' },
      { name: 'Subscriptions', href: '/admin/subscriptions' },
      { name: 'Reviews', href: '/admin/reviews' },
      { name: 'A/B Tests', href: '/admin/ab-tests' },
      { name: 'Promotions', href: '/admin/promotions' },
    ],
  },
  {
    name: 'Attribution',
    icon: BarChart3,
    children: [
      { name: 'Overview', href: '/admin/attribution' },
      { name: 'Channels', href: '/admin/attribution/channels' },
      { name: 'Journeys', href: '/admin/attribution/journeys' },
      { name: 'AI Insights', href: '/admin/attribution/ai-insights' },
    ],
  },
  {
    name: 'Creators',
    icon: Users,
    children: [
      { name: 'Directory', href: '/admin/creators' },
      { name: 'Applications', href: '/admin/creators/applications' },
      { name: 'Pipeline', href: '/admin/creator-pipeline' },
      { name: 'Inbox', href: '/admin/creators/inbox' },
    ],
  },
  {
    name: 'Finance',
    icon: DollarSign,
    children: [
      { name: 'Payouts', href: '/admin/payouts' },
      { name: 'Treasury', href: '/admin/treasury' },
      { name: 'Expenses', href: '/admin/expenses' },
      { name: 'Tax/1099', href: '/admin/tax' },
    ],
  },
  // NOTE: Full Operations dashboard is in Super Admin (Orchestrator)
  // Brand admins see a simplified view filtered to their tenant
  {
    name: 'Operations',
    icon: Activity,
    children: [
      { name: 'Dashboard', href: '/admin/ops' },      // Tenant-filtered view
      { name: 'Errors', href: '/admin/ops/errors' },  // Tenant errors only
      { name: 'Health', href: '/admin/ops/health' },  // Tenant integrations
    ],
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Cog,
  },
]
```

### Admin Layout

```typescript
// apps/admin/src/app/admin/layout.tsx
import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'
import { getTenantConfig } from '@/lib/tenant'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantConfig()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        navigation={adminNavigation}
        brand={{
          name: tenant.name,
          logo: tenant.logoUrl,
          primaryColor: tenant.primaryColor,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header tenant={tenant} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Tenant Configuration

```typescript
// apps/admin/src/lib/tenant.ts
import { sql } from '@repo/db'
import { headers } from 'next/headers'
import { decrypt } from '@repo/auth'

export interface TenantConfig {
  id: string
  slug: string
  name: string
  domain: string
  logoUrl: string | null
  primaryColor: string
  features: {
    creators: boolean
    subscriptions: boolean
    abTesting: boolean
    attribution: boolean
  }
  shopify: {
    storeDomain: string
    accessToken: string
  } | null
  stripe: {
    accountId: string
  } | null
}

export async function getTenantConfig(): Promise<TenantConfig> {
  const tenantSlug = headers().get('x-tenant-id')
  if (!tenantSlug) throw new Error('No tenant context')

  const [org] = await sql`
    SELECT
      id, slug, name, domain,
      settings->>'logoUrl' as logo_url,
      settings->>'primaryColor' as primary_color,
      settings->'features' as features,
      shopify_store_domain,
      shopify_access_token_encrypted,
      stripe_account_id
    FROM public.organizations
    WHERE slug = ${tenantSlug}
  `

  if (!org) throw new Error('Tenant not found')

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    domain: org.domain,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color || '#000000',
    features: org.features || {
      creators: true,
      subscriptions: true,
      abTesting: true,
      attribution: true,
    },
    shopify: org.shopify_store_domain ? {
      storeDomain: org.shopify_store_domain,
      accessToken: decrypt(org.shopify_access_token_encrypted),
    } : null,
    stripe: org.stripe_account_id ? {
      accountId: org.stripe_account_id,
    } : null,
  }
}
```

### Dashboard Page

```typescript
// apps/admin/src/app/admin/page.tsx
import { getTenantConfig } from '@/lib/tenant'
import { getEscalationCounts } from '@/lib/escalations'
import { getRevenueMetrics } from '@/lib/analytics'
import { DashboardCards } from '@/components/admin/dashboard/cards'
import { EscalationsWidget } from '@/components/admin/dashboard/escalations'
import { RecentActivity } from '@/components/admin/dashboard/activity'

export default async function DashboardPage() {
  const tenant = await getTenantConfig()

  const [escalations, metrics] = await Promise.all([
    getEscalationCounts(),
    getRevenueMetrics(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <DashboardCards metrics={metrics} />

      {/* Escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EscalationsWidget counts={escalations} />
        <RecentActivity tenant={tenant.slug} />
      </div>
    </div>
  )
}
```

---

## Week 2-3: Commerce Features

### Orders Module

```
apps/admin/src/
├── app/admin/orders/
│   ├── page.tsx              # Order list with filters
│   ├── [id]/
│   │   └── page.tsx          # Order detail
│   └── components/
│       ├── order-list.tsx    # DataTable with orders
│       ├── order-filters.tsx # Date, status, search
│       └── order-detail.tsx  # Full order view
│
├── lib/orders/
│   ├── index.ts
│   ├── types.ts
│   ├── db.ts                 # Database queries
│   └── sync.ts               # Shopify sync
│
└── api/admin/orders/
    ├── route.ts              # GET list, POST sync
    └── [id]/
        └── route.ts          # GET detail
```

### Customers Module

```typescript
// apps/admin/src/lib/customers/db.ts
import { sql, withTenant, getTenantFromRequest } from '@repo/db'

export async function getCustomers(
  req: Request,
  options: {
    search?: string
    limit?: number
    offset?: number
  }
) {
  const tenant = getTenantFromRequest(req)

  return withTenant(tenant, async () => {
    const customers = await sql`
      SELECT
        c.*,
        COUNT(o.id) as order_count,
        SUM(o.total_cents) as lifetime_value
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE
        CASE WHEN ${options.search}::text IS NOT NULL THEN
          c.email ILIKE '%' || ${options.search} || '%'
          OR c.first_name ILIKE '%' || ${options.search} || '%'
          OR c.last_name ILIKE '%' || ${options.search} || '%'
        ELSE TRUE END
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${options.limit || 50}
      OFFSET ${options.offset || 0}
    `

    return customers
  })
}
```

### Subscriptions Module

```typescript
// apps/admin/src/lib/subscriptions/loop-client.ts
import { getTenantConfig } from '../tenant'

export async function getSubscriptions() {
  const tenant = await getTenantConfig()

  // If using Loop
  if (tenant.features.subscriptions) {
    const loopToken = await getLoopToken(tenant.id)
    return fetchFromLoop(loopToken)
  }

  // Fall back to custom subscription system
  return getCustomSubscriptions()
}

async function fetchFromLoop(token: string) {
  const response = await fetch('https://api.loopsubscriptions.com/admin/2023-10/subscriptions', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json()
}
```

### Reviews Module

```typescript
// apps/admin/src/lib/reviews/db.ts
export async function getReviews(options: ReviewFilters) {
  return withTenant(options.tenant, async () => {
    const reviews = await sql`
      SELECT
        r.*,
        p.title as product_title,
        c.email as customer_email
      FROM reviews r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE
        CASE WHEN ${options.status}::text IS NOT NULL
          THEN r.status = ${options.status}
          ELSE TRUE
        END
        AND CASE WHEN ${options.productId}::uuid IS NOT NULL
          THEN r.product_id = ${options.productId}
          ELSE TRUE
        END
      ORDER BY r.created_at DESC
      LIMIT ${options.limit || 50}
    `

    return reviews
  })
}

export async function moderateReview(
  reviewId: string,
  action: 'approve' | 'reject',
  tenant: string
) {
  return withTenant(tenant, async () => {
    await sql`
      UPDATE reviews
      SET
        status = ${action === 'approve' ? 'approved' : 'rejected'},
        moderated_at = NOW()
      WHERE id = ${reviewId}
    `
  })
}
```

---

## Week 3-4: Content Features

### Landing Page Builder

```typescript
// apps/admin/src/lib/landing-pages/types.ts
export interface LandingPage {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published' | 'scheduled'
  blocks: Block[]
  seo: SEOConfig
  settings: PageSettings
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
}

export interface Block {
  id: string
  type: BlockType
  order: number
  config: Record<string, unknown>
}

export type BlockType =
  | 'hero'
  | 'product-showcase'
  | 'benefits'
  | 'reviews'
  | 'faq'
  | 'cta-banner'
  | 'markdown'
  | 'pdp-hero'
  | 'bundle-builder'
  // ... 70+ block types from RAWDOG
```

### Landing Page Editor

```typescript
// apps/admin/src/app/admin/landing-pages/[id]/page.tsx
import { getLandingPage } from '@/lib/landing-pages'
import { BlockEditor } from '@/components/admin/landing-pages/block-editor'
import { PageSettings } from '@/components/admin/landing-pages/page-settings'
import { SEOEditor } from '@/components/admin/landing-pages/seo-editor'

export default async function LandingPageEditorPage({
  params,
}: {
  params: { id: string }
}) {
  const page = await getLandingPage(params.id)

  return (
    <div className="grid grid-cols-[1fr_350px] gap-6 h-full">
      {/* Main editor */}
      <div className="space-y-4">
        <BlockEditor
          blocks={page.blocks}
          pageId={page.id}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-6 overflow-y-auto">
        <PageSettings page={page} />
        <SEOEditor seo={page.seo} pageId={page.id} />
      </div>
    </div>
  )
}
```

### Blog Management

```typescript
// apps/admin/src/lib/blog/db.ts
export async function getBlogPosts(options: BlogFilters) {
  return withTenant(options.tenant, async () => {
    return sql`
      SELECT
        p.*,
        a.name as author_name,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN blog_authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE
        CASE WHEN ${options.status}::text IS NOT NULL
          THEN p.status = ${options.status}
          ELSE TRUE
        END
      ORDER BY p.created_at DESC
      LIMIT ${options.limit || 50}
    `
  })
}

export async function createBlogPost(data: CreatePostInput, tenant: string) {
  return withTenant(tenant, async () => {
    const [post] = await sql`
      INSERT INTO blog_posts (
        slug, title, excerpt, content, status,
        author_id, category_id, featured_image, seo
      ) VALUES (
        ${data.slug}, ${data.title}, ${data.excerpt},
        ${data.content}, ${data.status},
        ${data.authorId}, ${data.categoryId},
        ${JSON.stringify(data.featuredImage)},
        ${JSON.stringify(data.seo)}
      )
      RETURNING *
    `

    return post
  })
}
```

---

## Week 4-5: Creator Features

### Creator Directory

```typescript
// apps/admin/src/lib/creators/db.ts
export async function getCreators(options: CreatorFilters) {
  return withTenant(options.tenant, async () => {
    return sql`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM creator_projects WHERE creator_id = c.id) as project_count,
        (SELECT SUM(amount_cents) FROM balance_transactions WHERE creator_id = c.id AND type = 'commission_available') as total_earned
      FROM creators c
      WHERE
        CASE WHEN ${options.status}::text IS NOT NULL
          THEN c.status = ${options.status}
          ELSE TRUE
        END
        AND CASE WHEN ${options.search}::text IS NOT NULL
          THEN c.name ILIKE '%' || ${options.search} || '%'
            OR c.email ILIKE '%' || ${options.search} || '%'
          ELSE TRUE
        END
      ORDER BY c.created_at DESC
      LIMIT ${options.limit || 50}
    `
  })
}
```

### Creator Pipeline (Kanban)

```typescript
// apps/admin/src/components/admin/creators/pipeline.tsx
'use client'

import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

const stages = [
  { id: 'applied', name: 'Applied' },
  { id: 'reviewing', name: 'Reviewing' },
  { id: 'approved', name: 'Approved' },
  { id: 'onboarding', name: 'Onboarding' },
  { id: 'active', name: 'Active' },
]

export function CreatorPipeline({ creators }: { creators: Creator[] }) {
  const [items, setItems] = useState(groupByStage(creators))

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const newStage = over.id as string
    await updateCreatorStage(active.id as string, newStage)
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage.id} className="min-w-[300px] bg-muted rounded-lg p-4">
            <h3 className="font-medium mb-4">{stage.name}</h3>
            <SortableContext items={items[stage.id] || []}>
              <div className="space-y-2">
                {items[stage.id]?.map(creator => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  )
}
```

### Creator Inbox

```typescript
// apps/admin/src/lib/messaging/db.ts
export async function getThreads(options: ThreadFilters) {
  return withTenant(options.tenant, async () => {
    return sql`
      SELECT
        t.*,
        c.name as creator_name,
        c.email as creator_email,
        (SELECT body FROM communication_messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM communication_threads t
      JOIN creators c ON t.creator_id = c.id
      WHERE
        CASE WHEN ${options.status}::text IS NOT NULL
          THEN t.status = ${options.status}
          ELSE TRUE
        END
      ORDER BY t.last_message_at DESC
      LIMIT ${options.limit || 50}
    `
  })
}

export async function sendMessage(data: SendMessageInput, tenant: string) {
  return withTenant(tenant, async () => {
    const [message] = await sql`
      INSERT INTO communication_messages (
        thread_id, direction, channel, body, sender_type, sender_id
      ) VALUES (
        ${data.threadId}, 'outbound', ${data.channel},
        ${data.body}, 'team', ${data.senderId}
      )
      RETURNING *
    `

    // Update thread last_message_at
    await sql`
      UPDATE communication_threads
      SET last_message_at = NOW()
      WHERE id = ${data.threadId}
    `

    return message
  })
}
```

---

## Week 5-6: Finance & Operations

### Payouts Dashboard

```typescript
// apps/admin/src/lib/payouts/db.ts
export async function getWithdrawalRequests(options: PayoutFilters) {
  return withTenant(options.tenant, async () => {
    return sql`
      SELECT
        w.*,
        c.name as creator_name,
        c.email as creator_email
      FROM withdrawal_requests w
      JOIN creators c ON w.creator_id = c.id
      WHERE
        CASE WHEN ${options.status}::text IS NOT NULL
          THEN w.status = ${options.status}
          ELSE TRUE
        END
      ORDER BY w.created_at DESC
      LIMIT ${options.limit || 50}
    `
  })
}

export async function processWithdrawal(
  requestId: string,
  action: 'approve' | 'reject',
  tenant: string
) {
  return withTenant(tenant, async () => {
    if (action === 'reject') {
      await sql`
        UPDATE withdrawal_requests
        SET status = 'rejected', processed_at = NOW()
        WHERE id = ${requestId}
      `
      return { success: true }
    }

    // For approval, trigger payout
    const [request] = await sql`
      SELECT * FROM withdrawal_requests WHERE id = ${requestId}
    `

    // Execute payout via Stripe or Wise
    const result = await executePayout(request)

    await sql`
      UPDATE withdrawal_requests
      SET
        status = ${result.success ? 'completed' : 'failed'},
        stripe_transfer_id = ${result.transferId},
        processed_at = NOW()
      WHERE id = ${requestId}
    `

    return result
  })
}
```

### Operations Dashboard (Tenant View)

Brand admin operations shows a filtered view of platform-wide data. The full operations system is in the Super Admin Orchestrator.

```typescript
// apps/admin/src/lib/ops/errors.ts
// Note: This queries the platform-wide platform_logs table, filtered by tenant
export async function getTenantErrors(tenantId: string) {
  return sql`
    SELECT * FROM public.platform_logs
    WHERE tenant_id = ${tenantId}
      AND level = 'error'
      AND timestamp > NOW() - INTERVAL '24 hours'
    ORDER BY timestamp DESC
    LIMIT 100
  `
}

export async function getTenantHealthStatus(tenantId: string) {
  // Run tenant-specific health checks (Shopify, Stripe for this tenant)
  const checks = await Promise.allSettled([
    checkShopify(tenantId),
    checkStripe(tenantId),
  ])

  return {
    shopify: checks[0].status === 'fulfilled',
    stripe: checks[1].status === 'fulfilled',
    overall: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
  }
}
```

> **Full Operations Specification**: See [SUPER-ADMIN-ARCHITECTURE-2025-02-10.md](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md), [HEALTH-MONITORING-SPEC-2025-02-10.md](./HEALTH-MONITORING-SPEC-2025-02-10.md), and [LOGGING-SPEC-2025-02-10.md](./LOGGING-SPEC-2025-02-10.md) for the complete platform-wide operations system.

---

## White-Labeling System

### Theme Configuration

```typescript
// apps/admin/src/lib/theme.ts
export interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  faviconUrl: string | null
  fontFamily: string
}

export function generateCSSVariables(theme: ThemeConfig): string {
  return `
    :root {
      --primary: ${hexToHSL(theme.primaryColor)};
      --secondary: ${hexToHSL(theme.secondaryColor)};
      --background: ${hexToHSL(theme.backgroundColor)};
      --foreground: ${hexToHSL(theme.textColor)};
      --font-family: ${theme.fontFamily};
    }
  `
}
```

### Custom Domain Support

```typescript
// apps/admin/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''

  // Check for custom domain
  const tenant = await getTenantByDomain(hostname)

  if (tenant) {
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', tenant.slug)
    return response
  }

  // Fall back to subdomain matching
  const subdomain = hostname.split('.')[0]
  if (subdomain && subdomain !== 'www') {
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', subdomain)
    return response
  }

  return NextResponse.redirect('/select-organization')
}
```

---

## Success Criteria

- [ ] All admin sections functional with tenant isolation
- [ ] White-labeling working (logo, colors, domain)
- [ ] Feature parity with current RAWDOG admin
- [ ] Performance: pages load in < 2s
- [ ] Mobile responsive
- [ ] Keyboard accessible

---

## Dependencies for Next Phases

**Phase 2A (Super Admin) requires:**
- [x] Admin layout and navigation patterns
- [x] Component library established
- [x] Tenant configuration system

**Phase 2B (Platform Ops) requires:**
- [x] Database schema for organizations
- [x] Authentication middleware patterns
- [x] Admin shell UI patterns

**Phase 3 (Storefront) requires:**
- [x] Shopify integration package
- [x] Tenant configuration system
- [x] Product/order sync working

---

## Next Steps

After completing this phase:

1. **Phase 2A**: Build Super Admin Dashboard (Orchestrator)
   - See [PHASE-2A-SUPER-ADMIN.md](./PHASE-2A-SUPER-ADMIN.md)
   - Uses patterns from this phase
   - Can run in parallel with Phase 2B

2. **Phase 2B**: Build Platform Operations
   - See [PHASE-2B-PLATFORM-OPS.md](./PHASE-2B-PLATFORM-OPS.md)
   - Health monitoring, logging, feature flags, brand onboarding
   - Can run in parallel with Phase 2A
