'use client'

import { useState } from 'react'
import {
  Bell,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  User,
  Webhook,
} from 'lucide-react'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

interface Action {
  type: string
  config: Record<string, unknown>
}

interface ActionListProps {
  actions: Action[]
  onChange: (actions: Action[]) => void
}

const ACTION_TYPES = [
  {
    type: 'send_message',
    label: 'Send Message',
    description: 'Send email or SMS to contact',
    icon: Mail,
  },
  {
    type: 'send_notification',
    label: 'Send Notification',
    description: 'Send internal notification',
    icon: Bell,
  },
  {
    type: 'slack_notify',
    label: 'Slack Notify',
    description: 'Post message to Slack channel',
    icon: MessageSquare,
  },
  {
    type: 'suggest_action',
    label: 'Suggest Action',
    description: 'Slack message with action buttons',
    icon: Send,
  },
  {
    type: 'schedule_followup',
    label: 'Schedule Follow-up',
    description: 'Schedule action for later',
    icon: Calendar,
  },
  {
    type: 'update_status',
    label: 'Update Status',
    description: 'Change entity status',
    icon: Pencil,
  },
  {
    type: 'update_field',
    label: 'Update Field',
    description: 'Update entity field value',
    icon: FileText,
  },
  {
    type: 'create_task',
    label: 'Create Task',
    description: 'Create a new task',
    icon: CheckSquare,
  },
  {
    type: 'assign_to',
    label: 'Assign To',
    description: 'Assign entity to user',
    icon: User,
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Call external URL',
    icon: Webhook,
  },
]

export function ActionList({ actions, onChange }: ActionListProps) {
  const [showActionPicker, setShowActionPicker] = useState(false)
  const [expandedAction, setExpandedAction] = useState<number | null>(
    actions.length > 0 ? 0 : null
  )

  const addAction = (type: string) => {
    const newAction: Action = { type, config: {} }
    onChange([...actions, newAction])
    setExpandedAction(actions.length)
    setShowActionPicker(false)
  }

  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = [...actions]
    const currentAction = newActions[index]
    if (!currentAction) return
    newActions[index] = { ...currentAction, ...updates }
    onChange(newActions)
  }

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
    if (expandedAction === index) {
      setExpandedAction(null)
    }
  }

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= actions.length) return

    const newActions = [...actions]
    const currentAction = newActions[index]
    const targetAction = newActions[newIndex]
    if (!currentAction || !targetAction) return
    newActions[index] = targetAction
    newActions[newIndex] = currentAction
    onChange(newActions)
    setExpandedAction(newIndex)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">Actions</h3>
          <p className="text-sm text-muted-foreground">
            Actions execute in order when conditions pass
          </p>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No actions defined. Add at least one action.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActionPicker(true)}
            className="mt-3"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Action
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action, index) => {
            const actionType = ACTION_TYPES.find((t) => t.type === action.type)
            const Icon = actionType?.icon || Webhook
            const isExpanded = expandedAction === index

            return (
              <div
                key={index}
                className={cn(
                  'rounded-lg border bg-card transition-all',
                  isExpanded && 'ring-1 ring-primary'
                )}
              >
                {/* Action Header */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 cursor-pointer',
                    'hover:bg-muted/30'
                  )}
                  onClick={() => setExpandedAction(isExpanded ? null : index)}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Step Number */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {actionType?.label || action.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getActionPreview(action)}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveAction(index, 'up')
                      }}
                      disabled={index === 0}
                      className={cn(
                        'rounded p-1 transition-colors',
                        'hover:bg-muted disabled:opacity-30'
                      )}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveAction(index, 'down')
                      }}
                      disabled={index === actions.length - 1}
                      className={cn(
                        'rounded p-1 transition-colors',
                        'hover:bg-muted disabled:opacity-30'
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAction(index)
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Action Config (expanded) */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4">
                    <ActionConfigForm
                      action={action}
                      onChange={(config) => updateAction(index, { config })}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActionPicker(true)}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Action
          </Button>
        </div>
      )}

      {/* Action Picker Modal */}
      {showActionPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Add Action</h3>
            <p className="text-sm text-muted-foreground">
              Choose an action to add to this workflow
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {ACTION_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.type}
                    onClick={() => addAction(type.type)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left',
                      'transition-all hover:border-primary hover:bg-primary/5'
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowActionPicker(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionConfigForm({
  action,
  onChange,
}: {
  action: Action
  onChange: (config: Record<string, unknown>) => void
}) {
  const config = action.config

  const updateConfig = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value })
  }

  switch (action.type) {
    case 'send_message':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Channel</label>
              <select
                value={(config.channel as string) || 'email'}
                onChange={(e) => updateConfig('channel', e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <select
                value={(config.to as string) || 'contact'}
                onChange={(e) => updateConfig('to', e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="contact">Contact</option>
                <option value="assignee">Assignee</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Subject</label>
            <input
              type="text"
              value={(config.subject as string) || ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Email subject..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Template{' '}
              <span className="text-xs text-muted-foreground">
                (use {'{'}firstName{'}'}, {'{'}projectTitle{'}'}, etc.)
              </span>
            </label>
            <textarea
              value={(config.template as string) || ''}
              onChange={(e) => updateConfig('template', e.target.value)}
              placeholder="Hey {firstName}, ..."
              rows={4}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
      )

    case 'send_notification':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">To</label>
            <select
              value={(config.to as string) || 'assignee'}
              onChange={(e) => updateConfig('to', e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="assignee">Assignee</option>
              <option value="owner">Owner</option>
              <option value="all_admins">All Admins</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={(config.title as string) || ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Notification title"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={(config.message as string) || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              placeholder="Notification message..."
              rows={2}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )

    case 'slack_notify':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Channel</label>
            <input
              type="text"
              value={(config.channel as string) || ''}
              onChange={(e) => updateConfig('channel', e.target.value)}
              placeholder="#ops"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={(config.message as string) || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              placeholder="Message to send..."
              rows={2}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Mention (optional)</label>
            <input
              type="text"
              value={(config.mention as string) || ''}
              onChange={(e) => updateConfig('mention', e.target.value)}
              placeholder="@primary, @channel"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
      )

    case 'update_status':
      return (
        <div>
          <label className="text-sm font-medium">New Status</label>
          <input
            type="text"
            value={(config.newStatus as string) || ''}
            onChange={(e) => updateConfig('newStatus', e.target.value)}
            placeholder="completed"
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>
      )

    case 'create_task':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Task Title</label>
            <input
              type="text"
              value={(config.title as string) || ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Follow up on {projectTitle}"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={(config.priority as string) || 'medium'}
                onChange={(e) => updateConfig('priority', e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Due in (days)</label>
              <input
                type="number"
                min="0"
                value={(config.dueInDays as number) || ''}
                onChange={(e) => updateConfig('dueInDays', parseInt(e.target.value) || 0)}
                placeholder="3"
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'webhook':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">URL</label>
            <input
              type="url"
              value={(config.url as string) || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Method</label>
            <select
              value={(config.method as string) || 'POST'}
              onChange={(e) => updateConfig('method', e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeEntity"
              checked={(config.includeEntity as boolean) || false}
              onChange={(e) => updateConfig('includeEntity', e.target.checked)}
              className="rounded border"
            />
            <label htmlFor="includeEntity" className="text-sm">
              Include entity data in request body
            </label>
          </div>
        </div>
      )

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Configure this action using the JSON config below.
        </div>
      )
  }
}

function getActionPreview(action: Action): string {
  const config = action.config

  switch (action.type) {
    case 'send_message':
      return `${config.channel || 'email'} to ${config.to || 'contact'}`
    case 'send_notification':
      return `to ${config.to || 'assignee'}: ${config.title || '...'}`
    case 'slack_notify':
      return `${config.channel || '#channel'}: ${String(config.message || '...').substring(0, 30)}`
    case 'update_status':
      return `set to ${config.newStatus || '...'}`
    case 'create_task':
      return `${config.title || 'New task'}`
    case 'webhook':
      return `${config.method || 'POST'} ${config.url || '...'}`
    default:
      return ''
  }
}
