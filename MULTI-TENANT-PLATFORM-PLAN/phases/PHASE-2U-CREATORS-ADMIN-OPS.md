# PHASE-2U-CREATORS-ADMIN-OPS: Commissions, Samples & Onboarding Metrics

**Status**: COMPLETE
**Completed**: 2026-02-10
**Duration**: 1 week (Week 22)
**Depends On**: PHASE-4B (creator payments), PHASE-4G (creator analytics)
**Parallel With**: PHASE-2U-CREATORS-ADMIN-ESIGN
**Blocks**: None

---

## Goal

Implement operational admin features for the creator program including commission management, product sample tracking, onboarding metrics, and application queue management.

---

## Success Criteria

- [x] Commission management with approval workflow
- [x] Retroactive commission calculation
- [x] Commission rate configuration per creator
- [x] Product sample tracking and shipment management
- [x] Onboarding metrics dashboard with funnel analytics
- [x] Application queue with review workflow
- [x] Onboarding settings configuration

---

## Deliverables

### 1. Commission Management

**Location**: `/admin/commissions`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMMISSIONS                                          [Sync Orders] [Export]│
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Pending      │ │ Approved     │ │ Paid         │ │ Total YTD    │        │
│ │ $2,450.00    │ │ $890.00      │ │ $12,340.00   │ │ $15,680.00   │        │
│ │ 23 orders    │ │ 8 orders     │ │ 142 orders   │ │ 173 orders   │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status: [All ▼]  Creator: [All ▼]  Date: [From] - [To]  [Apply] [Clear]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☐ │ Order      │ Date   │ Creator    │ Promo Code │ Sales   │ Commission │ Status  │
│ ──┼────────────┼────────┼────────────┼────────────┼─────────┼────────────┼─────────│
│ ☐ │ #1234      │ Feb 8  │ Jane Doe   │ JANE15     │ $128.00 │ $12.80     │ Pending │
│ ☐ │ #1233      │ Feb 7  │ John Smith │ JOHNS20    │ $256.00 │ $51.20     │ Approved│
│ ☐ │ #1232      │ Feb 6  │ Jane Doe   │ JANE15     │ $84.00  │ $8.40      │ Paid    │
└───┴────────────┴────────┴────────────┴────────────┴─────────┴────────────┴─────────┘
│ [Select All] [Approve Selected] [Export Selected]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Commission Statuses**:
| Status | Description | Actions |
|--------|-------------|---------|
| `pending` | Order placed, awaiting review | Approve, Reject |
| `approved` | Ready for payout | Pay (moves to payout queue) |
| `paid` | Included in payout | View payout details |
| `rejected` | Not eligible (fraud, return) | Restore |

**Commission Calculation**:
```typescript
interface Commission {
  orderId: string
  orderNumber: string
  orderDate: Date
  creatorId: string
  creatorName: string
  promoCode: string
  netSalesCents: number // Order total minus discounts, shipping, tax
  commissionPercent: number // Creator's rate at time of order
  commissionCents: number // Calculated commission
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  approvedAt?: Date
  paidAt?: Date
  payoutId?: string
}

// Calculation
commissionCents = Math.round(netSalesCents * (commissionPercent / 100))
```

**Commission Features**:
- Auto-sync orders with discount codes
- Match orders to creators by promo code
- Calculate commission based on creator's rate
- Bulk approve pending commissions
- View order details (line items, customer)
- Filter by status, creator, date range
- Export to CSV

**Retroactive Commission Application**:
- Scan orders without creator attribution
- Match discount codes to creators
- Apply commissions retroactively
- Log applied commissions
- Configurable lookback period (default: 90 days)

**Commission Rate Configuration**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMMISSION SETTINGS                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Default Commission Rate: [10]%                                              │
│                                                                             │
│ Tier-Based Rates:                                                           │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Tier        │ Threshold           │ Commission Rate                   │  │
│ ├─────────────┼─────────────────────┼───────────────────────────────────│  │
│ │ Bronze      │ $0+ lifetime        │ 10%                               │  │
│ │ Silver      │ $1,000+ lifetime    │ 12%                               │  │
│ │ Gold        │ $5,000+ lifetime    │ 15%                               │  │
│ │ Platinum    │ $15,000+ lifetime   │ 18%                               │  │
│ │ Diamond     │ $50,000+ lifetime   │ 20%                               │  │
│ └─────────────┴─────────────────────┴───────────────────────────────────┘  │
│                                                                             │
│ Per-Creator Overrides:                                                      │
│ Edit individual creator rates in Creator Directory                         │
│                                                                             │
│ [Save Settings]                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Application Queue

**Location**: `/admin/creators/applications`

**Application Statuses**:
| Status | Description | Next Steps |
|--------|-------------|------------|
| `new` | Just submitted | Review |
| `in_review` | Being evaluated | Approve/Reject |
| `approved` | Accepted | Onboarding starts |
| `rejected` | Declined | Optional: feedback |
| `waitlisted` | On hold | Approve later |

**Application Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CREATOR APPLICATIONS                               Badge: 12 new           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status: [New ▼]  Source: [All ▼]  Date: [From] - [To]                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ Jane Doe                                              NEW | Feb 8   │    │
│ │ jane@example.com | @janecreates | 15.2K followers                   │    │
│ │ "I love skincare and want to share authentic content..."            │    │
│ │ [View Profile] [View Social] [Approve] [Reject] [Waitlist]          │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ John Smith                                            NEW | Feb 7   │    │
│ │ john@example.com | @johnsmith | 8.5K followers                      │    │
│ │ "Looking to partner with quality brands..."                         │    │
│ │ [View Profile] [View Social] [Approve] [Reject] [Waitlist]          │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Application Review Modal**:
- Full application details
- Social media links (open in new tab)
- Follower counts (cached/scraped)
- Previous brand partnerships (if provided)
- Application notes (admin-only)
- Quick approve with default settings
- Custom approve with rate/code override
- Reject with template reason
- Waitlist with note

**Approval Actions**:
```typescript
interface ApprovalAction {
  applicationId: string
  action: 'approve' | 'reject' | 'waitlist'
  commissionPercent?: number // Override default
  discountCode?: string // Custom code or auto-generate
  tier?: string // Starting tier
  notes?: string // Internal notes
  rejectionReason?: string // Template or custom
  sendNotification: boolean // Email applicant
}
```

**Rejection Templates**:
- "Thank you for your interest. At this time, we're not accepting new creators."
- "We're looking for creators with more engagement in skincare content."
- "Your application is on our waitlist. We'll reach out when spots open."
- Custom message

### 3. Onboarding Settings

**Location**: `/admin/creators/onboarding-settings`

**Onboarding Steps Configuration**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ONBOARDING SETTINGS                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ REQUIRED STEPS                                                              │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Step                      │ Required │ Order │ Reminder Days         │  │
│ ├───────────────────────────┼──────────┼───────┼───────────────────────│  │
│ │ Accept Terms & Conditions │ [✓]      │ 1     │ N/A (blocking)        │  │
│ │ Complete Profile          │ [✓]      │ 2     │ 3, 7, 14              │  │
│ │ Sign Creator Agreement    │ [✓]      │ 3     │ 3, 7                  │  │
│ │ Submit W-9 / Tax Info     │ [✓]      │ 4     │ 7, 14, 21             │  │
│ │ Set Up Payout Method      │ [✓]      │ 5     │ 7, 14                 │  │
│ │ Complete Training Module  │ [ ]      │ 6     │ 7                     │  │
│ │ Receive Sample Products   │ [ ]      │ 7     │ N/A (admin initiated) │  │
│ └───────────────────────────┴──────────┴───────┴───────────────────────┘  │
│                                                                             │
│ ONBOARDING TIMELINE                                                         │
│ Max days to complete required steps: [30] days                             │
│ Auto-deactivate if incomplete: [✓]                                         │
│                                                                             │
│ WELCOME EMAIL TEMPLATE                                                      │
│ Template: [Welcome Email ▼]                           [Edit Template]      │
│                                                                             │
│ AUTO-ASSIGN SETTINGS                                                        │
│ Default Commission Rate: [10]%                                              │
│ Auto-generate Discount Code: [✓]                                           │
│ Code Format: [NAME][RANDOM2]  Example: JANE42                              │
│                                                                             │
│ [Save Settings]                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Email Template Editor**:
- WYSIWYG editor for welcome email
- Variable substitution
- Preview with sample data
- Test send

### 4. Onboarding Metrics

**Location**: `/admin/onboarding-metrics`

**Dashboard Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ONBOARDING METRICS                                   Period: [Last 30d ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Applications │ │ Approval     │ │ Onboarding   │ │ Avg Time to  │        │
│ │ Received     │ │ Rate         │ │ Completion   │ │ Complete     │        │
│ │     45       │ │    67%       │ │    82%       │ │   12 days    │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ONBOARDING FUNNEL                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ ████████████████████████████████████████████  Applications: 45      │    │
│ │ ██████████████████████████████                Approved: 30 (67%)    │    │
│ │ ████████████████████████                      Started: 28 (93%)     │    │
│ │ ██████████████████████                        Completed: 25 (89%)   │    │
│ │ ████████████████████                          First Project: 22 (88%)│   │
│ │ ██████████████████                            Active (30d): 18 (82%)│    │
│ └─────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│ STEP COMPLETION RATES                                                       │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Step                      │ Completed │ Pending │ Avg Days            │  │
│ ├───────────────────────────┼───────────┼─────────┼─────────────────────│  │
│ │ Accept Terms              │ 30/30     │ 0       │ 0.2 days            │  │
│ │ Complete Profile          │ 29/30     │ 1       │ 1.5 days            │  │
│ │ Sign Agreement            │ 27/30     │ 3       │ 3.2 days            │  │
│ │ Submit W-9                │ 25/30     │ 5       │ 7.1 days            │  │
│ │ Set Up Payout             │ 25/30     │ 5       │ 4.8 days            │  │
│ └───────────────────────────┴───────────┴─────────┴─────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ STUCK CREATORS (Onboarding incomplete > 14 days)                            │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ Jane Doe - Stuck on: Submit W-9 - 18 days - [Send Reminder] [View]  │    │
│ │ John S.  - Stuck on: Sign Agreement - 15 days - [Send Reminder]     │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Metrics Tracked**:
| Metric | Description |
|--------|-------------|
| Applications Received | Total applications (period) |
| Approval Rate | % approved vs total |
| Onboarding Started | % approved who started |
| Onboarding Completed | % who finished all required steps |
| First Project Assigned | % who received a project |
| Active (30d) | % with activity in last 30 days |
| Avg Time to Complete | Mean days to finish onboarding |
| Drop-off Rate | % who abandoned onboarding |

**Step Analysis**:
- Per-step completion rate
- Per-step average time
- Pending creators per step
- Send reminder actions

**Stuck Creators List**:
- Creators stuck at any step > X days
- One-click reminder sending
- Bulk reminder option
- View creator profile

### 5. Sample Management

**Location**: `/admin/samples`

**Sample Tracking Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAMPLE MANAGEMENT                                         [+ Request Sample]│
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Pending      │ │ Shipped      │ │ Delivered    │ │ This Month   │        │
│ │ Requests     │ │ In Transit   │ │              │ │ Sent         │        │
│ │     8        │ │     5        │ │     42       │ │     12       │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status: [All ▼]  Creator: [Search...]  Date: [From] - [To]                │
├─────────────────────────────────────────────────────────────────────────────┤
│ │ Creator      │ Products              │ Status    │ Requested │ Shipped  │
│ ├──────────────┼───────────────────────┼───────────┼───────────┼──────────│
│ │ Jane Doe     │ Cleanser, Moisturizer │ Pending   │ Feb 8     │ -        │
│ │ John Smith   │ Full Bundle           │ Shipped   │ Feb 5     │ Feb 7    │
│ │ Alice M.     │ Eye Cream             │ Delivered │ Jan 28    │ Jan 30   │
└─┴──────────────┴───────────────────────┴───────────┴───────────┴──────────┘
│ [Mark Shipped] [Mark Delivered] [Cancel Selected]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Sample Request Flow**:
1. Creator requests sample (portal) OR Admin creates request
2. Request appears as "Pending"
3. Admin ships and marks "Shipped" with tracking
4. Tracking auto-updates or Admin marks "Delivered"
5. Optional: Creator confirms receipt

**Sample Statuses**:
| Status | Description |
|--------|-------------|
| `requested` | Creator requested samples |
| `approved` | Approved for shipping |
| `pending` | Waiting to ship |
| `shipped` | Sent with tracking |
| `in_transit` | Carrier has package |
| `delivered` | Confirmed delivery |
| `cancelled` | Request cancelled |

**Sample Request Modal**:
```typescript
interface SampleRequest {
  creatorId: string
  products: {
    productId: string
    productName: string
    variant?: string
    quantity: number
  }[]
  shippingAddress: Address
  priority: 'normal' | 'rush'
  notes?: string
}
```

**Shipment Details**:
- Carrier (USPS, UPS, FedEx, etc.)
- Tracking number
- Estimated delivery
- Actual delivery date
- Delivery confirmation (signature if available)

**Sample Inventory (Optional)**:
- Track sample inventory levels
- Low stock alerts
- Cost per sample tracking
- Sample budget per creator

---

## Database Schema

```sql
-- Commission configuration
CREATE TABLE commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  default_rate_percent NUMERIC(5,2) DEFAULT 10,
  tier_rates JSONB DEFAULT '[]', -- [{tier, minLifetimeCents, ratePercent}]
  auto_retroactive BOOLEAN DEFAULT true,
  retroactive_lookback_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Commission records
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id VARCHAR(255) NOT NULL,
  order_number VARCHAR(50),
  order_date TIMESTAMPTZ NOT NULL,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  promo_code VARCHAR(50),
  net_sales_cents INTEGER NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  payout_id UUID, -- Reference to payout when paid
  paid_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_id)
);

-- Creator applications
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  instagram VARCHAR(100),
  tiktok VARCHAR(100),
  youtube VARCHAR(100),
  follower_count INTEGER,
  bio TEXT,
  why_interested TEXT,
  previous_partnerships TEXT,
  source VARCHAR(50), -- organic, referral, ad, etc.
  referrer_code VARCHAR(50),
  status VARCHAR(20) DEFAULT 'new', -- new, in_review, approved, rejected, waitlisted
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding configuration
CREATE TABLE onboarding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]', -- [{id, name, required, order, reminderDays}]
  max_completion_days INTEGER DEFAULT 30,
  auto_deactivate BOOLEAN DEFAULT true,
  default_commission_percent NUMERIC(5,2) DEFAULT 10,
  auto_generate_code BOOLEAN DEFAULT true,
  code_format VARCHAR(50) DEFAULT '{NAME}{RANDOM2}',
  welcome_template_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Creator onboarding progress
CREATE TABLE creator_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  step_id VARCHAR(50) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, creator_id, step_id)
);

-- Sample requests
CREATE TABLE sample_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  products JSONB NOT NULL, -- [{productId, productName, variant, quantity}]
  shipping_address JSONB NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'requested', -- requested, approved, pending, shipped, in_transit, delivered, cancelled
  tracking_carrier VARCHAR(50),
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  estimated_delivery DATE,
  actual_delivery DATE,
  cost_cents INTEGER,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_tenant_status ON commissions(tenant_id, status);
CREATE INDEX idx_commissions_creator ON commissions(creator_id);
CREATE INDEX idx_creator_applications_tenant_status ON creator_applications(tenant_id, status);
CREATE INDEX idx_creator_onboarding_creator ON creator_onboarding(creator_id);
CREATE INDEX idx_sample_requests_tenant_status ON sample_requests(tenant_id, status);
CREATE INDEX idx_sample_requests_creator ON sample_requests(creator_id);
```

---

## API Routes

### Commissions

```
GET /api/admin/commissions
  Query: status, creatorId, dateFrom, dateTo, page, limit
  Returns: { commissions: Commission[], summary: CommissionSummary, total: number }

POST /api/admin/commissions/approve
  Body: { commissionIds: string[] }
  Returns: { success: boolean, approved: number }

POST /api/admin/commissions/reject
  Body: { commissionIds: string[], reason: string }
  Returns: { success: boolean, rejected: number }

POST /api/admin/commissions/sync
  Returns: { success: boolean, synced: number }

POST /api/admin/commissions/auto-retroactive
  Returns: { success: boolean, applied: number }

GET /api/admin/commissions/config
  Returns: CommissionConfig

PATCH /api/admin/commissions/config
  Body: CommissionConfig
  Returns: { success: boolean }
```

### Applications

```
GET /api/admin/creators/applications
  Query: status, source, dateFrom, dateTo, page, limit
  Returns: { applications: Application[], total: number }

GET /api/admin/creators/applications/[id]
  Returns: Application with full details

POST /api/admin/creators/applications/[id]/approve
  Body: { commissionPercent?, discountCode?, tier?, notes?, sendNotification? }
  Returns: { success: boolean, creator: Creator }

POST /api/admin/creators/applications/[id]/reject
  Body: { reason, sendNotification? }
  Returns: { success: boolean }

POST /api/admin/creators/applications/[id]/waitlist
  Body: { notes? }
  Returns: { success: boolean }
```

### Onboarding

```
GET /api/admin/creators/onboarding/settings
  Returns: OnboardingConfig

PATCH /api/admin/creators/onboarding/settings
  Body: OnboardingConfig
  Returns: { success: boolean }

GET /api/admin/creators/onboarding/metrics
  Query: period (7d, 30d, 90d)
  Returns: OnboardingMetrics

GET /api/admin/creators/onboarding/stuck
  Query: minDays (default: 14)
  Returns: { creators: StuckCreator[] }

POST /api/admin/creators/onboarding/[creatorId]/reminder
  Body: { stepId }
  Returns: { success: boolean }

POST /api/admin/creators/onboarding/bulk-reminder
  Body: { creatorIds: string[], stepId?: string }
  Returns: { success: boolean, sent: number }
```

### Samples

```
GET /api/admin/samples
  Query: status, creatorId, dateFrom, dateTo, page, limit
  Returns: { requests: SampleRequest[], total: number, stats: SampleStats }

POST /api/admin/samples
  Body: CreateSampleRequest
  Returns: { success: boolean, request: SampleRequest }

PATCH /api/admin/samples/[id]
  Body: { status?, trackingCarrier?, trackingNumber?, notes? }
  Returns: { success: boolean, request: SampleRequest }

POST /api/admin/samples/bulk-status
  Body: { requestIds: string[], status: string, trackingInfo?: {} }
  Returns: { success: boolean, updated: number }

DELETE /api/admin/samples/[id]
  Returns: { success: boolean }
```

---

## UI Components

```typescript
// packages/admin-core/src/components/creators/
CommissionsPage.tsx         // Commission list
CommissionTable.tsx         // Commission data table
CommissionSummary.tsx       // Summary cards
CommissionConfig.tsx        // Settings modal/page
ApplicationsPage.tsx        // Application queue
ApplicationCard.tsx         // Application preview
ApplicationReviewModal.tsx  // Full review with actions
OnboardingSettingsPage.tsx  // Onboarding config
OnboardingStepsEditor.tsx   // Step configuration
EmailTemplateEditor.tsx     // Welcome email editor
OnboardingMetricsPage.tsx   // Metrics dashboard
OnboardingFunnel.tsx        // Funnel visualization
StuckCreatorsList.tsx       // Stuck creators with actions
SamplesPage.tsx             // Sample management
SampleRequestModal.tsx      // Create/edit request
SampleStatusBadge.tsx       // Status indicator
TrackingInfo.tsx            // Carrier + tracking display
```

---

## Background Jobs

```typescript
// Sync orders and calculate commissions
export const syncOrderCommissions = inngest.createFunction(
  { id: 'sync-order-commissions' },
  { cron: '0 * * * *' }, // Hourly
  async ({ step }) => {
    const tenants = await step.run('get-tenants', getAllActiveTenants)
    for (const tenant of tenants) {
      await step.run(`sync-${tenant.id}`, async () => {
        await syncCommissionsForTenant(tenant.id)
      })
    }
  }
)

// Send onboarding reminders
export const sendOnboardingReminders = inngest.createFunction(
  { id: 'send-onboarding-reminders' },
  { cron: '0 10 * * *' }, // Daily at 10 AM
  async ({ step }) => {
    const creators = await step.run('get-stuck-creators', getCreatorsNeedingReminders)
    for (const creator of creators) {
      await step.run(`remind-${creator.id}`, async () => {
        await sendOnboardingReminder(creator)
      })
    }
  }
)

// Check for sample delivery updates
export const checkSampleDeliveries = inngest.createFunction(
  { id: 'check-sample-deliveries' },
  { cron: '0 */4 * * *' }, // Every 4 hours
  async ({ step }) => {
    const samples = await step.run('get-shipped-samples', getShippedSamples)
    for (const sample of samples) {
      await step.run(`check-${sample.id}`, async () => {
        await updateSampleDeliveryStatus(sample)
      })
    }
  }
)
```

---

## Constraints

- Commission calculations use order time rate (not current rate)
- Retroactive application limited to 90 days by default
- Sample tracking via carrier APIs (EasyPost integration optional)
- Onboarding reminders respect quiet hours
- All operations tenant-isolated

---

## Pattern References

**RAWDOG code to reference:**
- `src/app/admin/commissions/page.tsx` - Commissions
- `src/app/admin/creators/applications/page.tsx` - Applications
- `src/app/admin/creators/onboarding-settings/page.tsx` - Settings
- `src/app/admin/onboarding-metrics/page.tsx` - Metrics
- `src/app/admin/samples/page.tsx` - Samples

---

## Tasks

### [PARALLEL] Database
- [x] Create `commission_config` migration
- [x] Create `commissions` migration
- [x] Create `creator_applications` migration
- [x] Create `onboarding_config` migration
- [x] Create `creator_onboarding` migration
- [x] Create `sample_requests` migration

### [PARALLEL with DB] Data Layer
- [x] Implement commission CRUD functions
- [x] Implement commission sync logic
- [x] Implement application CRUD functions
- [x] Implement onboarding config functions
- [x] Implement onboarding metrics functions
- [x] Implement sample request functions

### [SEQUENTIAL after data layer] API Routes
- [x] Create commission routes
- [x] Create application routes
- [x] Create onboarding settings routes
- [x] Create onboarding metrics routes
- [x] Create sample routes

### [PARALLEL with API] Background Jobs
- [x] Implement `syncOrderCommissions`
- [x] Implement `sendOnboardingReminders`
- [x] Implement `checkSampleDeliveries`

### [SEQUENTIAL after API/Jobs] UI Components
- [x] Build CommissionsPage
- [x] Build CommissionConfig
- [x] Build ApplicationsPage
- [x] Build ApplicationReviewModal
- [x] Build OnboardingSettingsPage
- [x] Build OnboardingMetricsPage
- [x] Build SamplesPage

---

## Definition of Done

- [x] Commissions sync and calculate correctly
- [x] Bulk approve/reject works
- [x] Retroactive application works
- [x] Applications queue shows all statuses
- [x] Approve/reject workflow complete
- [x] Onboarding steps configurable
- [x] Onboarding metrics accurate
- [x] Stuck creators identified and remindable
- [x] Sample requests tracked through delivery
- [x] All pages are tenant-isolated
- [x] `npx tsc --noEmit` passes (no errors in new files)
