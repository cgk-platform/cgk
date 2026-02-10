# Multi-Tenant Platform Architecture

> **Reference**: Current codebase analysis in `./CODEBASE-ANALYSIS/` documents the existing implementation. This architecture document defines the target state.

---

## Architecture Principles

### 1. Vendor-Agnostic Design
Every major component should be replaceable without rewriting the application:
- **Background Jobs**: Inngest → could swap to Temporal, BullMQ
- **Database**: Neon PostgreSQL → could swap to any Postgres
- **Cache**: Upstash Redis → could swap to any Redis
- **Hosting**: Vercel → could self-host on any Node.js platform
- **Auth**: Custom JWT → could integrate with any identity provider

### 2. Cost-Conscious Architecture
Designed to reduce from $500-600/month to $200-300/month:
- **Consolidated deployments** - One admin app serves all tenants
- **Edge-first** - Use edge runtime where possible (cheaper)
- **Background jobs off Vercel** - Inngest handles compute-heavy work
- **Aggressive caching** - Redis + ISR reduce repeated work

### 3. Tenant Isolation by Default
Every layer enforces tenant isolation:
- **Database**: Schema-per-tenant separation
- **API**: Middleware validates tenant context
- **Cache**: Tenant-prefixed keys
- **Jobs**: Tenant ID in every event payload

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (Internal)                          │
│  Organization Management │ User Access │ Billing │ Deployments          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│   BRAND: RAWDOG   │     │  BRAND: CLIENT X  │     │  BRAND: CLIENT Y  │
├───────────────────┤     ├───────────────────┤     ├───────────────────┤
│ Admin Portal      │     │ Admin Portal      │     │ Admin Portal      │
│ Storefront        │     │ Storefront        │     │ Storefront        │
│ Creator Portal    │     │ Creator Portal    │     │ Creator Portal    │
│ MCP Server        │     │ MCP Server        │     │ MCP Server        │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SHARED INFRASTRUCTURE                           │
│  PostgreSQL (Neon) │ Redis (Upstash) │ Inngest │ Vercel │ Cloudflare   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Installation & Setup Flow

The platform has **two distinct setup levels** - understanding this distinction is critical:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM SETUP (One-Time)                            │
│  "WordPress-style first-run installer"                                  │
│                                                                         │
│  When: First time running the platform                                  │
│  Who: Platform operator / developer                                     │
│  What: Provisions infrastructure, creates super-admin                   │
│                                                                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │
│  │Database │ → │ Cache   │ → │Migrations│ → │ Admin   │ → │Platform │  │
│  │(Neon)   │   │(Upstash)│   │(auto-run)│   │(create) │   │(config) │  │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘  │
│                                                                         │
│  Spec: PLATFORM-SETUP-SPEC-2025-02-10.md                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BRAND ONBOARDING (Per-Tenant)                        │
│  "9-step wizard for each new brand"                                     │
│                                                                         │
│  When: Creating each new brand/tenant                                   │
│  Who: Super admin or brand admin                                        │
│  What: Creates tenant schema, connects services, configures features    │
│                                                                         │
│  1. Basic Info → 2. Shopify → 3. Domains → 4. Payments →               │
│  5. Integrations → 6. Features → 7. Products → 8. Users → 9. Launch   │
│                                                                         │
│  Spec: BRAND-ONBOARDING-SPEC-2025-02-10.md                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Platform Setup | Brand Onboarding |
|--------|----------------|------------------|
| **Frequency** | Once per platform | Once per brand |
| **Actor** | Developer / platform operator | Super admin / brand admin |
| **Creates** | Shared infrastructure | Tenant schema + config |
| **Services** | Neon, Upstash, Vercel Blob | Shopify, Stripe, integrations |
| **Access After** | Orchestrator dashboard | Brand admin dashboard |

### Vercel Integration Flow

Both levels can leverage Vercel integrations for auto-provisioning:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Deploy Button   │ ──→ │ Neon + Upstash  │ ──→ │ Platform Setup  │
│ (one-click)     │     │ auto-provision  │     │ Wizard runs     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Brand Onboarding│ ──→ │ Vercel Domains  │
                        │ Step 3: Domains │     │ auto-provision  │
                        └─────────────────┘     └─────────────────┘
```

---

## Database Architecture

### Schema Design: Schema-Per-Tenant

```sql
-- SHARED SCHEMAS (public)
CREATE SCHEMA public;

-- Per-tenant schemas
CREATE SCHEMA tenant_rawdog;
CREATE SCHEMA tenant_clientx;
CREATE SCHEMA tenant_clienty;
```

### Public Schema (Shared)

```sql
-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,  -- Used in schema names
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),               -- Custom domain
  settings JSONB DEFAULT '{}',       -- Feature flags, limits
  shopify_store_domain VARCHAR(255),
  shopify_access_token_encrypted TEXT,
  stripe_account_id VARCHAR(255),    -- Platform Stripe account
  wise_profile_id VARCHAR(255),      -- Wise business profile
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (can access multiple organizations)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),        -- bcrypt
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member', -- superadmin, admin, member
  organization_ids UUID[] DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (for MCP, integrations)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing (Stripe subscriptions)
CREATE TABLE public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES public.organizations(id),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  status VARCHAR(50) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tenant Schema Template

Each tenant schema contains isolated tables:

```sql
-- Applied to each tenant schema
-- Run: \i migrations/tenant_template.sql

-- Orders (synced from Shopify)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_id BIGINT UNIQUE NOT NULL,
  shopify_order_number VARCHAR(50),
  email VARCHAR(255),
  customer_id UUID REFERENCES customers(id),
  gross_sales_cents INTEGER,
  discount_cents INTEGER,
  net_sales_cents INTEGER,
  tax_cents INTEGER,
  shipping_cents INTEGER,
  total_cents INTEGER,
  financial_status VARCHAR(50),
  fulfillment_status VARCHAR(50),
  is_subscription BOOLEAN DEFAULT FALSE,
  discount_codes TEXT[],
  tags TEXT[],
  note_attributes JSONB,
  shipping_address JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_id BIGINT UNIQUE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  order_count INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (synced from Shopify)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_id BIGINT UNIQUE NOT NULL,
  handle VARCHAR(255),
  title VARCHAR(500),
  vendor VARCHAR(255),
  product_type VARCHAR(255),
  status VARCHAR(50),
  variants JSONB,
  images JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  customer_id UUID REFERENCES customers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(500),
  body TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creators
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  commission_percent DECIMAL(5,2) DEFAULT 10.00,
  discount_code VARCHAR(50),
  instagram_handle VARCHAR(100),
  tiktok_handle VARCHAR(100),
  balance_cents INTEGER DEFAULT 0,
  pending_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator Projects
CREATE TABLE creator_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  rate_cents INTEGER,
  rate_type VARCHAR(50) DEFAULT 'flat',
  status VARCHAR(50) DEFAULT 'draft',
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance Transactions (ledger)
CREATE TABLE balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id),
  type VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawal Requests
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id),
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  payout_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  stripe_transfer_id VARCHAR(255),
  wise_transfer_id VARCHAR(255),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing Pages
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  blocks JSONB DEFAULT '[]',
  seo JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Blog Posts
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  author_id UUID,
  category_id UUID,
  featured_image JSONB,
  seo JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Attribution Touchpoints
CREATE TABLE attribution_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255),
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(100),
  source VARCHAR(255),
  medium VARCHAR(255),
  campaign VARCHAR(255),
  click_id VARCHAR(500),
  landing_page TEXT,
  touched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution Conversions
CREATE TABLE attribution_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  revenue_cents INTEGER,
  is_first_order BOOLEAN,
  attributed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Tests
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  variants JSONB NOT NULL,
  targeting JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E-Sign Documents
CREATE TABLE esign_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  creator_id UUID REFERENCES creators(id),
  status VARCHAR(50) DEFAULT 'pending',
  pdf_url TEXT,
  signed_pdf_url TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES expense_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operating Expenses
CREATE TABLE operating_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES expense_categories(id),
  date DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  vendor_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Index Strategy

```sql
-- Per-tenant indexes (applied to each schema)
CREATE INDEX idx_orders_shopify_id ON orders(shopify_id);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(financial_status, fulfillment_status);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_shopify ON customers(shopify_id);

CREATE INDEX idx_creators_email ON creators(email);
CREATE INDEX idx_creators_status ON creators(status);

CREATE INDEX idx_attribution_visitor ON attribution_touchpoints(visitor_id);
CREATE INDEX idx_attribution_customer ON attribution_touchpoints(customer_id);
CREATE INDEX idx_attribution_time ON attribution_touchpoints(touched_at DESC);
```

---

## Application Architecture

### Monorepo Structure

```
multi-tenant-platform/
├── package.json           # Workspace root
├── turbo.json             # Turborepo config
├── pnpm-workspace.yaml    # pnpm workspaces
│
├── apps/
│   ├── orchestrator/      # Internal management UI
│   │   ├── src/
│   │   │   ├── app/       # Next.js app router
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── admin/             # White-labeled admin portal
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── storefront/        # Headless storefront
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── creator-portal/    # Creator/contractor portal
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── mcp-server/        # Standalone MCP server
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── ui/                # Shared UI components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── db/                # Database client & queries
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── tenant.ts
│   │   │   ├── migrations/
│   │   │   └── queries/
│   │   └── package.json
│   │
│   ├── auth/              # Authentication utilities
│   │   ├── src/
│   │   │   ├── jwt.ts
│   │   │   ├── session.ts
│   │   │   └── middleware.ts
│   │   └── package.json
│   │
│   ├── shopify/           # Shopify client
│   │   ├── src/
│   │   │   ├── admin.ts
│   │   │   ├── storefront.ts
│   │   │   └── webhooks.ts
│   │   └── package.json
│   │
│   ├── payments/          # Payment orchestration
│   │   ├── src/
│   │   │   ├── stripe.ts
│   │   │   ├── wise.ts
│   │   │   └── payout.ts
│   │   └── package.json
│   │
│   ├── analytics/         # Analytics & attribution
│   │   ├── src/
│   │   │   ├── tracking.ts
│   │   │   ├── attribution.ts
│   │   │   └── ga4.ts
│   │   └── package.json
│   │
│   ├── mcp/               # MCP protocol utilities
│   │   ├── src/
│   │   │   ├── transport.ts
│   │   │   ├── tools.ts
│   │   │   └── session.ts
│   │   └── package.json
│   │
│   └── config/            # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
└── tooling/
    ├── scripts/           # Build & deploy scripts
    └── migrations/        # Database migrations
```

---

## Authentication Flow

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string           // User ID
  email: string
  org: string           // Organization ID (tenant)
  role: 'superadmin' | 'admin' | 'member'
  orgs: string[]        // All accessible orgs
  iat: number
  exp: number
}
```

### Session Flow

```
1. User logs in with email/password or magic link
2. Server validates credentials
3. Server creates session in database
4. Server issues JWT with session ID
5. Client stores JWT in httpOnly cookie
6. Each request: middleware validates JWT + session
7. Middleware extracts tenant context from org claim
8. Request proceeds with tenant context
```

### Middleware Implementation

```typescript
// packages/auth/src/middleware.ts
export async function withAuth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) {
    return NextResponse.redirect('/login')
  }

  try {
    const payload = await verifyJWT(token)
    const session = await getSession(payload.sessionId)

    if (!session || session.expires_at < new Date()) {
      return NextResponse.redirect('/login')
    }

    // Set tenant context for downstream handlers
    const headers = new Headers(req.headers)
    headers.set('x-tenant-id', payload.org)
    headers.set('x-user-id', payload.sub)
    headers.set('x-user-role', payload.role)

    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.redirect('/login')
  }
}
```

---

## Commerce Provider Architecture

The platform supports **dual checkout modes** via feature flag, enabling tenants to choose between Shopify Headless (default) or Custom+Stripe checkout.

### Supported Modes

| Mode | Products | Cart | Checkout | Payments | Best For |
|------|----------|------|----------|----------|----------|
| **Shopify** (default) | Shopify Products | Shopify Cart | Shopify Checkout | Shopify Payments | Quick setup, proven UX |
| **Custom** (opt-in) | Local PostgreSQL | Redis/DB | Custom Flow | Stripe Direct | Full control, lower fees |

### Feature Flag Control

```typescript
// Platform flag: commerce.provider
// Values: 'shopify' (default) or 'custom'
const provider = await evaluateFlag('commerce.provider', { tenantId })
```

### Provider Interface

```typescript
// packages/commerce/src/types.ts
interface CommerceProvider {
  readonly name: 'shopify' | 'custom'
  products: ProductOperations
  cart: CartOperations
  checkout: CheckoutOperations
  orders: OrderOperations
  customers: CustomerOperations
  subscriptions?: SubscriptionOperations
  discounts: DiscountOperations
  webhooks: WebhookHandler
}
```

### Factory Pattern

```typescript
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

### Storefront Usage

Components are provider-agnostic:

```typescript
// Works with either Shopify or Custom provider
function ProductPage({ handle }: { handle: string }) {
  const commerce = useCommerceProvider()
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    commerce.products.getByHandle(handle).then(setProduct)
  }, [handle])

  return <ProductDetails product={product} />
}
```

### Migration Path

Tenants can migrate from Shopify to Custom:
1. Export products/customers via CLI: `npx @cgk/cli migrate-commerce`
2. Configure Stripe in admin UI
3. Update feature flag override
4. Test checkout flow
5. Go live with custom checkout

See [COMMERCE-PROVIDER-SPEC-2025-02-10.md](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) for complete specification.

---

## Shopify Headless Configuration

When using Shopify as a headless backend, the storefront domain is NOT added to Shopify's domain settings. Instead, checkout redirects are configured:

### Checkout Flow

```
1. Customer on: www.mybrand.com (our storefront)
   ↓
2. Clicks checkout → Redirects to: checkout.mybrand.myshopify.com (Shopify checkout)
   ↓
3. Completes payment on Shopify
   ↓
4. Sees Shopify's order status/thank you page (default)
   ↓
5. (Optional) Script redirects to: www.mybrand.com/thank-you (for custom experience)
```

**Note**: The thank you page is Shopify's by default. The optional redirect is useful for:
- Custom thank you page design
- Post-purchase upsells
- Enhanced conversion tracking

### Configuration Requirements

| Setting | Location | Purpose |
|---------|----------|---------|
| **Checkout Domain** | Organization settings | The myshopify.com domain for checkout |
| **Post-Checkout Redirect** | Shopify Admin → Checkout Settings | Script to redirect back after purchase |
| **Cart Attributes** | Storefront cart | Pass tracking data (GA4, Meta) through checkout |
| **Webhooks** | Auto-registered on OAuth | Receive order, customer, product events |

### Product Sync Strategy

Products are synced from Shopify to a local PostgreSQL database for fast storefront reads:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Shopify Store  │────▶│  Background Job │────▶│  Local Postgres │
│   (Source of    │     │  (Sync Engine)  │     │  (Fast Reads)   │
│     Truth)      │     └─────────────────┘     └─────────────────┘
│                 │              │                       │
│                 │◀─────────────┘                       │
│                 │     Webhooks for real-time           │
│                 │     create/update/delete             ▼
└─────────────────┘                              ┌─────────────────┐
                                                 │   Storefront    │
                                                 │   (Reads from   │
                                                 │    local DB)    │
                                                 └─────────────────┘
```

**Benefits:**
- **Faster page loads**: Query local DB instead of Shopify API
- **Custom enrichment**: Add reviews, badges, platform-specific fields
- **Full-text search**: PostgreSQL search on local data
- **Resilience**: Storefront works even if Shopify API is slow

See [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete specification.

---

## Payment Architecture

### Payout Decision Tree

```
Creator requests withdrawal
    │
    ▼
Is amount >= $25?
    │
    ├─ No ──► Reject (minimum not met)
    │
    ▼ Yes
Has tax info (W-9)?
    │
    ├─ No ──► Block (require W-9)
    │
    ▼ Yes
Is creator US-based?
    │
    ├─ Yes ──► Use Stripe Connect Express
    │          └─ 2-3 day settlement
    │          └─ $0.25 + 0.25% fee
    │
    ▼ No (International)
Is country supported by Wise?
    │
    ├─ Yes ──► Use Wise Business API
    │          └─ 1-2 day settlement
    │          └─ ~0.5% mid-market rate
    │
    ▼ No
Use Stripe Connect Custom
    └─ May require additional verification
    └─ 5-7 day settlement
```

### Payment Provider Abstraction

```typescript
// packages/payments/src/payout.ts
interface PayoutProvider {
  name: string
  isSupported(country: string): boolean
  createPayout(request: PayoutRequest): Promise<PayoutResult>
  getPayoutStatus(id: string): Promise<PayoutStatus>
}

class StripeProvider implements PayoutProvider {
  name = 'stripe'
  isSupported(country: string) {
    return ['US', 'CA', 'GB', 'AU', 'EU'].includes(country)
  }
  // ... implementation
}

class WiseProvider implements PayoutProvider {
  name = 'wise'
  isSupported(country: string) {
    return WISE_SUPPORTED_COUNTRIES.includes(country)
  }
  // ... implementation
}

export async function executePayout(request: PayoutRequest) {
  const provider = selectProvider(request.country)
  return provider.createPayout(request)
}
```

---

## Background Jobs (Inngest)

### Why Replace Trigger.dev

**Current Pain Points**:
1. Requires separate worker process (`npm run dev:all`)
2. Tasks feel disconnected from main application
3. Proprietary SDK creates vendor lock-in
4. Cold starts and execution delays
5. $50-100/month at current usage

**Migration Scope**: 199 Trigger.dev tasks to migrate
- See `CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` for complete inventory
- Categories: A/B testing (11), Attribution (17), Creator comms (15), Payments (12+), Reviews (4+), more

### Vendor-Agnostic Abstraction

```typescript
// packages/jobs/src/types.ts
interface JobProvider {
  send(event: string, data: unknown): Promise<void>
  createFunction(config: FunctionConfig): JobFunction
  createScheduledFunction(config: ScheduleConfig): JobFunction
}

// packages/jobs/src/inngest.ts - Current implementation
export const jobProvider: JobProvider = {
  send: async (event, data) => {
    await inngest.send({ name: event, data })
  },
  createFunction: (config) => {
    return inngest.createFunction(config.meta, config.trigger, config.handler)
  },
  // ...
}

// Future: Could swap to Temporal, BullMQ, AWS Step Functions
// packages/jobs/src/temporal.ts (alternative)
// packages/jobs/src/bullmq.ts (alternative)
```

### Event Types

```typescript
// packages/inngest/src/events.ts
export type Events = {
  // Commerce
  'shopify/order.created': { orderId: string; tenantId: string }
  'shopify/order.updated': { orderId: string; tenantId: string }
  'shopify/customer.created': { customerId: string; tenantId: string }

  // Reviews
  'review/submitted': { reviewId: string; tenantId: string }
  'review/approved': { reviewId: string; tenantId: string }
  'review.email/scheduled': { orderId: string; sequence: number; tenantId: string }

  // Creators
  'creator/applied': { creatorId: string; tenantId: string }
  'creator/approved': { creatorId: string; tenantId: string }
  'payout/requested': { requestId: string; tenantId: string }
  'payout/completed': { requestId: string; tenantId: string }

  // Attribution
  'attribution/touchpoint': { visitorId: string; tenantId: string }
  'attribution/conversion': { orderId: string; tenantId: string }

  // Scheduled
  'cron/daily-metrics': { tenantId: string }
  'cron/review-reminders': { tenantId: string }
}
```

### Function Patterns

```typescript
// apps/admin/src/inngest/functions/order-sync.ts
import { inngest } from '@/lib/inngest'
import { withTenant } from '@repo/db'

export const syncOrder = inngest.createFunction(
  { id: 'sync-shopify-order', retries: 3 },
  { event: 'shopify/order.created' },
  async ({ event, step }) => {
    const { orderId, tenantId } = event.data

    const order = await step.run('fetch-shopify-order', async () => {
      return fetchShopifyOrder(tenantId, orderId)
    })

    await step.run('save-to-database', async () => {
      return withTenant(tenantId, () => saveOrder(order))
    })

    await step.run('process-attribution', async () => {
      return processOrderAttribution(tenantId, order)
    })

    if (order.discount_codes?.length) {
      await step.run('credit-creator', async () => {
        return creditCreatorCommission(tenantId, order)
      })
    }
  }
)
```

---

## MCP Server Architecture

### Streamable HTTP Transport

```typescript
// apps/mcp-server/src/routes/mcp.ts
export async function POST(req: Request) {
  const { tenantId, userId } = await authenticateRequest(req)
  const message = await req.json()

  switch (message.method) {
    case 'initialize':
      return handleInitialize(message, tenantId)

    case 'tools/list':
      return handleToolsList(tenantId)

    case 'tools/call':
      return handleToolCall(message, tenantId, userId)

    default:
      return Response.json({ error: 'Unknown method' }, { status: 400 })
  }
}

async function handleToolCall(message: MCPMessage, tenantId: string, userId: string) {
  const { name, arguments: args } = message.params

  // Check if tool requires streaming
  if (STREAMING_TOOLS.includes(name)) {
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          for await (const chunk of executeToolStreaming(name, args, tenantId)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          }

          controller.close()
        }
      }),
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Regular synchronous response
  const result = await executeTool(name, args, tenantId)
  return Response.json({ result })
}
```

### Tool Organization

```typescript
// packages/mcp/src/tools/registry.ts
export const toolCategories = {
  commerce: ['list_orders', 'get_order', 'search_customers', 'sync_products'],
  content: ['list_blog_posts', 'create_blog_post', 'list_landing_pages'],
  creators: ['list_creators', 'get_creator', 'approve_withdrawal'],
  analytics: ['get_revenue_metrics', 'get_attribution_report'],
  operations: ['get_error_logs', 'get_health_status'],
} as const

// Tool definitions are tenant-aware
export function getToolsForTenant(tenantId: string) {
  const settings = getTenantSettings(tenantId)

  return allTools.filter(tool => {
    // Filter based on tenant features
    if (tool.category === 'creators' && !settings.creatorsEnabled) {
      return false
    }
    return true
  })
}
```

---

## Deployment Architecture

### Domain Management

Each tenant can have custom domains programmatically provisioned via Vercel API:

| Domain Type | Format | Provisioning |
|-------------|--------|--------------|
| Platform Subdomain | `{slug}.platform.com` | Automatic on tenant creation |
| Custom Storefront | `www.mybrand.com` | Via onboarding wizard or admin settings |
| Custom Admin | `admin.mybrand.com` | Via onboarding wizard or admin settings |

**Domain Setup Flow:**
1. User enters custom domain in wizard
2. Platform calls Vercel API to add domain to project
3. Platform displays DNS records (A, CNAME, TXT) for user to configure
4. User adds DNS records at their registrar
5. Platform polls for verification
6. Once verified, SSL is auto-provisioned

See [DOMAIN-SHOPIFY-CONFIG-SPEC](./DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete specification.

### Vercel Project Structure

```
orchestrator.platform.com       → apps/orchestrator
admin.rawdog.com               → apps/admin (env: TENANT=rawdog)
admin.clientx.com              → apps/admin (env: TENANT=clientx)
www.justrawdogit.com           → apps/storefront (env: TENANT=rawdog)
www.clientx.com                → apps/storefront (env: TENANT=clientx)
creators.platform.com          → apps/creator-portal
mcp.platform.com               → apps/mcp-server
```

### Environment Variables

```bash
# Shared (all apps)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
INNGEST_EVENT_KEY=...

# Per-deployment
TENANT_ID=rawdog  # or clientx, etc.

# Loaded from database based on TENANT_ID:
# - Shopify credentials
# - Stripe account
# - Custom domain settings
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm turbo typecheck

      - name: Lint
        run: pnpm turbo lint

      - name: Test
        run: pnpm turbo test

      - name: Build
        run: pnpm turbo build

      - name: Deploy Orchestrator
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/orchestrator

      # Deploy each tenant's admin/storefront
      - name: Deploy Tenant Apps
        run: |
          for tenant in rawdog clientx; do
            TENANT_ID=$tenant vercel deploy --prod
          done
```

---

## Monitoring & Observability

### Logging Strategy

```typescript
// packages/logging/src/logger.ts
interface LogContext {
  tenantId: string
  userId?: string
  requestId: string
  action: string
}

export function createLogger(context: LogContext) {
  return {
    info: (message: string, data?: object) => {
      console.log(JSON.stringify({
        level: 'info',
        message,
        ...context,
        ...data,
        timestamp: new Date().toISOString()
      }))
    },
    error: (message: string, error: Error, data?: object) => {
      console.error(JSON.stringify({
        level: 'error',
        message,
        error: error.message,
        stack: error.stack,
        ...context,
        ...data,
        timestamp: new Date().toISOString()
      }))
    }
  }
}
```

### Health Checks

```typescript
// apps/admin/src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkShopify(),
    checkStripe(),
  ])

  const status = checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded'

  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === 'fulfilled',
      redis: checks[1].status === 'fulfilled',
      shopify: checks[2].status === 'fulfilled',
      stripe: checks[3].status === 'fulfilled',
    }
  })
}
```

---

## Agent Architecture

### Why Use Sub-Agents

Sub-agents conserve context, enable parallel work, and provide specialized expertise. **Always prefer spawning agents over doing work in the main context when:**

1. Task requires deep exploration (searching codebase, reading many files)
2. Task is independent and can run in parallel with others
3. Task benefits from specialized expertise (security review, performance audit)
4. Task generates large output that would pollute main context

### Type Check vs Build

**CRITICAL**: Always use `tsc --noEmit` instead of `npm run build` for validation:

```bash
# ✅ FAST - Type check only (preferred)
pnpm tsc --noEmit           # All packages
npx tsc --noEmit             # Current package

# ❌ SLOW - Full build (only when actually deploying)
pnpm build                   # Takes 2-5x longer
```

### Agent Panel Definitions

Use these pre-defined agent prompts when spawning specialized agents:

#### 1. Database Architect Agent
```
subagent_type: "Plan"
prompt: |
  You are a Database Architect specializing in PostgreSQL multi-tenant patterns.

  EXPERTISE:
  - Schema-per-tenant isolation
  - Row-level security policies
  - Index optimization
  - Migration strategies
  - Connection pooling with Neon

  CONSTRAINTS:
  - Never use db.connect() - use sql template tag
  - Transactions don't work with Neon pooling
  - Always consider tenant isolation in queries

  TASK: [describe database task]
```

#### 2. Security Auditor Agent
```
subagent_type: "Explore"
prompt: |
  You are a Security Auditor reviewing for vulnerabilities.

  CHECK FOR:
  - SQL injection (ensure parameterized queries)
  - XSS (proper escaping in React)
  - CSRF (token validation)
  - Auth bypass (middleware gaps)
  - Tenant isolation leaks (cross-tenant data access)
  - Secrets in code (API keys, tokens)
  - Command injection in Bash calls

  OUTPUT: List of vulnerabilities with file:line references and fixes.

  SCOPE: [describe files/features to audit]
```

#### 3. Performance Analyst Agent
```
subagent_type: "Explore"
prompt: |
  You are a Performance Analyst optimizing for speed.

  ANALYZE:
  - Database query efficiency (N+1 problems, missing indexes)
  - Bundle size (unnecessary imports)
  - Server component vs client component choices
  - Caching opportunities (Redis, ISR, edge)
  - API response times
  - Memory usage patterns

  OUTPUT: Performance issues with severity and optimization recommendations.

  SCOPE: [describe area to analyze]
```

#### 4. Frontend Designer Agent
```
subagent_type: "general-purpose"
prompt: |
  You are a Frontend Designer creating production-grade UI.

  INVOKE: /frontend-design skill before any component work

  PRINCIPLES:
  - Mobile-first responsive design
  - Distinctive aesthetics (not generic AI patterns)
  - Accessibility (ARIA, keyboard nav)
  - Performance (lazy loading, code splitting)
  - Consistent with design system

  USE: shadcn/ui components, Tailwind CSS, Framer Motion

  TASK: [describe UI to build]
```

#### 5. API Designer Agent
```
subagent_type: "Plan"
prompt: |
  You are an API Designer creating RESTful endpoints.

  PATTERNS:
  - Always include tenant context in middleware
  - Use Zod for request validation
  - Return consistent error shapes
  - Include pagination for lists
  - Document with OpenAPI comments

  REQUIRED EXPORTS:
  export const dynamic = 'force-dynamic'
  export const revalidate = 0

  TASK: [describe API endpoints to design]
```

#### 6. MCP Tool Builder Agent
```
subagent_type: "general-purpose"
prompt: |
  You are an MCP Tool Builder following the mcp-builder skill.

  INVOKE: /mcp-builder skill first, read all reference docs

  FOLLOW:
  - Streamable HTTP transport (not SSE)
  - Tool naming: {service}_{action}_{resource}
  - Include annotations: readOnlyHint, destructiveHint
  - Support JSON and Markdown output formats
  - Add pagination for list operations

  TASK: [describe MCP tools to build]
```

#### 7. Test Engineer Agent
```
subagent_type: "general-purpose"
prompt: |
  You are a Test Engineer writing comprehensive tests.

  INVOKE: /webapp-testing for E2E, use TDD skill for unit tests

  COVERAGE:
  - Unit tests: Business logic in lib/
  - Integration tests: API routes with database
  - E2E tests: Critical user flows with Playwright

  PATTERNS:
  - Use vitest for unit/integration
  - Mock external services (Shopify, Stripe)
  - Test tenant isolation explicitly
  - Use test tenant schema

  TASK: [describe what to test]
```

#### 8. Documentation Writer Agent
```
subagent_type: "general-purpose"
prompt: |
  You are a Documentation Writer creating clear technical docs.

  WRITE:
  - JSDoc for public functions
  - README for each major feature
  - Architecture decision records
  - API documentation
  - Migration guides

  AVOID:
  - Obvious code comments
  - Outdated information
  - Implementation details in user docs

  TASK: [describe documentation needed]
```

#### 9. Code Reviewer Agent
```
subagent_type: "Explore"
prompt: |
  You are a Code Reviewer ensuring quality standards.

  CHECK:
  - File size < 700 lines (soft limit 400-600)
  - Proper imports (type imports separate)
  - No hardcoded secrets
  - Error handling
  - TypeScript strict compliance
  - Tenant context in all queries

  OUTPUT: Review comments with file:line references

  SCOPE: [describe code to review]
```

#### 10. Migration Specialist Agent
```
subagent_type: "Plan"
prompt: |
  You are a Migration Specialist planning data migrations.

  APPROACH:
  - Zero-downtime migrations
  - Batch processing for large tables
  - Validation queries before/after
  - Rollback procedures
  - Parallel running during transition

  DELIVERABLES:
  - Migration scripts
  - Validation queries
  - Rollback plan
  - Monitoring checklist

  TASK: [describe migration]
```

### Agent Usage Examples

#### Parallel Exploration
```typescript
// Spawn multiple agents in parallel (single message, multiple Task calls)
Task(subagent_type="Explore", prompt="Find all database queries that don't use tenant context")
Task(subagent_type="Explore", prompt="Find all API routes missing auth middleware")
Task(subagent_type="Explore", prompt="Find all components over 500 lines")
```

#### Expert Panel for Architecture Decision
```typescript
// Spawn expert panel for architecture review
Task(subagent_type="Plan", prompt="[Database Architect] Review schema design for: ...")
Task(subagent_type="Plan", prompt="[Security Auditor] Review auth flow for: ...")
Task(subagent_type="Explore", prompt="[Performance Analyst] Analyze query patterns in: ...")
```

#### Sequential Build Flow
```typescript
// API Designer first, then Frontend, then Tests
Task(subagent_type="Plan", prompt="[API Designer] Design endpoints for user management")
// Wait for result, then:
Task(subagent_type="general-purpose", prompt="[Frontend Designer] Build UI for user management using these endpoints: ...")
// Wait for result, then:
Task(subagent_type="general-purpose", prompt="[Test Engineer] Write E2E tests for user management flow")
```

---

## Shopify App Architecture

### ALWAYS Use Shopify Dev MCP

For ANY Shopify development, use the Shopify Dev MCP:

```typescript
// Step 1: Learn the API context
mcp__shopify-dev-mcp__learn_shopify_api(api: "admin") // or "storefront-graphql"

// Step 2: Introspect schema for specific resources
mcp__shopify-dev-mcp__introspect_graphql_schema(query: "orders")
mcp__shopify-dev-mcp__introspect_graphql_schema(query: "products")

// Step 3: Validate GraphQL before implementation
mcp__shopify-dev-mcp__validate_graphql_codeblocks(codeblocks: [...])
```

### App Structure (From RAWDOG)

```
shopify-app/
├── shopify.app.toml              # App config (42 OAuth scopes)
├── package.json                  # Workspace with extensions
├── extensions/
│   ├── [function]-rust/          # Rust-based Functions (WASM)
│   │   ├── Cargo.toml
│   │   ├── src/run.rs            # Function logic
│   │   ├── src/run.graphql       # Input query
│   │   └── shopify.extension.toml
│   └── [pixel]-extension/        # TypeScript Web Pixels
│       ├── src/index.ts
│       └── shopify.extension.toml
└── .shopify/                     # Build artifacts
    └── deploy-bundle/            # Production WASM bundles
```

### Rust Function Pattern

**Cargo.toml**:
```toml
[package]
name = "function-name-rust"
edition = "2021"

[dependencies]
shopify_function = "0.8"
serde = "1.0"
serde_json = "1.0"

[profile.release]
opt-level = "z"     # Optimize for size (WASM constraint)
lto = true          # Link-time optimization
strip = true        # Strip debug symbols
```

**Build Command**: `cargo build --target=wasm32-wasip1 --release`

**Extension Config**:
```toml
api_version = "2025-10"
type = "function"
target = "purchase.delivery-customization.run"  # or other target
input_query = "src/run.graphql"
export = "run"

[build]
command = "cargo build --target=wasm32-wasip1 --release"
path = "target/wasm32-wasip1/release/function-name.wasm"
```

### OAuth Implementation

```typescript
// 1. Generate OAuth URL with HMAC state
const url = generateOAuthUrl(shop, redirectUri)
// Uses SHA256 HMAC for state, stored in Redis with 5-min TTL

// 2. On callback, verify HMAC signature
const valid = verifyHmac(query)  // SHA256 with SHOPIFY_API_SECRET

// 3. Exchange code for token
const { accessToken, scope } = await exchangeCodeForToken(shop, code)

// 4. Encrypt and store
const encrypted = await encryptToken(accessToken)  // AES-256-GCM
await storeInPostgres(shopify_connections, encrypted)
await storeInRedis(fallbackCache)  // Backup

// 5. Activate web pixel if needed
await activateWebPixel(shop, accessToken, settings)
```

### Token Storage Schema

```sql
CREATE TABLE shopify_connections (
  id TEXT PRIMARY KEY,
  shop TEXT UNIQUE NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  webhook_secret_encrypted TEXT,
  scopes TEXT[] NOT NULL,
  api_version TEXT DEFAULT '2025-01',
  pixel_id TEXT,
  pixel_active BOOLEAN,
  storefront_api_token_encrypted TEXT,
  installed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Web Pixel Pattern (TypeScript)

For checkout/analytics tracking:

```typescript
// extensions/pixel-name/src/index.ts
import {register} from '@shopify/web-pixels-extension'

register(({analytics, browser, settings}) => {
  analytics.subscribe('checkout_completed', async (event) => {
    // Read cart attributes for session stitching
    const ga4ClientId = getCartAttribute('_ga4_client_id')
    const metaFbp = getCartAttribute('_meta_fbp')

    // Send to GA4 Measurement Protocol
    await sendGA4Event(event, ga4ClientId)

    // Send to Meta CAPI
    await sendMetaCAPI(event, metaFbp)
  })
})
```

---

## Security Considerations

### Tenant Isolation

1. **Database Level**: Schema separation + RLS policies
2. **Application Level**: Middleware validates tenant access
3. **API Level**: All requests require tenant context
4. **Logging Level**: Tenant ID in all log entries

### Data Encryption

- Shopify access tokens: AES-256-GCM encrypted
- Payment credentials: Stripe/Wise vault
- PII: Hashed where possible (emails for attribution)
- Backups: Encrypted at rest

### Access Control

```typescript
// Role-based permissions
const permissions = {
  superadmin: ['*'],
  admin: ['read:*', 'write:*', 'delete:content'],
  member: ['read:*', 'write:content'],
} as const

function canAccess(role: string, action: string): boolean {
  const allowed = permissions[role] || []
  return allowed.some(p =>
    p === '*' ||
    p === action ||
    (p.endsWith(':*') && action.startsWith(p.slice(0, -1)))
  )
}
```

---

## Super Admin Dashboard (Orchestrator)

The platform owner has access to a dedicated **Super Admin Dashboard** (Orchestrator) that provides platform-wide visibility and control. This is separate from brand-level admin portals.

### Key Capabilities

| Capability | Description | Spec Document |
|------------|-------------|---------------|
| Brand Management | Create, edit, transfer, archive brands | [BRAND-ONBOARDING-SPEC](./BRAND-ONBOARDING-SPEC-2025-02-10.md) |
| Cross-Tenant Operations | View errors, logs, health across all tenants | [SUPER-ADMIN-ARCHITECTURE](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md) |
| Health Monitoring | Service health matrix, alerts, thresholds | [HEALTH-MONITORING-SPEC](./HEALTH-MONITORING-SPEC-2025-02-10.md) |
| Logging | Platform-wide structured logging with real-time stream | [LOGGING-SPEC](./LOGGING-SPEC-2025-02-10.md) |
| Feature Flags | Global and per-tenant feature toggles | [FEATURE-FLAGS-SPEC](./FEATURE-FLAGS-SPEC-2025-02-10.md) |
| User Management | All users, impersonation, access logs | [SUPER-ADMIN-ARCHITECTURE](./SUPER-ADMIN-ARCHITECTURE-2025-02-10.md) |

### Orchestrator URL Structure

```
orchestrator.platform.com/              # Overview dashboard
orchestrator.platform.com/brands        # Brand management
orchestrator.platform.com/brands/new    # Onboarding wizard
orchestrator.platform.com/ops           # Operations center
orchestrator.platform.com/ops/errors    # Cross-tenant errors
orchestrator.platform.com/ops/health    # Health matrix
orchestrator.platform.com/flags         # Feature flags
orchestrator.platform.com/users         # User management
orchestrator.platform.com/settings      # Platform settings
```

### Database Extensions

```sql
-- Super admin specific tables (added to public schema)
CREATE TABLE public.super_admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID
);

CREATE TABLE public.super_admin_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  tenant_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.platform_alerts (
  id UUID PRIMARY KEY,
  severity VARCHAR(10) NOT NULL,
  service VARCHAR(50) NOT NULL,
  tenant_id UUID,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  flag_type VARCHAR(20) NOT NULL,
  default_value JSONB NOT NULL,
  percentage INTEGER,
  enabled_tenants UUID[],
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.platform_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  level VARCHAR(10) NOT NULL,
  tenant_id UUID,
  service VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  data JSONB
) PARTITION BY RANGE (timestamp);

-- Slack Integration (Platform-wide ops)
CREATE TABLE public.platform_slack_workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,
  channel_critical VARCHAR(50),
  channel_errors VARCHAR(50),
  channel_warnings VARCHAR(50),
  channel_info VARCHAR(50),
  channel_deployments VARCHAR(50),
  mention_critical VARCHAR(50),
  mention_errors VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.platform_slack_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL,
  service VARCHAR(50) NOT NULL,
  tenant_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  channel_id VARCHAR(50),
  message_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tenant Slack Schema

Each tenant schema includes Slack integration tables:

```sql
-- Per-tenant Slack workspace connection
CREATE TABLE slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,
  connected_by_user_id UUID,
  connected_by_slack_user_id VARCHAR(50),
  bot_scopes TEXT[] NOT NULL,
  user_scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification type → channel mapping
CREATE TABLE slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(100) NOT NULL UNIQUE,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Slack reports (daily, weekly, monthly)
CREATE TABLE slack_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),
  frequency VARCHAR(20) NOT NULL,
  send_hour INTEGER NOT NULL CHECK (send_hour >= 0 AND send_hour <= 23),
  timezone VARCHAR(50) NOT NULL,
  metrics JSONB NOT NULL,
  date_range_type VARCHAR(20),
  date_range_days INTEGER,
  custom_header TEXT,
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom message templates (Block Kit)
CREATE TABLE slack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(100) NOT NULL UNIQUE,
  blocks JSONB NOT NULL,
  fallback_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification send log
CREATE TABLE slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  message_ts VARCHAR(50),
  thread_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform user ↔ Slack user associations
CREATE TABLE slack_user_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID NOT NULL,
  slack_user_id VARCHAR(50) NOT NULL,
  slack_email VARCHAR(255),
  association_method VARCHAR(20) NOT NULL,
  last_verified_at TIMESTAMPTZ,
  lookup_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_user_id)
);

-- Indexes
CREATE INDEX idx_slack_notifications_created ON slack_notifications(created_at DESC);
CREATE INDEX idx_slack_reports_schedule ON slack_reports(is_enabled, send_hour);
```

See individual specification documents for complete schemas and implementation details.
