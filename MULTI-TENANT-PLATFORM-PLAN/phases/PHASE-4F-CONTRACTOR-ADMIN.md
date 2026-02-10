# PHASE-4F: Contractor Admin

**Duration**: 0.5 week (Week 21)
**Depends On**: PHASE-4F-CONTRACTOR-PORTAL-CORE, PHASE-4F-CONTRACTOR-PAYMENTS
**Parallel With**: None
**Blocks**: PHASE-5C (contractor jobs)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All admin contractor operations must be tenant-scoped:
- Contractor queries filtered by current tenant
- Project assignments scoped to tenant
- Payment approvals scoped to tenant
- No cross-tenant contractor visibility

---

## Goal

Build the admin interface for managing contractors including directory, detail pages, project assignment, and payment approval workflows.

---

## Success Criteria

- [ ] Admin contractor directory with search and filters
- [ ] Contractor detail page with full profile editing
- [ ] Project assignment workflow functional
- [ ] Payment request approval queue working
- [ ] Contractor invitation flow functional
- [ ] CSV export of contractor data working
- [ ] Contract upload/management working

---

## Deliverables

### Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/contractors` | Contractor directory with search, filters, export |
| `/admin/contractors/[id]` | Contractor detail with profile, projects, payments |
| `/admin/contractors/[id]/edit` | Edit contractor profile |
| `/admin/contractors/[id]/projects` | Manage contractor's projects |
| `/admin/contractors/invite` | Invite new contractor |

### Admin API Routes

```
GET    /api/admin/contractors           - List contractors (with search, pagination)
POST   /api/admin/contractors           - Create contractor + payee
GET    /api/admin/contractors/[id]      - Get contractor with payee info
PATCH  /api/admin/contractors/[id]      - Update contractor profile
DELETE /api/admin/contractors/[id]      - Delete contractor (soft delete)
GET    /api/admin/contractors/export    - Export CSV

GET    /api/admin/contractors/[id]/projects       - List contractor's projects
POST   /api/admin/contractors/[id]/projects       - Assign project to contractor
PATCH  /api/admin/contractors/[id]/projects/[pid] - Update project status
DELETE /api/admin/contractors/[id]/projects/[pid] - Remove project

GET    /api/admin/contractors/[id]/payments       - Payment requests for contractor
POST   /api/admin/contractors/[id]/payments       - Create manual payment
PATCH  /api/admin/contractors/[id]/payments/[rid] - Approve/reject payment request

POST   /api/admin/contractors/invite              - Send contractor invitation
POST   /api/admin/contractors/[id]/bank-account   - Admin-assisted bank account setup
```

### Contractor Directory

```typescript
interface ContractorDirectoryFilters {
  search?: string // Name or email
  status?: ContractorStatus[]
  tags?: string[]
  hasPaymentMethod?: boolean
  hasW9?: boolean
  sortBy?: 'name' | 'createdAt' | 'balance' | 'projectCount'
  sortDir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

interface ContractorDirectoryItem {
  id: string
  name: string
  email: string
  status: ContractorStatus
  tags: string[]
  balanceCents: number
  pendingCents: number
  activeProjectCount: number
  hasPaymentMethod: boolean
  hasW9: boolean
  createdAt: Date
}
```

### Contractor Detail Page

```typescript
interface ContractorDetailPage {
  // Profile Section
  contractor: Contractor

  // Payee Section
  payee: PayeeSummary | null
  paymentMethods: PaymentMethod[]
  taxInfo: TaxInfo | null

  // Balance Section
  balance: {
    pendingCents: number
    availableCents: number
    paidCents: number
  }

  // Payout Summary
  payoutSummary: {
    pendingCount: number
    processingCount: number
    failedCount: number
    completedCount: number
  }

  // Projects Section
  projects: ContractorProject[]

  // Payment Requests Section
  paymentRequests: PaymentRequest[]
}
```

### Project Assignment Workflow

```typescript
// Creating a new project for contractor
interface CreateProjectRequest {
  contractorId: string
  title: string
  description?: string
  dueDate?: Date
  rateCents?: number
  deliverables?: string[]
}

// Project status transitions (admin actions)
const ADMIN_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  pending_contractor: [], // Contractor action only
  draft: [], // Contractor action only
  in_progress: [], // Contractor action only
  submitted: ['approved', 'revision_requested'], // Admin reviews
  revision_requested: [], // Contractor action only
  approved: ['payout_ready'], // Admin triggers payout eligibility
  payout_ready: [], // Contractor requests payout
  withdrawal_requested: ['payout_approved'], // Admin approves payout
  payout_approved: [], // Terminal
}
```

### Payment Request Approval Workflow

```typescript
// Admin reviewing payment request
interface ApprovePaymentRequest {
  requestId: string
  action: 'approve' | 'reject'
  approvedAmountCents?: number // Can approve different amount
  adminNotes?: string
}

// Approval creates balance transaction
async function approvePaymentRequest(
  request: ApprovePaymentRequest,
  adminUserId: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    // Update request status
    await sql`
      UPDATE payee_payment_requests
      SET
        status = 'approved',
        approved_amount_cents = ${request.approvedAmountCents},
        admin_notes = ${request.adminNotes},
        reviewed_at = NOW()
      WHERE id = ${request.requestId}
    `

    // Create balance transaction
    await sql`
      INSERT INTO payee_balance_transactions (
        payee_id, tenant_id, amount_cents,
        transaction_type, status, reference_id, reference_type
      )
      VALUES (
        ${payeeId}, ${tenantId}, ${request.approvedAmountCents},
        'earnings', 'completed', ${request.requestId}, 'payment_request'
      )
    `
  })
}
```

### Contractor Invitation Flow

```typescript
interface ContractorInvitation {
  email: string
  name?: string
  message?: string // Custom welcome message
  projectAssignment?: {
    title: string
    description?: string
    dueDate?: Date
    rateCents?: number
  }
}

async function inviteContractor(
  tenantId: string,
  invitation: ContractorInvitation
): Promise<{ contractorId: string; inviteToken: string }> {
  return await withTenant(tenantId, async () => {
    // 1. Create contractor record
    const contractor = await sql`
      INSERT INTO contractors (tenant_id, name, email, status)
      VALUES (${tenantId}, ${invitation.name || 'New Contractor'}, ${invitation.email}, 'pending')
      RETURNING id
    `

    // 2. Create payee record
    await upsertPayeeProfile({
      payeeType: 'contractor',
      referenceId: contractor.id,
      email: invitation.email,
      name: invitation.name,
    })

    // 3. Generate invite token (magic link style)
    const inviteToken = await createMagicLinkToken(contractor.id, '72h')

    // 4. Optionally create initial project
    if (invitation.projectAssignment) {
      await sql`
        INSERT INTO contractor_projects (contractor_id, tenant_id, title, description, due_date, rate_cents)
        VALUES (${contractor.id}, ${tenantId}, ${invitation.projectAssignment.title}, ...)
      `
    }

    // 5. Queue invitation email
    await queueContractorInvitationEmail(tenantId, contractor.id, invitation)

    return { contractorId: contractor.id, inviteToken }
  })
}
```

---

## Constraints

- All contractor data scoped to current tenant
- Only tenant admins can create/manage contractors
- Payment request approval creates balance transaction
- Contractor deletion is soft delete (preserves payment history)
- CSV export limited to 10,000 rows

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For admin UI components

**MCPs to consult:**
- Context7 MCP: "React admin table with search and filters"
- Context7 MCP: "Next.js CSV export pattern"

**RAWDOG code to reference:**
- `src/app/admin/contractors/` - **Admin contractor pages**
- `src/app/admin/contractors/[id]/` - **Contractor detail page**
- `src/app/api/admin/contractors/` - **Admin contractor API routes**
- `src/components/admin/` - **Shared admin components**
- `src/components/admin/CreatePaymentModal.tsx` - **Manual payment creation**
- `src/components/admin/AddBankAccountModal.tsx` - **Admin bank account helper**

**Spec documents:**
- [PHASE-2-ADMIN.md](./PHASE-2-ADMIN.md) - Admin shell patterns
- [PHASE-4A-CREATOR-PORTAL.md](./PHASE-4A-CREATOR-PORTAL.md) - Similar structure for creators

---

## Frontend Design Skill Integration

### Component-Specific Skill Prompts

**1. Contractor Directory:**
```
/frontend-design

Building Contractor Directory for admin (PHASE-4F-CONTRACTOR-ADMIN).

Requirements:
- Header:
  - "Contractors" title with count
  - "Invite Contractor" primary button
  - "Export CSV" secondary button

- Filters:
  - Search input (name, email)
  - Status multi-select (active, pending, suspended)
  - Tags filter
  - "Has payment method" toggle
  - "Has W-9" toggle

- Table columns:
  - Name (with status badge)
  - Email
  - Balance (available / pending)
  - Active Projects
  - Payment Method (icon or "Not set")
  - W-9 (check or warning icon)
  - Created date
  - Actions dropdown (View, Edit, Delete)

- Pagination:
  - Items per page selector (10, 25, 50)
  - Page navigation

- Empty state:
  - "No contractors yet"
  - CTA to invite first contractor

Layout:
- Full-width table
- Sticky header
- Mobile: Card view instead of table
```

**2. Contractor Detail Page:**
```
/frontend-design

Building Contractor Detail page for admin (PHASE-4F-CONTRACTOR-ADMIN).

Requirements:
- Header:
  - Contractor name + email
  - Status badge (editable dropdown)
  - Tags (editable)
  - "Edit Profile" button

- Profile Card:
  - Name, email, phone
  - Status
  - Notes (admin-only)
  - Contract status (uploaded/link/none)
  - Created date

- Balance Card:
  - Available balance (large)
  - Pending balance
  - Total paid
  - "Create Payment" button

- Payout Status Card:
  - Pending count
  - Processing count
  - Failed count
  - Completed count
  - "View All" link

- Payment Methods Card:
  - List of methods with status
  - "Add Bank Account" button (admin helper)

- Payee Record Card:
  - Payee ID
  - Status
  - W-9 status

- Projects Section:
  - Table of assigned projects
  - "Assign Project" button
  - Status badges per project
  - Actions: View, Edit Status

- Payment Requests Section:
  - Table of requests
  - Pending requests highlighted
  - Approve/Reject actions
  - Amount adjustment on approve

Layout:
- Two-column layout on desktop
- Cards for each section
- Mobile: single column
```

**3. Project Assignment Modal:**
```
/frontend-design

Building Project Assignment modal for contractor admin (PHASE-4F-CONTRACTOR-ADMIN).

Requirements:
- Modal header:
  - "Assign Project to {Contractor Name}"
  - Close button

- Form fields:
  - Title (required)
  - Description (optional, textarea)
  - Due Date (optional, date picker)
  - Rate (optional, currency input)
  - Deliverables (optional, list builder)

- Actions:
  - Cancel button
  - "Assign Project" primary button

- Validation:
  - Title required
  - Due date must be future

Design:
- Clean modal
- Form validation inline
- Loading state on submit
```

**4. Payment Request Approval Row:**
```
/frontend-design

Building Payment Request approval row for contractor admin (PHASE-4F-CONTRACTOR-ADMIN).

Requirements:
- Row displays:
  - Amount (requested)
  - Description
  - Work type badge
  - Project link (if attached)
  - Submitted date
  - Status badge
  - Attachments (if any)

- Actions for pending requests:
  - "Approve" button
  - "Reject" button
  - Amount input (for partial approval)
  - Notes input (for rejection reason)

- Expanded view:
  - Full description
  - Attachment previews
  - Admin notes history

Design:
- Inline actions for quick approval
- Expandable for full details
- Green/red color coding for approve/reject
```

**5. Contractor Invite Modal:**
```
/frontend-design

Building Contractor Invite modal for admin (PHASE-4F-CONTRACTOR-ADMIN).

Requirements:
- Modal header:
  - "Invite Contractor"
  - Close button

- Form fields:
  - Email (required)
  - Name (optional)
  - Custom message (optional, textarea)
  - "Assign initial project" checkbox
    - If checked: project title, due date, rate fields

- Actions:
  - Cancel
  - "Send Invitation" primary button

- Success state:
  - "Invitation sent to {email}"
  - Option to invite another

Design:
- Clean form
- Progressive disclosure (project fields)
- Success confirmation
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Table library (shadcn/ui DataTable, TanStack Table, or custom)
2. Modal vs. drawer for detail views
3. Inline editing vs. separate edit page
4. Real-time vs. polling for approval status updates

---

## Tasks

### [PARALLEL] API routes
- [ ] Create contractor list endpoint with filters
- [ ] Create contractor detail endpoint
- [ ] Create contractor CRUD endpoints
- [ ] Create contractor invite endpoint
- [ ] Create project assignment endpoints
- [ ] Create payment request approval endpoints
- [ ] Create CSV export endpoint

### [PARALLEL with above] Admin pages
- [ ] Build contractor directory page
- [ ] Build contractor detail page
- [ ] Build project assignment modal
- [ ] Build payment request approval UI
- [ ] Build contractor invite modal
- [ ] Build edit contractor page

### [SEQUENTIAL] Integration
- [ ] Connect to payee infrastructure
- [ ] Implement balance calculation
- [ ] Implement approval workflow
- [ ] Implement email notifications for invites

---

## Definition of Done

- [ ] Admin can view contractor directory with search/filter
- [ ] Admin can view contractor detail with all sections
- [ ] Admin can create/edit/delete contractors
- [ ] Admin can invite contractors via email
- [ ] Admin can assign projects to contractors
- [ ] Admin can approve/reject payment requests
- [ ] Admin can export contractor CSV
- [ ] Contract upload/link works
- [ ] Tenant isolation verified
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: full admin flow works

---

## Integration with Other Phases

### Dependencies from Earlier Phases

| Phase | What We Use |
|-------|-------------|
| PHASE-2-ADMIN | Admin shell, layout, navigation |
| PHASE-4B | Payee infrastructure, balance |
| PHASE-4F-CORE | Contractor data model |
| PHASE-4F-PAYMENTS | Payment request model |

### What Later Phases Use

| Phase | What They Need |
|-------|----------------|
| PHASE-5C | Admin action triggers (invite, approve) |
| PHASE-2CM | Contractor notification templates |
