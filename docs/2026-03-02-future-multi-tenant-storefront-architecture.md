# Future: Universal Multi-Tenant Storefront Architecture

**Status:** Future Planning (Parallel Track to Meliusly Standalone)
**Timeline:** 2-4 weeks (parallel to Meliusly build)
**Goal:** Transform `apps/storefront/` into scalable multi-tenant platform for all future headless tenants

---

## Executive Summary

This document outlines the architecture for converting the existing `apps/storefront/` into a universal multi-tenant storefront platform that can serve hundreds or thousands of tenants from a single codebase and deployment.

**Why This Matters:**

- Meliusly standalone is a tactical solution (speed to production)
- Universal multi-tenant is the strategic solution (scalability for future tenants)
- Industry standard: ReCharge, Yotpo, Klaviyo all use single multi-tenant frontends
- Cost optimization: One build serves all tenants (vs. N separate Vercel projects)

---

## Current State Analysis

### Existing Infrastructure (Ready to Leverage)

**apps/storefront/** already has:

- ✅ Tenant resolution middleware (subdomain/custom domain detection)
- ✅ `getTenantConfig()` - Loads tenant-specific settings from database
- ✅ Theme system with CSS custom properties for runtime switching
- ✅ Asset organization pattern: `/public/{tenant}/`
- ✅ 80+ reusable components (cart, checkout, account, products, blocks)
- ✅ Block-based page builder with 70+ block types
- ✅ Hybrid product reading (local PostgreSQL + Shopify Storefront API)

**Gaps to Address:**

- ⏳ Database-driven theme system (currently file-based defaults)
- ⏳ Tenant provisioning workflow in Orchestrator
- ⏳ Theme customization UI for tenants
- ⏳ Per-tenant block configuration storage
- ⏳ Migration strategy for existing tenants (CGK, Meliusly)

---

## Architecture Design

### 1. Tenant Resolution Flow

```
Customer visits domain (e.g., shop.meliusly.com or meliusly.com)
  ↓
Vercel Edge Network (globally distributed)
  ↓
Middleware (apps/storefront/src/middleware.ts)
  ├── Extract tenant from subdomain/custom domain
  ├── Query domain-lookup API for custom domains
  ├── Set x-tenant-slug header
  └── Continue to app
  ↓
Server Components
  ├── Call getTenantConfig(slug)
  ├── Load theme from database (public.tenant_themes table)
  ├── Load Shopify credentials (public.organizations.shopify_config)
  └── Render tenant-specific page
  ↓
CSS custom properties applied (--portal-primary, --portal-accent, etc.)
  ↓
Tenant-branded storefront rendered
```

### 2. Database Schema Changes

**New Table: `public.tenant_themes`**

```sql
CREATE TABLE public.tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Colors
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  accent_color TEXT,
  background_color TEXT DEFAULT '#FFFFFF',
  foreground_color TEXT DEFAULT '#000000',

  -- Typography
  font_family TEXT DEFAULT 'Inter',
  heading_font_family TEXT,
  font_size_base INTEGER DEFAULT 16,

  -- Layout
  max_content_width INTEGER DEFAULT 1440,
  border_radius INTEGER DEFAULT 8,
  spacing_density TEXT DEFAULT 'comfortable', -- 'compact' | 'comfortable' | 'spacious'

  -- Branding
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,

  -- Advanced
  custom_css TEXT,
  custom_fonts JSONB, -- Array of Google Font or custom font URLs

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);
```

**New Table: `public.tenant_storefront_config`**

```sql
CREATE TABLE public.tenant_storefront_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Homepage configuration
  homepage_layout TEXT DEFAULT 'default', -- 'default' | 'minimal' | 'custom'
  homepage_blocks JSONB, -- Array of block configurations

  -- Navigation
  navigation_menu JSONB, -- Menu items configuration

  -- Footer
  footer_config JSONB, -- Footer sections and links

  -- Features
  show_newsletter BOOLEAN DEFAULT true,
  show_reviews BOOLEAN DEFAULT true,
  show_search BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);
```

**Migration for Existing Tenants:**

```sql
-- Seed themes for existing tenants
INSERT INTO public.tenant_themes (organization_id, primary_color, font_family)
SELECT id,
       COALESCE(settings->>'primaryColor', '#0268A0'),
       COALESCE(settings->>'fontFamily', 'Inter')
FROM public.organizations
WHERE status != 'deleted';
```

### 3. Theme Loading System

**File: `apps/storefront/src/lib/theme/database.ts` (NEW)**

```typescript
import { sql } from '@vercel/postgres'
import type { StorefrontThemeConfig } from './types'
import { createTheme } from './defaults'

export async function loadThemeFromDatabase(
  organizationId: string
): Promise<StorefrontThemeConfig> {
  const result = await sql`
    SELECT * FROM public.tenant_themes
    WHERE organization_id = ${organizationId}
  `

  if (result.rows.length === 0) {
    // Return default theme if no custom theme exists
    return createTheme()
  }

  const themeRow = result.rows[0]

  return {
    primaryColor: themeRow.primary_color,
    secondaryColor: themeRow.secondary_color || undefined,
    accentColor: themeRow.accent_color || undefined,
    backgroundColor: themeRow.background_color,
    foregroundColor: themeRow.foreground_color,
    fontFamily: themeRow.font_family,
    headingFontFamily: themeRow.heading_font_family || undefined,
    fontSizeBase: themeRow.font_size_base,
    maxContentWidth: themeRow.max_content_width,
    borderRadius: themeRow.border_radius,
    spacingDensity: themeRow.spacing_density as 'compact' | 'comfortable' | 'spacious',
    logo: themeRow.logo_url || undefined,
    logoDark: themeRow.logo_dark_url || undefined,
    favicon: themeRow.favicon_url || undefined,
    customCss: themeRow.custom_css || undefined,
    customFonts: themeRow.custom_fonts || undefined,
  }
}

export async function saveTheme(
  organizationId: string,
  theme: Partial<StorefrontThemeConfig>
): Promise<void> {
  await sql`
    INSERT INTO public.tenant_themes (
      organization_id,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      foreground_color,
      font_family,
      heading_font_family,
      font_size_base,
      max_content_width,
      border_radius,
      spacing_density,
      logo_url,
      logo_dark_url,
      favicon_url,
      custom_css,
      custom_fonts
    ) VALUES (
      ${organizationId},
      ${theme.primaryColor || '#0268A0'},
      ${theme.secondaryColor || null},
      ${theme.accentColor || null},
      ${theme.backgroundColor || '#FFFFFF'},
      ${theme.foregroundColor || '#000000'},
      ${theme.fontFamily || 'Inter'},
      ${theme.headingFontFamily || null},
      ${theme.fontSizeBase || 16},
      ${theme.maxContentWidth || 1440},
      ${theme.borderRadius || 8},
      ${theme.spacingDensity || 'comfortable'},
      ${theme.logo || null},
      ${theme.logoDark || null},
      ${theme.favicon || null},
      ${theme.customCss || null},
      ${JSON.stringify(theme.customFonts || null)}
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      accent_color = EXCLUDED.accent_color,
      background_color = EXCLUDED.background_color,
      foreground_color = EXCLUDED.foreground_color,
      font_family = EXCLUDED.font_family,
      heading_font_family = EXCLUDED.heading_font_family,
      font_size_base = EXCLUDED.font_size_base,
      max_content_width = EXCLUDED.max_content_width,
      border_radius = EXCLUDED.border_radius,
      spacing_density = EXCLUDED.spacing_density,
      logo_url = EXCLUDED.logo_url,
      logo_dark_url = EXCLUDED.logo_dark_url,
      favicon_url = EXCLUDED.favicon_url,
      custom_css = EXCLUDED.custom_css,
      custom_fonts = EXCLUDED.custom_fonts,
      updated_at = NOW()
  `
}
```

**Update: `apps/storefront/src/lib/tenant.ts`**

```typescript
import { loadThemeFromDatabase } from './theme/database'

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  // ... existing tenant loading logic ...

  // Load theme from database instead of file
  const theme = await loadThemeFromDatabase(tenant.id)

  return {
    ...tenant,
    theme, // Database-driven theme
  }
}
```

### 4. Tenant Provisioning Workflow

**Orchestrator UI: New Tenant Wizard**

**Route: `apps/orchestrator/src/app/tenants/new/page.tsx`**

Steps:

1. **Basic Info**
   - Tenant name
   - Slug (URL-safe identifier)
   - Contact email

2. **Commerce Provider**
   - Shopify
   - Custom + Stripe (future)

3. **Storefront Type**
   - Shopify Liquid Theme (traditional)
   - Shopify Headless (recommended) ← Creates storefront config
   - No Storefront (backend-only)

4. **Domain Configuration**
   - Subdomain: `{slug}.cgk.com`
   - Custom domain: `shop.{tenant}.com`

5. **Theme Customization**
   - Primary color picker
   - Logo upload
   - Font selection (Google Fonts dropdown)
   - Preview pane (live preview of storefront with settings)

6. **Shopify Connection** (if Shopify selected)
   - Store domain
   - Install CGK app via OAuth
   - Generate Storefront Access Token

**CLI Command:**

```bash
npx @cgk-platform/cli tenant:provision \
  --name "Brand Name" \
  --slug brand-slug \
  --commerce shopify \
  --storefront headless \
  --domain shop.brand.com
```

### 5. Theme Customization UI (Orchestrator)

**Route: `apps/orchestrator/src/app/organizations/[id]/storefront/page.tsx`**

Features:

- Live preview iframe showing storefront
- Theme editor panel:
  - Color pickers (primary, secondary, accent, background, foreground)
  - Font family dropdowns (Google Fonts API integration)
  - Layout settings (max width, border radius, spacing density)
  - Logo/favicon upload (with image optimization)
  - Custom CSS textarea (advanced users)
- Save button → Updates `public.tenant_themes` table
- Preview updates in real-time via postMessage to iframe

**API Route: `apps/orchestrator/src/app/api/tenants/[id]/theme/route.ts`**

```typescript
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth(req)
  const theme = await req.json()

  // Verify user has access to this tenant
  const hasAccess = await checkTenantAccess(userId, params.id)
  if (!hasAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Save theme to database
  await saveTheme(params.id, theme)

  // Invalidate cache (if using Redis/Upstash for theme caching)
  await invalidateThemeCache(params.id)

  return Response.json({ success: true })
}
```

---

## Migration Strategy

### Phase 1: Build Universal Infrastructure (Week 1-2)

**Tasks:**

1. Create database tables (`tenant_themes`, `tenant_storefront_config`)
2. Implement `loadThemeFromDatabase()` function
3. Update `getTenantConfig()` to use database themes
4. Build theme customization UI in Orchestrator
5. Create tenant provisioning wizard
6. Test with CGK tenant (migrate existing hardcoded theme to database)

**Deliverables:**

- Database migrations
- Theme loading system
- Orchestrator UI for theme editing
- Documentation

### Phase 2: Pilot with Test Tenant (Week 2-3)

**Tasks:**

1. Create test tenant via new provisioning workflow
2. Customize theme via Orchestrator UI
3. Point test subdomain to storefront
4. Validate tenant isolation
5. Performance testing (ensure no regressions)
6. Fix bugs, refine UX

**Deliverables:**

- Working test tenant storefront
- Bug fixes and refinements
- Performance benchmarks

### Phase 3: Migrate Meliusly (Week 3-4)

**Tasks:**

1. Export Meliusly theme from standalone app
2. Create Meliusly theme record in database
3. Migrate Meliusly-specific components to `components/meliusly/`
4. Register Meliusly blocks in BlockRenderer
5. Update meliusly.com DNS to point to `apps/storefront/`
6. Verify all pages render correctly
7. Run pixel-perfect audit against Figma
8. Performance testing (Lighthouse >85)

**Rollback Plan:**

- Keep standalone app running in parallel
- DNS switch is instant (can revert immediately)
- Monitor for 48 hours before deprecating standalone

**Deliverables:**

- Meliusly running on multi-tenant platform
- Standalone app deprecated (but archived)
- Documentation of migration process

### Phase 4: Productionize (Week 4+)

**Tasks:**

1. Migrate CGK tenant to database-driven theme
2. Document tenant onboarding process
3. Create video tutorial for theme customization
4. Add monitoring/alerting for tenant-specific errors
5. Implement tenant usage analytics (page views, conversions per tenant)

**Deliverables:**

- Production-ready multi-tenant platform
- Onboarding documentation
- Monitoring dashboards

---

## Scalability Considerations

### Build Performance

**Current State:**

- One build serves all tenants
- Build time: ~3-5 minutes (constant regardless of tenant count)
- Deploy frequency: On-demand (not per-tenant)

**As Platform Grows:**

- 10 tenants: 3-5 min build ✅
- 100 tenants: 3-5 min build ✅
- 1000 tenants: 3-5 min build ✅

**Why:** Components are shared, tenant-specific config is in database (not bundled in build).

### Runtime Performance

**Request Flow:**

```
Customer request → Edge Network → Middleware (tenant resolution) → App
  ↓
Database query: getTenantConfig(slug) [Cached 60s]
  ↓
Theme CSS generated (Cached per tenant)
  ↓
Page rendered (ISR cached per tenant)
```

**Caching Strategy:**

- Tenant config: 60s Redis/Upstash cache
- Theme CSS: Generated once, cached indefinitely (invalidate on theme update)
- Product pages: ISR 60s revalidation
- Static assets: CDN cached per tenant path

**Database Load:**

- Tenant config: 1 query per request (cached 60s) = negligible
- Product queries: Tenant-scoped (uses `tenant_{slug}` schema) = isolated
- No cross-tenant queries = linear scalability

### Asset Storage

**Strategy:**

- Tenant assets: `/public/{slug}/` in repository
- User uploads: Store in Vercel Blob or Cloudflare R2 (external storage)
- Image optimization: Next.js Image API (automatic WebP/AVIF conversion)

**Growth Plan:**

- < 50 tenants: `/public/{slug}/` in repo ✅
- 50-500 tenants: Migrate to Vercel Blob (images only)
- 500+ tenants: Full external asset storage (R2/S3) + CDN

### Cost Analysis

**Current (Multi-Tenant):**

- Vercel Pro: $20/month base
- Additional bandwidth: $40/100GB
- Build minutes: Included (100 hours/month)
- Estimated 100 tenants: ~$100-200/month

**Alternative (Standalone Per Tenant):**

- Vercel Pro: $20/month × 100 = $2,000/month
- Build minutes: 3 min/tenant × 100 = 300 min/deploy (exceeds free tier)
- Additional bandwidth: $40/100GB × 100 = $4,000/month
- **Estimated 100 tenants: $6,000-8,000/month**

**Savings: ~30x cost reduction with multi-tenant**

---

## Technology Stack

### Frontend

- Next.js 16 (App Router, React Server Components)
- React 19 (with React Compiler)
- Tailwind CSS 4 (CSS custom properties for theming)
- TypeScript 5.9+

### Backend

- Vercel Postgres (Neon) - Tenant schemas
- Vercel Edge Functions - Middleware
- Vercel Serverless Functions - API routes
- Upstash Redis - Caching (optional)

### Integrations

- Shopify Storefront API - Product data
- Shopify Admin API - Order sync (via apps/shopify-app)
- Stripe - Payment processing (custom checkout)
- Resend - Transactional email

### Monitoring

- Vercel Analytics - Core Web Vitals
- Sentry - Error tracking (tenant-tagged)
- Custom dashboard - Tenant usage metrics

---

## Security Considerations

### Tenant Isolation

**Database:** Schema-per-tenant (`tenant_{slug}`)

- No shared tables for tenant data
- `withTenant(tenantId, callback)` enforces isolation
- All queries scoped to tenant schema

**Assets:**

- Path-based: `/public/{slug}/` prevents cross-tenant access
- Next.js Image API validates paths
- External storage: Pre-signed URLs with tenant check

**Authentication:**

- JWT tokens include `tenantId`
- Session table has `organization_id` foreign key
- All auth checks validate tenant match

**Theme CSS:**

- Generated server-side (no user-controlled CSS execution)
- Custom CSS sanitized (CSP headers, no inline scripts)
- Preview iframe sandboxed

### Attack Vectors

**Subdomain Takeover:**

- Mitigation: Verify domain ownership before activation
- DNS TXT record validation required

**Theme XSS:**

- Mitigation: Sanitize custom CSS, disallow `<script>` in custom HTML
- CSP headers prevent inline script execution

**Tenant Enumeration:**

- Mitigation: Rate limit tenant resolution endpoint
- Don't expose tenant list publicly

**Resource Exhaustion:**

- Mitigation: Rate limit per tenant (Redis + Upstash)
- Query timeouts enforced
- Large asset uploads blocked (max 5MB per image)

---

## Open Questions / Decisions Needed

1. **Custom Domain Verification:**
   - Require DNS TXT record validation?
   - Or trust user-provided domains (faster onboarding)?

2. **Theme Preview:**
   - Live preview in Orchestrator (requires iframe embedding)?
   - Or static screenshots (easier to implement)?

3. **Block Configuration Storage:**
   - Store in `tenant_storefront_config.homepage_blocks` (JSONB)?
   - Or separate `tenant_blocks` table (more flexible)?

4. **Asset Upload Strategy:**
   - Immediate migration to Vercel Blob?
   - Or start with `/public/` and migrate later?

5. **Tenant Limits:**
   - Enforce limits (e.g., max 100 products for free tier)?
   - Or unlimited (trust Shopify plan limits)?

---

## Success Metrics

**Technical:**

- [ ] Lighthouse Performance >85 for all tenant storefronts
- [ ] Build time <5 minutes regardless of tenant count
- [ ] Tenant config load time <100ms (cached)
- [ ] Zero cross-tenant data leaks (security audit)

**Business:**

- [ ] Tenant onboarding time <10 minutes (from signup to live storefront)
- [ ] Theme customization saves without errors 99.9% of time
- [ ] Customer-facing storefront uptime >99.9%
- [ ] Cost per tenant <$2/month (infrastructure)

**User Experience:**

- [ ] Theme preview updates in real-time (<500ms)
- [ ] Custom domain activation <5 minutes (DNS propagation)
- [ ] No visual regressions when migrating tenants

---

## References

- Current storefront architecture: `apps/storefront/`
- Theme system: `apps/storefront/src/lib/theme/`
- Tenant resolution: `apps/storefront/src/middleware.ts`
- Meliusly standalone plan: `.claude/plans/deep-noodling-nest.md`
- Multi-tenancy patterns: `.claude/knowledge-bases/multi-tenancy-patterns/`

---

**Next Steps:**

1. Review and approve this architecture plan
2. Create Phase 1 implementation tasks in task tracker
3. Assign architect/implementer agents to build Phase 1
4. Set milestone: Universal infrastructure complete by 2026-03-16

---

Mr. Tinkleberry, this future architecture provides a scalable, cost-effective path to serving hundreds of tenants while maintaining the flexibility for pixel-perfect brand customization. Once Meliusly standalone validates the product-market fit, this system will be ready to scale.
