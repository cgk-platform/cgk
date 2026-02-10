# PHASE-4F: Contractor Payments

**Duration**: 1 week (Week 20-21)
**Depends On**: PHASE-4F-CONTRACTOR-PORTAL-CORE, PHASE-4B (payment infrastructure)
**Parallel With**: PHASE-4F-CONTRACTOR-ADMIN
**Blocks**: PHASE-5C (payout jobs)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All contractor payment operations must be tenant-scoped:
- Balance queries filtered by `tenant_id`
- Payment requests associated with tenant
- Withdrawal requests scoped to tenant
- Tax info linked to tenant context

---

## Goal

Build the contractor payment system including balance tracking, invoice/payment request submission, payout method setup (Stripe Connect, PayPal, Venmo, Check), withdrawal requests, and tax form handling (W-9).

This phase reuses infrastructure from PHASE-4B (Creator Payments) via the unified payee system.

---

## Success Criteria

- [ ] Contractor balance displayed (pending, available, paid)
- [ ] Invoice/payment request submission working
- [ ] Multiple payout methods supported (Stripe Connect, PayPal, Venmo, Check)
- [ ] Stripe Connect self-hosted onboarding flow complete
- [ ] Withdrawal request flow working
- [ ] W-9 collection required before first payout
- [ ] Tax forms page shows W-9 status and 1099-NEC forms

---

## Deliverables

### Contractor Portal Pages

| Route | Purpose |
|-------|---------|
| `/contractor/payments` | Dashboard with balance + withdrawal history |
| `/contractor/request-payment` | Invoice/payment request form |
| `/contractor/settings/payout-methods` | Manage payout methods |
| `/contractor/settings/payout-methods/stripe-setup` | Self-hosted Stripe Connect onboarding |
| `/contractor/settings/tax` | W-9 submission + 1099 access |
| `/contractor/settings/notifications` | Notification preferences |

### API Routes

**Balance & Transactions:**
```
GET    /api/contractor/payments/balance        - Get balance (pending/available/paid)
GET    /api/contractor/payments/transactions   - Transaction history with pagination
```

**Withdrawal:**
```
GET    /api/contractor/payments/withdraw       - List withdrawal history
POST   /api/contractor/payments/withdraw       - Request withdrawal
```

**Payment Requests (Invoices):**
```
GET    /api/contractor/payments/request        - List payment requests
POST   /api/contractor/payments/request        - Submit new payment request
POST   /api/contractor/payments/request/upload - Upload invoice attachments
```

**Payout Methods:**
```
GET    /api/contractor/payments/methods        - List payout methods + W-9 status
POST   /api/contractor/payments/methods        - Add PayPal/Venmo/Check method
PATCH  /api/contractor/payments/methods        - Update or set default
DELETE /api/contractor/payments/methods?id=xxx - Remove method
```

**Stripe Connect:**
```
POST   /api/contractor/payments/connect/oauth          - Initiate OAuth flow
GET    /api/contractor/payments/connect/oauth/callback - Handle OAuth callback
POST   /api/contractor/payments/connect/onboard        - Get onboarding status
POST   /api/contractor/payments/connect/update         - Update account info (step-based)
POST   /api/contractor/payments/connect/refresh        - Refresh access token
POST   /api/contractor/payments/connect/sync           - Sync account status
GET    /api/contractor/payments/connect/countries      - Get available countries
POST   /api/contractor/payments/connect/bank-account   - Add bank account
```

**Tax:**
```
GET    /api/contractor/tax/info       - Get W-9 status
POST   /api/contractor/tax/info       - Submit W-9 info
GET    /api/contractor/tax/forms      - List tax forms (1099-NEC)
GET    /api/contractor/tax/forms/[id] - Download tax form
```

**Notifications:**
```
GET    /api/contractor/settings/notifications  - Get preferences
POST   /api/contractor/settings/notifications  - Update preferences
```

### Shared Infrastructure (from PHASE-4B)

This phase reuses the payee payment infrastructure:

```typescript
// packages/payments/src/payee-balance.ts
export async function getPayeeBalance(
  payeeId: string,
  tenantId: string
): Promise<PayeeBalance>

// packages/payments/src/payee-withdrawal.ts
export async function createWithdrawalRequest(
  payeeId: string,
  tenantId: string,
  amountCents: number,
  paymentMethodId: string
): Promise<WithdrawalRequest>

// packages/payments/src/payee-payment-methods.ts
export async function getPaymentMethods(payeeId: string): Promise<PaymentMethod[]>
export async function addStripeConnect(payeeId: string, ...): Promise<PaymentMethod>
```

### Payment Request (Invoice) System

```typescript
interface PaymentRequest {
  id: string
  payeeId: string
  tenantId: string
  amountCents: number
  description: string
  workType: 'contract_work' | 'consulting' | 'project_delivery' | 'maintenance' | 'event' | 'other'
  projectId: string | null
  attachments: string[] // URLs to uploaded files
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  adminNotes: string | null
  approvedAmountCents: number | null
  createdAt: Date
  reviewedAt: Date | null
  paidAt: Date | null
}

// Validation rules
const PAYMENT_REQUEST_RULES = {
  minAmountCents: 1000, // $10 minimum
  minDescriptionLength: 10,
  maxPendingRequests: 3, // Max 3 pending at once
  allowedWorkTypes: ['contract_work', 'consulting', 'project_delivery', 'maintenance', 'event', 'other'],
}
```

### Payout Method Types

```typescript
type PayoutMethodType =
  | 'stripe_connect'         // Standard Stripe Connect
  | 'stripe_connect_standard' // Stripe Connect Standard accounts
  | 'paypal'                 // PayPal email
  | 'venmo'                  // Venmo handle
  | 'check'                  // Mailing address

interface PaymentMethod {
  id: string
  payeeId: string
  type: PayoutMethodType
  isDefault: boolean

  // Stripe Connect fields
  stripeAccountId: string | null
  stripeAccountStatus: string | null
  stripeOnboardingComplete: boolean
  stripePayoutsEnabled: boolean
  stripeChargesEnabled: boolean
  stripeDetailsSubmitted: boolean
  stripeCapabilities: Record<string, string> | null
  stripeRequirementsDue: string[]
  stripeRequirementsErrors: StripeRequirementError[]
  stripeAccessToken: string | null
  stripeRefreshToken: string | null
  accountCountry: string | null
  accountCurrency: string | null

  // Alternative methods
  paypalEmail: string | null
  venmoHandle: string | null
  checkAddress: string | null
  bankName: string | null
  accountLastFour: string | null

  verificationStatus: 'verified' | 'pending' | 'failed' | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

### Stripe Connect Self-Hosted Onboarding

Multi-step form for Stripe Connect setup (avoids redirect to Stripe):

```typescript
// Step 1: Business Type Selection
interface Step1Data {
  businessType: 'individual' | 'company'
  country: string
}

// Step 2: Personal Information (Individual) or Company Information
interface Step2Data {
  // Individual
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: {
    day: number
    month: number
    year: number
  }

  // Company
  companyName?: string
  companyPhone?: string
  taxId?: string
}

// Step 3: Address
interface Step3Data {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

// Step 4: Identity Verification
interface Step4Data {
  ssn?: string // Full SSN for US
  ssnLast4?: string // Last 4 only (for some countries)
  cpf?: string // Brazil
  nationalId?: string // Other countries
}

// Country-specific requirements from payee-stripe-country-specs.ts
const COUNTRY_REQUIREMENTS = {
  US: {
    requiresFullSSN: true,
    supportedBusinessTypes: ['individual', 'company'],
    requiresIdentityVerification: true,
  },
  BR: {
    requiresCPF: true,
    supportedBusinessTypes: ['individual', 'company'],
    requiresIdentityVerification: true,
  },
  // ... other countries
}
```

### W-9 Collection Flow

```typescript
interface W9Info {
  payeeId: string
  country: string
  ssnLast4: string
  ssnEncrypted: string // AES-256-GCM encrypted
  businessName: string | null
  entityType: 'individual' | 'llc' | 's_corp' | 'c_corp' | 'partnership' | 'sole_proprietor'
  w9ReceivedAt: Date
  w9SignedBy: string
}

// W-9 is required before:
// 1. First withdrawal request
// 2. Contractor has US payout method

async function requiresW9(payeeId: string, tenantId: string): Promise<boolean> {
  const taxInfo = await getTaxInfo(payeeId)
  if (taxInfo?.w9ReceivedAt) return false

  const methods = await getPaymentMethods(payeeId)
  const hasUSMethod = methods.some(m => m.accountCountry === 'US')

  return hasUSMethod
}
```

---

## Constraints

- Payment requests require $10 minimum
- Maximum 3 pending payment requests at once
- W-9 required for US contractors before first payout
- Stripe Connect onboarding requires identity verification for payouts
- All amounts stored in cents (integer precision)
- OAuth tokens encrypted at rest (AES-256-GCM)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For payment UI components

**MCPs to consult:**
- Context7 MCP: "Stripe Connect Express onboarding"
- Context7 MCP: "React form multi-step wizard"

**RAWDOG code to reference:**
- `src/app/contractor/payments/` - **Payments dashboard**
- `src/app/contractor/request-payment/` - **Invoice submission form**
- `src/app/contractor/settings/payout-methods/` - **Payout method management**
- `src/app/contractor/settings/payout-methods/stripe-setup/` - **Self-hosted Stripe onboarding**
- `src/app/contractor/settings/tax/` - **W-9 and tax forms**
- `src/app/api/contractor/payments/` - **All payment API routes (12 routes)**
- `src/app/api/contractor/payments/connect/` - **Stripe Connect routes (9 routes)**
- `src/lib/payments/payee-balance.ts` - **Balance calculation**
- `src/lib/payments/payee-stripe-country-specs.ts` - **Country requirements**

**Spec documents:**
- [PHASE-4B-CREATOR-PAYMENTS.md](./PHASE-4B-CREATOR-PAYMENTS.md) - Payment infrastructure
- [PHASE-4D-CREATOR-TAX.md](./PHASE-4D-CREATOR-TAX.md) - Tax compliance

---

## Frontend Design Skill Integration

### Component-Specific Skill Prompts

**1. Contractor Payments Dashboard:**
```
/frontend-design

Building Contractor Payments Dashboard for PHASE-4F-CONTRACTOR-PAYMENTS.

Requirements:
- Header section:
  - "Your Balance" title
  - Available balance (large, green if > 0)
  - "Request Payout" button (disabled if no balance or no method)

- Balance cards (horizontal row):
  - Pending (awaiting approval)
  - Available (can withdraw)
  - Paid (lifetime total)

- Alert section (conditional):
  - W-9 required alert (if US and no W-9)
  - Payout method required alert (if no methods set up)
  - Stripe onboarding incomplete alert

- Payment Requests section:
  - Table: Amount, Description, Status, Submitted, Actions
  - Status badges: pending (yellow), approved (green), rejected (red), paid (blue)
  - "Request Payment" button

- Withdrawal History section:
  - Table: Amount, Method, Status, Requested, Completed
  - Expandable rows for transaction details

Layout:
- Single column, focused
- Cards for balance metrics
- Tables for history

User context:
- Contractor checking balance and payment status
- Primary questions: "How much can I withdraw?" and "When will I get paid?"
```

**2. Payment Request Form:**
```
/frontend-design

Building Payment Request (Invoice) form for contractor portal (PHASE-4F-CONTRACTOR-PAYMENTS).

Requirements:
- Form fields:
  - Amount (required, $10 minimum)
  - Work Type dropdown (6 options)
  - Description (required, 10+ chars)
  - Project link (optional, select from approved projects)
  - File upload for invoice/receipt (optional, drag-drop)

- Validation:
  - Amount minimum $10
  - Description minimum 10 characters
  - Max 3 pending requests warning

- Submit:
  - Loading state
  - Success: redirect to payments with toast
  - Error: inline error message

Design:
- Clean, professional form
- Inline validation with clear errors
- File upload with preview
- Submit button prominent
```

**3. Payout Methods Page:**
```
/frontend-design

Building Payout Methods settings for contractor portal (PHASE-4F-CONTRACTOR-PAYMENTS).

Requirements:
- Method types section:
  - Stripe Connect (recommended badge)
  - PayPal
  - Venmo
  - Check

- Current methods list:
  - Method type with icon
  - Account identifier (last 4, email, etc.)
  - Status (verified, pending, needs action)
  - Default badge if default
  - Actions: Set Default, Remove

- Add method flow:
  - Select type → enter details → verify
  - Stripe: "Connect with Stripe" button → self-hosted setup
  - PayPal: email input
  - Venmo: handle input
  - Check: address form

- Stripe onboarding status:
  - Requirements checklist
  - "Complete Setup" button if incomplete

Design:
- Card per method type
- Clear status indicators
- Mobile-friendly
```

**4. Stripe Self-Hosted Setup:**
```
/frontend-design

Building self-hosted Stripe Connect setup wizard for contractor portal (PHASE-4F-CONTRACTOR-PAYMENTS).

Requirements:
- Multi-step form (4 steps):
  1. Business Type (Individual/Company) + Country
  2. Personal/Company Info (name, phone, DOB/tax ID)
  3. Address (street, city, state, postal, country)
  4. Identity (SSN/CPF/National ID based on country)

- Progress indicator:
  - Step numbers with labels
  - Current step highlighted
  - Completed steps checkmarked

- Each step:
  - Clear form fields
  - Inline validation
  - "Continue" button
  - "Back" button (after step 1)

- Final step:
  - Review summary
  - "Complete Setup" button
  - Redirect to payout methods on success

- Country-specific:
  - Different ID requirements per country
  - Show/hide fields based on country

Design:
- Clean wizard layout
- Single column form
- Mobile-friendly
- Secure feel (lock icons, privacy notice)
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Multi-step form library (react-hook-form steps, custom, or wizard library)
2. File upload provider (Vercel Blob resumable, S3 presigned, etc.)
3. Stripe Connect account type (Express vs. Standard)
4. Balance recalculation strategy (on-demand vs. cached)

---

## Tasks

### [PARALLEL] Payment infrastructure integration
- [ ] Integrate with PHASE-4B payee balance functions
- [ ] Integrate with payee payment methods functions
- [ ] Set up contractor-specific payment request table

### [PARALLEL with above] API routes
- [ ] Create balance endpoint
- [ ] Create transaction history endpoint
- [ ] Create payment request endpoints (list, create, upload)
- [ ] Create withdrawal endpoints (list, create)
- [ ] Create payment methods CRUD endpoints
- [ ] Create Stripe Connect OAuth flow endpoints
- [ ] Create Stripe self-hosted update endpoints
- [ ] Create tax info endpoints

### [SEQUENTIAL after API] Portal pages
- [ ] Build payments dashboard page
- [ ] Build payment request form page
- [ ] Build payout methods settings page
- [ ] Build Stripe self-hosted setup wizard
- [ ] Build tax settings page
- [ ] Build notification settings page

### [PARALLEL] Alerts and notifications
- [ ] Implement W-9 required alert
- [ ] Implement payout method required alert
- [ ] Implement Stripe incomplete alert

---

## Definition of Done

- [ ] Contractor sees accurate balance (pending/available/paid)
- [ ] Contractor can submit payment requests with attachments
- [ ] Contractor can add Stripe Connect via self-hosted flow
- [ ] Contractor can add PayPal/Venmo/Check methods
- [ ] Contractor can request withdrawal
- [ ] W-9 enforced for US contractors before payout
- [ ] Tax forms page shows W-9 status and 1099s
- [ ] Tenant isolation verified on all endpoints
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: full payment flow works

---

## Integration with Other Phases

### Dependencies from Earlier Phases

| Phase | What We Use |
|-------|-------------|
| PHASE-1B | Tenant schema, database patterns |
| PHASE-4A | Auth patterns, session management |
| PHASE-4B | Payment infrastructure (balance, methods, withdrawal) |
| PHASE-4D | Tax compliance (W-9, 1099) |
| PHASE-4F-CORE | Contractor auth, project linkage |

### What Later Phases Use

| Phase | What They Need |
|-------|----------------|
| PHASE-4F-ADMIN | Payment approval workflow |
| PHASE-5C | Payout processing jobs |
| PHASE-2CM | Payment notification templates |
