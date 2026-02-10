# Gap Remediation: SMS Communications (Platform Notifications Only)

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM (SMS is off by default)
> **Estimated Phases**: 1 focused phase doc
> **IMPORTANT**: NO SMS marketing - notifications only. SMS is OFF by default, toggle-able per tenant.

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

RAWDOG has Twilio/Retell integration for SMS. For the multi-tenant platform:
- SMS is **disabled by default** for all tenants
- Tenants can **opt-in** to enable SMS notifications
- SMS is for **platform notifications only** - NOT marketing
- Each notification type can have email, SMS, or both

---

## SMS Configuration - WHAT We Need

### Master SMS Toggle (/admin/settings/sms)

**Outcomes:**
- SMS master switch (off by default)
- Twilio account configuration when enabled
- Phone number management
- SMS health dashboard

**Setup Flow:**
1. Tenant enables SMS in settings
2. Guided Twilio setup (API credentials, phone number)
3. Verification of phone number
4. Enable SMS per notification type

### Per-Notification SMS Toggle

**Outcomes:**
- Each notification type has channel selector: Email | SMS | Both
- Email is always enabled by default
- SMS only available if master toggle is on
- SMS-specific template for each notification type

**Example Notification Settings:**
```
review_request:
  email: enabled (default)
  sms: disabled (toggle)

payment_available:
  email: enabled
  sms: enabled (if tenant opted in)

contract_reminder:
  email: enabled
  sms: disabled
```

### SMS Template Management

**Outcomes:**
- Character limit enforcement (160 chars for single SMS)
- Variable substitution (same as email)
- Link shortening integration
- Preview with character count
- Fallback if too long

**Template Editor:**
- Plain text only (SMS doesn't support HTML)
- Character counter
- Variable insertion
- Link shortener toggle
- Preview

### SMS Queue & Logs

**Outcomes:**
- Same queue pattern as email (pending, sent, failed)
- Status tracking with carrier info
- Delivery receipts
- Error logging

### Opt-Out Management (TCPA Compliance)

**Outcomes:**
- Recipients can opt out of SMS
- Opt-out respected across all notifications
- Required for compliance (TCPA)
- Opt-out list management in admin
- STOP keyword handling

---

## SMS Notification Types

Same categories as email, but SMS versions are shorter:

**Customer:**
- Order shipped (short tracking link)
- Delivery notification
- Review request (link to review page)

**Creator/Contractor/Vendor:**
- Payment available
- Action required (contract, tax form)
- Payout sent

**System:**
- Verification codes
- Security alerts

---

## What This Prompt Does NOT Cover

**Explicitly OUT OF SCOPE:**
- SMS marketing campaigns
- Bulk SMS blasts
- SMS drip sequences
- SMS automation flows
- Promotional SMS

---

## Non-Negotiable Requirements

**Configuration:**
- SMS off by default
- Twilio setup when enabled
- Per-notification channel toggle
- Opt-out compliance (TCPA)

**Templates:**
- Character limit enforcement
- Same variable system as email
- Link shortening

**Logging:**
- Full SMS queue with status
- Delivery tracking
- Error logging

---

## Definition of Done

- [ ] SMS master toggle works (off by default)
- [ ] Twilio setup wizard guides tenant through configuration
- [ ] Per-notification SMS toggle available
- [ ] SMS templates have character limits and preview
- [ ] SMS queue shows sent/pending/failed
- [ ] Opt-out management works
- [ ] No SMS marketing features

---

## Output Checklist

- [ ] PLAN.md updated with SMS as optional notification channel
- [ ] Phase doc for SMS configuration
- [ ] Clear documentation that SMS marketing is out of scope
- [ ] Integration with Prompt 35 (Unified Communications)
