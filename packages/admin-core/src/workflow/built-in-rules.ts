/**
 * Built-in Workflow Rule Templates
 * PHASE-2H-WORKFLOWS
 *
 * These rules are created automatically for new tenants.
 */

import type { CreateWorkflowRuleInput } from './types'

/**
 * Built-in rule templates
 */
export const BUILT_IN_RULES: CreateWorkflowRuleInput[] = [
  // 1. Project: No Response 48h Reminder
  {
    name: 'Project: 48h No Response Reminder',
    description: 'Sends a reminder email when a project has been pending for 48 hours with no response',
    isActive: true,
    priority: 10,
    triggerType: 'time_elapsed',
    triggerConfig: {
      type: 'time_elapsed',
      status: 'pending',
      hours: 48,
    },
    conditions: [
      { field: 'hasResponse', operator: 'equals', value: false },
    ],
    actions: [
      {
        type: 'send_message',
        config: {
          channel: 'email',
          subject: 'Checking in on {projectTitle}',
          template: 'Hey {firstName}, just checking in on {projectTitle}. Let me know if you have any questions!',
        },
      },
      {
        type: 'slack_notify',
        config: {
          channel: '#ops',
          message: 'Sent 48h reminder to {name} for {projectTitle}',
        },
      },
    ],
    cooldownHours: 24,
    maxExecutions: 3,
    entityTypes: ['project'],
  },

  // 2. Project: Stalled 7 Days
  {
    name: 'Project: Stalled 7 Days Alert',
    description: 'Sends a Slack suggestion when a project has been in_progress for 7 days without updates',
    isActive: true,
    priority: 8,
    triggerType: 'time_elapsed',
    triggerConfig: {
      type: 'time_elapsed',
      status: 'in_progress',
      days: 7,
    },
    conditions: [
      { field: 'daysSinceLastUpdate', operator: 'greaterThan', value: 7 },
    ],
    actions: [
      {
        type: 'suggest_action',
        config: {
          channel: '#ops',
          message: '{projectTitle} has been stalled for 7 days. What should we do?',
          options: ['Send check-in', 'Escalate', 'Mark complete', 'Ignore'],
        },
      },
    ],
    requiresApproval: true,
    cooldownHours: 72,
    entityTypes: ['project'],
  },

  // 3. Submission: Review Reminder 24h
  {
    name: 'Submission: 24h Review Reminder',
    description: 'Notifies team when a submission has been pending review for 24 hours',
    isActive: true,
    priority: 15,
    triggerType: 'time_elapsed',
    triggerConfig: {
      type: 'time_elapsed',
      status: 'submitted',
      hours: 24,
    },
    conditions: [],
    actions: [
      {
        type: 'slack_notify',
        config: {
          channel: '#ops',
          message: 'Submission from {name} for {projectTitle} pending review for 24h',
          mention: '@primary',
        },
      },
    ],
    cooldownHours: 24,
    entityTypes: ['project'],
  },

  // 4. Task: Overdue Alert
  {
    name: 'Task: Overdue Alert',
    description: 'Sends notification when a task becomes overdue (runs daily at 9 AM)',
    isActive: true,
    priority: 12,
    triggerType: 'scheduled',
    triggerConfig: {
      type: 'scheduled',
      cron: '0 9 * * *',
      timezone: 'America/Los_Angeles',
    },
    conditions: [
      { field: 'dueDate', operator: 'lessThan', value: 'now' },
      { field: 'status', operator: 'notEquals', value: 'completed' },
    ],
    actions: [
      {
        type: 'send_notification',
        config: {
          to: 'assignee',
          title: 'Task Overdue',
          message: "Your task '{title}' is overdue",
          priority: 'high',
        },
      },
    ],
    entityTypes: ['task'],
  },

  // 5. Project: Completion Follow-up
  {
    name: 'Project: Completion Follow-up',
    description: 'Schedules a follow-up message 3 days after project completion',
    isActive: true,
    priority: 5,
    triggerType: 'status_change',
    triggerConfig: {
      type: 'status_change',
      to: ['completed'],
    },
    conditions: [],
    actions: [
      {
        type: 'schedule_followup',
        config: {
          delayDays: 3,
          action: {
            type: 'send_message',
            config: {
              channel: 'email',
              subject: 'How was your experience with {projectTitle}?',
              template: 'Hey {firstName}, we completed {projectTitle} a few days ago. We would love to hear your feedback! Is there anything we could have done better?',
            },
          },
          cancelIf: [
            { field: 'hasNegativeFeedback', operator: 'equals', value: true },
          ],
        },
      },
    ],
    entityTypes: ['project'],
  },

  // 6. Order: High Value Alert
  {
    name: 'Order: High Value Alert',
    description: 'Notifies team when a high-value order is placed',
    isActive: true,
    priority: 20,
    triggerType: 'event',
    triggerConfig: {
      type: 'event',
      eventType: 'order.created',
    },
    conditions: [
      { field: 'totalCents', operator: 'greaterThan', value: 50000 }, // > $500
    ],
    actions: [
      {
        type: 'slack_notify',
        config: {
          channel: '#sales',
          message: 'High-value order received: ${totalCents/100} from {customerName}',
        },
      },
      {
        type: 'create_task',
        config: {
          title: 'Review high-value order from {customerName}',
          description: 'Order total: ${totalCents/100}. Verify and prioritize.',
          priority: 'high',
          assignTo: 'owner',
          dueInDays: 1,
        },
      },
    ],
    entityTypes: ['order'],
  },

  // 7. Creator: Onboarding Welcome
  {
    name: 'Creator: Onboarding Welcome',
    description: 'Sends welcome email and creates onboarding task when creator is accepted',
    isActive: true,
    priority: 15,
    triggerType: 'status_change',
    triggerConfig: {
      type: 'status_change',
      from: ['pending', 'applied'],
      to: ['active'],
    },
    conditions: [],
    actions: [
      {
        type: 'send_message',
        config: {
          channel: 'email',
          subject: 'Welcome to the team, {firstName}!',
          template: 'Hi {firstName},\n\nWelcome aboard! We are excited to have you as a creator.\n\nHere are your next steps:\n1. Complete your profile\n2. Review our guidelines\n3. Check out available projects\n\nLet us know if you have any questions!',
        },
      },
      {
        type: 'create_task',
        config: {
          title: 'Onboard new creator: {name}',
          description: 'Complete onboarding checklist for {name}',
          priority: 'medium',
          assignTo: 'coordinator',
          dueInDays: 3,
        },
      },
    ],
    entityTypes: ['creator'],
  },

  // 8. Creator: Payment Pending 7 Days
  {
    name: 'Creator: Payment Pending Alert',
    description: 'Alerts when creator payment has been pending for 7 days',
    isActive: true,
    priority: 18,
    triggerType: 'time_elapsed',
    triggerConfig: {
      type: 'time_elapsed',
      status: 'payment_pending',
      days: 7,
    },
    conditions: [
      { field: 'pendingPayoutCents', operator: 'greaterThan', value: 0 },
    ],
    actions: [
      {
        type: 'slack_notify',
        config: {
          channel: '#treasury',
          message: 'Creator {name} has payment pending for 7+ days. Amount: ${pendingPayoutCents/100}',
          mention: '@treasury',
        },
      },
    ],
    cooldownHours: 168, // Weekly
    entityTypes: ['creator'],
  },
]

/**
 * Seed built-in rules for a new tenant
 */
export function getBuiltInRulesForTenant(): CreateWorkflowRuleInput[] {
  return BUILT_IN_RULES.map((rule) => ({
    ...rule,
    // Mark as system-created
    description: rule.description ? `[Built-in] ${rule.description}` : '[Built-in rule]',
  }))
}

/**
 * Get a built-in rule template by name
 */
export function getBuiltInRuleTemplate(name: string): CreateWorkflowRuleInput | undefined {
  return BUILT_IN_RULES.find((rule) =>
    rule.name.toLowerCase().includes(name.toLowerCase())
  )
}
