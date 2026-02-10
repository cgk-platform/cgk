# PHASE-3G: Customer Segmentation & Samples Tracking

**Duration**: 1 week (Week 16-17)
**Depends On**: Phase 3F (Promo Codes - segment targeting), Phase 2B (Admin Commerce)
**Parallel With**: Phase 3D (Storefront Theming)
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Customer data is highly sensitive. Key requirements:
- Segment queries scoped to tenant's Shopify store
- RFM calculations use only tenant's order data
- Samples tracking isolated per-tenant
- Klaviyo sync uses tenant's API credentials

---

## Goal

Implement customer segmentation (Shopify + RFM), samples/UGC tracking, and Klaviyo list sync for targeted marketing and operational visibility.

---

## Success Criteria

- [ ] Shopify segments synced and available for targeting
- [ ] Platform RFM segmentation calculated from order data
- [ ] Segment targeting for promo codes and communications
- [ ] UGC samples list with tag-based detection
- [ ] TikTok samples list with channel/tag detection
- [ ] Klaviyo list sync (bi-directional)
- [ ] All data properly tenant-isolated

---

## Deliverables

### Shopify Segments Integration
- Sync segments from Shopify Admin API
- Display segments in admin (name, query, member count)
- Use segments for promo code targeting
- Refresh on-demand and scheduled

### RFM Segmentation (Platform-Native)
- Calculate RFM scores from order data
- Segment customers: Champions, Loyal, At Risk, etc.
- Display segment distribution in analytics
- Use for email targeting

### Customer Segments UI
- Combined view: Shopify + RFM segments
- Segment explorer with customer lists
- Segment-based action triggers

### Samples Tracking
- UGC samples detection by configurable tags
- TikTok samples detection by tags and channel
- Fulfillment status tracking
- Creator profile linking
- Stats by type

### Klaviyo Integration
- Push segments to Klaviyo lists
- Sync list membership changes
- Trigger flows from segment changes
- Tenant-scoped API credentials

---

## Constraints

- Shopify segments read-only (created in Shopify)
- RFM calculated on order data (last 365 days default)
- Samples detection uses tenant-configured tags
- Klaviyo sync is optional (requires tenant API key)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For segment explorer, samples list
- Shopify Dev MCP: Introspect `segments` query
- Context7 MCP: "Klaviyo API list sync patterns"

**RAWDOG code to reference:**
- `src/app/admin/customer-segments/` - Segments UI
- `src/app/api/admin/customer-segments/route.ts` - Shopify query
- `src/app/admin/samples/page.tsx` - Samples tracking
- `src/app/api/admin/samples/route.ts` - Samples API

**Spec documents:**
- `ECOMMERCE-OPS-PATTERNS.md` - Segmentation patterns

---

## Database Schema

```sql
-- Cached Shopify segments (synced periodically)
CREATE TABLE cached_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT,
  member_count INTEGER,
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, shopify_segment_id)
);

-- RFM segment assignments (calculated)
CREATE TABLE customer_rfm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  r_score INTEGER NOT NULL,  -- 1-5
  f_score INTEGER NOT NULL,  -- 1-5
  m_score INTEGER NOT NULL,  -- 1-5
  segment TEXT NOT NULL,  -- champions, loyal, new, at_risk, hibernating, potential
  recency_days INTEGER,
  frequency_count INTEGER,
  monetary_total DECIMAL(10,2),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_rfm_segment ON customer_rfm_segments(tenant_id, segment);

-- Samples configuration
CREATE TABLE samples_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  ugc_tags TEXT[] DEFAULT ARRAY['ugc-sample', 'ugc', 'creator-sample'],
  tiktok_tags TEXT[] DEFAULT ARRAY['tiktok-sample', 'tiktok-shop-sample'],
  channel_patterns TEXT[] DEFAULT ARRAY['tiktok%', '%tiktok shop%'],
  zero_price_only BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Klaviyo sync configuration
CREATE TABLE klaviyo_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_key TEXT,  -- Encrypted
  segment_id TEXT NOT NULL,  -- Platform segment (Shopify ID or RFM name)
  klaviyo_list_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'push',  -- push, pull, bidirectional
  last_synced_at TIMESTAMPTZ,
  UNIQUE(tenant_id, segment_id, klaviyo_list_id)
);
```

---

## RFM Segment Definitions

| Segment | R Score | F Score | Description |
|---------|---------|---------|-------------|
| Champions | 4-5 | 4-5 | Best customers, buy often, spend most |
| Loyal | 3-5 | 3-5 | Consistent buyers, responsive to promos |
| New | 4-5 | 1-2 | Recent first-time buyers |
| At Risk | 1-2 | 3-5 | Used to buy often, haven't recently |
| Hibernating | 1-2 | 1-2 | Last purchase long ago, low frequency |
| Potential | 3 | 2-3 | Average scores, could be developed |

---

## AI Discretion Areas

The implementing agent should determine:
1. RFM calculation frequency (daily vs. on-demand)
2. Segment sync batch size with Klaviyo
3. Cache duration for Shopify segments
4. Sample detection query optimization
5. Whether to include segment size trending

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `packages/db/src/schema/cached-segments.ts`
- [ ] Create `packages/db/src/schema/customer-rfm-segments.ts`
- [ ] Create `packages/db/src/schema/samples-config.ts`
- [ ] Create migration files
- [ ] Create `apps/admin/src/lib/segments/db.ts`
- [ ] Create `apps/admin/src/lib/samples/db.ts`

### [PARALLEL] API Routes - Segments
- [ ] Create `apps/admin/src/app/api/admin/segments/route.ts` (GET combined)
- [ ] Create `apps/admin/src/app/api/admin/segments/shopify/route.ts` (GET, POST sync)
- [ ] Create `apps/admin/src/app/api/admin/segments/rfm/route.ts` (GET, POST calculate)
- [ ] Create `apps/admin/src/app/api/admin/segments/[id]/customers/route.ts`

### [PARALLEL] API Routes - Samples
- [ ] Create `apps/admin/src/app/api/admin/samples/route.ts` (GET list)
- [ ] Create `apps/admin/src/app/api/admin/samples/stats/route.ts` (GET stats)
- [ ] Create `apps/admin/src/app/api/admin/samples/settings/route.ts` (GET, PATCH)

### [PARALLEL] API Routes - Klaviyo
- [ ] Create `apps/admin/src/app/api/admin/integrations/klaviyo/lists/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/integrations/klaviyo/sync/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/integrations/klaviyo/config/route.ts`

### [SEQUENTIAL after API] Admin UI - Segments
- [ ] Create `apps/admin/src/app/admin/segments/page.tsx`
- [ ] Create segments list (Shopify + RFM tabs)
- [ ] Create segment detail view with customer list
- [ ] Create RFM distribution chart
- [ ] Create segment sync button
- [ ] Add segment selector for promo codes

### [SEQUENTIAL after API] Admin UI - Samples
- [ ] Create `apps/admin/src/app/admin/samples/page.tsx`
- [ ] Create samples list with dual-type filtering
- [ ] Create stats cards (UGC count, TikTok count, pending)
- [ ] Create settings modal for tag configuration
- [ ] Add fulfillment status filtering

### [PARALLEL with UI] Background Jobs
- [ ] Create `apps/jobs/src/functions/segments/sync-shopify-segments.ts`
- [ ] Create `apps/jobs/src/functions/segments/calculate-rfm.ts`
- [ ] Create `apps/jobs/src/functions/segments/sync-klaviyo-lists.ts`

### [SEQUENTIAL after all] Integration Tests
- [ ] Test Shopify segment sync
- [ ] Test RFM calculation
- [ ] Test samples detection
- [ ] Test Klaviyo sync
- [ ] Test tenant isolation

---

## Frontend Design Skill Prompts

**1. Segments Overview:**
```
/frontend-design

Building customer segments overview for PHASE-3G-ECOMMERCE-SEGMENTS.

Requirements:
- Tab navigation: Shopify Segments | RFM Segments
- Shopify tab:
  - List of segments with name, query preview, member count
  - Sync button with last synced timestamp
  - Click to view customers in segment
- RFM tab:
  - Distribution chart (pie or bar showing segment sizes)
  - List of segments with count and actions
  - Recalculate button

Design:
- Member count as badge
- Segment colors: champions=gold, loyal=green, at_risk=red
- Query preview truncated with tooltip for full
```

**2. Samples Tracking:**
```
/frontend-design

Building samples tracking page for PHASE-3G-ECOMMERCE-SEGMENTS.

Requirements:
- Stats row: Total Samples, UGC Samples, TikTok Samples, Pending Fulfillment
- Filter tabs: All | UGC | TikTok
- Secondary filter: Fulfillment status dropdown
- Search: Order number, customer name/email
- Table columns: Order #, Customer, Type (badge), Items, Status, Date, Actions
- Actions: View in Shopify, Link to Creator

Design:
- Type badges: UGC=purple, TikTok=cyan
- Fulfillment badges: pending=yellow, fulfilled=green, partial=orange
- Settings gear icon opens tag configuration modal
```

**3. Samples Settings Modal:**
```
/frontend-design

Building samples settings modal for PHASE-3G-ECOMMERCE-SEGMENTS.

Requirements:
- UGC Tags section:
  - Tag input with add/remove
  - Current tags shown as chips
- TikTok Tags section:
  - Same tag input pattern
- Channel Patterns section:
  - Pattern input (e.g., "tiktok%")
  - Explanation of pattern matching
- Zero-price only toggle for TikTok
- Save/Cancel buttons

Layout:
- Two-column on desktop
- Each section in a card
- Help text explaining what each field does
```

---

## Cron Schedule Reference

| Task | Schedule | Description |
|------|----------|-------------|
| Sync Shopify segments | Every 6 hours | Refresh segment cache |
| Calculate RFM | Daily 3 AM | Recalculate RFM scores |
| Sync Klaviyo lists | Every 30 min | Push/pull list changes |

---

## Definition of Done

- [ ] Shopify segments synced and displayed
- [ ] RFM segmentation calculated and displayed
- [ ] Segment targeting working for promo codes
- [ ] Samples detection by UGC and TikTok tags
- [ ] Samples settings configurable per tenant
- [ ] Klaviyo sync functional (if configured)
- [ ] All tenant-isolated
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests passing
