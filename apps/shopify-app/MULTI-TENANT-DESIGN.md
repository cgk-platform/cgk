# Multi-Tenant Shopify App Design

> **Status**: Design Document (not yet implemented)
> **Created**: 2026-02-24
> **Goal**: Evolve from "one custom Shopify app per tenant" to "one reusable Shopify app that all tenants install"

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Shop-to-Tenant Mapping](#3-shop-to-tenant-mapping)
4. [Install Flow](#4-install-flow)
5. [Session Management](#5-session-management)
6. [Webhook Routing](#6-webhook-routing)
7. [Shopify Functions & Per-Tenant Isolation](#7-shopify-functions--per-tenant-isolation)
8. [Admin UI: Embedded App Experience](#8-admin-ui-embedded-app-experience)
9. [Extension Configuration Per Tenant](#9-extension-configuration-per-tenant)
10. [Migration Plan](#10-migration-plan)
11. [Open Questions](#11-open-questions)

---

## 1. Current State Analysis

### What Exists Today

The Shopify app at `apps/shopify-app/` is a Remix-based embedded app with:

**App Configuration** (`shopify.app.toml`):
- `client_id = "6bdb14a850b3220eaa2c8decb420bb8c"` (hardcoded to one app)
- `distribution = AppDistribution.AppStore` (already set for multi-store)
- `dev_store_url = "cgk-unlimited.myshopify.com"` (single dev store)
- Prisma/SQLite session storage (local only, not production-ready for multi-tenant)

**Session Storage** (`app/db.server.ts`, `prisma/schema.prisma`):
- Uses `PrismaSessionStorage` with a SQLite `Session` model
- Stores per-shop OAuth sessions: `shop`, `accessToken`, `scope`, `userId`, etc.
- This is the Shopify session (per-shop OAuth token), NOT the CGK platform session

**Tenant Identification** (current approach):
- `CGK_TENANT_SLUG` env var hardcoded per deployment (one app instance = one tenant)
- Webhooks (`webhooks.orders.create.tsx`) reference `process.env.CGK_TENANT_SLUG`
- Bundle config sync (`app.bundles.$id.tsx`) also uses `CGK_TENANT_SLUG`
- Both files contain TODO comments: "For multi-tenant support, replace with dynamic tenant detection from admin.session.shop -> organizations.shopify_store_domain lookup"

**Platform-Side Shop Mapping** (already exists in `packages/shopify/`):
- `getTenantForShop(shop)` in `packages/shopify/src/webhooks/utils.ts` queries:
  1. `shopify_connections` table (authoritative, written by OAuth callback)
  2. `organizations.shopify_store_domain` (fallback for legacy setups)
- `handleOAuthCallback()` in `packages/shopify/src/oauth/callback.ts` stores encrypted tokens in `shopify_connections` table with `tenant_id`
- `shopify_connections` migration (`021_shopify_app_core.sql`) already has `UNIQUE(tenant_id, shop)` constraint

**Extensions** (5 total):
- `bundle-builder` — Theme block (reads `$app:bundle-discount` metafield)
- `bundle-order-discount` — Shopify Function (Rust/WASM, reads config from metafield)
- `bundle-cart-transform` — Shopify Function (Rust/WASM, merges bundle lines)
- `delivery-customization` — Shopify Function (Rust/WASM, A/B test shipping)
- `session-stitching-pixel` — Web pixel (GA4/Meta CAPI events)

### Key Problems With Current Approach

1. **One app per tenant**: Each tenant needs their own Shopify Partners app, client_id, and deployment. This does not scale.
2. **Hardcoded `CGK_TENANT_SLUG`**: Tenant identification is baked into environment variables, not derived from the shop making the request.
3. **SQLite session storage**: Only works for single-instance deployment. Multiple tenants on one app instance need a shared database.
4. **No install-time linking**: There is no flow to connect "shop X just installed the app" to "shop X belongs to tenant Y."
5. **Extension settings are per-shop already**: Shopify natively isolates extension settings (pixel IDs, API keys) per installing shop. This is actually fine for multi-tenant.

### What Already Works

1. **`getTenantForShop()`**: The platform webhook handler already resolves shop domain to tenant ID via `shopify_connections`. This same pattern works for the embedded app.
2. **`shopify_connections` table**: Already stores per-tenant, per-shop OAuth tokens with encryption.
3. **Shopify Function metafields**: Bundle discount config is stored as a metafield on the discount node, which is per-shop by nature. No cross-tenant contamination possible.
4. **`AppDistribution.AppStore`**: The app is already configured for public distribution, not single-merchant custom mode.
5. **Extension settings**: Shopify isolates extension settings per shop installation.

---

## 2. Target Architecture

### Single App, Multiple Stores

```
                   ┌──────────────────────────────────┐
                   │     CGK Platform Shopify App      │
                   │     (One app in Partners)         │
                   │     client_id: 6bdb14a850b...     │
                   └──────────────┬───────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                    │
     ┌────────▼───────┐  ┌───────▼────────┐  ┌───────▼────────┐
     │ cgk-unlimited   │  │ rawdog-store   │  │ vitahustle-co  │
     │ .myshopify.com  │  │ .myshopify.com │  │ .myshopify.com │
     └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
              │                   │                    │
     ┌────────▼───────┐  ┌───────▼────────┐  ┌───────▼────────┐
     │ tenant: cgk     │  │ tenant: rawdog │  │ tenant: vita   │
     │ schema:         │  │ schema:        │  │ schema:        │
     │ tenant_cgk      │  │ tenant_rawdog  │  │ tenant_vita    │
     └────────────────┘  └────────────────┘  └────────────────┘
```

### Core Principle

**Every request from Shopify includes the shop domain.** The `@shopify/shopify-app-remix` library provides `authenticate.admin(request)` which returns the authenticated `session.shop`. This is the key to tenant resolution -- no env var needed.

### Data Flow

```
Shop installs app
  → Shopify OAuth flow
  → @shopify/shopify-app-remix handles token exchange
  → App stores session in shared Prisma DB (PostgreSQL)
  → App looks up shop in shopify_app_installations (public schema)
  → If mapping exists → tenant identified
  → If no mapping → onboarding/linking flow
```

---

## 3. Shop-to-Tenant Mapping

### New Table: `shopify_app_installations` (public schema)

This table is the authoritative mapping between a Shopify shop domain and a CGK tenant. It lives in the **public schema** because it needs to be queryable before we know which tenant schema to use.

```sql
-- Migration: public/0XX_shopify_app_installations.sql
-- Purpose: Maps Shopify shops to CGK tenants for the multi-tenant embedded app

CREATE TABLE IF NOT EXISTS public.shopify_app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The Shopify shop domain (e.g., "cgk-unlimited.myshopify.com")
  -- This is globally unique across all Shopify stores
  shop TEXT NOT NULL UNIQUE,

  -- The CGK tenant this shop belongs to
  -- References organizations.id
  organization_id UUID NOT NULL REFERENCES public.organizations(id),

  -- Installation status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'uninstalled', 'suspended')),

  -- OAuth scopes currently granted
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- The Shopify app's API version used during install
  api_version TEXT NOT NULL DEFAULT '2026-04',

  -- Cached store metadata (updated periodically)
  store_name TEXT,
  store_email TEXT,
  store_plan TEXT,           -- Shopify plan (basic, shopify, advanced, plus)
  store_currency TEXT DEFAULT 'USD',
  store_timezone TEXT,

  -- Tracking
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopify_installations_org
  ON public.shopify_app_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_shopify_installations_status
  ON public.shopify_app_installations(status);
CREATE INDEX IF NOT EXISTS idx_shopify_installations_shop_status
  ON public.shopify_app_installations(shop, status);

-- Updated_at trigger
CREATE TRIGGER trigger_shopify_installations_updated_at
  BEFORE UPDATE ON public.shopify_app_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.shopify_app_installations IS
  'Maps Shopify shops to CGK tenants. Authoritative source for shop→tenant resolution in the embedded app.';
COMMENT ON COLUMN public.shopify_app_installations.shop IS
  'Shopify myshopify.com domain. Globally unique across all Shopify stores.';
```

### Why a Separate Table From `shopify_connections`?

The existing `shopify_connections` table (migration `021_shopify_app_core.sql`) serves a different purpose:

| Aspect | `shopify_connections` | `shopify_app_installations` |
|--------|----------------------|---------------------------|
| **Schema** | Tenant schema | Public schema |
| **Purpose** | Stores encrypted OAuth tokens for platform API calls (order sync, product sync) | Maps shops to tenants for the embedded app |
| **Written by** | Platform onboarding OAuth flow (`packages/shopify/src/oauth/callback.ts`) | Shopify app install flow (`apps/shopify-app/`) |
| **Contains tokens** | Yes (encrypted access_token, webhook_secret, storefront token) | No (Prisma session storage handles tokens) |
| **Queryable before tenant known** | No (lives in tenant schema, requires `withTenant()`) | Yes (lives in public schema) |
| **Key constraint** | `UNIQUE(tenant_id, shop)` | `UNIQUE(shop)` |

The `shopify_app_installations` table is the **first lookup** -- before we know which tenant schema to set. Once we have the `organization_id`, we can derive the tenant slug and call `withTenant()`.

### Relationship to `organizations` Table

The existing `organizations` table already has `shopify_store_domain` column. That column stores the **primary** shop domain configured during onboarding. The new `shopify_app_installations` table supports:

1. Multiple shops per tenant (e.g., a brand with a US store and an EU store)
2. App installation lifecycle tracking (install/uninstall events)
3. Decoupled from manual onboarding (app install can happen independently)

### Lookup Function

```typescript
// apps/shopify-app/app/lib/tenant-resolver.server.ts

import { sql } from '@cgk-platform/db'

export interface TenantMapping {
  organizationId: string
  tenantSlug: string
  status: string
}

/**
 * Resolve a Shopify shop domain to a CGK tenant.
 *
 * Query order:
 * 1. shopify_app_installations (authoritative for embedded app)
 * 2. organizations.shopify_store_domain (fallback for legacy setups)
 *
 * Returns null if the shop is not linked to any tenant.
 */
export async function resolveTenantForShop(shop: string): Promise<TenantMapping | null> {
  // Primary: check app installations table
  const installResult = await sql`
    SELECT
      i.organization_id,
      o.slug as tenant_slug,
      i.status
    FROM public.shopify_app_installations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.shop = ${shop}
    AND i.status = 'active'
    LIMIT 1
  `

  if (installResult.rows.length > 0) {
    const row = installResult.rows[0] as Record<string, unknown>
    return {
      organizationId: row.organization_id as string,
      tenantSlug: row.tenant_slug as string,
      status: row.status as string,
    }
  }

  // Fallback: check organizations table directly
  const orgResult = await sql`
    SELECT id as organization_id, slug as tenant_slug, status
    FROM public.organizations
    WHERE shopify_store_domain = ${shop}
    AND status = 'active'
    LIMIT 1
  `

  if (orgResult.rows.length > 0) {
    const row = orgResult.rows[0] as Record<string, unknown>
    return {
      organizationId: row.organization_id as string,
      tenantSlug: row.tenant_slug as string,
      status: row.status as string,
    }
  }

  return null
}
```

---

## 4. Install Flow

### Sequence: Shop Installs the App

```
1. Merchant clicks "Install" in Shopify App Store
   or follows an install link (https://{app-url}/api/auth?shop=X)

2. @shopify/shopify-app-remix handles OAuth:
   a. Redirects to Shopify for consent
   b. Shopify redirects back with auth code
   c. Library exchanges code for access token
   d. PrismaSessionStorage stores session (shop, accessToken, scopes)

3. App's post-install hook runs:
   a. Extract shop domain from session
   b. Query shopify_app_installations for this shop
   c. If found → tenant already linked, redirect to app home
   d. If not found → enter linking flow

4. Linking flow (one of three paths):

   Path A — Auto-link via organizations.shopify_store_domain:
     Query: SELECT id, slug FROM organizations
            WHERE shopify_store_domain = {shop}
     If found → create shopify_app_installations row → done

   Path B — Link via invite code:
     During brand onboarding, platform generates an invite code
     Merchant enters code during app install
     Code resolves to organization_id → create mapping → done

   Path C — Link via authenticated platform user:
     Merchant is already logged into CGK admin
     App redirects to platform with shop domain
     Platform UI shows "Link this shop to your brand"
     User confirms → API creates mapping → redirect back to app

5. Post-linking:
   a. Sync shop metadata (name, email, plan, currency, timezone)
   b. Register webhooks for this shop
   c. Show app home with tenant-specific data
```

### Post-Install Hook Implementation

```typescript
// apps/shopify-app/app/lib/post-install.server.ts

import { sql } from '@cgk-platform/db'
import type { Session } from '@shopify/shopify-api'

export async function handlePostInstall(session: Session): Promise<{
  linked: boolean
  organizationId?: string
  tenantSlug?: string
  requiresLinking: boolean
}> {
  const shop = session.shop

  // Check if already linked
  const existing = await sql`
    SELECT i.organization_id, o.slug
    FROM public.shopify_app_installations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.shop = ${shop}
    AND i.status = 'active'
  `

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as Record<string, unknown>
    // Update last_active_at
    await sql`
      UPDATE public.shopify_app_installations
      SET last_active_at = NOW(), updated_at = NOW()
      WHERE shop = ${shop}
    `
    return {
      linked: true,
      organizationId: row.organization_id as string,
      tenantSlug: row.slug as string,
      requiresLinking: false,
    }
  }

  // Try auto-link via organizations table
  const orgResult = await sql`
    SELECT id, slug FROM public.organizations
    WHERE shopify_store_domain = ${shop}
    AND status = 'active'
  `

  if (orgResult.rows.length > 0) {
    const org = orgResult.rows[0] as Record<string, unknown>
    const orgId = org.id as string
    const slug = org.slug as string

    // Create the installation record
    await sql`
      INSERT INTO public.shopify_app_installations (
        shop, organization_id, scopes, status, installed_at
      ) VALUES (
        ${shop}, ${orgId},
        ${`{${session.scope?.split(',').join(',') || ''}}`}::TEXT[],
        'active', NOW()
      )
      ON CONFLICT (shop) DO UPDATE SET
        organization_id = ${orgId},
        status = 'active',
        scopes = EXCLUDED.scopes,
        uninstalled_at = NULL,
        updated_at = NOW()
    `

    return {
      linked: true,
      organizationId: orgId,
      tenantSlug: slug,
      requiresLinking: false,
    }
  }

  // No auto-link possible — shop needs manual linking
  return { linked: false, requiresLinking: true }
}
```

---

## 5. Session Management

### Current: Prisma + SQLite (Single Instance)

The existing `PrismaSessionStorage` stores Shopify sessions in a local SQLite file. This only works for one app instance serving one tenant.

### Target: Prisma + PostgreSQL (Shared Across All Tenants)

**The Shopify session storage stays in a separate database from the CGK platform database.** This keeps it simple -- Prisma manages Shopify's session lifecycle (offline/online tokens, expiry, refresh) independently.

```prisma
// prisma/schema.prisma (updated)

datasource db {
  // In production: PostgreSQL (same Neon cluster, separate database or schema)
  // In dev: SQLite is fine for local testing
  provider = "postgresql"
  url      = env("SHOPIFY_SESSION_DATABASE_URL")
}

model Session {
  id                  String    @id
  shop                String
  state               String
  isOnline            Boolean   @default(false)
  scope               String?
  expires             DateTime?
  accessToken         String    // Encrypted by @shopify/shopify-app-remix
  userId              BigInt?
  firstName           String?
  lastName            String?
  email               String?
  accountOwner        Boolean   @default(false)
  locale              String?
  collaborator        Boolean?  @default(false)
  emailVerified       Boolean?  @default(false)
  refreshToken        String?
  refreshTokenExpires DateTime?

  @@index([shop])
}
```

### How @shopify/shopify-app-remix Handles Per-Shop Sessions

The Shopify Remix library already handles multi-shop sessions natively:

1. **Offline tokens** (one per shop): Long-lived access tokens stored with `isOnline: false`. Used for background operations (webhooks, cron syncs). Keyed by `offline_{shop}`.

2. **Online tokens** (one per shop per user): Short-lived tokens for the currently logged-in Shopify admin user. Keyed by `online_{shop}_{userId}`. Refreshed automatically via `expiringOfflineAccessTokens: true`.

3. **`authenticate.admin(request)`**: Extracts the shop from the request (via session token or cookie), loads the matching session from `PrismaSessionStorage`, and returns `{ admin, session }`. The `session.shop` field tells us which shop is making the request.

4. **Session lookup is by shop domain**: When a merchant opens the embedded app, Shopify passes the shop domain in the request. The library looks up the session by shop, validates the token, and provides an authenticated admin client scoped to that shop.

**This is already multi-tenant from Shopify's perspective.** Each shop that installs the app gets its own session with its own access token. The library manages this automatically.

### What Changes

| Component | Current | Target |
|-----------|---------|--------|
| Session DB | SQLite (local) | PostgreSQL (shared) |
| Tenant resolution | `process.env.CGK_TENANT_SLUG` | `resolveTenantForShop(session.shop)` |
| Platform API calls | Hardcoded tenant slug header | Dynamic tenant slug from shop lookup |
| Webhook tenant routing | Env var | Shop domain lookup |

---

## 6. Webhook Routing

### Current: Hardcoded Tenant in Webhooks

In `app/routes/webhooks.orders.create.tsx`:
```typescript
const tenantSlug = process.env.CGK_TENANT_SLUG  // Static per deployment
```

### Target: Dynamic Tenant From Shop Domain

```typescript
// app/routes/webhooks.orders.create.tsx (updated concept)

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request)

  // Dynamic tenant resolution — no env var needed
  const tenant = await resolveTenantForShop(shop)

  if (!tenant) {
    console.warn(`[Webhook] ${topic} for unlinked shop: ${shop}`)
    return new Response()  // 200 to prevent retries
  }

  // Use tenant.tenantSlug for platform API calls
  const response = await fetch(`${platformApiUrl}/api/admin/bundles/${bundleId}/orders`, {
    headers: {
      'x-tenant-slug': tenant.tenantSlug,
      Authorization: `Bearer ${platformApiKey}`,
    },
    body: JSON.stringify(orderData),
  })

  return new Response()
}
```

### Uninstall Webhook

The existing `webhooks.app.uninstalled.tsx` deletes Prisma sessions. It should also update the installation record:

```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request)

  // Clean up Shopify sessions
  if (session) {
    await db.session.deleteMany({ where: { shop } })
  }

  // Mark installation as uninstalled
  await sql`
    UPDATE public.shopify_app_installations
    SET status = 'uninstalled', uninstalled_at = NOW(), updated_at = NOW()
    WHERE shop = ${shop}
  `

  return new Response()
}
```

### Platform-Side Webhook Handler (Already Multi-Tenant)

The platform-side webhook handler in `packages/shopify/src/webhooks/handler.ts` is already multi-tenant. It calls `getTenantForShop(shop)` which queries `shopify_connections` and `organizations`. This handler is for webhooks sent to the platform's admin API, not the Shopify app's Remix routes.

The two webhook paths serve different purposes:

1. **Shopify App webhooks** (`apps/shopify-app/app/routes/webhooks.*`): Handled by the Remix app. Currently used for bundle order tracking and session cleanup. These need the `resolveTenantForShop()` update.

2. **Platform webhooks** (`packages/shopify/src/webhooks/handler.ts`): Handled by the Next.js admin app. Used for order sync, product sync, customer sync. Already multi-tenant via `getTenantForShop()`.

---

## 7. Shopify Functions & Per-Tenant Isolation

### How Shopify Functions Work (Key Insight)

Shopify Functions (the Rust/WASM extensions) run in Shopify's infrastructure, not in the app's server. They are deployed once but execute per-shop. Here is why multi-tenancy is inherently safe:

1. **Functions are scoped to the installing shop**: When shop A installs the app, the function runs against shop A's cart data only. Shop B's data is never visible.

2. **Metafield isolation**: The bundle discount config is stored as a metafield (`$app:bundle-discount.config`) on the automatic discount node. Each shop has its own discount nodes with their own metafields. There is no cross-shop leakage.

3. **Cart attribute isolation**: The `_bundle_id`, `_bundle_tier`, `_bundle_free_gift` attributes are set by the storefront theme block and travel with the cart. Each shop's cart is isolated.

### Bundle Discount Function (No Changes Needed)

The Rust function at `extensions/bundle-order-discount/src/cart_lines_discounts_generate_run.rs`:

- Reads config from `input.discount().metafield()` -- this is the discount's own metafield, scoped to the shop
- Groups cart lines by `_bundle_id` attribute -- per-cart, per-shop
- Applies tier-based discounts -- purely computed from the input data

**No tenant awareness needed in the function itself.** Shopify guarantees isolation at the function execution level.

### Bundle Cart Transform (No Changes Needed)

Same isolation: reads cart lines, merges bundle items. Per-shop execution.

### Delivery Customization (No Changes Needed)

Reads cart attributes for A/B test variant assignment. Per-shop execution.

### Theme Extension: Bundle Builder Block

The `bundle-builder` theme extension reads from the `$app:bundle-discount.config` metafield via `{% render 'bundle-product-card' %}`. This metafield is app-scoped and shop-specific. Each shop installing the app gets its own set of metafields.

### Session Stitching Pixel

This web pixel has per-shop settings (GA4 Measurement ID, Meta Pixel ID, etc.) configured in the Shopify admin. Each shop configures its own analytics credentials. No cross-tenant concern.

### Summary: Extensions Are Already Multi-Tenant

| Extension | Isolation Mechanism | Changes Needed |
|-----------|-------------------|----------------|
| bundle-order-discount | Metafield per shop, cart per shop | None |
| bundle-cart-transform | Cart lines per shop | None |
| bundle-builder | Metafield per shop, theme per shop | None |
| delivery-customization | Cart attributes per shop | None |
| session-stitching-pixel | Extension settings per shop | None |

---

## 8. Admin UI: Embedded App Experience

### Current Flow

1. Merchant opens embedded app in Shopify Admin
2. `authenticate.admin(request)` validates the session
3. App shows bundle configuration UI (hardcoded to one tenant)

### Target Flow

1. Merchant opens embedded app in Shopify Admin
2. `authenticate.admin(request)` validates the session, returns `session.shop`
3. App calls `resolveTenantForShop(session.shop)` to get tenant context
4. **If linked**: App shows tenant-specific data (bundles, settings)
5. **If not linked**: App shows onboarding/linking UI

### Tenant Context in Loaders

Every loader that needs tenant context follows this pattern:

```typescript
// app/lib/with-tenant-context.server.ts

import { authenticate } from '../shopify.server'
import { resolveTenantForShop } from './tenant-resolver.server'
import type { LoaderFunctionArgs } from '@remix-run/node'

export async function withTenantContext(request: Request) {
  const { admin, session } = await authenticate.admin(request)

  const tenant = await resolveTenantForShop(session.shop)

  if (!tenant) {
    // Redirect to linking flow
    throw new Response(null, {
      status: 302,
      headers: { Location: '/app/setup' },
    })
  }

  return { admin, session, tenant }
}
```

```typescript
// app/routes/app._index.tsx (updated concept)

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, tenant } = await withTenantContext(request)

  // Use tenant.tenantSlug for any platform API calls
  // Use admin.graphql() for Shopify API calls (already shop-scoped)
  const nodes = await listBundleDiscounts(admin)

  return json({ discounts: nodes, tenantSlug: tenant.tenantSlug })
}
```

---

## 9. Extension Configuration Per Tenant

### Metafield-Based Config (Bundle Discount)

Bundle discount configuration is stored as a JSON metafield on the automatic discount node:

```
Namespace: $app:bundle-discount
Key: config
Value: { "bundles": [{ "bundleId": "...", "discountType": "percentage", "tiers": [...] }] }
```

This is **per-shop by nature** -- each shop creates its own discount nodes via the embedded app. The function reads from its own discount's metafield. No tenant-level isolation needed beyond what Shopify provides.

### Extension Settings (Session Stitching Pixel, Post-Purchase Survey)

Extension settings (GA4 ID, Meta Pixel ID, etc.) are configured per-shop in the Shopify admin under Settings > Apps > CGK Platform. Each tenant configures their own values. Shopify manages the isolation.

### Per-Tenant Configuration Sync

When a tenant configures bundles in the embedded app, the app syncs the configuration to the CGK platform database:

```
Embedded App (Shopify)
  → Merchant saves bundle config
  → Config saved as Shopify metafield (for the function)
  → Config also POSTed to CGK platform API (for reporting/analytics)
  → Platform API receives x-tenant-slug header (from resolveTenantForShop)
  → Platform stores in tenant schema via withTenant()
```

---

## 10. Migration Plan

### Phase 1: Database Changes

1. Create `shopify_app_installations` migration in `packages/db/src/migrations/public/`
2. Add `SHOPIFY_SESSION_DATABASE_URL` env var pointing to PostgreSQL
3. Update Prisma schema to use PostgreSQL provider
4. Run `prisma migrate deploy` against the shared session database

### Phase 2: Tenant Resolution

1. Create `app/lib/tenant-resolver.server.ts` with `resolveTenantForShop()`
2. Create `app/lib/with-tenant-context.server.ts` helper
3. Create `app/lib/post-install.server.ts` for install-time linking

### Phase 3: Update Routes

1. Update `app/routes/app._index.tsx` to use `withTenantContext`
2. Update `app/routes/app.bundles.$id.tsx` to use dynamic tenant slug
3. Update `app/routes/webhooks.orders.create.tsx` to use `resolveTenantForShop`
4. Update `app/routes/webhooks.app.uninstalled.tsx` to mark installation as uninstalled
5. Add `app/routes/app.setup.tsx` for the linking flow (shop not yet linked to tenant)

### Phase 4: Session Storage Migration

1. Switch Prisma from SQLite to PostgreSQL
2. Migrate existing sessions (or let them re-authenticate on next visit)
3. Verify `PrismaSessionStorage` works with PostgreSQL connection pooling

### Phase 5: Remove Hardcoded Tenant

1. Remove `CGK_TENANT_SLUG` from all route files
2. Remove `CGK_PLATFORM_API_KEY` (use per-tenant API keys from platform)
3. Keep `CGK_PLATFORM_API_URL` as a shared env var (same platform for all tenants)

### Phase 6: Testing

1. Install the app on a second dev store
2. Link it to a different tenant
3. Verify:
   - Bundle config is isolated per shop
   - Webhooks route to the correct tenant
   - Embedded UI shows tenant-specific data
   - Uninstall properly marks the installation

---

## 11. Open Questions

### Q1: Should `shopify_app_installations` and `shopify_connections` be merged?

**Current recommendation: No.** They serve different purposes:
- `shopify_connections` stores encrypted tokens for server-to-server API calls (initiated by the platform)
- `shopify_app_installations` tracks the app installation lifecycle and provides pre-tenant-context shop lookup

However, during the install flow, the app should also create/update the `shopify_connections` record so the platform's webhook handler (`packages/shopify/src/webhooks/handler.ts`) can resolve the shop.

### Q2: How should the linking flow work for new tenants?

Three options (implement all, let the flow determine which to use):
- **Auto-link**: If `organizations.shopify_store_domain` matches, link automatically (no user action)
- **Invite code**: Platform generates a code during onboarding, merchant enters it in the app
- **OAuth redirect**: App redirects to platform login, user selects which org to link to

### Q3: What about shops that reinstall?

If a shop uninstalls and reinstalls:
1. The `shopify_app_installations` record has `status: 'uninstalled'`
2. On reinstall, update to `status: 'active'`, clear `uninstalled_at`
3. The `organization_id` mapping is preserved (the shop still belongs to the same tenant)
4. Prisma sessions are recreated by the OAuth flow

### Q4: Can one shop belong to multiple tenants?

**No.** The `UNIQUE(shop)` constraint on `shopify_app_installations` enforces one-to-one. A Shopify shop can only install the app once, and each installation maps to exactly one CGK tenant.

However, one tenant CAN have multiple shops (e.g., US store + EU store). The `shopify_app_installations` table supports this via the many-to-one relationship to `organizations`.

### Q5: How does this affect the `shopify.app.toml` configuration?

The `shopify.app.toml` has a single `client_id`. This is correct -- there is ONE app in Shopify Partners. All tenants install the same app. The `client_id` does not change.

The `dev_store_url` field is only used during local development. In production, the app URL is set in Shopify Partners and applies to all installing shops.

### Q6: What about the platform-side Shopify package (`packages/shopify/`)?

The platform-side Shopify package handles:
- OAuth initiation/callback for linking Shopify stores during brand onboarding
- Webhook handling for order/product/customer sync
- Admin API client for server-to-server calls

This package is already multi-tenant. It uses `getTenantForShop()` and `withTenant()`. The only coordination needed is:
- When the Shopify app creates a `shopify_app_installations` record, it should also ensure a `shopify_connections` record exists (or trigger the platform OAuth flow for the encrypted token).

### Q7: Environment variable cleanup

| Current Env Var | Status | Replacement |
|----------------|--------|-------------|
| `CGK_TENANT_SLUG` | Remove | `resolveTenantForShop(session.shop)` |
| `CGK_PLATFORM_API_KEY` | Keep or replace | Per-tenant API key from platform, or shared platform service key |
| `CGK_PLATFORM_API_URL` | Keep | Shared across all tenants (one platform) |
| `SHOPIFY_API_KEY` | Keep | Shared (one app, one client_id) |
| `SHOPIFY_API_SECRET` | Keep | Shared (one app, one secret) |
| `SHOPIFY_SESSION_DATABASE_URL` | New | PostgreSQL connection for shared session storage |
