# Gap Remediation: Support & Help Desk System

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Critical
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

RAWDOG has a customer support system that is **completely missing** from the multi-tenant platform plan. This includes ticket management, knowledge base, and multi-channel support.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/support/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/support/
/Users/holdenthemic/Documents/rawdog-web/src/components/support/
/Users/holdenthemic/Documents/rawdog-web/src/lib/support/
```

**Features that must be documented:**
- Ticket management (create, assign, resolve, escalate)
- Knowledge base (KB) builder and management
- Multi-channel support (email, Slack, SMS, chat)
- Escalation workflows
- Agent management (support team members)
- Privacy settings management
- CSAT (Customer Satisfaction) tracking
- Response templates
- Ticket analytics and reporting

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- Ticket lifecycle and states
- How KB articles are structured
- Multi-channel message routing
- Escalation rules
- CSAT collection flow

### 2. Update Master Documents

**PLAN.md updates:**
- Add Support System to appropriate section
- Determine phase placement

**PROMPT.md updates:**
- Add patterns for ticket/support development
- Add multi-channel routing patterns

### 3. Create Phase Documents

Suggested structure:

```
PHASE-2E-SUPPORT-TICKETS.md
- Ticket CRUD
- Assignment and routing
- Escalation workflows
- SLA tracking

PHASE-2E-SUPPORT-KB.md
- Knowledge base structure
- Article authoring
- Search and discovery
- Public vs internal articles

PHASE-2E-SUPPORT-CHANNELS.md (optional)
- Email integration
- Chat widget
- Slack support channel
- SMS support
```

---

## Open-Ended Areas (Your Discretion)

- **Third-party vs built-in**: Evaluate if Intercom/Zendesk integration makes more sense than building
- **KB architecture**: How articles relate to products, categories
- **Chat implementation**: Real-time vs async approaches
- **AI integration**: Whether BRII should handle first-line support

---

## Non-Negotiable Requirements

You MUST preserve:
- Ticket management
- Knowledge base functionality
- Multi-channel support
- Escalation workflows
- Agent assignment
- CSAT tracking
- Privacy controls

---

## Validation

- [ ] All support features documented
- [ ] Database schema specified
- [ ] API endpoints listed
- [ ] Admin UI pages specified
- [ ] Customer-facing chat widget addressed
- [ ] Multi-tenant ticket isolation

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated
- [ ] 1-3 phase docs created
