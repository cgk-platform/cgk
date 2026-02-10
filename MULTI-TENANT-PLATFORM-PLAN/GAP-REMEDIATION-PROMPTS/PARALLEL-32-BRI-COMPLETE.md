# Gap Remediation: BRI AI Agent - Complete Admin Pages

> **Execution**: Can run in parallel with other prompts
> **Priority**: HIGH
> **Estimated Phases**: 1-2 focused phase docs
> **Note**: Complements prompt 01 (AI Assistant) with full admin UI

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

RAWDOG has extensive BRI (AI Agent) admin pages. Prompt 01 covers the backend/capabilities. This prompt documents all **admin UI pages**.

---

## BRI Admin Pages (/admin/bri)

```
/admin/bri
├── (dashboard)                  # BRI overview
├── /conversations               # Conversation list
├── /action-log                  # Action history
├── /creative-ideas              # Brainstorming tool
├── /autonomy                    # Autonomy settings
├── /voice                       # Voice configuration
├── /integrations                # BRI integrations
│   ├── /email                   # Email integration
│   └── /sms                     # SMS integration
├── /team-memories               # Shared knowledge
├── /team-defaults               # Default settings
├── /slack-users                 # Slack user mapping
├── /notifications               # Notification config
└── /followups                   # Follow-up management
```

---

## Page Specifications

### Dashboard (/admin/bri)
- Active conversation count
- Actions taken today
- Pending follow-ups
- Quick access links

### Conversations (/admin/bri/conversations)
- Conversation list
- Filter by status, date, channel
- Conversation detail view
- Message history
- Actions taken

### Action Log (/admin/bri/action-log)
- All actions taken by BRI
- Action types (email sent, meeting scheduled, etc.)
- Approval status
- Undo capability

### Creative Ideas (/admin/bri/creative-ideas)
- AI brainstorming tool
- Idea generation
- Idea categorization
- Idea status tracking

### Autonomy (/admin/bri/autonomy)
- Autonomy level settings
- Approval requirements
- Auto-approve rules
- Escalation triggers

### Voice (/admin/bri/voice)
- TTS provider selection
- Voice model choice
- Speaking speed
- Tone settings

### Integrations
- Email configuration
- SMS configuration
- Channel-specific settings

### Team Memories (/admin/bri/team-memories)
- Shared knowledge base
- Memory categories
- Confidence levels
- Memory source tracking

### Team Defaults (/admin/bri/team-defaults)
- Default responses
- Default behavior
- Brand voice settings

### Slack Users (/admin/bri/slack-users)
- Slack user → internal user mapping
- Permissions per user
- Response preferences

### Notifications (/admin/bri/notifications)
- Notification preferences
- Alert thresholds
- Channel routing

### Follow-ups (/admin/bri/followups)
- Pending follow-ups
- Scheduled actions
- Follow-up templates
- Completion tracking

---

## Your Task

### 1. Explore BRI Admin Pages

Document each page's:
- Purpose and functionality
- Data displayed
- User actions
- Integration points

### 2. Create Phase Document

```
PHASE-2T-BRI-ADMIN.md

## Dashboard & Overview
- KPIs and quick actions
- Activity feed
- Status indicators

## Conversation Management
- Conversation list
- Detail views
- Action history per conversation

## Action Management
- Action log
- Approval workflow
- Undo capabilities

## Configuration
- Autonomy levels
- Voice settings
- Integration config
- Team defaults

## Knowledge Management
- Team memories
- Shared knowledge
- Learning system

## Follow-up System
- Scheduled actions
- Reminder management
- Completion tracking
```

---

## Relationship to Prompt 01

- Prompt 01: Backend capabilities (voice, RAG, memory)
- This prompt: Admin UI for configuring and monitoring BRI

---

## Non-Negotiable Requirements

- All 12 BRI admin pages documented
- Configuration interfaces specified
- Monitoring dashboards included
- Knowledge management UI

---

## Output Checklist

- [ ] All BRI pages documented
- [ ] Each page has UI spec
- [ ] Integration with backend (prompt 01)
- [ ] Multi-tenant considerations
