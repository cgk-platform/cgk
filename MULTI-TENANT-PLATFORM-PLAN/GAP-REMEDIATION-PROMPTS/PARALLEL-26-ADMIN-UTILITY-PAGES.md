# Gap Remediation: Admin Utility Pages & System Features

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1 focused phase doc

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

RAWDOG has several **admin utility pages** that are not in the main navigation but are essential:

---

## Utility Pages

```
/admin/gallery                   # UGC Gallery management
/admin/projects/[id]             # Project detail view
/admin/projects/new              # Create new project
/admin/stripe-topups             # Stripe balance top-ups
/admin/system/sync               # System data sync
/admin/recorder                  # Session recorder
/admin/changelog                 # System changelog
```

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/gallery/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/projects/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/stripe-topups/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/system/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/recorder/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/changelog/
```

---

## Feature Details

### Gallery (/admin/gallery)
- UGC (User Generated Content) management
- Photo/video gallery from customers
- Moderation workflow
- Display on storefront

### Projects (/admin/projects)
- Internal project management
- Project creation and tracking
- Assignment to team members

### Stripe Topups (/admin/stripe-topups)
- Add funds to Stripe balance
- Balance tracking
- Top-up history

### System Sync (/admin/system/sync)
- Manual data synchronization
- Shopify sync triggers
- Integration status

### Recorder (/admin/recorder)
- Session recording tool
- Video/audio capture
- Content creation aid

### Changelog (/admin/changelog)
- System activity log
- Change history
- Audit trail

---

## Your Task

### 1. Explore Each Page in RAWDOG

Document purpose, features, and integration points.

### 2. Create Phase Document

```
PHASE-2N-ADMIN-UTILITIES.md

## Gallery Management
- UGC display and moderation
- Photo/video library
- Storefront integration

## Project Management
- Internal projects (not creator projects)
- Team collaboration
- Status tracking

## Financial Utilities
- Stripe balance top-ups
- Balance monitoring
- Payment preparation

## System Operations
- Data sync controls
- Integration triggers
- Status monitoring

## Content Tools
- Recorder for content capture
- Changelog for audit trail
```

---

## Non-Negotiable Requirements

- Gallery management
- Internal project system
- Stripe top-up capability
- System sync controls
- Changelog/audit trail

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] All utility pages documented
- [ ] Integration points specified
