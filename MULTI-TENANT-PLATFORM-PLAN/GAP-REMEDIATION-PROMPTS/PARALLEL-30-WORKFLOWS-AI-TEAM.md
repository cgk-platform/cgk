# Gap Remediation: Workflows & AI Team Management

> **Execution**: Can run in parallel with other prompts
> **Priority**: MEDIUM
> **Estimated Phases**: 1-2 focused phase docs

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

RAWDOG has **Workflows** and **AI Team** admin sections that are not in the main navigation but exist in the codebase.

---

## Workflows (/admin/workflows)

```
/admin/workflows
├── (list)                       # Workflow list
├── /scheduled                   # Scheduled workflows
└── /approvals                   # Approval workflows
```

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/workflows/
/Users/holdenthemic/Documents/rawdog-web/src/lib/workflow/
```

**Features:**
- Workflow rule builder
- Scheduled automation
- Approval chain management
- Execution history

---

## AI Team (/admin/ai-team)

```
/admin/ai-team
├── (list)                       # Agent list
├── /[agentId]                   # Agent detail
│   ├── /learnings               # Agent knowledge
│   └── /relationships           # Agent relationships
├── /create-agent                # Create new agent
├── /org-chart                   # Organization structure
└── /teams                       # Team management
```

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/ai-team/
/Users/holdenthemic/Documents/rawdog-web/src/lib/ai-agents/
```

**Features:**
- Multi-agent management
- Agent configuration
- Knowledge/learnings storage
- Agent relationships
- Team organization
- Org chart visualization

---

## Your Task

### 1. Explore Both Systems

Document:
- Workflow types and capabilities
- AI agent architecture
- Integration between systems

### 2. Create Phase Documents

```
PHASE-2R-WORKFLOWS.md

## Workflow List
- Active workflows
- Workflow status
- Execution statistics

## Workflow Builder
- Trigger configuration
- Condition logic
- Action definitions
- Variable mapping

## Scheduled Workflows
- Cron-based scheduling
- One-time schedules
- Schedule management

## Approval Workflows
- Approval chain definition
- Approver assignment
- Escalation rules
- Approval history

PHASE-2R-AI-TEAM.md

## Agent Management
- Agent list and search
- Agent creation wizard
- Agent configuration

## Agent Detail
- Agent profile
- Performance metrics
- Conversation history
- Learning history

## Agent Learnings
- Knowledge base per agent
- Learning sources
- Confidence scoring

## Agent Relationships
- Inter-agent relationships
- Collaboration rules
- Handoff configurations

## Team Organization
- Team creation
- Agent assignment
- Org chart visualization
- Hierarchy management
```

---

## Relationship to Prompt 01 (AI Assistant)

Prompt 01 covers BRII (the main AI assistant). This prompt covers the **AI Team** management system which is the multi-agent orchestration layer.

---

## Non-Negotiable Requirements

**Workflows:**
- Workflow builder
- Scheduled execution
- Approval chains
- Execution history

**AI Team:**
- Multi-agent management
- Agent learnings
- Agent relationships
- Org chart

---

## Output Checklist

- [ ] Workflow system documented
- [ ] AI Team system documented
- [ ] Relationship to BRII clarified
- [ ] Multi-tenant isolation addressed
