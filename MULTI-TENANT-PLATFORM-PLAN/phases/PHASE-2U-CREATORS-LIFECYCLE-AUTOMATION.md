# PHASE-2U-CREATORS-LIFECYCLE-AUTOMATION: Slack Notifications, Product Shipments & Reminder Chains

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: Wave 3A Agents

**Duration**: 1 week
**Depends On**: PHASE-2U-CREATORS-ADMIN-OPS, PHASE-2CM-SLACK-INTEGRATION, PHASE-2U-CREATORS-ADMIN-ESIGN
**Parallel With**: None
**Blocks**: None

---

## Goal

Implement creator lifecycle automation features including Slack notifications for 10 creator events, product shipment system with Shopify draft order creation, and configurable reminder chain UI for approval and welcome call sequences.

---

## Success Criteria

- [ ] Slack notifications for 10 creator lifecycle events
- [ ] Per-notification channel selection and message customization
- [ ] SendProductModal with Shopify product/variant selection
- [ ] Draft order creation with 100% discount and proper tagging
- [ ] Shipment status tracking on creator cards and directory
- [ ] Reminder chain configuration UI (add/remove steps)
- [ ] Per-step channel selection (email/SMS/both)
- [ ] Escalation delay configuration
- [ ] All features tenant-isolated

---

## Deliverables

### 1. Creator Slack Notifications

**Location**: `/admin/creators/communications/slack`

**10 Notification Event Types**:

| Event | Emoji | Description | Trigger |
|-------|-------|-------------|---------|
| `application_received` | 📥 | New application submitted | Application form submit |
| `application_approved` | 🎉 | Creator approved | Admin approves |
| `welcome_call_booked` | 📅 | Welcome call scheduled | Calendar webhook (Cal.com) |
| `escalation` | ⚠️ | Follow-up needed | After max reminders without response |
| `product_shipped` | 📦 | Product fulfillment created | Order fulfilled in Shopify |
| `product_received` | ✅ | Delivery confirmed | Admin marks delivered or tracking confirms |
| `contract_sent` | 📄 | E-sign document sent | Send button clicked |
| `contract_signed` | ✍️ | Contract signed by creator | Signer completes signing |
| `content_submitted` | 🎬 | Project work submitted | Creator submits in pipeline |
| `content_revisions_requested` | 🔄 | Revisions requested | Admin requests changes |

**Settings UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CREATOR SLACK NOTIFICATIONS                                    [Test All]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📥 Application Received                                    [Enabled ✓] │ │
│ │ Channel: [#creator-applications ▼]                                     │ │
│ │ Message: [Edit Template]                                               │ │
│ │ Include Action Button: [✓]                                             │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🎉 Application Approved                                    [Enabled ✓] │ │
│ │ Channel: [#creator-applications ▼]                                     │ │
│ │ Message: [Edit Template]                                               │ │
│ │ Include Action Button: [✓]                                             │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ... (8 more notification types)                                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [Save Settings]                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Per-Notification Configuration**:
```typescript
interface CreatorSlackNotificationConfig {
  type: CreatorNotificationType
  enabled: boolean
  channelId: string
  channelName: string
  messageTemplate: string
  includeActionButtons: boolean
  customEmoji?: string
}

type CreatorNotificationType =
  | 'application_received'
  | 'application_approved'
  | 'welcome_call_booked'
  | 'escalation'
  | 'product_shipped'
  | 'product_received'
  | 'contract_sent'
  | 'contract_signed'
  | 'content_submitted'
  | 'content_revisions_requested'
```

**Template Variables**:
```typescript
// Available in all templates
{{creatorName}}, {{creatorEmail}}

// Application types
{{applicationId}}

// Project/content types
{{projectId}}, {{projectTitle}}

// Contract types
{{documentName}}, {{documentId}}

// Product types
{{productList}}, {{trackingNumber}}, {{carrier}}

// Conditionals
{{#variable}}content shown if variable exists{{/variable}}
```

**Message Block Structure**:
```typescript
// Slack Block Kit format
[
  {
    type: 'header',
    text: { type: 'plain_text', text: '📥 New Creator Application', emoji: true }
  },
  {
    type: 'section',
    text: { type: 'mrkdwn', text: messageTemplate }
  },
  {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Received at ${timestamp}` }]
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View Application' },
        url: adminUrl
      }
    ]
  }
]
```

**Storage**: Redis key `tenant:{tenantId}:creator:slack:notifications:config`

---

### 2. Send Product to Creator (Shopify Draft Orders)

**Location**: Modal triggered from Creator Directory card or Creator Detail modal

**SendProductModal UI**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SEND PRODUCTS TO JANE DOE                                            [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Shipping Address:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 123 Main Street                                                         │ │
│ │ Los Angeles, CA 90001                                                   │ │
│ │ United States                                              [Edit]       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ SELECT PRODUCTS                                          Search: [______]  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [IMG] Daily Cleanser                                                    │ │
│ │       SKU: CLN-001 | $28.00                                            │ │
│ │       Variant: [8oz ▼]  Qty: [1 ▼]                         [+ Add]     │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [IMG] Hydrating Moisturizer                                             │ │
│ │       SKU: MOI-002 | $42.00                                            │ │
│ │       Variant: [Regular ▼]  Qty: [1 ▼]                     [+ Add]     │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [IMG] Eye Cream                                                         │ │
│ │       SKU: EYE-003 | $38.00                                            │ │
│ │       Variant: [15ml ▼]  Qty: [1 ▼]                        [+ Add]     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ SELECTED (2 items)                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Daily Cleanser (8oz) x1                                      [Remove]  │ │
│ │ Hydrating Moisturizer (Regular) x1                           [Remove]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Notes: [Optional note for this shipment___________________]                 │
│                                                                             │
│                                            [Cancel]  [Create Sample Order]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Product Selection Flow**:
1. Modal fetches active products from Shopify via existing `@cgk-platform/shopify` package
2. Shows all variants with images, SKUs, prices
3. Quantity selection (1-5 units per variant)
4. Address validation before allowing send

**Shopify Draft Order Creation**:
```typescript
interface CreateSampleOrderParams {
  creatorId: string
  products: {
    variantId: string
    title: string
    quantity: number
    sku?: string
    imageUrl?: string
  }[]
  shippingAddress: Address
  notes?: string
}

// Creates draft order with:
// - 100% discount applied
// - Tags: ['UGC', 'creator-sample', `creator:${creatorId}`]
// - Note: "Creator Sample - {creatorName}"
// - Completes draft order immediately
```

**Database Schema**:
```sql
-- Creator product shipments
CREATE TABLE creator_product_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Shopify reference
  shopify_order_id TEXT,
  shopify_order_number TEXT,

  -- Products sent
  products JSONB NOT NULL, -- [{variantId, title, quantity, sku, imageUrl}]

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending: order created, not yet fulfilled
    -- ordered: draft order completed
    -- shipped: fulfillment created, in transit
    -- delivered: confirmed delivery
    -- failed: order creation failed

  -- Tracking
  tracking_number TEXT,
  carrier TEXT, -- ups, fedex, usps, dhl

  -- Timestamps
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_shipments_tenant ON creator_product_shipments(tenant_id);
CREATE INDEX idx_creator_shipments_creator ON creator_product_shipments(creator_id);
CREATE INDEX idx_creator_shipments_status ON creator_product_shipments(status);
```

**Creator Card Shipment Badge**:
```
┌─────────────────────────────────────────┐
│ [Avatar]  Jane Doe                      │
│           @janecreates | 15.2K          │
│                                         │
│ 📦 3 products sent                      │
│    Latest: Shipped (Feb 8)              │
│                                         │
│ [View] [Send Product] [Message]         │
└─────────────────────────────────────────┘
```

**Shipment Status Colors**:
| Status | Badge Color | Icon |
|--------|-------------|------|
| pending | Gray | ○ |
| ordered | Blue | ◐ |
| shipped | Amber | 📦 |
| delivered | Green | ✅ |
| failed | Red | ✗ |

**Tracking Link Generation**:
```typescript
function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const carriers: Record<string, string> = {
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    dhl: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`,
  }
  return carriers[carrier.toLowerCase()] || '#'
}
```

---

### 3. Reminder Chain Configuration UI

**Location**: `/admin/creators/communications/settings`

**Reminder Settings Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUTOMATED REMINDERS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ APPROVAL REMINDERS                                           [Enabled ✓]   │
│ Send reminders to approved creators who haven't logged in yet              │
│ Schedule: Daily at 9:00 AM UTC                                              │
│                                                                             │
│ Reminder Chain:                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Step │ Days After Approval │ Channel      │ Template        │ Actions  │ │
│ ├──────┼─────────────────────┼──────────────┼─────────────────┼──────────┤ │
│ │ 1    │ 3 days              │ Email        │ first_reminder  │ [Edit][X]│ │
│ │ 2    │ 7 days              │ Email + SMS  │ second_reminder │ [Edit][X]│ │
│ │ 3    │ 14 days             │ Email + SMS  │ final_reminder  │ [Edit][X]│ │
│ └──────┴─────────────────────┴──────────────┴─────────────────┴──────────┘ │
│ [+ Add Reminder Step]                                                       │
│                                                                             │
│ Escalation: After final reminder + [7] days → Mark as escalated            │
│ Max 1 reminder per day per creator: [✓]                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ WELCOME CALL REMINDERS                                       [Enabled ✓]   │
│ Send reminders to creators who logged in but haven't scheduled call        │
│ Schedule: Daily at 10:00 AM UTC                                             │
│                                                                             │
│ Conditions:                                                                 │
│ - Creator has logged in at least once                                       │
│ - No welcome call scheduled                                                 │
│ - Hasn't dismissed the notification                                         │
│ - Status is active                                                          │
│                                                                             │
│ Reminder Chain:                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Step │ Days After Login │ Channel      │ Template              │ Actions│ │
│ ├──────┼──────────────────┼──────────────┼───────────────────────┼────────┤ │
│ │ 1    │ 2 days           │ Email        │ welcome_call_reminder │[Edit][X]│ │
│ │ 2    │ 5 days           │ Email + SMS  │ welcome_call_urgent   │[Edit][X]│ │
│ └──────┴──────────────────┴──────────────┴───────────────────────┴────────┘ │
│ [+ Add Reminder Step]                                                       │
│                                                                             │
│ Calendar Integration: Cal.com Event Type: [Welcome Call ▼]                 │
│                                                                             │
│ [Save All Settings]                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reminder Configuration Schema**:
```typescript
interface ReminderChainConfig {
  type: 'approval' | 'welcome_call'
  enabled: boolean
  scheduleTime: string // "09:00" UTC
  steps: ReminderStep[]
  escalation?: {
    enabled: boolean
    daysAfterFinal: number
    slackNotification: boolean
  }
  maxOnePerDay: boolean
}

interface ReminderStep {
  id: string
  order: number
  daysAfterTrigger: number
  channels: ('email' | 'sms')[]
  templateId: string
  templateName: string
}
```

**Storage**: Database table `creator_reminder_config`

```sql
CREATE TABLE creator_reminder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,

  -- Approval reminders
  approval_enabled BOOLEAN DEFAULT true,
  approval_schedule_time TIME DEFAULT '09:00',
  approval_steps JSONB DEFAULT '[]',
  approval_escalation_days INTEGER DEFAULT 7,
  approval_escalation_slack BOOLEAN DEFAULT true,

  -- Welcome call reminders
  welcome_call_enabled BOOLEAN DEFAULT true,
  welcome_call_schedule_time TIME DEFAULT '10:00',
  welcome_call_steps JSONB DEFAULT '[]',
  welcome_call_event_type_id TEXT, -- Cal.com event type

  -- Global settings
  max_one_per_day BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Creator Tracking Fields** (add to creators table):
```sql
ALTER TABLE creators ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_scheduled_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_dismissed BOOLEAN DEFAULT false;
```

---

## API Routes

### Slack Notifications

```
GET /api/admin/creators/slack-notifications
  Returns: { config: CreatorSlackNotificationConfig[] }

PATCH /api/admin/creators/slack-notifications
  Body: { config: CreatorSlackNotificationConfig[] }
  Returns: { success: boolean }

POST /api/admin/creators/slack-notifications/test
  Body: { type: CreatorNotificationType }
  Returns: { success: boolean }

GET /api/admin/creators/slack-notifications/channels
  Returns: { channels: SlackChannel[] }
```

### Product Shipments

```
GET /api/admin/creators/[id]/shipments
  Returns: { shipments: ProductShipment[] }

POST /api/admin/creators/[id]/shipments
  Body: CreateSampleOrderParams
  Returns: { success: boolean, shipment: ProductShipment, shopifyOrderId: string }

PATCH /api/admin/creators/[id]/shipments/[shipmentId]
  Body: { status?, trackingNumber?, carrier?, notes? }
  Returns: { success: boolean }

POST /api/admin/creators/[id]/shipments/[shipmentId]/sync
  Returns: { success: boolean, shipment: ProductShipment }
  // Syncs fulfillment/tracking from Shopify

GET /api/admin/products/available
  Returns: { products: ShopifyProduct[] }
  // Fetches active products with variants from Shopify
```

### Reminder Configuration

```
GET /api/admin/creators/reminder-config
  Returns: { config: ReminderChainConfig }

PATCH /api/admin/creators/reminder-config
  Body: Partial<ReminderChainConfig>
  Returns: { success: boolean }

POST /api/admin/creators/reminder-config/test
  Body: { type: 'approval' | 'welcome_call', creatorId: string }
  Returns: { success: boolean }
```

---

## Background Jobs

```typescript
// Process approval reminders (daily 9 AM UTC)
export const checkApprovalReminders = inngest.createFunction(
  { id: 'check-creator-approval-reminders' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    // 1. Get reminder config
    // 2. Find approved creators who haven't logged in
    // 3. Check which step they're on based on days since approval
    // 4. Queue appropriate reminder emails
    // 5. Update reminder_count and last_reminder_at
    // 6. Mark as escalated if past final step + escalation days
  }
)

// Process welcome call reminders (daily 10 AM UTC)
export const checkWelcomeCallReminders = inngest.createFunction(
  { id: 'check-creator-welcome-call-reminders' },
  { cron: '0 10 * * *' },
  async ({ step }) => {
    // 1. Get reminder config
    // 2. Find creators: logged_in AND no_call_scheduled AND !dismissed
    // 3. Queue appropriate reminder based on days since first login
    // 4. Update welcome_call_reminder_count
  }
)

// Send creator Slack notification (event-driven)
export const sendCreatorSlackNotification = inngest.createFunction(
  { id: 'send-creator-slack-notification' },
  { event: 'creator.notification.*' },
  async ({ event, step }) => {
    // 1. Get notification config for this event type
    // 2. If enabled, build Slack blocks with template
    // 3. Send to configured channel
    // 4. Log delivery (fire-and-forget, don't block)
  }
)

// Sync shipment status from Shopify (hourly)
export const syncCreatorShipments = inngest.createFunction(
  { id: 'sync-creator-shipments' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    // 1. Find shipments with status 'ordered' or 'shipped'
    // 2. Check Shopify fulfillment status
    // 3. Update tracking number, carrier, status
    // 4. Send Slack notification on status change
  }
)
```

---

## UI Components

```typescript
// apps/admin/src/components/creators/
SlackNotificationSettings.tsx     // Notification config UI
SlackNotificationRow.tsx          // Single notification config
SlackTemplateEditor.tsx           // Message template editor
SendProductModal.tsx              // Product selection modal
ProductSelector.tsx               // Shopify product picker
ShipmentHistory.tsx               // Shipment list for creator
ShipmentBadge.tsx                 // Status badge for cards
ReminderChainConfig.tsx           // Reminder settings UI
ReminderStepRow.tsx               // Single reminder step
EscalationSettings.tsx            // Escalation config
```

---

## Integration Points

### Trigger Slack Notifications From:

1. **Application Form Submit** → `application_received`
2. **Admin Approves Application** → `application_approved`
3. **Cal.com Webhook (booking.created)** → `welcome_call_booked`
4. **Approval Reminder Job (escalation)** → `escalation`
5. **Shopify Fulfillment Webhook** → `product_shipped`
6. **Admin Marks Delivered / Tracking API** → `product_received`
7. **E-Sign Send Button** → `contract_sent`
8. **E-Sign Signer Completes** → `contract_signed`
9. **Creator Submits in Pipeline** → `content_submitted`
10. **Admin Requests Revisions** → `content_revisions_requested`

---

## Constraints

- Slack notifications are fire-and-forget (don't block main operations)
- Product shipments require valid shipping address before creation
- Max 5 units per variant in sample orders
- Reminder chains max 5 steps each
- All operations tenant-isolated
- Shopify API rate limits apply to product fetching

---

## Pattern References

**RAWDOG code to reference:**
- `src/app/admin/creators/communications/slack/page.tsx` - Slack settings UI
- `src/lib/creator-portal/slack-notifications.ts` - Notification config
- `src/lib/creator-portal/slack-sender.ts` - Notification sender
- `src/app/admin/creators/components/SendProductModal.tsx` - Send modal
- `src/app/admin/creators/components/ProductShipmentHistory.tsx` - History
- `src/app/api/admin/creators/[id]/shipments/route.ts` - Shipments API
- `src/lib/creator-portal/product-shipments.ts` - Shipment lib
- `src/app/admin/creators/communications/settings/page.tsx` - Reminder settings
- `src/trigger/approval-reminders.ts` - Reminder task

---

## Tasks

### [PARALLEL] Database
- [ ] Create `creator_product_shipments` migration
- [ ] Create `creator_reminder_config` migration
- [ ] Add reminder tracking columns to creators table

### [PARALLEL with DB] Data Layer
- [ ] Implement Slack notification config functions (Redis)
- [ ] Implement product shipment CRUD functions
- [ ] Implement reminder config functions
- [ ] Implement Shopify draft order creation

### [SEQUENTIAL after data layer] API Routes
- [ ] Create Slack notification settings routes
- [ ] Create product shipments routes
- [ ] Create available products route (Shopify)
- [ ] Create reminder config routes

### [PARALLEL with API] Background Jobs
- [ ] Implement `checkApprovalReminders`
- [ ] Implement `checkWelcomeCallReminders`
- [ ] Implement `sendCreatorSlackNotification`
- [ ] Implement `syncCreatorShipments`

### [SEQUENTIAL after API/Jobs] UI Components
- [ ] Build SlackNotificationSettings page
- [ ] Build SendProductModal
- [ ] Build ShipmentHistory and ShipmentBadge
- [ ] Update CreatorCard with shipment badge
- [ ] Build ReminderChainConfig UI

### [SEQUENTIAL] Integration
- [ ] Wire up Slack notifications to trigger points
- [ ] Add SendProduct button to Creator modal/card
- [ ] Connect Cal.com webhook for welcome_call_booked

---

## Definition of Done

- [ ] All 10 Slack notification types configurable
- [ ] Slack messages send with correct formatting and action buttons
- [ ] SendProductModal creates Shopify draft order with 100% discount
- [ ] Orders tagged correctly: `['UGC', 'creator-sample', 'creator:{id}']`
- [ ] Shipment status visible on creator cards
- [ ] Reminder chains configurable with dynamic steps
- [ ] Approval reminders send on schedule
- [ ] Welcome call reminders send on schedule
- [ ] Escalation marks creators correctly
- [ ] All pages tenant-isolated
- [ ] `npx tsc --noEmit` passes
