'use client'

import { cn } from '@cgk-platform/ui'
import { Plus, Trash2, X } from 'lucide-react'
import { useState, useEffect } from 'react'

import type {
  PipelineTrigger,
  TriggerType,
  PipelineAction,
  ProjectStatus,
} from '@/lib/pipeline/types'
import { PIPELINE_STAGES } from '@/lib/pipeline/types'

interface TriggerConfigModalProps {
  trigger?: PipelineTrigger
  onSave: (trigger: Omit<PipelineTrigger, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onDelete?: (triggerId: string) => Promise<void>
  onClose: () => void
}

const TRIGGER_TYPES: Array<{ id: TriggerType; label: string; description: string }> = [
  {
    id: 'stage_enter',
    label: 'Stage Enter',
    description: 'When a project enters a specific stage',
  },
  {
    id: 'stage_exit',
    label: 'Stage Exit',
    description: 'When a project leaves a specific stage',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    description: 'When a project becomes overdue',
  },
  {
    id: 'due_soon',
    label: 'Due Soon',
    description: 'When a project is due within X days',
  },
  {
    id: 'value_threshold',
    label: 'Value Threshold',
    description: 'When project value exceeds threshold',
  },
]

const ACTION_TYPES = [
  { id: 'send_email', label: 'Send Email' },
  { id: 'slack_notify', label: 'Slack Notification' },
  { id: 'assign_to', label: 'Assign to User' },
  { id: 'add_tag', label: 'Add Tag' },
  { id: 'change_status', label: 'Change Status' },
]

export function TriggerConfigModal({
  trigger,
  onSave,
  onDelete,
  onClose,
}: TriggerConfigModalProps) {
  const [name, setName] = useState(trigger?.name || '')
  const [enabled, setEnabled] = useState(trigger?.enabled ?? true)
  const [triggerType, setTriggerType] = useState<TriggerType>(
    trigger?.triggerType || 'stage_enter'
  )
  const [triggerStage, setTriggerStage] = useState<ProjectStatus | undefined>(
    trigger?.triggerStage
  )
  const [triggerDays, setTriggerDays] = useState<number | undefined>(
    trigger?.triggerDays
  )
  const [triggerValueCents, setTriggerValueCents] = useState<number | undefined>(
    trigger?.triggerValueCents
  )
  const [actions, setActions] = useState<PipelineAction[]>(trigger?.actions || [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        name,
        enabled,
        triggerType,
        triggerStage,
        triggerDays,
        triggerValueCents,
        actions,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save trigger:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!trigger?.id || !onDelete) return
    if (!confirm('Delete this trigger?')) return

    setIsSaving(true)
    try {
      await onDelete(trigger.id)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const addAction = (type: PipelineAction['type']) => {
    switch (type) {
      case 'send_email':
        setActions([...actions, { type: 'send_email', template: '' }])
        break
      case 'slack_notify':
        setActions([...actions, { type: 'slack_notify', channel: '', message: '' }])
        break
      case 'assign_to':
        setActions([...actions, { type: 'assign_to', userId: '' }])
        break
      case 'add_tag':
        setActions([...actions, { type: 'add_tag', tag: '' }])
        break
      case 'change_status':
        setActions([...actions, { type: 'change_status', newStatus: 'in_progress' }])
        break
    }
  }

  const updateAction = (index: number, updates: Partial<PipelineAction>) => {
    setActions((prev) => {
      const newActions = [...prev]
      newActions[index] = { ...newActions[index], ...updates } as PipelineAction
      return newActions
    })
  }

  const removeAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }

  const needsStage = triggerType === 'stage_enter' || triggerType === 'stage_exit'
  const needsDays = triggerType === 'due_soon'
  const needsValue = triggerType === 'value_threshold'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <h2 className="font-mono text-sm font-semibold text-slate-200">
            {trigger ? 'Edit Trigger' : 'New Trigger'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Name */}
          <div className="mb-4">
            <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trigger name..."
              className="w-full rounded border border-slate-700/50 bg-slate-800/50 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          {/* Enabled */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500"
              />
              <span className="font-mono text-xs text-slate-400">Enabled</span>
            </label>
          </div>

          {/* Trigger Type */}
          <div className="mb-4">
            <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
              Trigger Type
            </label>
            <div className="grid gap-2">
              {TRIGGER_TYPES.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => setTriggerType(tt.id)}
                  className={cn(
                    'rounded border px-3 py-2 text-left transition-colors',
                    triggerType === tt.id
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                  )}
                >
                  <div className="font-mono text-xs font-medium">{tt.label}</div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {tt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stage selector (for stage_enter/exit) */}
          {needsStage && (
            <div className="mb-4">
              <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                Stage
              </label>
              <select
                value={triggerStage || ''}
                onChange={(e) =>
                  setTriggerStage((e.target.value as ProjectStatus) || undefined)
                }
                className="w-full rounded border border-slate-700/50 bg-slate-800/50 px-3 py-2 font-mono text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none"
              >
                <option value="">Select stage...</option>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Days (for due_soon) */}
          {needsDays && (
            <div className="mb-4">
              <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                Days Before Due
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={triggerDays || ''}
                onChange={(e) =>
                  setTriggerDays(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="3"
                className="w-full rounded border border-slate-700/50 bg-slate-800/50 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          )}

          {/* Value threshold */}
          {needsValue && (
            <div className="mb-4">
              <label className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                Value Threshold ($)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={triggerValueCents ? triggerValueCents / 100 : ''}
                onChange={(e) =>
                  setTriggerValueCents(
                    e.target.value ? parseInt(e.target.value, 10) * 100 : undefined
                  )
                }
                placeholder="1000"
                className="w-full rounded border border-slate-700/50 bg-slate-800/50 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="mb-4">
            <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
              Actions
            </label>

            <div className="space-y-2">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded border border-slate-700/50 bg-slate-800/30 p-2"
                >
                  <div className="flex-1">
                    <div className="mb-1 font-mono text-xs text-slate-400">
                      {ACTION_TYPES.find((t) => t.id === action.type)?.label}
                    </div>

                    {action.type === 'send_email' && (
                      <input
                        type="text"
                        value={action.template}
                        onChange={(e) =>
                          updateAction(index, { template: e.target.value })
                        }
                        placeholder="Template name..."
                        className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                    )}

                    {action.type === 'slack_notify' && (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={action.channel}
                          onChange={(e) =>
                            updateAction(index, { channel: e.target.value })
                          }
                          placeholder="#channel"
                          className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={action.message}
                          onChange={(e) =>
                            updateAction(index, { message: e.target.value })
                          }
                          placeholder="Message..."
                          className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    )}

                    {action.type === 'add_tag' && (
                      <input
                        type="text"
                        value={action.tag}
                        onChange={(e) =>
                          updateAction(index, { tag: e.target.value })
                        }
                        placeholder="Tag name..."
                        className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                    )}

                    {action.type === 'change_status' && (
                      <select
                        value={action.newStatus}
                        onChange={(e) =>
                          updateAction(index, {
                            newStatus: e.target.value as ProjectStatus,
                          })
                        }
                        className="w-full rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
                      >
                        {PIPELINE_STAGES.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => removeAction(index)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {ACTION_TYPES.map((actionType) => (
                <button
                  key={actionType.id}
                  onClick={() => addAction(actionType.id as PipelineAction['type'])}
                  className="flex items-center gap-1 rounded border border-dashed border-slate-700/50 px-2 py-1 font-mono text-xs text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-400"
                >
                  <Plus className="h-3 w-3" />
                  {actionType.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700/50 px-4 py-3">
          <div>
            {trigger && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded px-4 py-2 font-mono text-xs text-red-400 transition-colors hover:text-red-300"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded px-4 py-2 font-mono text-xs text-slate-400 transition-colors hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="rounded bg-blue-500 px-4 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : trigger ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
