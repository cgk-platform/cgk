# Gap Remediation: Missing Integrations

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Medium
> **Estimated Phases**: Update existing integration docs

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

RAWDOG integrates with 24+ services but several are **not mentioned** in the plan's integration documentation.

### Missing Integrations from Plan

| Integration | Current Usage | Gap |
|-------------|---------------|-----|
| **Retell** | Voice AI for automated calls | Not mentioned |
| **11Labs** | Text-to-speech for BRII | Not mentioned |
| **Lob** | Physical mail delivery | Not mentioned |
| **Fairing** | Post-purchase surveys | Not mentioned |
| **Plaid** | Bank account linking for payouts | Not mentioned |
| **PayPal** | Alternative payout method | Only Stripe + Wise mentioned |
| **Microsoft Clarity** | Session recording/heatmaps | Not mentioned |
| **Better Stack** | Uptime monitoring | Not mentioned |
| **Sentry** | Error tracking | Not mentioned |
| **DocuSign** | E-signature provider | Not specified as provider |

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/retell/
/Users/holdenthemic/Documents/rawdog-web/src/lib/lob/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/retell/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/webhooks/lob/
```

---

## Your Task

### 1. Explore Each Missing Integration

For each integration, understand:
- What it's used for
- API patterns
- Webhook handling
- Data stored

### 2. Update Master Documents

**PLAN.md updates:**
- Add missing integrations to Integration section
- Note which phases they belong to

**PROMPT.md updates:**
- Add patterns for each integration type

### 3. Update Existing Phase Documents

Find the relevant phase docs and add the integrations:

**Voice/AI Integrations (likely Phase 2C AI):**
- Retell for voice calls
- 11Labs for TTS

**Payment Integrations (Phase 4):**
- Plaid for bank linking
- PayPal as alternative payout

**Marketing/Analytics Integrations:**
- Fairing for surveys
- Clarity for session recording

**Operations Integrations (Phase 2B):**
- Better Stack for uptime
- Sentry for errors

**Physical Mail (new or misc):**
- Lob for physical mail

**E-Sign (Phase 4C):**
- DocuSign as specific provider

---

## Integration Documentation Format

For each integration, document:

```markdown
### [Integration Name]

**Purpose**: What it's used for

**API Type**: REST, GraphQL, Webhook, etc.

**Key Operations**:
- Operation 1
- Operation 2

**Webhooks**:
- Event types handled

**Credentials**:
- What env vars needed
- Per-tenant vs platform-wide

**Multi-Tenant Approach**:
- How credentials are stored per tenant
- Isolation requirements
```

---

## Open-Ended Areas (Your Discretion)

- **Provider alternatives**: Suggest alternatives for flexibility
- **Integration priority**: Which are critical vs nice-to-have
- **Abstraction**: Whether to abstract providers

---

## Non-Negotiable Requirements

You MUST document:
- Retell voice integration
- 11Labs TTS
- Plaid bank linking
- PayPal payouts
- Fairing surveys
- Lob physical mail
- Clarity/Better Stack/Sentry monitoring
- DocuSign as e-sign provider

---

## Validation

- [ ] All 10+ missing integrations documented
- [ ] Each integration assigned to a phase
- [ ] Webhook handling specified
- [ ] Credential storage specified
- [ ] Multi-tenant isolation addressed

---

## Output Checklist

- [ ] PLAN.md Integrations section updated
- [ ] PROMPT.md updated with integration patterns
- [ ] Relevant phase docs updated
- [ ] CODEBASE-ANALYSIS/INTEGRATIONS doc updated if needed
