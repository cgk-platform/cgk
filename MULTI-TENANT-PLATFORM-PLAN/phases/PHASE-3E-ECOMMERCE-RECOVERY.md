# PHASE-3E: E-Commerce Recovery Operations

**Duration**: 1 week (Week 15)
**Depends On**: Phase 3A (Storefront Foundation), Phase 2B (Admin Commerce)
**Parallel With**: Phase 3F (Promo Codes)
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Recovery data is sensitive - it contains customer PII and purchase intent. Key requirements:
- ALL abandoned checkout queries use `withTenant(tenantId, ...)`
- Recovery emails use tenant-configured templates (no hardcoding)
- Draft orders created in tenant's Shopify store only
- Stats and metrics are per-tenant only

---

## Goal

Implement abandoned checkout tracking, recovery workflows, and draft order management to help tenants recover lost revenue from abandoned carts.

---

## Success Criteria

- [ ] Shopify checkout webhooks processed and stored per tenant
- [ ] Abandoned checkout list with filtering (status, date range, value)
- [ ] Recovery email sequences configurable per tenant (1-3 emails)
- [ ] Draft order creation from abandoned checkout data
- [ ] Recovery rate tracking and "Value at Risk" metrics
- [ ] All data properly tenant-isolated

---

## Deliverables

### Webhook Processing
- Shopify `checkouts/create` webhook handler
- Shopify `checkouts/update` webhook handler
- Abandoned checkout detection (configurable timeout, default 1 hour)
- Local storage with tenant isolation

### Admin UI
- Abandoned checkouts list page with DataTable
- Filters: Status (abandoned/recovered/expired), Date range, Cart value
- Expandable rows showing cart contents and customer info
- Recovery URL direct links
- Draft order creation action
- Bulk recovery email trigger

### Recovery Email System
- Sequence configuration (1-3 emails with timing)
- Template customization per tenant (via PHASE-2CM)
- Incentive code attachment (optional)
- Queue processing with email delivery tracking
- Recovery URL tracking (Shopify abandoned checkout URL)

### Draft Orders
- Create draft order from abandoned checkout
- Apply discount code option
- Send invoice email to customer
- Track draft order → order conversion

### Analytics
- Recovery rate calculation
- Value recovered vs. value at risk
- Sequence performance (which email converts)
- Time-of-day analysis

---

## Constraints

- Use Shopify's `recovery_url` for checkout recovery (don't rebuild checkout)
- Recovery emails must use tenant templates (no hardcoded content)
- Draft orders created via Shopify GraphQL (tenant's store)
- Abandoned checkout timeout is tenant-configurable
- Maximum 3 recovery emails per checkout

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For abandoned checkout list and detail views
- Context7 MCP: "Shopify abandoned checkout webhooks"
- Shopify Dev MCP: Introspect `draftOrderCreate` mutation

**RAWDOG code to reference:**
- `src/app/admin/abandoned-checkouts/page.tsx` - List page pattern
- `src/app/api/admin/abandoned-checkouts/route.ts` - Shopify GraphQL queries
- `src/app/api/admin/draft-orders/route.ts` - Draft order creation

**Spec documents:**
- `ECOMMERCE-OPS-PATTERNS.md` - Abandoned checkout patterns

---

## Database Schema

```sql
CREATE TABLE abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_checkout_id TEXT NOT NULL,
  shopify_checkout_token TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_id TEXT,
  cart_total DECIMAL(10,2) NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  line_items JSONB NOT NULL,
  billing_address JSONB,
  shipping_address JSONB,
  recovery_url TEXT,
  status TEXT DEFAULT 'abandoned',  -- abandoned, processing, recovered, expired
  recovery_email_count INTEGER DEFAULT 0,
  max_recovery_emails INTEGER DEFAULT 3,
  recovery_run_id TEXT,
  last_email_sent_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, shopify_checkout_id)
);

CREATE INDEX idx_abandoned_checkouts_recovery ON abandoned_checkouts(
  tenant_id, status, abandoned_at
) WHERE recovered_at IS NULL;

CREATE INDEX idx_abandoned_checkouts_email ON abandoned_checkouts(
  tenant_id, customer_email
);

-- Recovery email queue
CREATE TABLE recovery_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  abandoned_checkout_id UUID NOT NULL REFERENCES abandoned_checkouts(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL DEFAULT 1,  -- 1, 2, or 3
  status TEXT DEFAULT 'scheduled',  -- scheduled, processing, sent, failed, skipped
  incentive_code TEXT,  -- Optional discount code to include
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, abandoned_checkout_id, sequence_number)
);

-- Tenant recovery settings
CREATE TABLE tenant_recovery_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  abandonment_timeout_hours INTEGER DEFAULT 1,
  max_recovery_emails INTEGER DEFAULT 3,
  sequence_1_delay_hours INTEGER DEFAULT 1,    -- 1 hour after abandonment
  sequence_2_delay_hours INTEGER DEFAULT 24,   -- 24 hours after abandonment
  sequence_3_delay_hours INTEGER DEFAULT 72,   -- 72 hours after abandonment
  sequence_1_incentive_code TEXT,  -- Optional discount code for email 1
  sequence_2_incentive_code TEXT,
  sequence_3_incentive_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## AI Discretion Areas

The implementing agent should determine:
1. Optimal batch size for webhook processing
2. Retry strategy for failed recovery emails
3. Whether to include SMS recovery option
4. Draft order expiration handling
5. Recovery attribution (how to track which email led to conversion)

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `packages/db/src/schema/abandoned-checkouts.ts` schema
- [ ] Create `packages/db/src/schema/recovery-email-queue.ts` schema
- [ ] Create migration files
- [ ] Create `apps/admin/src/lib/abandoned-checkouts/db.ts`

### [PARALLEL] Webhook Handlers
- [ ] Create `apps/storefront/src/app/api/webhooks/shopify/checkouts/route.ts`
- [ ] Implement checkout create/update handling
- [ ] Add abandonment detection logic
- [ ] Add recovery detection (checkout → order conversion)

### [SEQUENTIAL after DB] API Routes
- [ ] Create `apps/admin/src/app/api/admin/abandoned-checkouts/route.ts` (GET list)
- [ ] Create `apps/admin/src/app/api/admin/abandoned-checkouts/[id]/route.ts` (GET detail)
- [ ] Create `apps/admin/src/app/api/admin/abandoned-checkouts/[id]/recover/route.ts` (POST)
- [ ] Create `apps/admin/src/app/api/admin/abandoned-checkouts/settings/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/draft-orders/route.ts` (POST create)

### [SEQUENTIAL after API] Admin UI
- [ ] Create `apps/admin/src/app/admin/abandoned-checkouts/page.tsx`
- [ ] Create list component with expandable rows
- [ ] Create filters component (status, date, value range)
- [ ] Create stats cards (total abandoned, recovered, value at risk)
- [ ] Create recovery settings modal
- [ ] Create draft order creation modal

### [PARALLEL with UI] Background Jobs
- [ ] Create `apps/jobs/src/functions/recovery/process-recovery-queue.ts`
- [ ] Create `apps/jobs/src/functions/recovery/check-abandoned-checkouts.ts`
- [ ] Create `apps/jobs/src/functions/recovery/schedule-recovery-emails.ts`
- [ ] Configure cron schedules

### [SEQUENTIAL after all] Integration Tests
- [ ] Test webhook processing
- [ ] Test recovery email scheduling
- [ ] Test draft order creation
- [ ] Test tenant isolation

---

## Frontend Design Skill Prompts

**1. Abandoned Checkouts List:**
```
/frontend-design

Building abandoned checkouts list for PHASE-3E-ECOMMERCE-RECOVERY.

Requirements:
- Stats row at top: Total Abandoned (count), Value at Risk ($), Recovered (count), Recovery Rate (%)
- Columns: Customer (name/email), Cart Total, Items (count), Status (badge), Abandoned At, Actions
- Expandable rows showing:
  - Line items with thumbnails
  - Shipping address
  - Recovery URL link
- Filters row:
  - Status: All, Abandoned, Recovered, Expired
  - Date range picker
  - Value range slider
- Actions per row:
  - Send Recovery Email (disabled if max reached)
  - Create Draft Order
  - View in Shopify

Design:
- Status badges: abandoned=yellow, recovered=green, expired=gray
- High-value carts (>$100) highlighted
```

**2. Recovery Settings Modal:**
```
/frontend-design

Building recovery settings modal for PHASE-3E-ECOMMERCE-RECOVERY.

Requirements:
- Master enable/disable toggle
- Abandonment timeout (hours input, default 1)
- Sequence configuration:
  - Sequence 1: Delay (hours), Incentive code (optional)
  - Sequence 2: Delay (hours), Incentive code (optional)
  - Sequence 3: Delay (hours), Incentive code (optional)
- Template preview links (per sequence)
- Save/Cancel buttons

Layout:
- Single column form
- Each sequence in a card
- Accordion-style expand/collapse for advanced settings
```

---

## Cron Schedule Reference

| Task | Schedule | Description |
|------|----------|-------------|
| Check abandoned checkouts | Every 5 min | Detect new abandonments |
| Process recovery queue | Every 5 min | Send scheduled recovery emails |
| Expire old checkouts | Daily 2 AM | Mark 30+ day old checkouts as expired |

---

## Definition of Done

- [ ] Shopify checkout webhooks processing correctly
- [ ] Abandoned checkouts tracked with tenant isolation
- [ ] Admin list page showing checkouts with filters
- [ ] Recovery email queue processing
- [ ] Draft order creation working
- [ ] Stats showing recovery rate and value metrics
- [ ] Settings configurable per tenant
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests passing
