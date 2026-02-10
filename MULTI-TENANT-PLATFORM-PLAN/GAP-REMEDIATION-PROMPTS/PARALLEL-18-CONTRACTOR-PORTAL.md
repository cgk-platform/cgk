# Gap Remediation: Contractor Portal (Full System)

> **Execution**: Can run in parallel with other prompts
> **Priority**: CRITICAL
> **Estimated Phases**: 2-3 new phase docs

---
## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Context

RAWDOG has a **fully functional contractor portal** that is **completely separate** from the creator portal. The multi-tenant plan only briefly mentions "Tier 4: Creator/Contractor Portals" but has **NO specifications** for contractor-specific features.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/contractor/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/contractors/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/contractor/
/Users/holdenthemic/Documents/rawdog-web/src/components/contractor-portal/
/Users/holdenthemic/Documents/rawdog-web/src/lib/contractor/
```

**Contractor Portal Pages (fully implemented):**
- `/contractor/projects` - Kanban board (Upcoming, In Progress, Submitted, Revisions, Approved, Payouts)
- `/contractor/payments` - Balance view + withdrawal request
- `/contractor/request-payment` - Invoice submission form
- `/contractor/settings/payout-methods` - Stripe, PayPal, Venmo, Check setup
- `/contractor/settings/tax` - W-9 submission
- `/contractor/settings/notifications` - Notification preferences
- `/contractor/signin`, `/signup`, `/forgot-password` - Auth flow

**API Routes (32 routes):**
- Payment management (balance, methods, withdraw, transactions, request)
- Stripe Connect OAuth (oauth, callback, onboard, bank-account, countries, sync, refresh, update)
- Auth (signup, signin, logout, magic-link, verify)
- Settings and projects

**Admin Pages:**
- `/admin/contractors` - Directory with search, export CSV, invite
- `/admin/contractors/[id]` - Detail page

---

## Your Task

### 1. Explore the RAWDOG Contractor System

Understand:
- How contractors differ from creators
- Project assignment and submission workflow
- Invoice/payment request workflow
- Payout method differences
- Tax form handling

### 2. Create Payee Type Model Document

First, clarify the relationship between:
- **Creators**: Commission-based, multi-brand, content focus
- **Contractors**: Project-based, invoice-driven, service focus
- **Vendors**: B2B suppliers, company entity, different tax treatment

Create: `PAYEE-TYPE-MODEL-SPEC.md`

### 3. Update Master Documents

**PLAN.md updates:**
- Add Contractor Portal phases (Phase 4E+)
- Add to Tier 4 Architecture section
- Update timeline

**PROMPT.md updates:**
- Add contractor-specific patterns
- Add invoice/project patterns

### 4. Create Phase Documents

```
PHASE-4E-CONTRACTOR-PORTAL-CORE.md
- Contractor authentication (separate from creator)
- Contractor dashboard
- Project kanban board
- Project submission workflow
- Revision handling

PHASE-4E-CONTRACTOR-PAYMENTS.md
- Invoice/payment request system
- Balance tracking
- Withdrawal requests
- Payout method setup (Stripe Connect, PayPal, Venmo, Check)
- Tax form handling (W-9)

PHASE-4E-CONTRACTOR-ADMIN.md
- Contractor directory
- Contractor invitations
- Contractor detail pages
- Project assignment to contractors
- Payment approval workflow
```

---

## Key Differences from Creator Portal

| Aspect | Creator | Contractor |
|--------|---------|------------|
| Compensation | Commission-based | Project/invoice-based |
| Projects | Content deliverables | Service deliverables |
| Brands | Multi-brand relationships | Typically single-brand |
| Payment trigger | Sales/commissions | Invoice approval |
| Payout methods | Stripe Connect, Wise | Stripe, PayPal, Venmo, Check |

---

## Open-Ended Areas (Your Discretion)

- **Multi-brand contractors**: Should contractors work across brands?
- **Shared payee infrastructure**: How much to share with creator payments?
- **Project types**: What project types to support?
- **Approval workflow**: How project approval differs from creator approval

---

## Non-Negotiable Requirements

You MUST preserve:
- Contractor authentication (separate from creator)
- Project kanban with 6 stages
- Invoice/payment request system
- Payout method setup (4 methods)
- Tax form handling
- Admin contractor directory
- Admin contractor detail pages

---

## Validation

- [ ] Payee type model documented
- [ ] Contractor portal fully specified
- [ ] All 32 API routes accounted for
- [ ] Admin pages specified
- [ ] Database schema for contractors
- [ ] Multi-tenant isolation addressed

---

## Output Checklist

- [ ] PAYEE-TYPE-MODEL-SPEC.md created
- [ ] PLAN.md updated with contractor phases
- [ ] PROMPT.md updated
- [ ] 2-3 contractor phase docs created
- [ ] Relationship to creator portal clarified
