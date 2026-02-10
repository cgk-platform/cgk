# Payee Type Model Specification

> **Purpose**: Clarify the relationship and differences between Creators, Contractors, and Vendors in the multi-tenant platform.

---

## Overview

The platform supports three types of external payees, all sharing a unified payment infrastructure but with distinct use cases, workflows, and portals.

```
                     ┌──────────────────────────────────────┐
                     │          PAYEE INFRASTRUCTURE        │
                     │  ┌─────────────────────────────────┐ │
                     │  │ Payment Methods (Stripe/PayPal) │ │
                     │  │ Balance Tracking                │ │
                     │  │ Withdrawal Requests             │ │
                     │  │ Tax Compliance (W-9/1099)       │ │
                     │  │ Magic Link Auth                 │ │
                     │  └─────────────────────────────────┘ │
                     └──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
     ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
     │   CREATOR   │           │ CONTRACTOR  │           │   VENDOR    │
     │   Portal    │           │   Portal    │           │   Portal    │
     │ /creator/*  │           │/contractor/*│           │  /vendor/*  │
     └─────────────┘           └─────────────┘           └─────────────┘
           │                          │                          │
           │                          │                          │
     Commission-based           Project-based             Invoice-based
     Multi-brand                Single-brand              Single-brand
     Content focus              Service focus             B2B focus
```

---

## Payee Type Comparison

| Aspect | Creator | Contractor | Vendor |
|--------|---------|------------|--------|
| **Portal Route** | `/creator/*` | `/contractor/*` | `/vendor/*` |
| **Primary Use** | Influencers, ambassadors, content creators | Freelance project workers, service providers | Business entities, agencies, suppliers |
| **Entity Type** | Individual | Individual | Often business entity (LLC, Corp) |
| **Compensation Model** | Commission on sales | Project-based + invoice | Invoice-based |
| **Payment Trigger** | Automatic from sales | Invoice approval | Invoice approval |
| **Multi-Brand** | Yes (common - creators work with many brands) | Usually single | Usually single |
| **Discount Codes** | Yes (per-brand) | No | No |
| **Commission Rate** | Yes (per-brand, e.g., 15%) | No | No |
| **Projects** | Content deliverables (posts, videos) | Service deliverables (design, dev) | N/A (invoice-based) |
| **Project Pipeline** | Simple (assigned → submitted → approved) | 6-stage Kanban | N/A |
| **Contract Type** | E-sign (full workflow) | Simple upload/link | Simple upload/link |
| **Tax Form** | 1099-NEC | 1099-NEC | 1099-MISC |
| **payee_type** | `'creator'` | `'contractor'` | `'vendor'` |

---

## Database Architecture

### Core Tables

```sql
-- PUBLIC SCHEMA (Cross-Tenant)

-- Unified payee table for payment infrastructure linkage
CREATE TABLE public.payees (
  id TEXT PRIMARY KEY DEFAULT 'payee_' || gen_random_uuid()::text,
  payee_type TEXT NOT NULL, -- 'creator' | 'contractor' | 'vendor'
  reference_id TEXT NOT NULL, -- FK to creators.id, contractors.id, or vendors.id
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payee_type, reference_id)
);

-- Creator master table (cross-tenant - creators work with multiple brands)
CREATE TABLE public.creators (
  id TEXT PRIMARY KEY DEFAULT 'creator_' || gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator-brand relationships (many-to-many)
CREATE TABLE public.creator_brand_memberships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id TEXT NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, paused, suspended
  commission_percent DECIMAL(5,2), -- e.g., 15.00%
  discount_code TEXT,
  balance_cents INTEGER DEFAULT 0,
  pending_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, tenant_id)
);

-- TENANT SCHEMA (Per-Tenant Isolation)

-- Contractors table (per-tenant - contractors typically work with one brand)
CREATE TABLE {tenant_schema}.contractors (
  id TEXT PRIMARY KEY DEFAULT 'contractor_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active', -- active, pending, suspended, inactive
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  contract_url TEXT,
  contract_type TEXT, -- 'uploaded', 'link'
  contract_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractor projects (per-tenant)
CREATE TABLE {tenant_schema}.contractor_projects (
  id TEXT PRIMARY KEY DEFAULT 'project_' || gen_random_uuid()::text,
  contractor_id TEXT NOT NULL REFERENCES {tenant_schema}.contractors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending_contractor',
    -- pending_contractor, draft, in_progress, submitted,
    -- revision_requested, approved, payout_ready,
    -- withdrawal_requested, payout_approved
  due_date DATE,
  rate_cents INTEGER, -- Hourly or project rate
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors table (per-tenant - vendors typically work with one brand)
CREATE TABLE {tenant_schema}.vendors (
  id TEXT PRIMARY KEY DEFAULT 'vendor_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  business_type TEXT, -- 'llc', 's_corp', 'c_corp', 'partnership', 'sole_proprietor'
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  notes TEXT,
  contract_url TEXT,
  contract_type TEXT,
  contract_signed_at TIMESTAMPTZ,
  payment_terms TEXT DEFAULT 'net_30', -- 'due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Shared Payment Tables (Public Schema)

```sql
-- Payment accounts for portal login
CREATE TABLE public.payee_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT,
  phone TEXT,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, active, suspended
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payee_id)
);

-- Payment methods (Stripe Connect, PayPal, Venmo, Check)
CREATE TABLE public.payee_payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'stripe_connect', 'stripe_connect_standard', 'paypal', 'venmo', 'check'
  is_default BOOLEAN DEFAULT FALSE,

  -- Stripe Connect fields
  stripe_account_id TEXT,
  stripe_account_status TEXT,
  stripe_onboarding_complete BOOLEAN,
  stripe_payouts_enabled BOOLEAN,
  stripe_charges_enabled BOOLEAN,
  stripe_details_submitted BOOLEAN,
  stripe_capabilities JSONB,
  stripe_requirements_due TEXT[],
  stripe_requirements_errors JSONB,
  stripe_access_token TEXT,
  stripe_refresh_token TEXT,
  account_country TEXT,
  account_currency TEXT,

  -- Alternative methods
  paypal_email TEXT,
  venmo_handle TEXT,
  check_address TEXT,
  bank_name TEXT,
  account_last_four TEXT,

  verification_status TEXT, -- 'verified', 'pending', 'failed'
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance transactions
CREATE TABLE public.payee_balance_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL, -- For tenant isolation in queries
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earnings', 'withdrawal', 'fee', 'reversal'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  reference_id TEXT, -- Links to project, payment request, etc.
  reference_type TEXT, -- 'project', 'invoice', 'commission', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment requests (invoices from contractors/vendors)
CREATE TABLE public.payee_payment_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  work_type TEXT, -- 'contract_work', 'consulting', 'project_delivery', 'maintenance', 'event', 'other'
  project_id TEXT, -- Optional link to project
  attachments TEXT[], -- URLs to uploaded files
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  admin_notes TEXT,
  approved_amount_cents INTEGER, -- Admin can approve different amount
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Tax information
CREATE TABLE public.payee_tax_info (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  payee_type TEXT NOT NULL, -- Denormalized for tax form routing
  country TEXT NOT NULL DEFAULT 'US',
  ssn_last_4 TEXT,
  ssn_encrypted TEXT, -- AES-256-GCM encrypted full SSN
  ein_encrypted TEXT, -- For business entities
  business_name TEXT,
  entity_type TEXT, -- 'individual', 'llc', 's_corp', 'c_corp', etc.
  w9_received_at TIMESTAMPTZ,
  w9_signed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payee_id)
);
```

---

## Payee Type Configuration

```typescript
// packages/payments/src/payee-config.ts

export const PAYEE_CONFIG = {
  creator: {
    table: 'creators',
    schemaType: 'public', // Cross-tenant
    payeeIdColumn: 'id',
    formType: '1099-NEC',
    supportsMultiBrand: true,
    hasDiscountCodes: true,
    hasCommissionRates: true,
    projectWorkflow: 'simple', // assigned → submitted → approved
    contractType: 'esign',
    portalPath: '/creator',
    paymentTrigger: 'automatic', // Commission from sales
  },

  contractor: {
    table: 'contractors',
    schemaType: 'tenant', // Per-tenant isolation
    payeeIdColumn: 'id',
    formType: '1099-NEC',
    supportsMultiBrand: false,
    hasDiscountCodes: false,
    hasCommissionRates: false,
    projectWorkflow: 'kanban', // 6-stage pipeline
    contractType: 'simple', // Upload or link
    portalPath: '/contractor',
    paymentTrigger: 'invoice', // Invoice approval
  },

  vendor: {
    table: 'vendors',
    schemaType: 'tenant', // Per-tenant isolation
    payeeIdColumn: 'id',
    formType: '1099-MISC',
    supportsMultiBrand: false,
    hasDiscountCodes: false,
    hasCommissionRates: false,
    projectWorkflow: null, // No project workflow
    contractType: 'simple',
    portalPath: '/vendor',
    paymentTrigger: 'invoice',
    supportsBusinessEntity: true, // LLC, Corp, etc.
    hasPaymentTerms: true, // Net 30, Net 60, etc.
  },
} as const

export type PayeeType = keyof typeof PAYEE_CONFIG
```

---

## Workflow Differences

### Creator Workflow (Commission-Based)

```
Sale Made → Commission Calculated → Balance Updated → Creator Withdraws
                   │
                   ▼
            (Automatic)
```

- Commissions calculated automatically when orders are placed
- Balance accrues without approval workflow
- Creator requests withdrawal when ready
- No invoice submission needed

### Contractor Workflow (Project-Based)

```
                          ┌─────────────────────────────────────────────────┐
                          │                KANBAN PIPELINE                  │
                          ├───────┬───────┬───────┬───────┬───────┬───────┤
Project Assigned ────────►│Upcoming│In Prog│Submit │Revise │Approve│Payout │
                          │       │       │       │       │       │       │
                          └───┬───┴───┬───┴───┬───┴───┬───┴───┬───┴───┬───┘
                              │       │       │       │       │       │
                              ▼       ▼       ▼       ▼       ▼       ▼
                          Contractor moves card as work progresses
                                      │
                                      ▼
                            Invoice Submitted (optional)
                                      │
                                      ▼
                            Admin Reviews & Approves
                                      │
                                      ▼
                              Balance Updated
                                      │
                                      ▼
                            Contractor Withdraws
```

- Admin assigns projects to contractors
- Contractor tracks work through 6-stage Kanban
- Contractor submits work and optionally invoices
- Admin approves and updates balance
- Contractor requests withdrawal

### Vendor Workflow (Invoice-Based)

```
Work Completed → Invoice Submitted → Admin Approves → Balance Updated → Vendor Withdraws
                        │                   │
                        ▼                   ▼
                  (Manual entry)     (Payment terms apply)
```

- Vendor completes work independently
- Vendor submits invoice with description and amount
- Admin reviews and approves (or rejects)
- Payment terms (Net 30, etc.) may apply
- Vendor requests withdrawal

---

## Shared Infrastructure Usage

### Authentication

All three payee types share the same authentication infrastructure:

```typescript
// Shared: packages/auth/src/payee-auth.ts

export async function authenticatePayee(email: string, password: string): Promise<PayeeSession> {
  // 1. Look up payee account by email
  const account = await getPayeeAccountByEmail(email)

  // 2. Verify password
  const valid = await verifyPassword(password, account.passwordHash)

  // 3. Load payee details based on type
  const payee = await getPayee(account.payeeId)

  // 4. Create session with type-specific claims
  return createPayeeSession(payee)
}

export async function sendMagicLink(email: string): Promise<void> {
  // Same flow for all payee types
}
```

### Payment Methods

All three types use the same payment method infrastructure:

```typescript
// Shared: packages/payments/src/payee-payment-methods.ts

export async function getPaymentMethods(payeeId: string): Promise<PaymentMethod[]> {
  return sql`
    SELECT * FROM public.payee_payment_methods
    WHERE payee_id = ${payeeId}
    ORDER BY is_default DESC, created_at DESC
  `
}

export async function addStripeConnect(payeeId: string, accountId: string): Promise<PaymentMethod> {
  // Same Stripe Connect flow for all types
}
```

### Balance Tracking

All three types use unified balance tracking:

```typescript
// Shared: packages/payments/src/payee-balance.ts

export async function getPayeeBalance(payeeId: string, tenantId: string): Promise<PayeeBalance> {
  const transactions = await sql`
    SELECT
      transaction_type,
      status,
      SUM(amount_cents) as total
    FROM public.payee_balance_transactions
    WHERE payee_id = ${payeeId}
      AND tenant_id = ${tenantId}
    GROUP BY transaction_type, status
  `

  // Calculate pending, available, paid
  return calculateBalance(transactions)
}
```

### Tax Compliance

All three types go through W-9 collection and 1099 generation:

```typescript
// Shared: packages/tax/src/payee-tax.ts

export async function getRequiredTaxForm(payeeType: PayeeType): TaxFormType {
  switch (payeeType) {
    case 'creator':
    case 'contractor':
      return '1099-NEC'
    case 'vendor':
      return '1099-MISC'
  }
}

export async function requiresW9(payeeId: string, tenantId: string): Promise<boolean> {
  // Check if payee has payments in current tax year
  // Check if W-9 already on file
  // Return true if W-9 needed before payouts
}
```

---

## Portal Structure

### Creator Portal (`/creator/*`)

```
/creator
├── /signin
├── /signup
├── /forgot-password
├── /reset-password
├── /dashboard              ← Multi-brand earnings overview
├── /messages               ← Messaging inbox
├── /projects               ← Content deliverables
├── /contracts              ← E-sign documents
├── /files                  ← File uploads
├── /settings
│   ├── /profile
│   ├── /security
│   ├── /notifications
│   ├── /payout-methods
│   └── /tax
└── /help
```

### Contractor Portal (`/contractor/*`)

```
/contractor
├── /signin
├── /signup
├── /forgot-password
├── /reset-password
├── /projects               ← 6-stage Kanban board
├── /payments               ← Balance + withdrawal requests
├── /request-payment        ← Invoice submission
├── /settings
│   ├── /payout-methods
│   │   └── /stripe-setup   ← Self-hosted Stripe onboarding
│   ├── /notifications
│   └── /tax
└── /help
```

### Vendor Portal (`/vendor/*`)

```
/vendor
├── /signin
├── /signup
├── /forgot-password
├── /payments               ← Balance + withdrawal requests
├── /request-payment        ← Invoice submission
├── /settings
│   ├── /payout-methods
│   ├── /notifications
│   └── /tax
└── /help
```

---

## Admin Management

### Unified Payees Dashboard

Consider a unified admin view for all payees:

```
/admin/payees              ← Combined view (filter by type)
/admin/payees/stats        ← Cross-type statistics
```

### Type-Specific Management

```
/admin/creators
├── /                      ← Creator directory
├── /[id]                  ← Creator detail
├── /contracts             ← E-sign contracts
└── /communications        ← Email queue

/admin/contractors
├── /                      ← Contractor directory
├── /[id]                  ← Contractor detail + projects
└── /projects              ← All contractor projects

/admin/vendors
├── /                      ← Vendor directory
├── /[id]                  ← Vendor detail
└── /invoices              ← Invoice approval queue
```

---

## Migration Considerations

### From RAWDOG to Multi-Tenant

1. **Creators**: Already support multi-brand via `creator_brand_memberships`
2. **Contractors**: Add `tenant_id` for isolation, migrate to tenant schema
3. **Vendors**: Add `tenant_id` for isolation, migrate to tenant schema
4. **Payees table**: Ensure all payee records have correct `payee_type`
5. **Balance transactions**: Add `tenant_id` to all existing transactions

### Data Isolation Rules

- **Creators**: Cross-tenant (public schema) - same creator, multiple brands
- **Contractors**: Per-tenant (tenant schema) - isolated per brand
- **Vendors**: Per-tenant (tenant schema) - isolated per brand
- **Payees table**: Public schema, but links to tenant-specific data
- **Transactions**: Public schema with `tenant_id` for query scoping

---

## API Pattern Summary

| Endpoint Pattern | Creator | Contractor | Vendor |
|------------------|---------|------------|--------|
| Auth | `/api/creator/auth/*` | `/api/contractor/auth/*` | `/api/vendor/auth/*` |
| Projects | `/api/creator/projects` | `/api/contractor/projects` | N/A |
| Payments | `/api/creator/payments/*` | `/api/contractor/payments/*` | `/api/vendor/payments/*` |
| Settings | `/api/creator/settings/*` | `/api/contractor/settings/*` | `/api/vendor/settings/*` |
| Tax | `/api/creator/tax/*` | `/api/contractor/tax/*` | `/api/vendor/tax/*` |
| Admin | `/api/admin/creators/*` | `/api/admin/contractors/*` | `/api/admin/vendors/*` |

---

## Non-Negotiable Requirements

1. **Tenant isolation**: Contractors and vendors are always tenant-scoped
2. **Payee infrastructure**: All three types share payment/tax infrastructure
3. **Separate portals**: Each type has its own portal and auth
4. **Tax compliance**: All types require W-9 collection for US payees
5. **Form types**: Creators/Contractors get 1099-NEC, Vendors get 1099-MISC
6. **No cross-type access**: A contractor cannot access creator portal, etc.

---

## Document References

- [PHASE-4A-CREATOR-PORTAL.md](./phases/PHASE-4A-CREATOR-PORTAL.md) - Creator portal spec
- [PHASE-4B-CREATOR-PAYMENTS.md](./phases/PHASE-4B-CREATOR-PAYMENTS.md) - Payment infrastructure
- [PHASE-4D-CREATOR-TAX.md](./phases/PHASE-4D-CREATOR-TAX.md) - Tax compliance
- [PHASE-4E-VENDOR-MANAGEMENT.md](./phases/PHASE-4E-VENDOR-MANAGEMENT.md) - Vendor portal spec
- [PHASE-4F-CONTRACTOR-PORTAL-CORE.md](./phases/PHASE-4F-CONTRACTOR-PORTAL-CORE.md) - Contractor portal spec
- [PHASE-4F-CONTRACTOR-PAYMENTS.md](./phases/PHASE-4F-CONTRACTOR-PAYMENTS.md) - Contractor payments
- [PHASE-4F-CONTRACTOR-ADMIN.md](./phases/PHASE-4F-CONTRACTOR-ADMIN.md) - Contractor admin
