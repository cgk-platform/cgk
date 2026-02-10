# Gap Remediation: Email Templates (Platform Notifications Only)

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1 focused phase doc
> **IMPORTANT**: NO marketing campaigns/flows - this is for platform notification templates ONLY
> **Status**: ✅ COMPLETE

---

## Phase Documents Created

| Phase | Document | Status |
|-------|----------|--------|
| 2CM-TEMPLATE-LIBRARY | `PHASE-2CM-TEMPLATE-LIBRARY.md` | ✅ Created |

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

~~RAWDOG has Campaigns and Templates admin sections for email marketing.~~

**UPDATED**: For the multi-tenant platform, we are NOT building a marketing platform. All email/SMS functionality is focused on **platform notifications** only (transactional emails, system notifications).

Marketing campaigns, drip sequences, and automation flows are OUT OF SCOPE.

See **Prompt 35 (Unified Communications System)** for the comprehensive notification system.

---

## What This Prompt Covers

### Email Template Library (/admin/templates)

**Purpose**: Central library of all notification templates used across the platform.

**Outcomes:**
- View all email templates in one place
- Grouped by function (Reviews, Creators, Subscriptions, E-Sign, etc.)
- Quick edit access to any template
- Usage statistics per template

**Template Categories:**

1. **Customer Notifications**
   - Review requests and reminders
   - Subscription confirmations and alerts
   - Order status updates

2. **Creator/Contractor/Vendor Notifications**
   - Onboarding emails
   - Project updates
   - Payment notifications
   - Contract signing requests

3. **System Notifications**
   - Admin alerts
   - Error notifications
   - Health check alerts (super admin)

### Template Detail (/admin/templates/[slug])

**Outcomes:**
- Full template editor
- Subject line and preheader
- Body content with variable insertion
- Preview with sample data
- Send test email
- View usage history
- Reset to default

### Template Analytics (/admin/templates/analytics)

**Outcomes:**
- Open rates per template (if tracking enabled)
- Click rates
- Bounce rates
- Most/least used templates

---

## What This Prompt Does NOT Cover

**Explicitly OUT OF SCOPE:**
- Marketing campaigns
- Drip sequences
- Automation flows
- Email campaigns to customer lists
- Newsletter functionality
- Segment-based email sends
- A/B testing of marketing emails (see prompt 23 for product A/B tests)

These features may be added in a future phase but are not part of the initial platform.

---

## Cross-Reference

- **Prompt 35**: Unified Communications System (comprehensive notification architecture)
- **Prompt 05**: SMS Communications (notifications only, not marketing)
- **Prompt 27**: Commerce (order notification templates)
- **Prompt 33**: Creators Admin (creator notification templates)

---

## Non-Negotiable Requirements

**DO:**
- Template library with all notification templates
- Template editor with variables and preview
- Usage analytics
- Multi-tenant template isolation

**DO NOT:**
- Campaign creation
- Automation flow builder
- Drip sequences
- Segment targeting
- Marketing email scheduling

---

## Definition of Done

- [ ] Template library shows all notification templates grouped by function
- [ ] Each template is editable with WYSIWYG editor
- [ ] Variable insertion works correctly
- [ ] Preview shows rendered template with sample data
- [ ] Test send works
- [ ] Template analytics show usage stats
- [ ] No marketing campaign functionality

---

## Output Checklist

- [x] PLAN.md updated (remove marketing campaigns, add template library)
- [x] Phase doc for template library UI (`PHASE-2CM-TEMPLATE-LIBRARY.md`)
- [x] Clear documentation that marketing is out of scope
