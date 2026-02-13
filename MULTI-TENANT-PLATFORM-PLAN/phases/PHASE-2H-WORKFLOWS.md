# PHASE-2H: Workflow Automation Engine

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Duration**: 2 weeks (Week 12-13)
**Completed**: 2026-02-10
**Depends On**: PHASE-2H-PRODUCTIVITY (needs task infrastructure), PHASE-2CM (needs email/notification infrastructure)
**Parallel With**: PHASE-3A-STOREFRONT (no dependencies)
**Blocks**: PHASE-5B-JOBS-COMMERCE (uses workflow triggers)

---

## MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Workflows are tenant-scoped. Rules, executions, and state from Tenant A must NEVER affect or be visible to Tenant B.

---

## Goal

Build a comprehensive workflow automation engine that enables tenant admins to create rule-based automations with triggers, conditions, and actions. This includes a rule engine for event-driven workflows, approval workflows requiring human intervention, scheduled actions with cancellation logic, and a unified smart inbox for managing all communications.

---

## Context: RAWDOG Reference Implementation

The RAWDOG platform has a sophisticated workflow engine:

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/workflow/
  ├── engine.ts                    # WorkflowEngine class (singleton)
  ├── db/schema.ts                 # workflow_rules, workflow_executions, scheduled_actions
  ├── rules/
  │   ├── types.ts                 # TriggerType, ActionType, Condition types
  │   ├── evaluator.ts             # Condition evaluation logic
  │   └── built-in.ts              # Pre-configured default rules
  ├── actions/executor.ts          # Action execution logic
  └── reports/index.ts             # Scheduled report generation

/Users/holdenthemic/Documents/rawdog-web/src/lib/smart-inbox/
  ├── types.ts                     # Conversation, Message, Contact types
  ├── copilot.ts                   # AI draft generation
  └── consent.ts                   # SMS/Email consent management

/Users/holdenthemic/Documents/rawdog-web/src/lib/communications/
  └── schema.ts                    # contacts, threads, messages tables
```

Key patterns:
- Rules have triggers (status_change, time_elapsed, scheduled, manual)
- Conditions are AND-ed together with 13+ operators
- Actions include: send_message, slack_notify, suggest_action, schedule_followup, update_status
- Template interpolation with `{firstName}`, `{projectTitle}`, etc.
- Approval workflows route through human approval queue
- Scheduled actions can be cancelled if conditions change
- Smart inbox consolidates all communications (Email, SMS, Slack)

---

## Success Criteria

- [x] Tenant admins can create workflow rules with triggers, conditions, and actions
- [x] Rules execute automatically on status changes and scheduled triggers
- [x] Time-based triggers fire after elapsed duration in a status
- [x] Conditions evaluate correctly (all must pass)
- [x] Actions execute with template variable substitution
- [x] Approval workflows route to designated approvers
- [x] Scheduled actions can be cancelled based on conditions
- [x] Smart inbox shows unified view of all communications
- [x] AI copilot drafts responses (optional enable)
- [x] Workflow executions logged with full audit trail
- [x] Built-in rules available out-of-box

---

## Deliverables

### Database Schema (in tenant schema)

```sql
-- Workflow rules
CREATE TABLE {tenant_schema}.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule metadata
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 10, -- Higher = runs first

  -- Trigger configuration
  trigger_type TEXT NOT NULL, -- status_change, time_elapsed, scheduled, event, manual
  trigger_config JSONB NOT NULL, -- Type-specific config

  -- Conditions (all must pass)
  conditions JSONB DEFAULT '[]', -- Array of {field, operator, value}

  -- Actions to execute
  actions JSONB NOT NULL, -- Array of action definitions

  -- Execution limits
  cooldown_hours INTEGER, -- Minimum hours between executions
  max_executions INTEGER, -- Maximum total executions per entity

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approver_role TEXT, -- Role required to approve

  -- Ownership
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_rules_active ON {tenant_schema}.workflow_rules(is_active, priority DESC);
CREATE INDEX idx_workflow_rules_trigger ON {tenant_schema}.workflow_rules(trigger_type);

-- Workflow executions (audit log)
CREATE TABLE {tenant_schema}.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES {tenant_schema}.workflow_rules(id) ON DELETE CASCADE,

  -- Context
  entity_type TEXT NOT NULL, -- project, task, order, creator
  entity_id UUID NOT NULL,

  -- Trigger data
  trigger_data JSONB NOT NULL, -- What triggered this execution

  -- Condition evaluation
  conditions_evaluated JSONB, -- Result of each condition check
  conditions_passed BOOLEAN,

  -- Action results
  actions_taken JSONB, -- Result of each action

  -- Result
  result TEXT NOT NULL, -- success, partial, failed, skipped, pending_approval
  error_message TEXT,

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_exec_rule ON {tenant_schema}.workflow_executions(rule_id);
CREATE INDEX idx_workflow_exec_entity ON {tenant_schema}.workflow_executions(entity_type, entity_id);
CREATE INDEX idx_workflow_exec_pending ON {tenant_schema}.workflow_executions(result) WHERE result = 'pending_approval';
CREATE INDEX idx_workflow_exec_time ON {tenant_schema}.workflow_executions(started_at DESC);

-- Scheduled actions (delayed execution)
CREATE TABLE {tenant_schema}.scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  rule_id UUID REFERENCES {tenant_schema}.workflow_rules(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES {tenant_schema}.workflow_executions(id) ON DELETE SET NULL,

  -- Context
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Action details
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Cancellation conditions
  cancel_if JSONB, -- Conditions that cancel this action
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, executed, cancelled, failed
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_actions_pending ON {tenant_schema}.scheduled_actions(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_actions_entity ON {tenant_schema}.scheduled_actions(entity_type, entity_id);

-- Entity workflow state (tracks execution count per rule per entity)
CREATE TABLE {tenant_schema}.entity_workflow_state (
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES {tenant_schema}.workflow_rules(id) ON DELETE CASCADE,

  execution_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  last_execution_id UUID,

  -- Rule-specific state data
  state_data JSONB DEFAULT '{}',

  PRIMARY KEY (entity_type, entity_id, rule_id)
);

-- Smart Inbox: Contacts
CREATE TABLE {tenant_schema}.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact type & linking
  contact_type TEXT NOT NULL, -- creator, customer, vendor, partner, team_member, other
  external_id UUID, -- creator_id, customer_id, etc.

  -- Identity
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  company_role TEXT,

  -- Preferences
  preferred_channel TEXT DEFAULT 'email', -- sms, email, slack
  timezone TEXT,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Consent (for SMS)
  sms_consent BOOLEAN DEFAULT FALSE,
  sms_consented_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_type ON {tenant_schema}.contacts(contact_type);
CREATE INDEX idx_contacts_external ON {tenant_schema}.contacts(contact_type, external_id);
CREATE INDEX idx_contacts_email ON {tenant_schema}.contacts(email);
CREATE INDEX idx_contacts_phone ON {tenant_schema}.contacts(phone);

-- Smart Inbox: Communication threads
CREATE TABLE {tenant_schema}.communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES {tenant_schema}.contacts(id) ON DELETE CASCADE,

  -- Thread context
  thread_type TEXT DEFAULT 'general', -- general, project, support, onboarding
  related_entity_type TEXT, -- project, order, etc.
  related_entity_id UUID,

  -- Display
  subject TEXT,

  -- Status
  status TEXT DEFAULT 'open', -- open, snoozed, closed
  snoozed_until TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

  -- Assignment
  assigned_to UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ,

  -- Last message info (denormalized for performance)
  last_message_at TIMESTAMPTZ,
  last_message_sender TEXT, -- 'contact' or 'team'
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,

  -- External references (Slack thread, etc.)
  external_thread_id TEXT,
  external_thread_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_contact ON {tenant_schema}.communication_threads(contact_id);
CREATE INDEX idx_threads_status ON {tenant_schema}.communication_threads(status, updated_at DESC);
CREATE INDEX idx_threads_assigned ON {tenant_schema}.communication_threads(assigned_to);
CREATE INDEX idx_threads_entity ON {tenant_schema}.communication_threads(related_entity_type, related_entity_id);

-- Smart Inbox: Messages
CREATE TABLE {tenant_schema}.communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES {tenant_schema}.communication_threads(id) ON DELETE CASCADE,

  -- Direction
  direction TEXT NOT NULL, -- inbound, outbound
  channel TEXT NOT NULL, -- sms, email, slack, internal

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,

  -- Sender
  sender_type TEXT NOT NULL, -- contact, team_member, system, ai
  sender_id UUID, -- user_id if team_member

  -- AI draft metadata
  ai_drafted BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  ai_was_edited BOOLEAN DEFAULT FALSE,
  original_ai_draft TEXT,

  -- Delivery status (for outbound)
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
  external_id TEXT, -- Message ID from email/SMS provider
  failed_reason TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON {tenant_schema}.communication_messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_channel ON {tenant_schema}.communication_messages(channel);
```

### Workflow Engine (`packages/admin-core/src/lib/workflow/engine.ts`)

```typescript
export class WorkflowEngine {
  // Singleton pattern
  private static instance: WorkflowEngine
  static getInstance(tenantId: string): WorkflowEngine

  // Rule management
  async loadRules(): Promise<void>
  getRules(): WorkflowRule[]
  getActiveRules(): WorkflowRule[]

  // Trigger handlers
  async handleStatusChange(params: {
    entityType: string
    entityId: string
    oldStatus: string
    newStatus: string
    context?: Record<string, unknown>
  }): Promise<WorkflowExecution[]>

  async handleEvent(params: {
    eventType: string
    entityType: string
    entityId: string
    data: Record<string, unknown>
  }): Promise<WorkflowExecution[]>

  async checkTimeElapsedTriggers(
    entities: Array<{
      entityType: string
      entityId: string
      status: string
      statusChangedAt: Date
    }>
  ): Promise<WorkflowExecution[]>

  async triggerManually(params: {
    ruleId: string
    entityType: string
    entityId: string
    bypassChecks?: boolean
  }): Promise<WorkflowExecution | null>

  // Approval workflow
  async approveExecution(executionId: string, approverId: string): Promise<void>
  async rejectExecution(executionId: string, rejecterId: string, reason: string): Promise<void>
  async getPendingApprovals(): Promise<WorkflowExecution[]>

  // Scheduled actions
  async processScheduledActions(): Promise<void>
  async cancelScheduledAction(actionId: string, reason: string): Promise<void>
}
```

### Condition Evaluator (`packages/admin-core/src/lib/workflow/evaluator.ts`)

```typescript
export type ConditionOperator =
  | 'equals' | 'notEquals'
  | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual'
  | 'in' | 'notIn'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'exists' | 'notExists'
  | 'matches' // Regex

export interface Condition {
  field: string
  operator: ConditionOperator
  value: unknown
}

export interface EvaluationContext {
  entity: Record<string, unknown>
  previousEntity?: Record<string, unknown>
  user?: Record<string, unknown>
  computed: Record<string, unknown> // Computed fields like daysSinceLastUpdate
}

export function evaluateConditions(
  conditions: Condition[],
  context: EvaluationContext
): { passed: boolean; results: Array<{ condition: Condition; passed: boolean; actualValue: unknown }> }

export function getFieldValue(field: string, context: EvaluationContext): unknown

// Computed field calculators
export function computeDaysSinceLastUpdate(entity: Record<string, unknown>): number
export function computeHoursInStatus(entity: Record<string, unknown>): number
export function computeRemindersSent(state: Record<string, unknown>): number
```

### Action Executor (`packages/admin-core/src/lib/workflow/actions.ts`)

```typescript
export type ActionType =
  | 'send_message'      // Send email/SMS to contact
  | 'send_notification' // Internal notification
  | 'slack_notify'      // Post to Slack channel
  | 'suggest_action'    // Interactive Slack message with buttons
  | 'schedule_followup' // Schedule delayed action
  | 'update_status'     // Change entity status
  | 'update_field'      // Update entity field
  | 'create_task'       // Create a task
  | 'assign_to'         // Assign entity to user
  | 'webhook'           // Call external webhook
  | 'generate_report'   // Generate and send report

export interface Action {
  type: ActionType
  config: Record<string, unknown>
}

export async function executeAction(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult>

export function interpolateTemplate(
  template: string,
  context: ExecutionContext
): string

// Template variables:
// {firstName}, {lastName}, {name} - Contact name parts
// {email}, {phone} - Contact info
// {entityTitle}, {entityStatus} - Entity info
// {dueDate}, {daysSince}, {hoursInStatus} - Computed values
// {adminUrl} - Link to admin page
```

### Smart Inbox Service (`packages/admin-core/src/lib/inbox/`)

```typescript
// Contact management
export async function getContacts(tenantId: string, filters?: ContactFilters): Promise<Contact[]>
export async function getContact(tenantId: string, contactId: string): Promise<Contact | null>
export async function createContact(tenantId: string, data: CreateContactInput): Promise<Contact>
export async function updateContact(tenantId: string, contactId: string, data: UpdateContactInput): Promise<Contact>

// Thread management
export async function getThreads(tenantId: string, filters?: ThreadFilters): Promise<Thread[]>
export async function getThread(tenantId: string, threadId: string): Promise<Thread | null>
export async function createThread(tenantId: string, data: CreateThreadInput): Promise<Thread>
export async function updateThreadStatus(tenantId: string, threadId: string, status: ThreadStatus): Promise<Thread>
export async function assignThread(tenantId: string, threadId: string, userId: string): Promise<Thread>
export async function snoozeThread(tenantId: string, threadId: string, until: Date): Promise<Thread>

// Message operations
export async function getMessages(tenantId: string, threadId: string): Promise<Message[]>
export async function sendMessage(tenantId: string, threadId: string, data: SendMessageInput): Promise<Message>
export async function markAsRead(tenantId: string, threadId: string): Promise<void>

// AI Copilot
export async function generateDraft(tenantId: string, threadId: string): Promise<AIDraft>
export async function sendDraft(tenantId: string, draftId: string, edited?: string): Promise<Message>
```

### UI Components

**Workflow Builder:**
- `WorkflowRuleList` - List of all rules with status
- `WorkflowRuleEditor` - Create/edit rule with trigger/condition/action sections
- `TriggerConfigForm` - Configure trigger type and settings
- `ConditionBuilder` - Visual condition builder (AND-ed rows)
- `ActionList` - List of actions with drag-to-reorder
- `ActionConfigForm` - Configure individual action
- `TemplateEditor` - Edit message templates with variable insertion
- `WorkflowExecutionLog` - View execution history
- `ApprovalQueue` - Pending approvals with approve/reject

**Smart Inbox:**
- `InboxSidebar` - Thread list with filters
- `ThreadList` - Paginated thread list
- `ThreadDetail` - Message history and composer
- `MessageBubble` - Individual message display
- `MessageComposer` - Send new message
- `ContactCard` - Contact info with edit
- `AssignmentSelector` - Assign thread to team member
- `CopilotDraftPanel` - AI-generated draft with edit/send

### Admin Pages

```
/admin/workflows                       # Rule list
/admin/workflows/new                   # Create new rule
/admin/workflows/[id]                  # View/edit rule
/admin/workflows/[id]/executions       # Execution history for rule
/admin/workflows/approvals             # Pending approval queue
/admin/workflows/scheduled             # Scheduled actions
/admin/workflows/logs                  # All execution logs

/admin/inbox                           # Smart inbox
/admin/inbox/thread/[id]               # Thread detail
/admin/inbox/contacts                  # Contact directory
/admin/inbox/contacts/[id]             # Contact detail
```

---

## Constraints

- All conditions in a rule must pass (AND logic) for actions to execute
- Cooldowns prevent rule from firing on same entity within cooldown_hours
- max_executions limits total times a rule can fire on same entity
- Approval workflows pause execution until approved
- Scheduled actions are checked by background job every 5 minutes
- Template interpolation must escape HTML for email bodies
- AI copilot requires tenant to enable and have credits
- Thread assignment change clears unread for previous assignee

---

## Built-in Rules (Default Templates)

These rules are created automatically for new tenants:

### 1. Project: No Response 48h Reminder
```json
{
  "name": "Project: 48h No Response Reminder",
  "trigger_type": "time_elapsed",
  "trigger_config": { "status": "pending", "hours": 48 },
  "conditions": [
    { "field": "hasResponse", "operator": "equals", "value": false }
  ],
  "actions": [
    {
      "type": "send_message",
      "config": {
        "channel": "email",
        "template": "Hey {firstName}, just checking in on {projectTitle}. Let me know if you have any questions!"
      }
    },
    {
      "type": "slack_notify",
      "config": {
        "channel": "#ops",
        "message": "Sent 48h reminder to {name} for {projectTitle}"
      }
    }
  ],
  "cooldown_hours": 24,
  "max_executions": 3
}
```

### 2. Project: Stalled 7 Days
```json
{
  "name": "Project: Stalled 7 Days Alert",
  "trigger_type": "time_elapsed",
  "trigger_config": { "status": "in_progress", "days": 7 },
  "conditions": [
    { "field": "daysSinceLastUpdate", "operator": "greaterThan", "value": 7 }
  ],
  "actions": [
    {
      "type": "suggest_action",
      "config": {
        "channel": "#ops",
        "message": "{projectTitle} has been stalled for 7 days. What should we do?",
        "options": ["Send check-in", "Escalate", "Mark complete", "Ignore"]
      }
    }
  ],
  "requires_approval": true,
  "cooldown_hours": 72
}
```

### 3. Submission: Review Reminder 24h
```json
{
  "name": "Submission: 24h Review Reminder",
  "trigger_type": "time_elapsed",
  "trigger_config": { "status": "submitted", "hours": 24 },
  "actions": [
    {
      "type": "slack_notify",
      "config": {
        "channel": "#ops",
        "message": "Submission from {name} for {projectTitle} pending review for 24h",
        "mention": "@primary"
      }
    }
  ],
  "cooldown_hours": 24,
  "priority": 15
}
```

### 4. Task: Overdue Alert
```json
{
  "name": "Task: Overdue Alert",
  "trigger_type": "scheduled",
  "trigger_config": { "cron": "0 9 * * *", "timezone": "America/Los_Angeles" },
  "conditions": [
    { "field": "dueDate", "operator": "lessThan", "value": "now" },
    { "field": "status", "operator": "notEquals", "value": "completed" }
  ],
  "actions": [
    {
      "type": "send_notification",
      "config": {
        "to": "assignee",
        "title": "Task Overdue",
        "message": "Your task '{title}' is overdue"
      }
    }
  ]
}
```

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For workflow builder, inbox UI
- Context7 MCP: "workflow rule engine design patterns"
- Context7 MCP: "React form builder patterns"

**RAWDOG code to reference:**
- `src/lib/workflow/` - Complete workflow engine
- `src/lib/smart-inbox/` - Inbox and copilot
- `src/lib/communications/` - Thread and message schema
- `src/app/admin/workflows/` - Workflow admin UI

**Spec documents:**
- `PHASE-2CM-EMAIL-QUEUE.md` - Email queue patterns
- `PHASE-2H-PRODUCTIVITY.md` - Task creation action

---

## Interfaces

### WorkflowRule

```typescript
interface WorkflowRule {
  id: string
  name: string
  description: string | null
  isActive: boolean
  priority: number

  triggerType: 'status_change' | 'time_elapsed' | 'scheduled' | 'event' | 'manual'
  triggerConfig: TriggerConfig

  conditions: Condition[]
  actions: Action[]

  cooldownHours: number | null
  maxExecutions: number | null

  requiresApproval: boolean
  approverRole: string | null

  createdBy: { id: string; name: string }
  createdAt: Date
  updatedAt: Date
}

type TriggerConfig =
  | { type: 'status_change'; from?: string[]; to?: string[] }
  | { type: 'time_elapsed'; status: string; hours?: number; days?: number }
  | { type: 'scheduled'; cron: string; timezone?: string }
  | { type: 'event'; eventType: string }
  | { type: 'manual' }
```

### WorkflowExecution

```typescript
interface WorkflowExecution {
  id: string
  ruleId: string
  ruleName: string

  entityType: string
  entityId: string
  entityTitle: string

  triggerData: Record<string, unknown>

  conditionsEvaluated: Array<{
    condition: Condition
    passed: boolean
    actualValue: unknown
  }>
  conditionsPassed: boolean

  actionsTaken: Array<{
    action: Action
    success: boolean
    result?: unknown
    error?: string
  }>

  result: 'success' | 'partial' | 'failed' | 'skipped' | 'pending_approval'
  errorMessage: string | null

  requiresApproval: boolean
  approvedBy: { id: string; name: string } | null
  approvedAt: Date | null
  rejectedBy: { id: string; name: string } | null
  rejectedAt: Date | null
  rejectionReason: string | null

  startedAt: Date
  completedAt: Date | null
}
```

### Thread

```typescript
interface Thread {
  id: string
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
    avatarUrl: string | null
    contactType: string
  }

  threadType: 'general' | 'project' | 'support' | 'onboarding'
  relatedEntity: {
    type: string
    id: string
    title: string
  } | null

  subject: string | null
  status: 'open' | 'snoozed' | 'closed'
  snoozedUntil: Date | null
  priority: 'low' | 'normal' | 'high' | 'urgent'

  assignedTo: { id: string; name: string; avatarUrl: string | null } | null

  lastMessageAt: Date | null
  lastMessageSender: 'contact' | 'team'
  lastMessagePreview: string | null
  unreadCount: number

  tags: string[]

  createdAt: Date
  updatedAt: Date
}
```

---

## API Routes

```
/api/admin/workflows/
  rules/
    route.ts                         # GET list, POST create
    [id]/route.ts                    # GET, PATCH, DELETE rule
    [id]/executions/route.ts         # GET execution history
    [id]/test/route.ts               # POST test rule (dry run)

  executions/
    route.ts                         # GET all executions
    [id]/route.ts                    # GET execution detail

  approvals/
    route.ts                         # GET pending approvals
    [id]/approve/route.ts            # POST approve
    [id]/reject/route.ts             # POST reject

  scheduled/
    route.ts                         # GET scheduled actions
    [id]/cancel/route.ts             # POST cancel action

/api/admin/inbox/
  threads/
    route.ts                         # GET list, POST create
    [id]/route.ts                    # GET, PATCH thread
    [id]/messages/route.ts           # GET messages, POST send
    [id]/assign/route.ts             # POST assign
    [id]/snooze/route.ts             # POST snooze
    [id]/close/route.ts              # POST close

  contacts/
    route.ts                         # GET list, POST create
    [id]/route.ts                    # GET, PATCH, DELETE contact

  copilot/
    draft/route.ts                   # POST generate draft
    [draftId]/send/route.ts          # POST send draft

/api/webhooks/
  workflow/trigger/route.ts          # POST trigger manual workflow
```

---

## Frontend Design Prompts

### Workflow Rule Editor

```
/frontend-design

Building Workflow Rule Editor for tenant admin (PHASE-2H-WORKFLOWS).

Requirements:
- Multi-section form: Trigger, Conditions, Actions
- Trigger section: Select type (status_change, time_elapsed, scheduled, manual)
  - Dynamic config form based on type
- Conditions section: Visual builder
  - Add condition button
  - Each condition: Field dropdown, Operator dropdown, Value input
  - AND connector between conditions
  - Remove condition button
- Actions section: Ordered list
  - Add action button
  - Drag to reorder
  - Each action: Type selector, Config form (varies by type)
  - Template editor with variable insertion buttons
- Settings: Active toggle, Priority, Cooldown, Max executions
- Approval toggle with role selector

Layout:
- Left sidebar: Section navigation (Trigger, Conditions, Actions, Settings)
- Main area: Current section form
- Bottom bar: Cancel, Save Draft, Save & Activate

Design:
- Clean, form-heavy interface
- Conditions show as card-style rows with clear AND connectors
- Actions show as numbered steps
- Template editor has variable picker dropdown
```

### Smart Inbox

```
/frontend-design

Building Smart Inbox for tenant admin (PHASE-2H-WORKFLOWS).

Requirements:
- Three-panel layout: Sidebar (filters), Thread list, Thread detail
- Sidebar: Status filter (Open, Snoozed, Closed), Priority filter, Assignment filter
- Thread list:
  - Avatar, Contact name, Subject/preview, Time, Unread badge
  - Priority indicator (colored dot)
  - Assignment indicator
  - Hover reveals quick actions
- Thread detail:
  - Header: Contact info, Assign button, Snooze button, Close button
  - Message history (bubble style, inbound left, outbound right)
  - AI draft banner (if copilot enabled and draft available)
  - Composer at bottom: Text area, Channel selector, Send button

Interactions:
- Click thread to view detail
- Keyboard navigation (j/k for next/prev)
- Click AI draft to preview, edit, send
- Snooze shows date picker popover

Design:
- Gmail-inspired clean layout
- Unread threads have bold text
- Inbound messages: Light gray bubble, left aligned
- Outbound messages: Brand color bubble, right aligned
- AI drafts: Subtle purple border, "AI Draft" badge
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:

1. **Condition builder complexity**: Simple field/operator/value vs. nested groups with OR
2. **Action retry logic**: How to handle failed actions (retry count, backoff)
3. **Template editor**: Simple variable insertion vs. rich text with conditionals
4. **AI copilot integration**: Whether to build in this phase or defer
5. **Slack integration depth**: Whether to build full Slack actions or stub

---

## Tasks

### [PARALLEL] Database & Schema
- [x] Create `workflow_rules` table with indexes
- [x] Create `workflow_executions` table with indexes
- [x] Create `scheduled_actions` table with indexes
- [x] Create `entity_workflow_state` table
- [x] Create `contacts` table with indexes
- [x] Create `communication_threads` table with indexes
- [x] Create `communication_messages` table with indexes
- [x] Add schema migration scripts

### [PARALLEL] Core Engine
- [x] Implement WorkflowEngine class (singleton per tenant)
- [x] Implement condition evaluator with all 13 operators
- [x] Implement computed field calculators
- [x] Implement action executor framework
- [x] Implement template interpolation with escaping
- [x] Implement execution logging
- [x] Implement cooldown and max execution checks
- [x] Implement entity workflow state tracking

### [SEQUENTIAL after Core] Trigger Handlers
- [x] Implement status change trigger handler
- [x] Implement time elapsed trigger checker
- [x] Implement scheduled trigger handler (cron)
- [x] Implement manual trigger handler
- [x] Implement event trigger handler

### [SEQUENTIAL after Core] Action Implementations
- [x] Implement `send_message` action (email)
- [x] Implement `send_notification` action
- [x] Implement `slack_notify` action (stub if no Slack integration)
- [x] Implement `suggest_action` action (stub)
- [x] Implement `schedule_followup` action
- [x] Implement `update_status` action
- [x] Implement `update_field` action
- [x] Implement `create_task` action
- [x] Implement `webhook` action

### [SEQUENTIAL after Actions] Approval Workflow
- [x] Implement approval queue queries
- [x] Implement approve execution flow
- [x] Implement reject execution flow
- [x] Hook actions to resume after approval

### [PARALLEL] Smart Inbox
- [x] Implement contact CRUD operations
- [x] Implement thread CRUD operations
- [x] Implement message send/receive
- [x] Implement thread assignment
- [x] Implement snooze functionality
- [x] Implement mark as read
- [x] Implement unread count tracking

### [SEQUENTIAL after Engine & Inbox] API Routes
- [x] Create workflow rule CRUD routes
- [x] Create execution log routes
- [x] Create approval routes
- [x] Create scheduled action routes
- [x] Create inbox thread routes
- [x] Create contact routes
- [x] Create message routes
- [x] Add cache-busting headers

### [SEQUENTIAL after API] UI - Workflow Builder
- [x] Invoke `/frontend-design` for WorkflowRuleEditor
- [x] Build WorkflowRuleList component
- [x] Build WorkflowRuleEditor component
- [x] Build TriggerConfigForm component
- [x] Build ConditionBuilder component
- [x] Build ActionList component
- [x] Build ActionConfigForm component
- [x] Build TemplateEditor component
- [x] Build WorkflowExecutionLog component
- [x] Build ApprovalQueue component

### [SEQUENTIAL after API] UI - Smart Inbox
- [x] Invoke `/frontend-design` for InboxLayout
- [x] Build InboxSidebar component
- [x] Build ThreadList component
- [x] Build ThreadDetail component
- [x] Build MessageBubble component
- [x] Build MessageComposer component
- [x] Build ContactCard component

### [SEQUENTIAL after Components] Pages
- [x] Create `/admin/workflows` page
- [x] Create `/admin/workflows/new` page
- [x] Create `/admin/workflows/[id]` page
- [x] Create `/admin/workflows/approvals` page
- [x] Create `/admin/workflows/scheduled` page
- [x] Create `/admin/workflows/logs` page
- [x] Create `/admin/inbox` page
- [x] Create `/admin/inbox/thread/[id]` page
- [x] Create `/admin/inbox/contacts` page

### [SEQUENTIAL after Pages] Background Jobs
- [x] Create job: Process scheduled actions (every 5 min)
- [x] Create job: Check time-elapsed triggers (hourly)
- [x] Create job: Clean up old execution logs (daily)

### [SEQUENTIAL after All] Built-in Rules & Testing
- [x] Create built-in rule templates
- [x] Seed built-in rules for new tenants
- [x] Unit tests for condition evaluator
- [x] Unit tests for action executor
- [x] Integration tests for workflow execution
- [x] Tenant isolation tests

---

## Definition of Done

- [x] Rules can be created with triggers, conditions, and actions
- [x] Status change triggers fire correctly
- [x] Time elapsed triggers fire at correct intervals
- [x] All condition operators evaluate correctly
- [x] Actions execute with correct template substitution
- [x] Approval workflow pauses and resumes correctly
- [x] Scheduled actions execute at scheduled time
- [x] Scheduled actions can be cancelled
- [x] Smart inbox shows all threads correctly
- [x] Messages can be sent and received
- [x] Thread assignment and snooze work correctly
- [x] Execution logs show complete audit trail
- [x] Built-in rules created for new tenants
- [x] Tenant A cannot see Tenant B's workflows
- [x] `npx tsc --noEmit` passes
- [x] Unit and integration tests pass
