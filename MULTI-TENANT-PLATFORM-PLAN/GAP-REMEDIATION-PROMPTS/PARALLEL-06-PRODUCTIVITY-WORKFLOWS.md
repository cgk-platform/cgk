# Gap Remediation: Productivity & Workflow Automation

> **Execution**: Can run in parallel with all other prompts
> **Priority**: High
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

RAWDOG has internal productivity tools and workflow automation that are **not mentioned** in the plan. This includes task management, smart inbox, and rule-based automation.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/productivity/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/workflows/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/projects/
/Users/holdenthemic/Documents/rawdog-web/src/lib/smart-inbox/
/Users/holdenthemic/Documents/rawdog-web/src/lib/workflow/
```

**Productivity features:**
- Task management with assignments
- Productivity reports
- Saved items/bookmarks
- Project management (projects with tasks)
- Employee management

**Smart Inbox features:**
- Unified message management
- Conversation threading
- Priority routing
- Assignment tracking

**Workflow features:**
- Rule-based automation
- Action triggers
- Multi-step sequences
- Notification sequences
- External API call actions
- Data transformations

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- Task and project data models
- Smart inbox routing logic
- Workflow rule engine
- How workflows integrate with other systems

### 2. Update Master Documents

**PLAN.md updates:**
- Add Productivity/Workflows to Admin features
- Determine phase placement

**PROMPT.md updates:**
- Add workflow automation patterns
- Add task management patterns

### 3. Create Phase Documents

Suggested structure:

```
PHASE-2G-PRODUCTIVITY.md
- Task management CRUD
- Project management
- Assignment and tracking
- Productivity analytics
- Employee management

PHASE-2G-WORKFLOWS.md
- Workflow builder UI
- Rule engine
- Trigger types (event, schedule, manual)
- Action types (email, SMS, API call, data update)
- Approval workflows
- Multi-step sequences
```

---

## Open-Ended Areas (Your Discretion)

- **Workflow builder**: Visual builder vs code-based rules
- **Integration depth**: How deeply workflows integrate with other systems
- **Complexity**: How sophisticated the rule engine needs to be
- **Smart inbox scope**: Could be simple or complex AI-powered routing

---

## Non-Negotiable Requirements

You MUST preserve:
- Task management
- Project tracking
- Workflow automation (rule-based triggers)
- Multi-step sequences
- Approval workflows
- Smart inbox/message routing

---

## Validation

- [ ] All productivity features documented
- [ ] Workflow engine specified
- [ ] Database schemas specified
- [ ] API endpoints listed
- [ ] Admin UI specified
- [ ] Multi-tenant isolation for workflows

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated
- [ ] 1-2 phase docs created
