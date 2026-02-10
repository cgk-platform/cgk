# PHASE-4E: Vendor Management

**Duration**: 0.5-1 week (Week 18-19, overlaps with PHASE-4D tail)
**Depends On**: PHASE-4A (creator portal foundation), PHASE-4B (payment infrastructure)
**Parallel With**: PHASE-4D (creator tax) - shares payee infrastructure
**Blocks**: PHASE-5C (jobs for vendors)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Vendor Management follows the same tenant isolation rules as Creator Portal:
- Vendors are stored in `public.vendors` (like creators)
- Vendor-tenant relationships stored in `public.vendor_brand_memberships` (if multi-brand needed)
- All queries scoped to tenant context
- Payee records link vendors to tenant-specific payment infrastructure

---

## Goal

Build vendor management system for external service providers (agencies, suppliers, consultants). Vendors differ from creators in that they:
- Submit invoices for work completed (vs. earning commissions)
- Don't have discount codes or commission rates
- Are typically paid on a per-project/contract basis
- May be company entities rather than individuals

---

## Vendors vs Creators vs Contractors

| Aspect | Vendors | Creators | Contractors |
|--------|---------|----------|-------------|
| **Primary Use** | Service providers, agencies, suppliers | Influencers, content creators | Freelance project workers |
| **Payment Model** | Invoice submission | Commission on sales | Project-based payments |
| **Discount Codes** | No | Yes | No |
| **Commission Rate** | No | Yes (per-brand) | No |
| **Multi-Brand** | Usually single brand | Multiple brands common | Usually single brand |
| **Contract** | Required | Optional | Required |
| **Portal** | `/vendor/*` | `/creator/*` | `/contractor/*` |
| **payee_type** | `'vendor'` | `'creator'` | `'contractor'` |

**Shared Infrastructure (via Payee system)**:
- Payment methods (Stripe Connect, PayPal, Venmo, check)
- Balance tracking (pending, available, paid)
- Withdrawal requests
- Tax information (W-9, 1099)
- Notification preferences

---

## Success Criteria

- [ ] Vendor interface with required fields defined
- [ ] `vendors` table created in tenant schema (with business_type, payment_terms)
- [ ] `vendor_invoices` table created for invoice workflow
- [ ] Vendor-payee linkage working
- [ ] Vendor portal authentication functional
- [ ] Vendor dashboard displays balance and payouts
- [ ] Invoice submission flow working with status tracking
- [ ] Payment terms enforced (due date calculation)
- [ ] Admin vendor directory with search/filter
- [ ] Admin vendor detail page with edit capability
- [ ] Admin invoice queue for approval workflow
- [ ] Contract upload/management functional
- [ ] Business entity type selection on vendor profile
- [ ] W-9 collects correct entity type (LLC, Corp, etc.)

---

## Deliverables

### Data Model

**Vendor Table (per-tenant schema)**:
```sql
CREATE TABLE vendors (
  id TEXT PRIMARY KEY DEFAULT 'vendor_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,  -- Required for B2B vendors
  email TEXT,
  phone TEXT,

  -- Business Entity Fields
  business_type TEXT DEFAULT 'llc', -- llc, s_corp, c_corp, partnership, sole_prop, other

  -- Payment Terms
  payment_terms TEXT DEFAULT 'net_30', -- due_on_receipt, net_15, net_30, net_45, net_60

  -- Standard fields
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active', -- active, pending, suspended, inactive
  notes TEXT,
  contract_url TEXT,
  contract_signed_at TIMESTAMP,
  contract_type TEXT, -- 'uploaded', 'link'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendors_tenant_id ON vendors(tenant_id);
CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_payment_terms ON vendors(payment_terms);
```

**Invoice Table (per-tenant schema)**:
```sql
CREATE TABLE vendor_invoices (
  id TEXT PRIMARY KEY DEFAULT 'vinv_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number TEXT,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  service_date DATE,

  -- File attachment
  invoice_file_url TEXT,
  invoice_file_name TEXT,

  -- Status workflow: submitted → pending_review → approved → paid (or rejected)
  status TEXT DEFAULT 'submitted',
  status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Approval tracking
  reviewed_by TEXT,  -- admin user ID
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Due date (calculated from payment terms)
  due_date DATE,

  -- Payment tracking
  payment_id TEXT,  -- reference to payee_withdrawal_requests
  paid_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendor_invoices_tenant ON vendor_invoices(tenant_id);
CREATE INDEX idx_vendor_invoices_vendor ON vendor_invoices(vendor_id);
CREATE INDEX idx_vendor_invoices_status ON vendor_invoices(status);
CREATE INDEX idx_vendor_invoices_due_date ON vendor_invoices(due_date);
CREATE INDEX idx_vendor_invoices_submitted ON vendor_invoices(created_at) WHERE status = 'submitted';
```

**Payee Linkage** (existing public schema):
```sql
-- Vendors link to payees via payee_type = 'vendor'
-- payees.reference_id = vendors.id
-- payees.payee_type = 'vendor'
```

### Vendor Interface

```typescript
// Business entity types for W-9 and tax purposes
type BusinessType = 'sole_prop' | 'llc' | 'llc_s' | 'llc_c' | 's_corp' | 'c_corp' | 'partnership' | 'trust' | 'nonprofit' | 'other'

// Payment terms configuration
type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'net_60'

interface Vendor {
  id: string
  tenantId: string
  name: string
  company: string  // Required for B2B
  email: string | null
  phone: string | null

  // Business entity details
  businessType: BusinessType

  // Payment terms
  paymentTerms: PaymentTerms

  // Standard fields
  tags: string[]
  status: 'active' | 'pending' | 'suspended' | 'inactive'
  notes: string | null
  contractUrl: string | null
  contractSignedAt: Date | null
  contractType: 'uploaded' | 'link' | null
  createdAt: Date
  updatedAt: Date
}

interface VendorWithPayee extends Vendor {
  payee: PayeeSummary | null
  balance: PayeeBalance | null
  payoutSummary: PayoutSummary | null
  paymentMethods: PaymentMethod[]
}

// Invoice status workflow
type InvoiceStatus = 'submitted' | 'pending_review' | 'approved' | 'rejected' | 'paid'

interface VendorInvoice {
  id: string
  tenantId: string
  vendorId: string
  invoiceNumber: string | null
  description: string
  amountCents: number
  serviceDate: Date | null
  invoiceFileUrl: string | null
  invoiceFileName: string | null
  status: InvoiceStatus
  statusChangedAt: Date
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  rejectionReason: string | null
  dueDate: Date | null
  paymentId: string | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

---

## Business Entity Types

Vendors are **company entities** with specific tax and legal requirements.

### Supported Entity Types

| Type | Code | W-9 Line | EIN/SSN | Tax Classification |
|------|------|----------|---------|-------------------|
| Sole Proprietor | `sole_prop` | Individual | SSN | Individual |
| LLC (Single Member) | `llc` | LLC | SSN or EIN | Disregarded entity |
| LLC (S-Corp Election) | `llc_s` | LLC | EIN | S-Corp |
| LLC (C-Corp Election) | `llc_c` | LLC | EIN | C-Corp |
| S-Corporation | `s_corp` | S-Corp | EIN | S-Corp |
| C-Corporation | `c_corp` | C-Corp | EIN | C-Corp |
| Partnership | `partnership` | Partnership | EIN | Partnership |
| Trust/Estate | `trust` | Trust | EIN | Trust |
| Nonprofit | `nonprofit` | Exempt | EIN | 501(c) |
| Other | `other` | Other | EIN | Varies |

### EIN vs SSN Logic

```typescript
function requiresEIN(businessType: BusinessType): boolean {
  // SSN allowed only for sole props and single-member LLCs
  return !['sole_prop', 'llc'].includes(businessType)
}

function getTaxIdLabel(businessType: BusinessType): string {
  return requiresEIN(businessType) ? 'EIN' : 'SSN or EIN'
}
```

### 1099-MISC vs 1099-NEC

**CRITICAL**: Vendors receive 1099-MISC, not 1099-NEC.

| Form | Recipients | Box |
|------|-----------|-----|
| 1099-NEC | Creators, Contractors | Box 1: Non-employee compensation |
| 1099-MISC | Vendors | Box 1: Rents, Box 3: Other income, Box 7: Non-employee compensation |

For vendors, typically use Box 7 (non-employee compensation) for service payments.

---

## Payment Terms

Each vendor can have configured payment terms that determine when invoices are due.

### Available Terms

| Term | Code | Days | Description |
|------|------|------|-------------|
| Due on Receipt | `due_on_receipt` | 0 | Payment expected immediately |
| Net 15 | `net_15` | 15 | Due 15 days from invoice |
| Net 30 | `net_30` | 30 | Standard business terms |
| Net 45 | `net_45` | 45 | Extended terms |
| Net 60 | `net_60` | 60 | Large enterprise contracts |

### Due Date Calculation

```typescript
function calculateDueDate(submittedAt: Date, paymentTerms: PaymentTerms): Date {
  const daysMap: Record<PaymentTerms, number> = {
    due_on_receipt: 0,
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60
  }

  const dueDate = new Date(submittedAt)
  dueDate.setDate(dueDate.getDate() + daysMap[paymentTerms])
  return dueDate
}
```

### Overdue Invoice Tracking

Invoices past their due date are flagged:
- 1-7 days overdue: Warning state
- 8-14 days overdue: Escalated notification to admin
- 15+ days overdue: High priority in queue

---

## Invoice Workflow

### Invoice Status Flow

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  SUBMITTED ──→ PENDING_REVIEW ──→ APPROVED ──→ PAID          │
│                      │                                        │
│                      ↓                                        │
│                  REJECTED                                     │
│                      │                                        │
│                      ↓                                        │
│              (Vendor can resubmit)                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Who Sets | Description |
|--------|----------|-------------|
| `submitted` | Vendor | Invoice just submitted, awaiting review |
| `pending_review` | System | Queued for admin review |
| `approved` | Admin | Approved, payment can be processed |
| `rejected` | Admin | Rejected with reason, vendor can resubmit |
| `paid` | System | Payment completed |

### Invoice Submission (Vendor Portal)

```typescript
interface InvoiceSubmission {
  amountCents: number  // Required
  description: string  // Required: description of services
  invoiceNumber?: string  // Optional: vendor's invoice reference
  serviceDate?: Date  // Optional: date services were rendered
  invoiceFile?: File  // Optional: PDF upload
}

// On submission:
// 1. Validate required fields
// 2. Upload file to tenant storage if provided
// 3. Calculate due date from vendor's payment terms
// 4. Create invoice record with status 'submitted'
// 5. Notify admin of pending invoice
```

### Invoice Approval (Admin)

```typescript
interface InvoiceApproval {
  invoiceId: string
  action: 'approve' | 'reject'
  notes?: string  // Admin notes (visible to vendor)
  rejectionReason?: string  // Required if rejecting
}

// On approval:
// 1. Update invoice status to 'approved'
// 2. Create payment record in payee_withdrawal_requests
// 3. Link invoice.payment_id to withdrawal request
// 4. Notify vendor of approval

// On rejection:
// 1. Update invoice status to 'rejected'
// 2. Set rejection_reason
// 3. Notify vendor with reason
// 4. Vendor can edit and resubmit
```

### Auto-Approval Option

For trusted vendors, admins can enable auto-approval:

```sql
ALTER TABLE vendors ADD COLUMN auto_approve_invoices BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN auto_approve_max_cents INTEGER; -- null = unlimited
```

Invoices from auto-approve vendors skip `pending_review` and go directly to `approved`.
```

### Vendor Portal Pages

| Route | Purpose |
|-------|---------|
| `/vendor/signin` | Login (password + magic link) |
| `/vendor/signup` | Self-registration with onboarding |
| `/vendor/forgot-password` | Password reset |
| `/vendor/payments` | Dashboard with balance, payouts |
| `/vendor/invoices` | Invoice history list |
| `/vendor/invoices/new` | Invoice submission form |
| `/vendor/invoices/[id]` | Invoice detail (view status, download) |
| `/vendor/settings/profile` | Company info, business type |
| `/vendor/settings/payout-methods` | Configure payment methods |
| `/vendor/settings/notifications` | Notification preferences |
| `/vendor/settings/tax` | W-9 submission (business entity), 1099-MISC access |

### Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/vendors` | Vendor directory with search/export |
| `/admin/vendors/[id]` | Vendor detail with edit, payments |
| `/admin/vendors/invoices` | **Invoice queue** - pending review, approve/reject |
| `/admin/vendors/invoices/[id]` | Invoice detail with approval actions |
| `/admin/vendors/invoices/overdue` | Overdue invoices alert view |

### API Routes

**Vendor Portal APIs** (`/api/vendor/*`):
- `POST /api/vendor/onboarding` - Public signup
- `POST /api/vendor/auth/signin` - Password login
- `POST /api/vendor/auth/magic-link` - Magic link login
- `GET /api/vendor/auth/session` - Session check
- `POST /api/vendor/auth/logout` - Logout
- `GET /api/vendor/payments/balance` - Get balance
- `GET /api/vendor/payments/methods` - List payment methods
- `POST /api/vendor/payments/request` - Submit invoice/payment request
- `GET /api/vendor/payments/withdraw` - List withdrawal history
- `POST /api/vendor/payments/withdraw` - Request withdrawal
- `GET/POST /api/vendor/settings/notifications` - Notification prefs
- `GET/PATCH /api/vendor/settings/profile` - Company profile (business type, payment terms)
- `GET /api/vendor/tax/info` - Tax status
- `GET /api/vendor/tax/forms` - Available tax forms

**Invoice APIs** (`/api/vendor/invoices/*`):
- `GET /api/vendor/invoices` - List vendor's invoices
- `POST /api/vendor/invoices` - Submit new invoice
- `GET /api/vendor/invoices/[id]` - Get invoice detail
- `PATCH /api/vendor/invoices/[id]` - Update invoice (if rejected, for resubmission)
- `POST /api/vendor/invoices/[id]/upload` - Upload invoice PDF

**Admin APIs** (`/api/admin/vendors/*`):
- `GET /api/admin/vendors` - List vendors (with search, CSV export)
- `GET /api/admin/vendors/[id]` - Vendor detail with payee info
- `PATCH /api/admin/vendors/[id]` - Update vendor (including payment terms)
- `GET /api/admin/vendors/invoices` - List all invoices (filterable by status)
- `GET /api/admin/vendors/invoices/[id]` - Invoice detail
- `POST /api/admin/vendors/invoices/[id]/approve` - Approve invoice
- `POST /api/admin/vendors/invoices/[id]/reject` - Reject invoice with reason
- `GET /api/admin/vendors/invoices/overdue` - Overdue invoices report

---

## Constraints

- Vendors are stored per-tenant (unlike creators which are cross-tenant)
- Each vendor has exactly one payee record (linked via `payee_type='vendor'` and `reference_id`)
- Contract management is simple (upload or link) - not e-sign like creators
- Vendors do NOT have discount codes or commission rates
- Invoice submission creates a payment request (not automatic earnings)
- Vendors receive 1099-MISC (not 1099-NEC like creators/contractors)
- Business entities MUST use EIN (except sole proprietors who can use SSN)
- Payment terms are set per-vendor, not per-invoice
- Invoices cannot be deleted, only rejected and resubmitted

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For vendor portal UI

**MCPs to consult:**
- Context7 MCP: "Next.js authentication patterns"
- Context7 MCP: "File upload to cloud storage"

**RAWDOG code to reference:**
- `src/app/vendor/` - Existing vendor portal structure
- `src/app/api/vendor/` - Existing vendor API routes
- `src/app/admin/vendors/` - Existing admin vendor pages
- `src/components/payee-portal/` - Shared payee portal components
- `src/lib/payees/` - Payee infrastructure (magic links, onboarding)

**Spec documents:**
- `PHASE-4A-CREATOR-PORTAL.md` - Authentication patterns
- `PHASE-4B-CREATOR-PAYMENTS.md` - Payment infrastructure
- `TENANT-ISOLATION.md` - Isolation rules

---

## Frontend Design Skill Integration

**MANDATORY**: Vendor portal shares the same UX principles as creator portal but is simpler.

### Vendor Portal Design Principles

- **Invoice-focused**: Primary action is submitting invoices for payment
- **Balance visibility**: Available balance prominent
- **Simple flows**: Vendors are B2B, less hand-holding needed
- **Contract visibility**: Easy access to signed contracts

### Component-Specific Skill Prompts

**1. Vendor Dashboard:**
```
/frontend-design

Building Vendor Dashboard for PHASE-4E-VENDOR-MANAGEMENT.

Requirements:
- Header section:
  - Welcome message with vendor name/company
  - Available balance (large, prominent)
  - "Request Payout" button
  - "Submit Invoice" primary action

- Balance Cards:
  - Available balance
  - Pending balance
  - Total paid (all time)

- Recent Payouts section:
  - Last 5-10 payout requests
  - Status, amount, date
  - Net amount after fees

- Quick Actions:
  - Set up payout method (if none)
  - Submit invoice
  - View tax forms

Layout:
- Single column, focused
- Mobile-friendly

User context:
- B2B vendors checking payment status
- Primary question: "When will I get paid?"
```

**2. Invoice Submission Form:**
```
/frontend-design

Building Invoice Submission form for vendor portal (PHASE-4E-VENDOR-MANAGEMENT).

Requirements:
- Form fields:
  - Amount (required)
  - Invoice number/reference (optional)
  - Description of services (required)
  - File upload for invoice PDF (optional)
  - Date of service (optional, defaults to today)

- Submit button
- Clear validation messages
- Success confirmation with request ID

Design:
- Clean, professional form
- File upload with drag-drop support
- Preview of uploaded file
```

**3. Admin Invoice Queue:**
```
/frontend-design

Building Admin Invoice Queue for PHASE-4E-VENDOR-MANAGEMENT.

Requirements:
- Header section:
  - Title "Invoice Queue"
  - Stats cards: Pending Review, Approved Today, Overdue
  - Filter tabs: All, Pending, Approved, Rejected, Overdue

- Table columns:
  - Vendor name + company
  - Invoice number
  - Amount
  - Service date
  - Due date (with overdue badge if past)
  - Status badge
  - Submitted date
  - Actions

- Row actions:
  - View detail (link)
  - Approve (quick action)
  - Reject (opens modal for reason)

- Bulk actions:
  - Select multiple
  - Bulk approve

- Overdue highlighting:
  - Yellow background for 1-7 days overdue
  - Red background for 8+ days overdue

Layout:
- Full-width table
- Sticky header for filters
- Pagination

User context:
- Admin reviewing vendor invoices
- Primary goal: Approve legitimate invoices quickly
```

**4. Vendor Profile Settings (Business Entity):**
```
/frontend-design

Building Vendor Profile Settings for PHASE-4E-VENDOR-MANAGEMENT.

Requirements:
- Company Information section:
  - Company name (required)
  - Business type dropdown (LLC, S-Corp, C-Corp, etc.)
  - Contact name
  - Email
  - Phone

- Payment Terms display:
  - Current terms (e.g., "Net 30")
  - Note: "Contact admin to change payment terms"
  - Due date calculation preview

- Contract section:
  - Current contract status
  - Link to view signed contract
  - Upload new contract button

Design:
- Two-column layout on desktop
- Read-only fields where vendor can't edit
- Clear distinction between editable and view-only
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Whether vendors need multi-brand support (probably not initially)
2. Invoice approval workflow (auto-approve vs admin approval)
3. File upload provider (Vercel Blob, S3, etc.)
4. Invoice status tracking granularity

---

## Tasks

### [PARALLEL] Data model and types
- [ ] Define Vendor interface in `apps/admin/src/lib/types/vendor.ts`
- [ ] Define VendorInvoice interface with status workflow
- [ ] Define BusinessType and PaymentTerms types
- [ ] Create SQL migration for `vendors` table (with business_type, payment_terms)
- [ ] Create SQL migration for `vendor_invoices` table
- [ ] Create index migrations

### [PARALLEL with above] Portal scaffolding
- [ ] Create `apps/vendor-portal/` app (or reuse creator-portal structure)
- [ ] Create vendor portal layout with PayeePortalGuard
- [ ] Set up vendor authentication flow (reuse payee magic link)

### [SEQUENTIAL after data model] Authentication
- [ ] Implement vendor signup (upsertPayeeProfile pattern)
- [ ] Implement password login
- [ ] Implement magic link login
- [ ] Create session management

### [SEQUENTIAL after auth] Portal pages
- [ ] Build vendor dashboard page
- [ ] Build invoice list page (`/vendor/invoices`)
- [ ] Build invoice submission page (`/vendor/invoices/new`)
- [ ] Build invoice detail page (`/vendor/invoices/[id]`)
- [ ] Build company profile settings page (business type, payment terms view)
- [ ] Build payout methods settings page
- [ ] Build notification settings page
- [ ] Build tax info page (with business entity W-9)

### [PARALLEL] Invoice workflow logic
- [ ] Implement due date calculation from payment terms
- [ ] Implement invoice submission API
- [ ] Implement invoice status transitions
- [ ] Implement invoice approval/rejection API
- [ ] Implement auto-approval for trusted vendors
- [ ] Implement overdue invoice detection

### [PARALLEL] Admin pages
- [ ] Build vendor directory page
- [ ] Build vendor detail page (with payment terms config)
- [ ] Build invoice queue page (`/admin/vendors/invoices`)
- [ ] Build invoice detail page with approve/reject actions
- [ ] Build overdue invoices alert view
- [ ] Implement vendor CRUD APIs
- [ ] Implement invoice management APIs

### [SEQUENTIAL after invoice workflow] Notifications
- [ ] Invoice submitted notification (to admin)
- [ ] Invoice approved notification (to vendor)
- [ ] Invoice rejected notification (to vendor with reason)
- [ ] Invoice overdue notification (to admin)
- [ ] Payment processed notification (to vendor)

---

## Definition of Done

- [ ] Vendor can self-register and access portal
- [ ] Vendor can submit invoices with file attachments
- [ ] Vendor can view invoice status and history
- [ ] Vendor can view balance and request payouts
- [ ] Vendor can configure payout methods
- [ ] Vendor W-9 supports business entity types
- [ ] Admin can view and manage vendors
- [ ] Admin can configure payment terms per vendor
- [ ] Admin can approve/reject invoices
- [ ] Admin can view overdue invoice alerts
- [ ] Admin can create payments to vendors
- [ ] Contract upload/link works
- [ ] Due dates calculated from payment terms
- [ ] 1099-MISC generation works for vendors
- [ ] Tenant isolation verified
- [ ] `npx tsc --noEmit` passes

---

## Integration with Existing Phases

### Dependencies from Earlier Phases

| Phase | What We Use |
|-------|-------------|
| PHASE-1B | Tenant schema, database patterns |
| PHASE-1C | JWT auth, session management |
| PHASE-4A | PayeePortalGuard, auth patterns |
| PHASE-4B | Stripe Connect, payment methods, balance tracking |
| PHASE-4D | W-9 collection, 1099 generation |

### What Later Phases Use

| Phase | What They Need |
|-------|----------------|
| PHASE-5C | Vendor payout jobs, notification triggers |
| PHASE-2CM | Vendor email templates, queue entries |
