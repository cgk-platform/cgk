# PHASE-2TS: Tenant Admin Settings

**Duration**: 1 week (Week 10)
**Depends On**: PHASE-2A (Admin Shell), PHASE-2F (RBAC)
**Parallel With**: PHASE-2PO-FLAGS
**Blocks**: None (other phases can proceed)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All settings are tenant-scoped. Super admins can view/edit any tenant's settings via impersonation.

---

## Goal

Implement tenant-level settings pages that allow tenant admins to configure their own AI features, payout preferences, and site configuration. These pages are accessible to tenant admins for their own tenant only (unlike `/admin/ops/*` which is super admin only).

---

## Access Control Matrix

| Page | Super Admin | Tenant Admin | Team Member |
|------|-------------|--------------|-------------|
| `/admin/settings/ai` | Yes (all tenants) | Yes (own tenant) | Based on `tenant.settings.view` |
| `/admin/settings/payouts` | Yes (all tenants) | Yes (own tenant) | Based on `finance.payouts.*` |
| `/admin/settings/permissions` | Yes (all tenants) | Yes (own tenant) | Based on `team.roles.manage` |
| `/admin/config` | Yes (all tenants) | Yes (own tenant) | Based on `tenant.settings.edit` |
| `/admin/ops/*` | **Yes** | **NO** | **NO** |

---

## Success Criteria

- [ ] AI settings page allows toggling AI features per tenant
- [ ] Payout settings page configures payment schedules and thresholds
- [ ] Site config page manages branding, promotions, and navigation
- [ ] All settings persist to tenant-scoped database rows
- [ ] Changes audit logged with user context
- [ ] Settings sync to related systems (e.g., pricing changes propagate)
- [ ] Permission checks enforce access control

---

## Deliverables

### 1. AI Settings (`/admin/settings/ai`)

**Purpose**: Configure AI/ML features for the tenant.

**UI Components**:
- Feature toggles section (enable/disable AI capabilities)
- Model preferences (if multiple models available)
- Usage limits and budget configuration
- AI memory/context settings

**Features**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ai_enabled` | boolean | true | Master toggle for all AI features |
| `brii_enabled` | boolean | false | Enable BRII AI assistant |
| `ai_content_enabled` | boolean | true | Enable AI content generation |
| `ai_insights_enabled` | boolean | true | Enable AI-powered analytics insights |
| `ai_model_preference` | enum | 'auto' | Preferred model: auto, claude, gpt4 |
| `ai_monthly_budget_usd` | number | null | Monthly AI spending limit (null = unlimited) |
| `ai_content_auto_approve` | boolean | false | Auto-publish AI content without review |
| `ai_memory_enabled` | boolean | true | Allow AI to remember context |
| `ai_memory_retention_days` | number | 90 | Days to retain AI memory |

**Database Schema**:
```sql
CREATE TABLE tenant_{id}.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id),

  -- Feature toggles
  ai_enabled BOOLEAN DEFAULT true,
  brii_enabled BOOLEAN DEFAULT false,
  ai_content_enabled BOOLEAN DEFAULT true,
  ai_insights_enabled BOOLEAN DEFAULT true,

  -- Model preferences
  ai_model_preference VARCHAR(20) DEFAULT 'auto',

  -- Limits
  ai_monthly_budget_usd DECIMAL(10,2),
  ai_current_month_usage_usd DECIMAL(10,2) DEFAULT 0,

  -- Content settings
  ai_content_auto_approve BOOLEAN DEFAULT false,

  -- Memory settings
  ai_memory_enabled BOOLEAN DEFAULT true,
  ai_memory_retention_days INTEGER DEFAULT 90,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),

  CONSTRAINT one_per_tenant UNIQUE(tenant_id)
);
```

**API Routes**:
```
GET  /api/admin/settings/ai     - Get current AI settings
PATCH /api/admin/settings/ai    - Update AI settings
GET  /api/admin/settings/ai/usage - Get current month usage
POST /api/admin/settings/ai/reset-usage - Reset usage counter (super admin only)
```

---

### 2. Payout Settings (`/admin/settings/payouts`)

**Purpose**: Configure payment processing preferences for creators, contractors, and vendors.

**UI Components**:
- Default payment method selector
- Payout schedule configuration
- Minimum threshold settings
- Fee configuration
- Auto-payout toggle

**Features**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `default_payment_method` | enum | 'stripe_connect' | Default: stripe_connect, paypal, wise, check |
| `payout_schedule` | enum | 'weekly' | Frequency: weekly, bi_weekly, monthly, on_demand |
| `payout_day` | integer | 5 | Day of week (1-7) or month (1-28) |
| `min_payout_threshold_usd` | number | 10.00 | Minimum balance before payout |
| `auto_payout_enabled` | boolean | true | Auto-process when threshold met |
| `payout_fee_type` | enum | 'none' | Fee type: none, flat, percentage |
| `payout_fee_amount` | number | 0 | Fee amount (flat USD or percentage) |
| `hold_period_days` | number | 7 | Days to hold before eligible for payout |
| `max_pending_withdrawals` | integer | 3 | Max simultaneous withdrawal requests |
| `require_tax_info` | boolean | true | Require W-9 before payouts |

**Payout Schedule Options**:
- **Weekly**: Every week on specified day
- **Bi-weekly**: Every two weeks
- **Monthly**: Once per month on specified day
- **On-demand**: Only when payee requests

**Database Schema**:
```sql
CREATE TABLE tenant_{id}.payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id),

  -- Method preferences
  default_payment_method VARCHAR(20) DEFAULT 'stripe_connect',
  stripe_connect_enabled BOOLEAN DEFAULT true,
  paypal_enabled BOOLEAN DEFAULT true,
  wise_enabled BOOLEAN DEFAULT false,
  check_enabled BOOLEAN DEFAULT false,
  venmo_enabled BOOLEAN DEFAULT true,

  -- Schedule
  payout_schedule VARCHAR(20) DEFAULT 'weekly',
  payout_day INTEGER DEFAULT 5,

  -- Thresholds
  min_payout_threshold_usd DECIMAL(10,2) DEFAULT 10.00,
  max_pending_withdrawals INTEGER DEFAULT 3,
  hold_period_days INTEGER DEFAULT 7,

  -- Auto-payout
  auto_payout_enabled BOOLEAN DEFAULT true,

  -- Fees
  payout_fee_type VARCHAR(20) DEFAULT 'none',
  payout_fee_amount DECIMAL(10,4) DEFAULT 0,

  -- Compliance
  require_tax_info BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),

  CONSTRAINT one_per_tenant UNIQUE(tenant_id)
);
```

**API Routes**:
```
GET  /api/admin/settings/payouts     - Get payout settings
PATCH /api/admin/settings/payouts    - Update payout settings
GET  /api/admin/settings/payouts/methods - Get enabled payment methods
POST /api/admin/settings/payouts/test-stripe - Test Stripe Connect configuration
POST /api/admin/settings/payouts/test-wise - Test Wise API configuration
```

---

### 3. Site Configuration (`/admin/config`)

**Purpose**: Configure site-wide settings including pricing, promotions, banners, and branding.

**UI Components**:
- Pricing configuration panel
- Active promotions/sales manager
- Banner configuration
- Navigation customization
- Branding settings (logo, colors, fonts)

**Features**:

| Setting Group | Settings | Description |
|---------------|----------|-------------|
| **Pricing** | `pricing_config` | Product pricing, discounts, bundles |
| **Promotions** | `active_sale`, `sale_name`, `sale_dates` | Current promotion settings |
| **Banners** | `announcement_bar`, `promo_banners` | Site-wide banner configuration |
| **Branding** | `logo_url`, `colors`, `fonts` | Visual identity settings |
| **Navigation** | `nav_items`, `footer_links` | Menu and footer configuration |
| **Social** | `social_links`, `meta_defaults` | Social media and meta tags |

**Database Schema**:
```sql
CREATE TABLE tenant_{id}.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id),

  -- Pricing (mirrors pricing-config.ts structure)
  pricing_config JSONB DEFAULT '{}',

  -- Promotions
  sale_active BOOLEAN DEFAULT false,
  sale_name VARCHAR(100),
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  sale_config JSONB DEFAULT '{}',

  -- Banners
  announcement_bar_enabled BOOLEAN DEFAULT false,
  announcement_bar_text TEXT,
  announcement_bar_link VARCHAR(500),
  announcement_bar_bg_color VARCHAR(20) DEFAULT '#000000',
  announcement_bar_text_color VARCHAR(20) DEFAULT '#FFFFFF',
  promo_banners JSONB DEFAULT '[]',

  -- Branding
  logo_url VARCHAR(500),
  logo_dark_url VARCHAR(500),
  favicon_url VARCHAR(500),
  brand_colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#374d42"}',
  brand_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}',

  -- Navigation
  header_nav JSONB DEFAULT '[]',
  footer_nav JSONB DEFAULT '{}',

  -- Social & Meta
  social_links JSONB DEFAULT '{}',
  default_meta_title VARCHAR(100),
  default_meta_description VARCHAR(200),

  -- Analytics
  ga4_measurement_id VARCHAR(50),
  fb_pixel_id VARCHAR(50),
  tiktok_pixel_id VARCHAR(50),

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),

  CONSTRAINT one_per_tenant UNIQUE(tenant_id)
);

-- Pricing config structure example
/*
pricing_config: {
  "subscription": {
    "individual": { "discount": 15, "label": "15% OFF" },
    "bundle": { "discount": 25, "label": "25% OFF" }
  },
  "oneTime": {
    "individual": { "discount": 0 },
    "bundle": { "discount": 15, "label": "15% OFF" }
  },
  "products": {
    "cleanser": { "msrp": 32 },
    "moisturizer": { "msrp": 48 },
    "eye_cream": { "msrp": 48 },
    "bundle": { "msrp": 132 }
  }
}
*/
```

**API Routes**:
```
GET  /api/admin/config                - Get all site config
PATCH /api/admin/config               - Update site config (partial)
GET  /api/admin/config/pricing        - Get pricing config only
PATCH /api/admin/config/pricing       - Update pricing config
GET  /api/admin/config/branding       - Get branding config only
PATCH /api/admin/config/branding      - Update branding config
POST /api/admin/config/preview        - Generate preview of changes
POST /api/admin/config/publish        - Publish config changes to CDN cache
```

---

### 4. Permissions Settings (`/admin/settings/permissions`)

**Already documented in**: [PHASE-2F-RBAC.md](./PHASE-2F-RBAC.md)

This page provides:
- Permission matrix view
- Role list (predefined + custom)
- Role editor for custom roles
- Team member role assignment

---

## Constraints

- All settings must be tenant-scoped (never global)
- Settings changes must be audit logged
- Pricing changes must trigger cache invalidation
- Sensitive settings (payment credentials) encrypted at rest
- Super admin can view/edit via impersonation (audit logged)
- Settings must have default values for new tenants

---

## Pattern References

**RAWDOG code to reference**:
- `/src/lib/pricing-config.ts` - Pricing configuration structure
- `/src/app/admin/config/` - Current config pages
- `/src/app/admin/settings/` - Current settings pages

**Skills to invoke**:
- `/frontend-design` - For settings form layouts

**Spec documents**:
- `PHASE-2F-RBAC.md` - Permission patterns
- `ARCHITECTURE.md` - Tenant context patterns

---

## Frontend Design Prompts

### AI Settings Page

```
/frontend-design

Building AI Settings page for tenant admin (PHASE-2TS-TENANT-SETTINGS).

Requirements:
- Card-based layout with grouped settings
- Toggle switches for feature enables
- Dropdown for model preference
- Number input for budget limit (with currency formatting)
- Slider for memory retention days
- "Current Usage" indicator showing monthly spend vs budget

Sections:
1. Feature Toggles (AI master, BRII, Content, Insights)
2. Model Preferences (dropdown with descriptions)
3. Usage Limits (budget input, usage bar)
4. Content Settings (auto-approve toggle with warning)
5. Memory Settings (enable toggle, retention slider)

Design:
- Warning banners for risky settings (auto-approve, budget removal)
- Save button with unsaved changes indicator
- Permission check for tenant.settings.edit
```

### Payout Settings Page

```
/frontend-design

Building Payout Settings page for tenant admin (PHASE-2TS-TENANT-SETTINGS).

Requirements:
- Section-based form layout
- Payment method toggles with icons (Stripe, PayPal, Wise, Check, Venmo)
- Schedule selector (radio buttons) with day picker
- Currency input for threshold
- Fee configuration with type selector (none/flat/percentage)

Sections:
1. Default Payment Method (with "Test Connection" buttons)
2. Enabled Methods (toggle list)
3. Payout Schedule (frequency + day)
4. Thresholds & Limits (min amount, max pending, hold period)
5. Fees (type selector, amount input)
6. Compliance (require W-9 toggle)

Design:
- Visual schedule preview ("Payouts process every Friday")
- Connected account status indicators
- Save with confirmation for fee changes
```

### Site Config Page

```
/frontend-design

Building Site Configuration page for tenant admin (PHASE-2TS-TENANT-SETTINGS).

Requirements:
- Tab-based navigation (Pricing, Promotions, Banners, Branding, Navigation)
- Live preview panel on right side
- JSON editor option for advanced users

Tabs:
1. Pricing - Product prices, subscription discounts, bundle pricing
2. Promotions - Sale toggle, name, dates, discount overrides
3. Banners - Announcement bar, promo banners (drag-to-reorder)
4. Branding - Logo upload, color pickers, font selectors
5. Navigation - Header menu builder, footer configuration
6. Analytics - Pixel IDs (GA4, Meta, TikTok)

Design:
- Real-time preview updates as settings change
- "Publish Changes" button with cache invalidation
- Version history / revert capability
- Diff view showing pending changes
```

---

## API Route Patterns

All settings routes follow this pattern:

```typescript
// apps/admin/src/app/api/admin/settings/ai/route.ts
import { getTenantContext } from '@cgk/auth'
import { requirePermission } from '@cgk/auth/permissions'
import { withTenant } from '@cgk/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'tenant.settings.view')

  const settings = await withTenant(tenantId, async () => {
    return sql`SELECT * FROM ai_settings WHERE tenant_id = ${tenantId}`
  })

  return Response.json(settings)
}

export async function PATCH(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)
  await requirePermission(req, 'tenant.settings.edit')

  const updates = await req.json()

  const result = await withTenant(tenantId, async () => {
    // Update settings
    const updated = await sql`
      UPDATE ai_settings
      SET ${sql(updates)}, updated_at = NOW(), updated_by = ${userId}
      WHERE tenant_id = ${tenantId}
      RETURNING *
    `

    // Audit log
    await sql`
      INSERT INTO settings_audit_log (tenant_id, user_id, setting_type, changes)
      VALUES (${tenantId}, ${userId}, 'ai', ${JSON.stringify(updates)})
    `

    return updated
  })

  return Response.json(result)
}
```

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use optimistic updates in the UI
2. Cache invalidation strategy for config changes
3. Whether pricing changes need approval workflow
4. Validation rules for each setting type
5. Whether to support settings import/export

---

## Tasks

### [PARALLEL] Database Setup
- [ ] Create `ai_settings` table schema
- [ ] Create `payout_settings` table schema
- [ ] Create `site_config` table schema
- [ ] Create `settings_audit_log` table
- [ ] Add default values seeding for new tenants

### [PARALLEL] API Routes
- [ ] Implement AI settings CRUD endpoints
- [ ] Implement payout settings CRUD endpoints
- [ ] Implement site config CRUD endpoints
- [ ] Add permission checks to all routes
- [ ] Add audit logging to all write operations

### [SEQUENTIAL after APIs] UI Components
- [ ] Invoke `/frontend-design` for AI Settings page
- [ ] Invoke `/frontend-design` for Payout Settings page
- [ ] Invoke `/frontend-design` for Site Config page
- [ ] Build toggle/form components
- [ ] Build preview panel components

### [SEQUENTIAL after Components] Pages
- [ ] Create `/admin/settings/ai` page
- [ ] Create `/admin/settings/payouts` page
- [ ] Create `/admin/config` page (with tabs)

### [SEQUENTIAL after Pages] Integration
- [ ] Add cache invalidation for config changes
- [ ] Add webhook for pricing changes
- [ ] Integration tests for settings persistence
- [ ] Permission enforcement tests

---

## Definition of Done

- [ ] All three settings pages render correctly
- [ ] Settings persist to tenant-scoped tables
- [ ] Changes are audit logged with user context
- [ ] Permission checks work correctly
- [ ] Cache invalidation triggers on config changes
- [ ] UI shows unsaved changes indicator
- [ ] Settings have sensible defaults for new tenants
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
