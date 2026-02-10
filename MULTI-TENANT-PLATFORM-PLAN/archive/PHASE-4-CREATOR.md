# Phase 4: Creator Portal & Payments

**Duration**: 4 weeks
**Focus**: Creator/contractor management and hybrid payment system

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| INTEGRATIONS | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` |
| DATABASE-SCHEMA | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/DATABASE-SCHEMA-2025-02-10.md` |

---

## Required Skills for This Phase

**CRITICAL**: Creator-facing UI requires production-grade design.

| Skill | Usage |
|-------|-------|
| `/frontend-design` | **REQUIRED** - Creator dashboard, forms, file uploads |
| Context7 MCP | Stripe Connect, file upload, e-signature patterns |
| `obra/superpowers@test-driven-development` | TDD for payment and payout flows |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(frontend-design|documentation-lookup|test-driven)"

# If missing, install:
npx skills add anthropics/skills@frontend-design -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### Creator Portal Development Workflow
1. **Always invoke `/frontend-design`** for creator UI components
2. Use Context7 MCP to look up Stripe Connect, Vercel Blob patterns
3. Focus on intuitive UX for non-technical creators
4. Critical flows require TDD: payouts, tax forms, e-signatures

---

## Objectives

1. Build creator portal with multi-brand support
2. Implement hybrid payment system (Stripe + Wise)
3. Port project management and file uploads
4. Create e-signature workflow
5. Set up tax form generation (1099s)

---

## Week 1: Creator Portal Foundation

### Multi-Brand Creator Model

Creators can work with multiple brands (unlike admin which is brand-specific):

```typescript
// apps/creator-portal/src/lib/types.ts
export interface Creator {
  id: string
  email: string
  name: string
  phone: string | null
  // Brand relationships
  brandMemberships: BrandMembership[]
  // Shared across brands
  paymentMethods: PaymentMethod[]
  taxInfo: TaxInfo | null
}

export interface BrandMembership {
  brandId: string
  brandName: string
  status: 'pending' | 'active' | 'inactive'
  commissionPercent: number
  discountCode: string
  balanceCents: number
  pendingCents: number
}
```

### Creator Authentication

```typescript
// apps/creator-portal/src/lib/auth/index.ts
export async function authenticateCreator(email: string, password: string) {
  const [creator] = await sql`
    SELECT id, email, password_hash, name
    FROM public.creators
    WHERE email = ${email}
  `

  if (!creator || !await compare(password, creator.password_hash)) {
    throw new Error('Invalid credentials')
  }

  // Load brand memberships
  const memberships = await sql`
    SELECT
      cm.brand_id,
      o.name as brand_name,
      cm.status,
      cm.commission_percent,
      cm.discount_code
    FROM public.creator_brand_memberships cm
    JOIN public.organizations o ON cm.brand_id = o.id
    WHERE cm.creator_id = ${creator.id}
  `

  return {
    creator: { ...creator, brandMemberships: memberships },
    token: await signCreatorJWT(creator.id, memberships),
  }
}
```

### Creator Dashboard

```typescript
// apps/creator-portal/src/app/dashboard/page.tsx
export default async function CreatorDashboard() {
  const creator = await getCurrentCreator()

  const stats = await Promise.all(
    creator.brandMemberships.map(async (membership) => ({
      brandId: membership.brandId,
      brandName: membership.brandName,
      balance: await getCreatorBalance(creator.id, membership.brandId),
      projects: await getActiveProjects(creator.id, membership.brandId),
      pendingPayment: await getPendingWithdrawals(creator.id),
    }))
  )

  return (
    <div className="space-y-6">
      <h1>Welcome, {creator.name}</h1>

      {/* Brand earnings */}
      {stats.map(stat => (
        <BrandEarningsCard key={stat.brandId} {...stat} />
      ))}

      {/* Active projects */}
      <ProjectsList projects={stats.flatMap(s => s.projects)} />

      {/* Withdrawal status */}
      {stats[0].pendingPayment && (
        <WithdrawalStatus withdrawal={stats[0].pendingPayment} />
      )}
    </div>
  )
}
```

---

## Week 2: Hybrid Payment System

### Payment Provider Selection

```typescript
// packages/payments/src/payout.ts
import { StripeConnect } from './providers/stripe'
import { WiseBusiness } from './providers/wise'

export async function executePayout(request: PayoutRequest): Promise<PayoutResult> {
  const provider = selectProvider(request)

  try {
    const result = await provider.createPayout({
      amount: request.amountCents,
      currency: request.currency,
      recipientId: request.recipientId,
      reference: request.referenceId,
    })

    return {
      success: true,
      provider: provider.name,
      transferId: result.id,
      estimatedArrival: result.estimatedArrival,
    }
  } catch (error) {
    return {
      success: false,
      provider: provider.name,
      error: error.message,
    }
  }
}

function selectProvider(request: PayoutRequest): PayoutProvider {
  const { country, currency, amount } = request

  // US domestic: Use Stripe (faster, simpler)
  if (country === 'US') {
    return new StripeConnect()
  }

  // International: Use Wise (better rates)
  if (WISE_SUPPORTED_COUNTRIES.includes(country)) {
    return new WiseBusiness()
  }

  // Fallback: Stripe Connect Custom
  return new StripeConnect({ accountType: 'custom' })
}
```

### Stripe Connect Integration

```typescript
// packages/payments/src/providers/stripe.ts
import Stripe from 'stripe'

export class StripeConnect implements PayoutProvider {
  name = 'stripe'
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }

  async createAccount(creator: Creator): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: creator.country,
      email: creator.email,
      capabilities: {
        transfers: { requested: true },
      },
    })

    return account.id
  }

  async createPayout(request: PayoutParams): Promise<PayoutResult> {
    const transfer = await this.stripe.transfers.create({
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      destination: request.recipientId,
      transfer_group: request.reference,
    })

    return {
      id: transfer.id,
      status: 'pending',
      estimatedArrival: addDays(new Date(), 2),
    }
  }
}
```

### Wise Business Integration

```typescript
// packages/payments/src/providers/wise.ts
export class WiseBusiness implements PayoutProvider {
  name = 'wise'
  private apiUrl = 'https://api.wise.com/v1'

  async createPayout(request: PayoutParams): Promise<PayoutResult> {
    // 1. Create quote
    const quote = await this.createQuote(request)

    // 2. Create recipient if needed
    const recipient = await this.getOrCreateRecipient(request.recipientId)

    // 3. Create transfer
    const transfer = await this.createTransfer(quote, recipient)

    // 4. Fund transfer
    await this.fundTransfer(transfer.id)

    return {
      id: transfer.id,
      status: 'processing',
      estimatedArrival: new Date(transfer.estimatedDelivery),
    }
  }

  private async createQuote(request: PayoutParams) {
    const response = await fetch(`${this.apiUrl}/quotes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        profile: process.env.WISE_PROFILE_ID,
        sourceCurrency: 'USD',
        targetCurrency: request.currency,
        targetAmount: request.amount / 100,
        payOut: 'BANK_TRANSFER',
      }),
    })

    return response.json()
  }
}
```

### Unified Balance System

```typescript
// apps/creator-portal/src/lib/balance/index.ts
export async function getCreatorBalance(
  creatorId: string,
  brandId?: string
): Promise<BalanceSummary> {
  // Get balances across all brands or specific brand
  const balances = await sql`
    SELECT
      brand_id,
      SUM(CASE WHEN type IN ('commission_pending') THEN amount_cents ELSE 0 END) as pending,
      SUM(CASE WHEN type IN ('commission_available', 'project_payment', 'bonus') THEN amount_cents ELSE 0 END) as available,
      SUM(CASE WHEN type = 'withdrawal' THEN ABS(amount_cents) ELSE 0 END) as withdrawn
    FROM public.creator_balance_transactions
    WHERE creator_id = ${creatorId}
      AND CASE WHEN ${brandId}::uuid IS NOT NULL THEN brand_id = ${brandId} ELSE TRUE END
    GROUP BY brand_id
  `

  return {
    pending: sumBy(balances, 'pending'),
    available: sumBy(balances, 'available'),
    withdrawn: sumBy(balances, 'withdrawn'),
    byBrand: balances,
  }
}

export async function requestWithdrawal(
  creatorId: string,
  amountCents: number,
  paymentMethodId: string
): Promise<WithdrawalRequest> {
  // Validate balance
  const balance = await getCreatorBalance(creatorId)
  if (balance.available < amountCents) {
    throw new Error('Insufficient balance')
  }

  // Check for pending withdrawals
  const pending = await getPendingWithdrawals(creatorId)
  if (pending.length > 0) {
    throw new Error('Withdrawal already pending')
  }

  // Create withdrawal request
  const [request] = await sql`
    INSERT INTO public.withdrawal_requests (
      creator_id, amount_cents, payment_method_id, status
    ) VALUES (
      ${creatorId}, ${amountCents}, ${paymentMethodId}, 'pending'
    )
    RETURNING *
  `

  // Send notification
  await inngest.send({
    name: 'payout/requested',
    data: { requestId: request.id, creatorId },
  })

  return request
}
```

---

## Week 3: Projects & E-Signatures

### Project Management

```typescript
// apps/creator-portal/src/lib/projects/index.ts
export async function getProjects(
  creatorId: string,
  filters: ProjectFilters
): Promise<Project[]> {
  return sql`
    SELECT
      p.*,
      o.name as brand_name,
      (SELECT COUNT(*) FROM project_files WHERE project_id = p.id) as file_count
    FROM public.creator_projects p
    JOIN public.organizations o ON p.brand_id = o.id
    WHERE p.creator_id = ${creatorId}
      AND CASE WHEN ${filters.status}::text IS NOT NULL
        THEN p.status = ${filters.status}
        ELSE TRUE
      END
    ORDER BY p.created_at DESC
  `
}

export async function submitProject(
  projectId: string,
  creatorId: string
): Promise<void> {
  // Validate ownership
  const [project] = await sql`
    SELECT * FROM public.creator_projects
    WHERE id = ${projectId} AND creator_id = ${creatorId}
  `

  if (!project) throw new Error('Project not found')

  // Check required files
  const files = await sql`
    SELECT * FROM public.project_files WHERE project_id = ${projectId}
  `

  if (files.length === 0) {
    throw new Error('At least one file required')
  }

  // Update status
  await sql`
    UPDATE public.creator_projects
    SET status = 'submitted', submitted_at = NOW()
    WHERE id = ${projectId}
  `

  // Notify admin
  await inngest.send({
    name: 'project/submitted',
    data: { projectId, creatorId, brandId: project.brand_id },
  })
}
```

### File Uploads

```typescript
// apps/creator-portal/src/lib/files/upload.ts
import { put } from '@vercel/blob'

export async function uploadProjectFile(
  projectId: string,
  file: File,
  creatorId: string
): Promise<ProjectFile> {
  // Upload to Vercel Blob
  const blob = await put(`projects/${projectId}/${file.name}`, file, {
    access: 'public',
  })

  // Create file record
  const [record] = await sql`
    INSERT INTO public.project_files (
      project_id, creator_id, name, url, size_bytes, content_type
    ) VALUES (
      ${projectId}, ${creatorId}, ${file.name},
      ${blob.url}, ${file.size}, ${file.type}
    )
    RETURNING *
  `

  return record
}
```

### E-Signature System

```typescript
// apps/creator-portal/src/lib/esign/index.ts
export async function createSigningRequest(
  templateId: string,
  creatorId: string,
  brandId: string
): Promise<SigningRequest> {
  // Get template
  const template = await getEsignTemplate(templateId, brandId)

  // Create document instance
  const [document] = await sql`
    INSERT INTO public.esign_documents (
      template_id, creator_id, brand_id, status, pdf_url
    ) VALUES (
      ${templateId}, ${creatorId}, ${brandId}, 'pending', ${template.pdfUrl}
    )
    RETURNING *
  `

  // Create signer record with access token
  const accessToken = nanoid(32)
  await sql`
    INSERT INTO public.esign_signers (
      document_id, creator_id, access_token, status
    ) VALUES (
      ${document.id}, ${creatorId}, ${accessToken}, 'pending'
    )
  `

  // Send signing request email
  await sendSigningRequestEmail(creatorId, document.id, accessToken)

  return document
}

export async function signDocument(
  documentId: string,
  accessToken: string,
  signatureData: SignatureData
): Promise<void> {
  // Validate access
  const [signer] = await sql`
    SELECT * FROM public.esign_signers
    WHERE document_id = ${documentId} AND access_token = ${accessToken}
  `

  if (!signer) throw new Error('Invalid access')

  // Apply signature to PDF
  const signedPdfUrl = await applySignatureToPdf(documentId, signatureData)

  // Update records
  await sql`
    UPDATE public.esign_documents
    SET status = 'completed', signed_pdf_url = ${signedPdfUrl}, signed_at = NOW()
    WHERE id = ${documentId}
  `

  await sql`
    UPDATE public.esign_signers
    SET status = 'signed', signed_at = NOW()
    WHERE document_id = ${documentId}
  `

  // Log audit event
  await logEsignAudit(documentId, 'signed', signer.creator_id)
}
```

---

## Week 4: Tax Forms & Compliance

### Tax Information Collection

```typescript
// apps/creator-portal/src/lib/tax/w9.ts
export interface W9Data {
  legalName: string
  businessName?: string
  taxClassification: 'individual' | 's_corp' | 'c_corp' | 'partnership' | 'llc'
  address: Address
  tin: string // SSN or EIN, will be encrypted
  tinType: 'ssn' | 'ein'
  certificationDate: Date
  signatureIp: string
}

export async function saveW9(
  creatorId: string,
  data: W9Data
): Promise<void> {
  // Encrypt TIN before storage
  const encryptedTin = await encrypt(data.tin)

  await sql`
    INSERT INTO public.tax_payees (
      creator_id, legal_name, business_name, tax_classification,
      address, tin_encrypted, tin_type, tin_last_four,
      certified_at, certification_ip
    ) VALUES (
      ${creatorId}, ${data.legalName}, ${data.businessName},
      ${data.taxClassification}, ${JSON.stringify(data.address)},
      ${encryptedTin}, ${data.tinType}, ${data.tin.slice(-4)},
      NOW(), ${data.signatureIp}
    )
    ON CONFLICT (creator_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      business_name = EXCLUDED.business_name,
      tin_encrypted = EXCLUDED.tin_encrypted,
      certified_at = EXCLUDED.certified_at
  `
}
```

### 1099 Generation

```typescript
// packages/tax/src/forms/1099-nec.ts
export async function generate1099NEC(
  creatorId: string,
  taxYear: number
): Promise<TaxForm> {
  // Get tax info
  const taxPayee = await getTaxPayee(creatorId)
  if (!taxPayee) throw new Error('W-9 required')

  // Calculate total payments
  const payments = await sql`
    SELECT SUM(amount_cents) as total
    FROM public.creator_balance_transactions
    WHERE creator_id = ${creatorId}
      AND type IN ('commission_available', 'project_payment', 'bonus')
      AND EXTRACT(YEAR FROM created_at) = ${taxYear}
  `

  const totalCents = payments[0]?.total || 0

  // Check threshold ($600)
  if (totalCents < 60000) {
    return { required: false, reason: 'Below threshold' }
  }

  // Generate PDF
  const pdfUrl = await generate1099NECPdf({
    payerInfo: COMPANY_INFO,
    recipientInfo: taxPayee,
    box1Amount: totalCents / 100,
    taxYear,
  })

  // Store form record
  const [form] = await sql`
    INSERT INTO public.tax_forms (
      creator_id, form_type, tax_year, status, pdf_url,
      box1_amount_cents
    ) VALUES (
      ${creatorId}, '1099-NEC', ${taxYear}, 'draft', ${pdfUrl},
      ${totalCents}
    )
    RETURNING *
  `

  return form
}
```

---

## Success Criteria

- [ ] Creators can authenticate and view dashboard
- [ ] Multi-brand membership working
- [ ] Stripe Connect payouts functional
- [ ] Wise payouts functional for international
- [ ] Project management complete
- [ ] File uploads working
- [ ] E-signatures functional
- [ ] W-9 collection working
- [ ] 1099 generation working

---

## Dependencies for Next Phase

Phase 5 (Jobs) requires:
- [x] Payout processing logic
- [x] Project submission workflow
- [x] Tax form generation
