# Gap Remediation: Vendor Portal & Management

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1-2 new phase docs

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

RAWDOG has a **vendor management system** separate from creators and contractors. Vendors appear to be B2B suppliers with company entities. The plan has **zero coverage** for vendors beyond the brief mention in gap remediation prompt 15.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/vendors/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/vendor/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/admin/vendors/
```

**Admin Pages:**
- `/admin/vendors` - Vendor directory with search, export, invite
- `/admin/vendors/[id]` - Vendor detail page

**API Routes (31 routes):**
- Similar to contractor routes (payments, auth, settings)
- Balance, methods, withdraw endpoints

**Key Difference from Contractors:**
- Vendors have `company` field
- B2B supplier relationship (not individual services)
- Potentially different tax treatment
- May have payment terms (Net 30, etc.)

---

## Your Task

### 1. Explore the RAWDOG Vendor System

Understand:
- What makes vendors different from contractors
- Vendor-specific data model (company field, etc.)
- Payment terms handling
- Invoice/billing workflow
- Tax treatment for business entities

### 2. Update Payee Type Model

If created in prompt 18, enhance with vendor details:
- How vendors fit into payee hierarchy
- Business entity tax treatment (W-9 for LLC vs individual)
- Payment terms configuration

### 3. Update Master Documents

**PLAN.md updates:**
- Add Vendor Management section
- Clarify vendor vs contractor vs creator

**PROMPT.md updates:**
- Add vendor patterns
- Add B2B payment patterns

### 4. Create Phase Documents

```
PHASE-4F-VENDOR-MANAGEMENT.md

## Vendor Data Model
- VendorPayee interface
- Company name field
- Business type (LLC, Corp, etc.)
- Tax ID (EIN vs SSN)
- Payment terms (Net 15, 30, 45, 60)

## Admin Vendor Directory
- List with search and filters
- Company name display
- Status indicators
- Export functionality
- Invite new vendors

## Vendor Detail Page
- Company information
- Contact details
- Payment history
- Outstanding invoices
- Tax documents

## Vendor Portal (if exists)
- Vendor login
- Invoice submission
- Payment status tracking
- Profile/company settings
- Tax document upload

## Payment Terms
- Net 15/30/45/60 configuration
- Due date calculation
- Overdue notifications
- Payment scheduling
```

---

## Key Questions to Answer

1. **Do vendors have their own portal?** Or just admin management?
2. **How do vendor payments differ?** Invoice-based with terms?
3. **Tax treatment?** W-9 for business entities vs individuals
4. **Multi-brand vendors?** Can vendors work across brands?

---

## Open-Ended Areas (Your Discretion)

- **Vendor portal complexity**: Full portal vs admin-only management
- **Payment terms**: How sophisticated the terms engine needs to be
- **B2B invoicing**: Whether vendors submit invoices or admin creates them
- **Multi-brand**: Whether vendors are per-brand or platform-wide

---

## Non-Negotiable Requirements

You MUST document:
- Vendor data model (company, business type)
- Admin vendor directory
- Admin vendor detail page
- How vendors differ from contractors
- Tax treatment for business entities
- Payment workflow for vendors

---

## Validation

- [ ] Vendor system fully documented
- [ ] Distinction from contractors clear
- [ ] Database schema specified
- [ ] Admin UI pages specified
- [ ] Payment workflow documented

---

## Output Checklist

- [ ] PLAN.md updated with vendor section
- [ ] PAYEE-TYPE-MODEL-SPEC updated (if exists)
- [ ] Phase doc created for vendors
- [ ] Relationship to contractors clarified
