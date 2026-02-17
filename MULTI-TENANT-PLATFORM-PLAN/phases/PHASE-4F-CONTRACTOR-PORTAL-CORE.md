# PHASE-4F: Contractor Portal Core

> **STATUS**: ✅ COMPLETE (2026-02-11)
> **Completed By**: Wave 2 Agents

**Duration**: 1.5 weeks (Week 19-20)
**Depends On**: PHASE-4A (payee auth patterns), PHASE-4B (payment infrastructure)
**Parallel With**: PHASE-4E (vendor management) - shares payee infrastructure
**Blocks**: PHASE-4F-CONTRACTOR-PAYMENTS, PHASE-4F-CONTRACTOR-ADMIN

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

**CRITICAL DIFFERENCE**: Unlike creators (multi-brand), contractors are **single-tenant**:
- Contractors stored in tenant schema (not public schema)
- Each contractor belongs to exactly one tenant
- All queries scoped to `tenant_id`
- No cross-tenant contractor access
- Payee record links contractor to shared payment infrastructure

---

## Goal

Build the contractor portal with authentication, project Kanban board, and core dashboard. Contractors differ from creators in that they:
- Work on assigned projects with a 6-stage pipeline
- Submit invoices for completed work (vs. earning commissions)
- Are typically single-brand (unlike multi-brand creators)
- Have their own dedicated portal separate from creator portal

---

## Contractor vs Creator vs Vendor

| Aspect | Contractor | Creator | Vendor |
|--------|------------|---------|--------|
| **Compensation** | Project/invoice-based | Commission on sales | Invoice-based |
| **Multi-Brand** | Usually single | Yes (common) | Usually single |
| **Projects** | 6-stage Kanban | Simple deliverables | None |
| **Discount Codes** | No | Yes (per-brand) | No |
| **Contract** | Simple upload | E-sign | Simple upload |
| **Tax Form** | 1099-NEC | 1099-NEC | 1099-MISC |

See [PAYEE-TYPE-MODEL-SPEC.md](../PAYEE-TYPE-MODEL-SPEC.md) for complete comparison.

---

## Success Criteria

- [x] Contractor interface with all required fields defined
- [x] `contractors` table created in tenant schema
- [x] `contractor_projects` table created in tenant schema
- [x] Contractor-payee linkage working (payee_type='contractor')
- [x] Contractor portal authentication functional (password + magic link)
- [x] Contractor dashboard displays project overview and balance
- [x] 6-stage Kanban board working with drag-and-drop
- [x] Project status transitions validated
- [ ] Guided tour for new contractors (onboarding)

---

## Deliverables

### Data Model

**Contractor Table (per-tenant schema)**:
```sql
CREATE TABLE contractors (
  id TEXT PRIMARY KEY DEFAULT 'contractor_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active', -- active, pending, suspended, inactive
  tags TEXT[] DEFAULT '{}',
  notes TEXT, -- Admin-only notes
  contract_url TEXT,
  contract_type TEXT, -- 'uploaded', 'link'
  contract_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_contractors_tenant_email ON contractors(tenant_id, email);
CREATE INDEX idx_contractors_tenant_id ON contractors(tenant_id);
CREATE INDEX idx_contractors_status ON contractors(status);
```

**Contractor Projects Table (per-tenant schema)**:
```sql
CREATE TABLE contractor_projects (
  id TEXT PRIMARY KEY DEFAULT 'project_' || gen_random_uuid()::text,
  contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending_contractor',
  due_date DATE,
  rate_cents INTEGER, -- Hourly or project rate
  deliverables JSONB DEFAULT '[]', -- Array of expected deliverables
  submitted_work JSONB, -- Submitted files/links
  revision_notes TEXT, -- Admin feedback on revisions
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contractor_projects_contractor ON contractor_projects(contractor_id);
CREATE INDEX idx_contractor_projects_status ON contractor_projects(status);
CREATE INDEX idx_contractor_projects_tenant ON contractor_projects(tenant_id);
```

### Contractor Interface

```typescript
interface Contractor {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string | null
  status: 'active' | 'pending' | 'suspended' | 'inactive'
  tags: string[]
  notes: string | null
  contractUrl: string | null
  contractType: 'uploaded' | 'link' | null
  contractSignedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface ContractorWithPayee extends Contractor {
  payee: PayeeSummary | null
  balance: PayeeBalance | null
  payoutSummary: PayoutSummary | null
  paymentMethods: PaymentMethod[]
  activeProjectCount: number
}

interface ContractorProject {
  id: string
  contractorId: string
  tenantId: string
  title: string
  description: string | null
  status: ProjectStatus
  dueDate: Date | null
  rateCents: number | null
  deliverables: ProjectDeliverable[]
  submittedWork: SubmittedWork | null
  revisionNotes: string | null
  submittedAt: Date | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type ProjectStatus =
  | 'pending_contractor'  // Upcoming - not started
  | 'draft'               // Upcoming - contractor drafting
  | 'in_progress'         // In Progress
  | 'submitted'           // Submitted for review
  | 'revision_requested'  // Revisions needed
  | 'approved'            // Approved
  | 'payout_ready'        // Ready for payout
  | 'withdrawal_requested' // Contractor requested payout
  | 'payout_approved'     // Payout processed
```

### Kanban Pipeline Mapping

```typescript
const KANBAN_COLUMNS = {
  upcoming: ['pending_contractor', 'draft'],
  inProgress: ['in_progress'],
  submitted: ['submitted'],
  revisions: ['revision_requested'],
  approved: ['approved'],
  payouts: ['payout_ready', 'withdrawal_requested', 'payout_approved'],
} as const

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  pending_contractor: ['draft', 'in_progress'],
  draft: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['approved', 'revision_requested'], // Admin action
  revision_requested: ['in_progress', 'submitted'],
  approved: ['payout_ready'], // Admin action
  payout_ready: ['withdrawal_requested'], // Contractor action
  withdrawal_requested: ['payout_approved'], // Admin action
  payout_approved: [], // Terminal state
}
```

### Contractor Portal Pages

| Route | Purpose |
|-------|---------|
| `/contractor/signin` | Login (password + magic link) |
| `/contractor/signup` | Registration with password setup |
| `/contractor/forgot-password` | Password reset request |
| `/contractor/reset-password` | Password reset with token |
| `/contractor/projects` | **Primary**: 6-stage Kanban board |
| `/contractor/projects/[id]` | Project detail view |
| `/contractor/help` | FAQ and support |

### API Routes (Portal)

```
POST   /api/contractor/auth/signin           - Password login
POST   /api/contractor/auth/signup           - Registration with password
POST   /api/contractor/auth/magic-link       - Request magic link
GET    /api/contractor/auth/verify           - Verify magic link token
POST   /api/contractor/auth/forgot-password  - Request password reset
POST   /api/contractor/auth/reset-password   - Reset password with token
GET    /api/contractor/auth/session          - Session check (protected)
POST   /api/contractor/auth/logout           - Logout

GET    /api/contractor/projects              - List projects with status grouping
GET    /api/contractor/projects/[id]         - Project detail
PATCH  /api/contractor/projects/[id]/status  - Update project status
POST   /api/contractor/projects/[id]/submit  - Submit work for review
```

---

## Constraints

- Contractors are stored per-tenant (unlike creators in public schema)
- Each contractor has exactly one payee record (payee_type='contractor')
- Project status transitions must be validated server-side
- Contractors cannot skip Kanban stages (enforce workflow)
- Only admin can approve projects or request revisions
- Rate limiting on auth endpoints (5 attempts/15 min per IP)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all contractor portal UI

**MCPs to consult:**
- Context7 MCP: "React DnD Kanban board"
- Context7 MCP: "Next.js authentication patterns"

**RAWDOG code to reference:**
- `src/app/contractor/` - **Complete contractor portal implementation**
- `src/app/contractor/projects/` - **Kanban board with 6 columns**
- `src/app/contractor/signin/` - **Login page**
- `src/app/contractor/signup/` - **Registration with password**
- `src/app/contractor/forgot-password/` - **Password reset flow**
- `src/components/contractor-portal/` - **Layout and components**
- `src/lib/payees/` - **Payee auth, magic links, sessions**
- `src/lib/payees/session.ts` - getPayeeSession(), createPayeeSession()
- `src/lib/payees/magic-links.ts` - Token generation/verification

**Spec documents:**
- [PAYEE-TYPE-MODEL-SPEC.md](../PAYEE-TYPE-MODEL-SPEC.md) - Payee type comparison
- [PHASE-4A-CREATOR-PORTAL.md](./PHASE-4A-CREATOR-PORTAL.md) - Auth patterns
- [TENANT-ISOLATION.md](../TENANT-ISOLATION.md) - Isolation rules

---

## Frontend Design Skill Integration

**MANDATORY**: Contractor portal is project-focused (vs. creator's earnings-focus). Invoke `/frontend-design` for all components.

### Contractor Portal Design Principles

- **Project-centric**: Everything revolves around assigned projects
- **Status visibility**: Clear indication of where each project stands
- **Kanban workflow**: Visual pipeline for project progression
- **Balance awareness**: Show available balance, but secondary to projects

### Component-Specific Skill Prompts

**1. Contractor Projects Kanban:**
```
/frontend-design

Building Contractor Projects Kanban for PHASE-4F-CONTRACTOR-PORTAL-CORE.

Requirements:
- 6 columns in pipeline:
  1. Upcoming (pending_contractor, draft) - Not started
  2. In Progress (in_progress) - Currently working
  3. Submitted (submitted) - Awaiting review
  4. Revisions (revision_requested) - Needs changes
  5. Approved (approved) - Work accepted
  6. Payouts (payout_ready, withdrawal_requested, payout_approved) - Payment stage

- Project Cards:
  - Title (prominent)
  - Due date with urgency indicator (overdue = red, soon = yellow)
  - Rate/amount if set
  - Status badge
  - Click to open detail drawer

- Column Features:
  - Count badge
  - Empty state message
  - Scroll if many projects

- Drag-and-Drop:
  - Visual drop target indicator
  - Validate allowed transitions
  - Optimistic update with rollback on error

Layout:
- Desktop: Horizontal scroll with 6 visible columns
- Mobile: Vertical stack with column headers as tabs

User context:
- Contractors checking project status
- Primary questions: "What do I need to work on?" and "What's pending review?"
```

**2. Project Card:**
```
/frontend-design

Building Project Card for contractor Kanban (PHASE-4F-CONTRACTOR-PORTAL-CORE).

Requirements:
- Card header:
  - Project title (2 lines max, truncate)
  - Due date (relative: "Due in 3 days", "Overdue by 2 days")
  - Due date color: red if overdue, yellow if <3 days, normal otherwise

- Card body:
  - Rate/amount if set (e.g., "$500 project" or "$50/hr")
  - Status badge (matches column but more specific)
  - Brief description preview (1 line)

- Card footer:
  - Quick action button based on status:
    - Upcoming: "Start Project"
    - In Progress: "Submit Work"
    - Revisions: "View Feedback"
    - Approved: "Request Payout"

Design:
- Compact but readable
- Subtle shadow for elevation
- Hover state shows full title
- Keyboard accessible
```

**3. Project Detail Drawer:**
```
/frontend-design

Building Project Detail drawer for contractor portal (PHASE-4F-CONTRACTOR-PORTAL-CORE).

Requirements:
- Header:
  - Project title
  - Status badge (large)
  - Close button

- Details section:
  - Description (full)
  - Due date
  - Rate/amount
  - Expected deliverables list

- Status section:
  - Current status with timeline
  - Action button based on status:
    - In Progress: "Submit Work" with file/link upload
    - Revision Requested: Show revision notes + "Resubmit"
    - Approved: "Request Payout" button

- History section (optional):
  - Status changes with timestamps
  - Submissions with attachments

Layout:
- Slide-in drawer from right
- Mobile: Full screen modal
- Scrollable content

User context:
- Contractor reviewing project details
- Submitting work with files/links
```

**4. Contractor Sign In:**
```
/frontend-design

Building Contractor Sign In page for PHASE-4F-CONTRACTOR-PORTAL-CORE.

Requirements:
- Clean, centered login form:
  - Email input
  - Password input
  - "Remember me" checkbox
  - "Forgot password?" link
  - "Sign in" button

- Alternative auth:
  - "Sign in with magic link" option
  - Divider between options

- Registration link:
  - "New contractor? Set up your account"

- Trust elements:
  - Platform logo
  - "Contractor Portal" label

Design:
- Simple, professional
- Mobile-friendly
- Clear error messages for invalid credentials
- Loading state on submit
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Kanban library choice (@hello-pangea/dnd, react-beautiful-dnd, or custom)
2. Project detail view (drawer vs. modal vs. separate page)
3. Optimistic updates strategy for drag-and-drop
4. Session storage approach (cookie vs. localStorage with refresh)

---

## Tasks

### [PARALLEL] Data model and types
- [x] Define Contractor interface in `apps/contractor-portal/src/lib/types.ts`
- [x] Define ContractorProject interface
- [x] Define ProjectStatus type with transitions
- [x] Create SQL migration for `contractors` table in tenant schema
- [x] Create SQL migration for `contractor_projects` table

### [PARALLEL with above] Portal scaffolding
- [x] Create `apps/contractor-portal/` app structure
- [x] Create contractor portal layout with PayeePortalGuard
- [x] Set up tenant-aware routing

### [SEQUENTIAL after data model] Authentication
- [x] Implement contractor signup (upsertPayeeProfile pattern)
- [x] Implement password login with rate limiting
- [x] Implement magic link authentication
- [x] Create session management (getPayeeSession)
- [x] Implement forgot/reset password flow
- [x] Create auth middleware for protected routes

### [SEQUENTIAL after auth] Core pages
- [x] Build sign in page
- [x] Build sign up page
- [x] Build forgot password page
- [x] Build reset password page
- [x] Build projects Kanban page
- [x] Build project detail drawer/modal

### [PARALLEL] Kanban implementation
- [x] Implement Kanban board with 6 columns
- [x] Implement drag-and-drop with validation
- [x] Implement project card component
- [x] Implement status transition API
- [x] Implement project submission flow

---

## Definition of Done

- [x] Contractor can sign up with password
- [x] Contractor can sign in (password or magic link)
- [x] Contractor can reset password
- [x] Contractor sees 6-column Kanban with their projects
- [x] Contractor can drag projects between allowed columns
- [x] Contractor can view project details
- [x] Contractor can submit work for review
- [x] Status transitions validated server-side
- [x] Tenant isolation verified
- [x] `npx tsc --noEmit` passes
- [ ] Manual testing: full flow works end-to-end

---

## Integration with Other Phases

### Dependencies from Earlier Phases

| Phase | What We Use |
|-------|-------------|
| PHASE-1B | Tenant schema, database patterns |
| PHASE-1C | JWT auth, session management |
| PHASE-4A | PayeePortalGuard, auth patterns, magic link |
| PHASE-4B | Payee infrastructure, Stripe Connect |

### What Later Phases Use

| Phase | What They Need |
|-------|----------------|
| PHASE-4F-CONTRACTOR-PAYMENTS | Balance tracking, withdrawal requests |
| PHASE-4F-CONTRACTOR-ADMIN | Admin pages, project assignment |
| PHASE-5C | Contractor notification jobs |
| PHASE-2CM | Contractor email templates |
