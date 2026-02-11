# PHASE-2U: Admin Utility Pages & System Features

> **Status**: COMPLETE
> **Duration**: 1 week
> **Prerequisites**: PHASE-2A (Admin Shell)
> **Parallel With**: Can run with other Phase 2 work
> **Completed**: 2026-02-10

---

## Goal

Implement essential admin utility pages that support operational workflows but are not part of the main navigation. These pages provide content moderation, financial operations, system maintenance, and developer tools.

---

## Success Criteria

- [x] Gallery moderation page with approval workflow
- [x] Stripe balance top-up management
- [x] System sync and maintenance tools
- [x] Changelog/audit trail viewer
- [x] Recorder extension download page (optional per tenant)
- [x] All utilities tenant-isolated

---

## Implementation Summary

### Files Created

#### Database Migrations
- `packages/db/src/migrations/tenant/016_ugc_submissions.sql` - UGC submissions table
- `packages/db/src/migrations/tenant/016_stripe_topups.sql` - Stripe top-ups tables
- `packages/db/src/migrations/tenant/016_sync_operations.sql` - Sync operations tracking

#### Types & Database Layer
- `apps/admin/src/lib/admin-utilities/types.ts` - TypeScript types for all utilities
- `apps/admin/src/lib/admin-utilities/db.ts` - Database access functions
- `apps/admin/src/lib/admin-utilities/index.ts` - Module exports

#### Gallery Management
- `apps/admin/src/app/admin/gallery/page.tsx` - Gallery page with server components
- `apps/admin/src/app/admin/gallery/gallery-stats.tsx` - Stats cards component
- `apps/admin/src/app/admin/gallery/gallery-client.tsx` - Interactive gallery with modal
- `apps/admin/src/app/api/admin/gallery/route.ts` - GET submissions with stats
- `apps/admin/src/app/api/admin/gallery/[id]/route.ts` - GET/PATCH/DELETE submission
- `apps/admin/src/app/api/public/gallery/submit/route.ts` - Public submission endpoint

#### Stripe Top-ups
- `apps/admin/src/app/admin/stripe-topups/page.tsx` - Top-ups page with balance
- `apps/admin/src/app/admin/stripe-topups/topups-client.tsx` - Interactive management
- `apps/admin/src/app/api/admin/stripe/balance/route.ts` - GET/POST balance
- `apps/admin/src/app/api/admin/stripe/topups/route.ts` - GET top-ups list
- `apps/admin/src/app/api/admin/stripe/funding-sources/route.ts` - GET/POST sources
- `apps/admin/src/app/api/admin/stripe/pending-withdrawals/route.ts` - GET pending

#### System Sync
- `apps/admin/src/app/admin/system/sync/page.tsx` - Sync page
- `apps/admin/src/app/admin/system/sync/sync-client.tsx` - Interactive sync operations
- `apps/admin/src/app/api/admin/system/sync/route.ts` - GET/POST sync operations

#### Changelog
- `apps/admin/src/app/admin/changelog/page.tsx` - Changelog viewer page
- `apps/admin/src/app/admin/changelog/changelog-client.tsx` - Interactive viewer
- `apps/admin/src/app/api/admin/changelog/route.ts` - GET changelog entries

#### Recorder Extension
- `apps/admin/src/app/admin/recorder/page.tsx` - Download page with guides

---

## Overview

Based on RAWDOG source analysis, these utility pages exist:

| Path | Purpose | Reference File |
|------|---------|----------------|
| `/admin/gallery` | UGC photo moderation | `src/app/admin/gallery/page.tsx` |
| `/admin/stripe-topups` | Platform balance management | `src/app/admin/stripe-topups/page.tsx` |
| `/admin/system/sync` | Data synchronization | `src/app/admin/system/sync/page.tsx` |
| `/admin/changelog` | Audit trail viewer | via `src/app/api/admin/changelog/route.ts` |
| `/admin/recorder` | Recording extension download | `src/app/admin/recorder/` |

**Note**: The `/admin/projects/` pages are part of the Creator Projects system and are documented in [PHASE-4C-CREATOR-PROJECTS.md](./PHASE-4C-CREATOR-PROJECTS.md).

---

## Deliverables

### 1. Gallery Management (UGC Moderation)

**Purpose**: Allow tenants to moderate user-generated content (before/after photos, testimonials) submitted by customers for potential display on storefront.

**RAWDOG Reference**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/gallery/page.tsx`

#### Database Schema

```sql
CREATE TABLE ugc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Customer info
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,

  -- Content
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  testimonial TEXT,
  products_used TEXT[],
  duration_days INTEGER,

  -- Consent
  consent_marketing BOOLEAN DEFAULT false,
  consent_terms BOOLEAN DEFAULT false,

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT ugc_submissions_tenant_idx UNIQUE (tenant_id, id)
);

CREATE INDEX idx_ugc_submissions_tenant_status ON ugc_submissions(tenant_id, status);
```

#### Features

**Stats Dashboard**:
- Total submissions count
- Pending review count (actionable)
- Approved count
- Rejected count
- Click stat cards to filter

**Submission Grid**:
- Before/after image thumbnail grid
- Quick approve/reject buttons
- Status badge (pending/approved/rejected)
- Customer name and submission date
- Click to open detail modal

**Detail Modal**:
- Full-size before/after images side-by-side
- Customer information (name, email, phone)
- Products used, duration of use
- Testimonial text (if provided)
- Marketing consent status
- Review notes input
- Approve/Reject/Delete actions
- Review history (if previously reviewed)

#### API Routes

```
GET  /api/admin/gallery?status={pending|approved|rejected|all}
  → Returns { submissions: [], stats: { total, pending, approved, rejected } }

PATCH /api/admin/gallery/[id]
  → Body: { action: 'approve'|'reject', notes?: string }
  → Updates status, reviewed_by, reviewed_at

DELETE /api/admin/gallery/[id]
  → Soft deletes submission
```

#### Public Submission Form

Each tenant gets a public submission form at `/submit-photos` or configurable path:

```
/api/public/gallery/submit
  → Body: FormData with images, customer info, products
  → Uploads to tenant's storage
  → Creates pending submission
```

---

### 2. Stripe Balance Top-ups

**Purpose**: Manage platform Stripe balance for processing creator/vendor payouts. Top-ups pull funds from connected bank accounts.

**RAWDOG Reference**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/stripe-topups/page.tsx`

#### Database Schema

```sql
CREATE TABLE stripe_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_topup_id TEXT NOT NULL,
  stripe_source_id TEXT,

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL,  -- pending, succeeded, failed, canceled, reversed
  failure_code TEXT,
  failure_message TEXT,

  -- Timing
  expected_available_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Linking
  linked_withdrawal_ids UUID[],  -- Which withdrawals this covers

  -- Metadata
  statement_descriptor TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stripe_topup_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

  -- Default source
  default_source_id TEXT,
  default_source_last4 TEXT,
  default_source_bank_name TEXT,

  -- Auto top-up (optional)
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_threshold_cents INTEGER,
  auto_topup_amount_cents INTEGER,

  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stripe_topups_tenant_status ON stripe_topups(tenant_id, status);
```

#### Features

**Balance Overview**:
- Current available balance
- Pending balance
- Cards for pending/succeeded/failed/canceled counts

**Pending Withdrawals Section**:
- List of creator/vendor payouts awaiting funds
- One-click "Initiate Top-up" per withdrawal
- Links withdrawal to specific top-up

**Top-up History Table**:
- Stripe ID, amount, status, description
- Linked withdrawals count
- Created date, expected available date
- Status filtering

**Create Top-up Modal**:
- Amount input
- Funding source selection
- Optional description
- Confirmation with timing estimate

**Settings Panel**:
- Default funding source selection
- Auto top-up configuration (threshold + amount)
- Clear default button

#### API Routes

```
GET  /api/admin/stripe/balance
  → Returns { available: { usd, usdFormatted }, pending: { usd, usdFormatted } }

POST /api/admin/stripe/balance
  → Body: { amountCents, description?, sourceId?, linkedWithdrawalIds? }
  → Creates Stripe top-up
  → Returns { success, data: { stripeTopupId, amountFormatted } }

GET  /api/admin/stripe/topups?status={}&sync={true}
  → Returns { topups: [], stats: { pending, succeeded, failed, canceled } }

GET  /api/admin/stripe/funding-sources
  → Returns { sources: [], settings: {}, configuredInDashboard: boolean }

POST /api/admin/stripe/funding-sources
  → Body: { defaultSourceId, autoTopupEnabled, etc. }
  → Saves settings

GET  /api/admin/stripe/pending-withdrawals
  → Returns { withdrawals: [] } with topup linkage status
```

---

### 3. System Sync & Maintenance

**Purpose**: Provide admin tools for data synchronization, consistency fixes, and maintenance operations.

**RAWDOG Reference**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/system/sync/page.tsx`

#### Features

**Sync Operations** (each with preview → execute pattern):

| Operation | Purpose |
|-----------|---------|
| Commission Balance Sync | Syncs commissions from orders to balance transactions |
| Project Payment Sync | Syncs paid project payments to balance transactions |
| Conversation Merge | Merges duplicate conversations (same email/phone) |
| Mature Commissions | Moves pending commissions past hold period to available |

**UI Pattern**:
1. "Run All Syncs" button for batch execution
2. Individual "Run" buttons per operation
3. Results panel with:
   - Status badge (pending/running/success/error)
   - Preview data (collapsible)
   - Result data (collapsible)
   - Error message if failed
4. Copy results to clipboard

#### API Routes

```
GET  /api/admin/system/sync
  → Returns previews for all operations

POST /api/admin/system/sync
  → Body: { operation: string } or { runAll: true }
  → Executes sync, returns { results: [] }
```

#### Database Tables (sync tracking)

```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  operation_type TEXT NOT NULL,
  status TEXT NOT NULL,  -- pending, running, success, error

  preview_data JSONB,
  result_data JSONB,
  error_message TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  run_by TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_operations_tenant ON sync_operations(tenant_id, operation_type);
```

---

### 4. Changelog / Audit Trail

**Purpose**: View system change history for debugging, compliance, and audit purposes.

**RAWDOG Reference**: `/Users/holdenthemic/Documents/rawdog-web/src/app/api/admin/changelog/route.ts`

#### Database Schema

The changelog uses Redis for high-throughput storage (simulated with in-memory store for initial implementation):

```typescript
// Redis key pattern
`changelog:${tenantId}:entries` // Sorted set by timestamp
`changelog:${tenantId}:by_source:${source}` // Per-source index
`changelog:${tenantId}:stats` // Stats hash
```

#### Changelog Entry Structure

```typescript
interface ChangelogEntry {
  id: string
  timestamp: string
  source: ChangeSource
  action: string
  entityType: string
  entityId: string
  summary: string
  details?: Record<string, unknown>
  userId?: string
  userEmail?: string
  metadata?: Record<string, unknown>
}

type ChangeSource =
  | 'admin'      // Admin actions
  | 'api'        // API calls
  | 'webhook'    // Webhook events
  | 'job'        // Background jobs
  | 'system'     // System operations
  | 'user'       // User actions
```

#### Features

**Changelog Viewer Page** (`/admin/changelog`):
- Chronological list of changes
- Source filter (admin, api, webhook, job, system, user)
- Entity type filter
- Date range picker
- Search by entity ID or summary
- Stats panel (counts by source, by day)
- Detail expansion for each entry

#### API Routes

```
GET /api/admin/changelog?source={}&limit={}&offset={}&stats=true
  → Returns { entries: [], stats?: { bySource, byDay } }
```

#### Logging Helper

```typescript
// Usage in any admin action
await logChange(tenantId, {
  source: 'admin',
  action: 'update',
  entityType: 'creator',
  entityId: creatorId,
  summary: `Updated creator ${creatorName} status to active`,
  details: { oldStatus, newStatus }
})
```

---

### 5. Recorder Extension Download (Optional)

**Purpose**: Provide a download page for a screen/webcam recording Chrome extension. This is an optional feature per tenant.

**RAWDOG Reference**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/recorder/`

#### Features

**Download Card**:
- Extension icon
- Download button (triggers .zip download)
- Brief description

**Tabbed Content**:
1. **Installation** - Step-by-step installation guide
2. **Recording Guide** - How to use screen, webcam, PiP modes
3. **Features** - Feature list and roadmap

**Feature Flag**: `features.recorder_extension`

This feature is typically only enabled for tenants with video content workflows.

#### Files Needed

- `/public/downloads/recorder-extension.zip` - Extension package
- Extension manifest and code (separate repository or build process)

---

## Multi-Tenant Considerations

### Tenant Isolation

All utilities MUST be tenant-scoped:

```typescript
// ✅ CORRECT - Always filter by tenant
const submissions = await withTenant(tenantId, async () => {
  return sql`SELECT * FROM ugc_submissions WHERE tenant_id = ${tenantId}`
})

// ❌ WRONG - Never query without tenant context
const submissions = await sql`SELECT * FROM ugc_submissions`
```

### Feature Flags

Some utilities may be optional per tenant:

| Feature | Flag | Default |
|---------|------|---------|
| Gallery/UGC | `features.ugc_gallery` | `true` |
| Stripe Top-ups | `features.stripe_topups` | Platform operators only |
| System Sync | `features.system_sync` | Admin only |
| Recorder | `features.recorder_extension` | `false` |

### Permissions

| Action | Required Permission |
|--------|---------------------|
| View gallery | `content.ugc.view` |
| Moderate gallery | `content.ugc.manage` |
| View stripe balance | `finance.balance.view` |
| Create top-ups | `finance.balance.manage` |
| Run sync operations | `system.sync` (admin only) |
| View changelog | `system.changelog.view` |

---

## Implementation Tasks

### [PARALLEL] Task 1: Gallery Management

1. [x] Create `ugc_submissions` table
2. [x] Build gallery page with grid/modal
3. [x] Add approve/reject/delete API routes
4. [x] Add public submission form
5. [x] Add image upload handling

### [PARALLEL] Task 2: Stripe Top-ups

1. [x] Create `stripe_topups` and `stripe_topup_settings` tables
2. [x] Build top-ups page with stats, table, create modal
3. [x] Add balance/topups/funding-sources API routes
4. [x] Integrate with Stripe Top-ups API
5. [x] Add pending withdrawals linkage

### [PARALLEL] Task 3: System Sync

1. [x] Create `sync_operations` table
2. [x] Build sync page with operations list
3. [x] Add preview/execute API routes for each operation
4. [x] Add results display and copy functionality

### [SEQUENTIAL after Task 3] Task 4: Changelog

1. [x] Set up Redis changelog schema
2. [x] Build changelog viewer page
3. [x] Add changelog API route with filtering
4. [x] Add `logChange` helper function
5. [x] Integrate logging into existing admin actions

### [PARALLEL] Task 5: Recorder Page (Optional)

1. [x] Create recorder download page
2. [x] Add installation/usage guides
3. [x] Set up feature flag gating

---

## Non-Negotiable Requirements

- All utilities must be tenant-isolated
- All database queries must use `withTenant()`
- All admin actions must check permissions
- All mutations must log to changelog
- Stripe operations must use tenant's Stripe credentials
- Gallery images must be stored in tenant's storage bucket

---

## Pattern References

**RAWDOG Gallery Page**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/gallery/page.tsx`
- Grid/modal pattern
- Approve/reject workflow
- Stats cards with filtering

**RAWDOG Stripe Top-ups**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/stripe-topups/page.tsx`
- Balance display
- Funding source management
- Top-up creation modal

**RAWDOG System Sync**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/system/sync/page.tsx`
- Preview/execute pattern
- Results display
- Batch operations

---

## Related Documentation

- [PHASE-2H-FINANCIAL-TREASURY.md](./PHASE-2H-FINANCIAL-TREASURY.md) - Treasury management (uses top-ups)
- [PHASE-4B-CREATOR-PAYMENTS.md](./PHASE-4B-CREATOR-PAYMENTS.md) - Creator payouts (triggers top-ups)
- [PHASE-3E-VIDEO-CORE.md](./PHASE-3E-VIDEO-CORE.md) - Video features (may use recorder)
- [PHASE-2I-CONTENT-UGC.md](./PHASE-2I-CONTENT-UGC.md) - UGC content management
