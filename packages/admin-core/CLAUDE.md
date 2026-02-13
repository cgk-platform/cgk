# @cgk-platform/admin-core - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

Core admin functionality for the CGK platform. Provides the Workflow Automation Engine and Smart Inbox system with full tenant isolation.

---

## Quick Reference

```typescript
import {
  WorkflowEngine,
  evaluateConditions,
  executeActions,
  getWorkflowRules,
  createWorkflowRule,
} from '@cgk-platform/admin-core/workflow'

import {
  getThreads,
  sendMessage,
  getContacts,
  createContact,
} from '@cgk-platform/admin-core/inbox'
```

---

## Key Patterns

### Pattern 1: Workflow Engine (Singleton per Tenant)

```typescript
import { WorkflowEngine } from '@cgk-platform/admin-core/workflow'

// Get or create engine for tenant
const engine = WorkflowEngine.getInstance(tenantId)

// Load rules from database
await engine.loadRules()

// Handle status change trigger
const executions = await engine.handleStatusChange({
  entityType: 'project',
  entityId: projectId,
  oldStatus: 'pending',
  newStatus: 'in_progress',
  entity: projectData,
})

// Handle time-elapsed triggers (batch check)
const entities = await getEntitiesInStatus('pending')
await engine.checkTimeElapsedTriggers(entities)

// Manual trigger
await engine.triggerManually({
  ruleId,
  entityType: 'project',
  entityId,
  entity: projectData,
})
```

### Pattern 2: Condition Evaluation

```typescript
import { evaluateConditions, computeFields } from '@cgk-platform/admin-core/workflow'

const computed = computeFields(entity)
const { passed, results } = evaluateConditions(conditions, {
  entity,
  previousEntity,
  computed,
})

// Results show each condition's outcome
results.forEach(r => {
  console.log(`${r.condition.field} ${r.condition.operator}: ${r.passed}`)
})
```

### Pattern 3: Smart Inbox

```typescript
import {
  getThreads,
  sendMessage,
  markThreadAsRead,
  snoozeThread,
  generateDraft,
} from '@cgk-platform/admin-core/inbox'

// Get open threads
const { threads, total } = await getThreads(tenantId, {
  status: 'open',
  priority: 'high',
})

// Send message
const message = await sendMessage(tenantId, threadId, {
  channel: 'email',
  body: 'Hello!',
}, userId)

// Generate AI draft
const draft = await generateDraft(tenantId, threadId)
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `workflow/engine.ts` | Workflow engine (singleton) | `WorkflowEngine` |
| `workflow/evaluator.ts` | Condition evaluation | `evaluateConditions`, `computeFields` |
| `workflow/actions.ts` | Action execution | `executeAction`, `interpolateTemplate` |
| `workflow/rules.ts` | Rule CRUD | `getWorkflowRules`, `createWorkflowRule` |
| `workflow/types.ts` | Type definitions | All workflow types |
| `inbox/contacts.ts` | Contact operations | `getContacts`, `createContact` |
| `inbox/threads.ts` | Thread operations | `getThreads`, `snoozeThread` |
| `inbox/messages.ts` | Message operations | `sendMessage`, `generateDraft` |
| `inbox/types.ts` | Type definitions | All inbox types |

---

## Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match (case insensitive) | `status equals 'pending'` |
| `notEquals` | Not equal | `status notEquals 'completed'` |
| `greaterThan` | Numeric/date comparison | `hoursInStatus > 48` |
| `lessThan` | Numeric/date comparison | `dueDate < 'now'` |
| `in` | Value in array | `status in ['pending', 'review']` |
| `notIn` | Value not in array | `priority notIn ['low']` |
| `contains` | String/array contains | `tags contains 'urgent'` |
| `startsWith` | String starts with | `email startsWith 'admin'` |
| `endsWith` | String ends with | `email endsWith '@example.com'` |
| `exists` | Field exists and not null | `assignee exists` |
| `notExists` | Field is null/undefined | `dueDate notExists` |
| `matches` | Regex match | `email matches '^[a-z]+@'` |

---

## Computed Fields

These are automatically calculated and available in conditions:

| Field | Description |
|-------|-------------|
| `daysSinceCreated` | Days since entity created |
| `daysSinceUpdated` | Days since last update |
| `hoursInStatus` | Hours in current status |
| `daysSinceDue` | Days past due date (negative = future) |
| `isOverdue` | Boolean: past due and not completed |
| `remindersSent` | Count from entity state |

---

## Action Types

| Type | Description | Config |
|------|-------------|--------|
| `send_message` | Email/SMS to contact | `{ channel, template, subject, to }` |
| `send_notification` | Internal notification | `{ to, title, message, priority }` |
| `slack_notify` | Slack channel message | `{ channel, message, mention }` |
| `suggest_action` | Slack with buttons | `{ channel, message, options }` |
| `schedule_followup` | Delayed action | `{ delayHours, delayDays, action, cancelIf }` |
| `update_status` | Change status | `{ newStatus }` |
| `update_field` | Update field | `{ field, value }` |
| `create_task` | Create task | `{ title, description, priority, assignTo, dueInDays }` |
| `assign_to` | Assign entity | `{ userId, role }` |
| `webhook` | HTTP request | `{ url, method, headers, includeEntity }` |

---

## Template Variables

Use `{variableName}` in templates:

| Variable | Source |
|----------|--------|
| `{firstName}` | First part of contact name |
| `{lastName}` | Last part of contact name |
| `{name}` | Full name |
| `{email}` | Contact email |
| `{entityTitle}` | Entity title/name |
| `{entityStatus}` | Current status |
| `{dueDate}` | Formatted due date |
| `{daysSince}` | Days since last update |
| `{hoursInStatus}` | Hours in current status |
| `{projectTitle}` | Project title |
| `{adminUrl}` | Link to admin page |

---

## Common Gotchas

### 1. Always reload rules after changes

```typescript
const engine = WorkflowEngine.getInstance(tenantId)
await engine.reloadRules() // After creating/updating rules
```

### 2. Cooldowns apply per entity

```typescript
// If cooldownHours = 24, rule won't fire on same entity for 24h
// Different entities can still trigger the rule
```

### 3. Approval workflow pauses execution

```typescript
// When requiresApproval = true:
// - Conditions are evaluated
// - Execution is created with result = 'pending_approval'
// - Actions are NOT executed until approved
// - Use engine.approveExecution(id, userId) to continue
```

### 4. Template escaping

```typescript
// Templates are HTML-escaped for email bodies
// Use plain text in SMS templates
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/db` | Database queries with tenant isolation |
| `@cgk-platform/auth` | User context for actions |
| `@cgk-platform/communications` | Email queueing |
| `@cgk-platform/jobs` | Background job integration |

---

## Testing

```bash
# Run tests
pnpm --filter @cgk-platform/admin-core test

# Watch mode
pnpm --filter @cgk-platform/admin-core test:watch
```
