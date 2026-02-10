# Gap Remediation: Vendor Management

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Low
> **Estimated Phases**: 1 small phase doc

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

RAWDOG has a **vendor management system** separate from creators/contractors that is **not mentioned** in the plan.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/vendors/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/vendor/
```

**Features that must be documented:**
- Vendor directory
- Vendor profiles
- Vendor onboarding flow
- Vendor notifications
- Vendor vs Creator distinction

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- What distinguishes vendors from creators/contractors
- Vendor onboarding flow
- Vendor data model
- How vendors interact with the platform

### 2. Update Master Documents

**PLAN.md updates:**
- Add Vendor Management to appropriate phase
- Clarify vendor vs creator vs contractor

**PROMPT.md updates:**
- Add vendor patterns if distinct from creators

### 3. Create Phase Document

```
PHASE-4E-VENDOR-MANAGEMENT.md
- Vendor directory
- Vendor profiles
- Onboarding flow
- Vendor portal (if separate)
- Notification preferences
- Vendor vs Creator distinction
```

Or merge with creator portal if very similar.

---

## Open-Ended Areas (Your Discretion)

- **Vendor scope**: How vendors differ from creators
- **Separate portal**: Whether vendors need their own portal
- **Payment handling**: Whether vendors have payouts

---

## Non-Negotiable Requirements

You MUST preserve:
- Vendor directory
- Vendor profiles
- Vendor onboarding
- Vendor notifications

---

## Validation

- [ ] Vendor system documented
- [ ] Distinction from creators clarified
- [ ] Database schema specified
- [ ] Admin UI pages specified

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated if needed
- [ ] 1 phase doc created (or merged)
