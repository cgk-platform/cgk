# Gap Remediation: Tax & Compliance

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Medium
> **Estimated Phases**: 1 new phase doc

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

The plan mentions W-9/1099 briefly but RAWDOG has a **full tax compliance system** that needs specification.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/tax/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/admin/tax/
/Users/holdenthemic/Documents/rawdog-web/src/lib/tax/
```

**Features that must be documented:**
- W-9 form validation and storage
- Tax classification types (individual, LLC, S-Corp, C-Corp, etc.)
- 1099 reporting threshold tracking ($600+)
- 1099 form generation
- Annual payment reporting
- Tax filing integration/export
- Quarterly earnings tracking
- Tax ID (EIN/SSN) secure storage
- State-specific requirements

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- W-9 collection flow
- How earnings are tracked for 1099
- 1099 generation process
- Tax classification impact
- Secure storage approach

### 2. Update Master Documents

**PLAN.md updates:**
- Expand Tax section in Creator Portal phase
- Add compliance requirements

**PROMPT.md updates:**
- Add tax compliance patterns
- Add secure data handling patterns

### 3. Create Phase Documents

```
PHASE-4D-TAX-COMPLIANCE.md
- W-9 collection and validation
- Tax classification handling
- TIN (SSN/EIN) secure storage
- Threshold tracking ($600)
- 1099 generation
- Annual reporting
- State requirements
- Export for filing
```

---

## Open-Ended Areas (Your Discretion)

- **1099 generation**: Build vs third-party service
- **Filing integration**: Direct IRS filing vs export
- **State compliance**: Which states require additional forms
- **Security**: Encryption approach for sensitive data

---

## Non-Negotiable Requirements

You MUST preserve:
- W-9 form handling
- Tax classification types
- 1099 threshold tracking
- 1099 generation capability
- Annual payment reporting
- Secure TIN storage
- Quarterly tracking

---

## Validation

- [ ] All tax features documented
- [ ] W-9 workflow specified
- [ ] 1099 generation specified
- [ ] Security requirements specified
- [ ] Database schemas specified
- [ ] Admin UI pages specified

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated with tax patterns
- [ ] 1 focused phase doc created
