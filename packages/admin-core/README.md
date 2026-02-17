# @cgk-platform/admin-core

Core admin functionality for the CGK platform: Workflow automation engine, Smart Inbox, and shared admin utilities.

## Installation

```bash
pnpm add @cgk-platform/admin-core
```

## Features

- **Workflow Engine** - Automate business processes with triggers, conditions, and actions
- **Smart Inbox** - Unified communication hub for customer and internal messages
- **Admin Utilities** - Shared tools and helpers for admin interfaces

## Quick Start

### Workflow System

```typescript
import { createWorkflow, executeWorkflow } from '@cgk-platform/admin-core'

// Create a workflow
const workflow = await createWorkflow({
  tenantId: 'tenant_123',
  name: 'Order Follow-up',
  trigger: {
    type: 'order.delivered',
    conditions: [{ field: 'value', operator: 'gte', value: 100 }],
  },
  actions: [
    {
      type: 'send_email',
      config: {
        template: 'order_feedback',
        delay: '2d',
      },
    },
  ],
})

// Execute workflow
await executeWorkflow(workflow.id, {
  orderId: 'order_456',
  customerEmail: 'customer@example.com',
})
```

### Smart Inbox

```typescript
import { getInboxMessages, markAsRead } from '@cgk-platform/admin-core'

// Fetch inbox messages
const messages = await getInboxMessages({
  tenantId: 'tenant_123',
  status: 'unread',
  limit: 20,
})

// Mark as read
await markAsRead({
  tenantId: 'tenant_123',
  messageId: 'msg_789',
})
```

## Key Exports

### Workflow
- `createWorkflow()` - Create workflow definition
- `updateWorkflow()` - Update workflow configuration
- `executeWorkflow()` - Trigger workflow execution
- `listWorkflows()` - List all workflows
- `deleteWorkflow()` - Remove workflow

### Inbox
- `getInboxMessages()` - Fetch messages with filters
- `markAsRead()` - Mark message as read
- `archiveMessage()` - Archive message
- `assignMessage()` - Assign to team member
- `addNote()` - Add internal note to message

## Workflow Triggers

Supported trigger types:
- `order.created` - New order placed
- `order.delivered` - Order marked as delivered
- `customer.registered` - New customer signup
- `cart.abandoned` - Cart inactive for specified time
- `product.restocked` - Product back in stock

## Workflow Actions

Supported action types:
- `send_email` - Send email using template
- `send_sms` - Send SMS notification
- `update_customer` - Modify customer record
- `apply_discount` - Create discount code
- `create_task` - Add task to admin queue

## License

MIT
