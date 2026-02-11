# PHASE-2H: Treasury Management

**Status**: COMPLETE
**Duration**: 1 week (Week 7-8)
**Depends On**: Phase 2A (Admin Shell), Phase 2D (Admin Finance foundation), Phase 4B (Creator Payments)
**Parallel With**: Phase 2H-EXPENSES, Phase 2H-GIFT-CARDS
**Blocks**: None

---

## Goal

Implement treasury management for SBA loan draw requests, approval workflows, balance tracking, Stripe top-ups, and receipt/invoice management. Treasury enables financial oversight with email-based approvals and automated payment processing.

---

## Success Criteria

- [x] Treasury draw request creation and tracking
- [x] Email-based approval workflow with parsing
- [x] PDF generation for draw requests
- [x] Communication log per request
- [x] Receipt/invoice upload and management
- [x] Stripe top-up management
- [x] Balance tracking and alerts
- [x] Auto-send automation configuration
- [x] Slack notifications for treasury events

---

## Deliverables

### Treasury Draw Requests

Draw requests bundle pending payouts for treasurer approval:

**Request States:**
- `pending` - Awaiting treasurer approval
- `approved` - Approved, ready for processing
- `rejected` - Rejected with reason
- `cancelled` - Cancelled by admin

**Request Fields:**
- Request number (auto-generated)
- Description
- Total amount (sum of items)
- Treasurer name and email
- Signers list
- Due date
- PDF URL
- Status and timestamps

**Database Schema:**
```sql
CREATE TABLE treasury_draw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  treasurer_name TEXT NOT NULL,
  treasurer_email TEXT NOT NULL,
  signers TEXT[] NOT NULL,
  due_date DATE,
  is_draft BOOLEAN DEFAULT false,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  approval_message TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, request_number)
);

CREATE TABLE treasury_draw_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES treasury_draw_requests(id) ON DELETE CASCADE,
  withdrawal_id UUID NOT NULL,
  creator_name TEXT NOT NULL,
  project_description TEXT,
  net_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Email-Based Approval Workflow

Treasurers can approve/reject via email reply:

**Outbound Email:**
- Sent to treasurer with request details
- PDF attachment or link
- Clear instructions for approval/rejection
- Reply-to address for parsing

**Inbound Parsing:**
- Parse email body for approval keywords ("approved", "yes", "ok")
- Parse for rejection keywords ("rejected", "no", "denied")
- Extract any additional message/reason
- Confidence scoring (high/medium/low)
- Matched keywords tracking

**Communication Log:**
- All outbound and inbound messages logged
- Direction (outbound/inbound)
- Channel (email)
- Subject and body
- Parsed status and confidence
- Matched keywords

**Database Schema:**
```sql
CREATE TABLE treasury_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES treasury_draw_requests(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'outbound' or 'inbound'
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  parsed_status TEXT, -- 'approved', 'rejected', 'unclear'
  parsed_confidence TEXT, -- 'high', 'medium', 'low'
  matched_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### PDF Generation

Generate professional PDF for each draw request:

**PDF Contents:**
- Company header with tenant branding
- Request number and date
- Total amount
- Line items (payee, project, amount)
- Signature lines for signers
- Footer with treasury contact

**Implementation:**
- Use @react-pdf/renderer or jsPDF
- Store in Vercel Blob
- Link stored in treasury_draw_requests.pdf_url

### Receipt/Invoice Management

Track incoming invoices and receipts:

**Receipt Features:**
- Upload receipt/invoice files
- Associate with expense or vendor
- OCR extraction (optional, future)
- Status tracking (pending, processed, archived)
- Link to operating expenses

**Admin UI:**
- Receipts tab in Treasury page
- Upload with drag-and-drop
- List with filters (status, date, vendor)
- Preview in modal

### Stripe Top-ups

Manage platform balance top-ups:

**Top-up Features:**
- View current Stripe balance
- Create new top-up from bank account
- Track top-up status (pending, succeeded, failed)
- Link top-ups to pending withdrawals
- Auto top-up configuration

**Funding Sources:**
- List connected bank accounts
- Set default funding source
- Configure auto top-up threshold and amount

**Database Schema:**
```sql
CREATE TABLE stripe_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_topup_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'canceled', 'reversed'
  failure_code TEXT,
  failure_message TEXT,
  expected_available_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  linked_withdrawal_ids UUID[],
  statement_descriptor TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, stripe_topup_id)
);

CREATE TABLE topup_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  default_source_id TEXT,
  default_source_last4 TEXT,
  default_source_bank_name TEXT,
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_threshold_cents INTEGER DEFAULT 0,
  auto_topup_amount_cents INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Auto-Send Automation

Configure automatic sending of approved payouts:

**Settings:**
- Enable/disable auto-send
- Send delay (e.g., 24 hours after approval)
- Maximum amount per auto-send
- Notification preferences

### Treasury Settings

Configurable per tenant:

**Settings:**
- Treasurer email
- Treasurer name
- Signers list (default)
- Auto-send enabled
- Low balance alert threshold
- Slack webhook for notifications

---

## Constraints

- Email parsing must handle various response formats
- PDF generation must be fast (< 2 seconds)
- Stripe API errors must surface clearly with retry options
- All treasury actions require appropriate permissions
- Financial data requires audit logging
- Inbound email handling requires webhook configuration (Resend)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For draw request modal, communication log, receipts grid

**RAWDOG code to reference:**
- `src/app/admin/treasury/page.tsx` - Treasury dashboard
- `src/app/admin/treasury/settings/page.tsx` - Treasury settings
- `src/app/admin/stripe-topups/page.tsx` - Top-up management
- `src/lib/treasury/` - All treasury logic
  - `types.ts` - Type definitions
  - `email.ts` - Email sending
  - `approval-parser.ts` - Inbound parsing
  - `communications.ts` - Comms logging
  - `pdf-generator.ts` - PDF creation
  - `auto-send.ts` - Automation
  - `slack.ts` - Notifications
- `src/components/admin/treasury/ReceiptsSection.tsx` - Receipts UI

---

## AI Discretion Areas

The implementing agent should determine:
1. PDF styling and layout
2. Email parsing keyword lists and confidence thresholds
3. Communication log expansion UI
4. Top-up confirmation modal design
5. Low balance alert UI treatment

---

## Tasks

### [PARALLEL] Database Layer

- [x] Create `apps/admin/src/lib/treasury/types.ts`
- [x] Create `apps/admin/src/lib/treasury/db/requests.ts`
- [x] Create `apps/admin/src/lib/treasury/db/communications.ts`
- [x] Create `apps/admin/src/lib/treasury/db/receipts.ts`
- [x] Create `apps/admin/src/lib/treasury/db/topups.ts`
- [x] Create `apps/admin/src/lib/treasury/db/settings.ts`

### [PARALLEL] Core Treasury Logic

- [x] Create `apps/admin/src/lib/treasury/pdf-generator.ts`
- [x] Create `apps/admin/src/lib/treasury/email.ts`
- [x] Create `apps/admin/src/lib/treasury/approval-parser.ts`
- [x] Create `apps/admin/src/lib/treasury/auto-send.ts`
- [x] Create `apps/admin/src/lib/treasury/slack.ts`

### [PARALLEL] API Routes

- [x] Create `apps/admin/src/app/api/admin/treasury/requests/route.ts`
- [x] Create `apps/admin/src/app/api/admin/treasury/requests/[id]/route.ts`
- [x] Create `apps/admin/src/app/api/admin/treasury/settings/route.ts`
- [x] Create `apps/admin/src/app/api/admin/treasury/receipts/route.ts`
- [x] Create `apps/admin/src/app/api/admin/stripe/topups/route.ts`
- [x] Create `apps/admin/src/app/api/admin/stripe/balance/route.ts`
- [x] Create `apps/admin/src/app/api/admin/stripe/funding-sources/route.ts`
- [x] Create `apps/admin/src/app/api/admin/stripe/pending-withdrawals/route.ts`
- [x] Create `apps/admin/src/app/api/webhooks/resend/treasury/route.ts` (inbound email)

### [SEQUENTIAL after API] Admin UI

- [x] Create `apps/admin/src/app/admin/treasury/page.tsx`
- [x] Create `apps/admin/src/app/admin/treasury/settings/page.tsx`
- [x] Create `apps/admin/src/app/admin/stripe-topups/page.tsx`
- [x] Create `apps/admin/src/components/admin/treasury/RequestDetail.tsx`
- [x] Create `apps/admin/src/components/admin/treasury/CommunicationLog.tsx`
- [x] Create `apps/admin/src/components/admin/treasury/ReceiptsSection.tsx`
- [x] Create `apps/admin/src/components/admin/treasury/TopupModal.tsx`

### [SEQUENTIAL after UI] Background Jobs

- [x] Create job: `treasury/send-approval-email`
- [x] Create job: `treasury/process-inbound-email`
- [x] Create job: `treasury/auto-send-approved`
- [x] Create job: `treasury/sync-topup-statuses`
- [x] Create job: `treasury/low-balance-alert`

---

## API Endpoints Specification

### GET /api/admin/treasury/requests
**Query params:** status (optional), payee (optional)
**Returns:** requests[] with items and payee info

### GET /api/admin/treasury/requests/[id]
**Returns:** Full request with items and communications

### PATCH /api/admin/treasury/requests/[id]
**Body:** { action: 'approve' | 'reject' | 'cancel' | 'withdraw', reason?: string }
**Returns:** Updated request

### POST /api/admin/stripe/balance
**Body:** { amountCents, description, sourceId, linkedWithdrawalIds }
**Returns:** Created top-up

### GET /api/admin/stripe/funding-sources
**Returns:** sources[], settings, configuredInDashboard flag

---

## Definition of Done

- [x] Treasury requests can be created from pending payouts
- [x] Approval emails sent with PDF attachment
- [x] Inbound emails parsed for approval/rejection
- [x] Communication log shows all messages
- [x] Manual approve/reject works from UI
- [x] Receipts can be uploaded and managed
- [x] Stripe top-ups can be created and tracked
- [x] Balance shown with pending indicator
- [x] Funding sources configurable
- [x] Auto-send works when enabled
- [x] Slack notifications fire on key events
- [x] All data properly tenant-isolated
- [x] `npx tsc --noEmit` passes

---

## Implementation Notes

### Files Created

**Database Migration:**
- `packages/db/src/migrations/tenant/015_treasury.sql` - All treasury tables with proper enums and indexes

**Types:**
- `apps/admin/src/lib/treasury/types.ts` - Extended with all treasury types

**Database Operations:**
- `apps/admin/src/lib/treasury/db/requests.ts` - Draw request CRUD operations
- `apps/admin/src/lib/treasury/db/communications.ts` - Communication log operations
- `apps/admin/src/lib/treasury/db/receipts.ts` - Receipt management
- `apps/admin/src/lib/treasury/db/topups.ts` - Stripe top-up tracking
- `apps/admin/src/lib/treasury/db/settings.ts` - Treasury and top-up settings

**Core Logic:**
- `apps/admin/src/lib/treasury/approval-parser.ts` - Email parsing with confidence scoring
- `apps/admin/src/lib/treasury/email.ts` - Approval email building and sending
- `apps/admin/src/lib/treasury/pdf-generator.ts` - PDF generation with Vercel Blob storage
- `apps/admin/src/lib/treasury/auto-send.ts` - Automated payout processing
- `apps/admin/src/lib/treasury/slack.ts` - Slack webhook notifications

**API Routes:**
- All treasury API routes created with proper tenant isolation
- Webhook route for inbound email processing via Resend

**UI Components:**
- Treasury dashboard with industrial banking aesthetic
- Settings page with comprehensive configuration
- RequestDetail modal for viewing/managing requests
- CommunicationLog for email thread display
- ReceiptsSection for receipt management
- TopupModal for creating Stripe top-ups

**Background Jobs:**
- `packages/jobs/src/handlers/treasury.ts` - All treasury background jobs
- Jobs for email sending, auto-send, status sync, and low balance alerts

### Design Aesthetic

The treasury UI uses an "Industrial Banking" design aesthetic - combining Swiss private banking precision with industrial control panel elements. Features include:
- Monospace typography for financial figures
- Slate/emerald/amber color palette
- Data-dense layouts with clear visual hierarchy
- Subtle gradients and shadows for depth
