'use client'

import { AlertCircle, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react'

import { Alert, AlertDescription, Badge, Button, Input, Switch } from '@cgk/ui'

import type { ReminderChannel, ReminderStep } from '../../../lib/creators/lifecycle-types'

interface ReminderChainConfigProps {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  scheduleTime: string
  onScheduleTimeChange: (time: string) => void
  steps: ReminderStep[]
  onStepsChange: (steps: ReminderStep[]) => void
  escalation?: {
    enabled: boolean
    daysAfterFinal: number
    slackNotification: boolean
  }
  onEscalationChange?: (escalation: { enabled: boolean; daysAfterFinal: number; slackNotification: boolean }) => void
  triggerLabel: string // "After Approval" or "After Login"
  maxSteps?: number
}

export function ReminderChainConfig({
  title,
  description,
  enabled,
  onEnabledChange,
  scheduleTime,
  onScheduleTimeChange,
  steps,
  onStepsChange,
  escalation,
  onEscalationChange,
  triggerLabel,
  maxSteps = 5,
}: ReminderChainConfigProps) {
  function addStep() {
    if (steps.length >= maxSteps) return

    const lastStep = steps[steps.length - 1]
    const newStep: ReminderStep = {
      id: `step-${Date.now()}`,
      order: steps.length + 1,
      daysAfterTrigger: lastStep ? lastStep.daysAfterTrigger + 3 : 3,
      channels: ['email'],
      templateId: `reminder_${steps.length + 1}`,
      templateName: `Reminder ${steps.length + 1}`,
    }

    onStepsChange([...steps, newStep])
  }

  function removeStep(stepId: string) {
    const filtered = steps.filter((s) => s.id !== stepId)
    // Re-order remaining steps
    const reordered = filtered.map((s, idx) => ({ ...s, order: idx + 1 }))
    onStepsChange(reordered)
  }

  function updateStep(stepId: string, updates: Partial<ReminderStep>) {
    onStepsChange(
      steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    )
  }

  function toggleChannel(stepId: string, channel: ReminderChannel) {
    const step = steps.find((s) => s.id === stepId)
    if (!step) return

    let newChannels: ReminderChannel[]
    if (step.channels.includes(channel)) {
      newChannels = step.channels.filter((c) => c !== channel)
      if (newChannels.length === 0) newChannels = ['email'] // Must have at least one
    } else {
      newChannels = [...step.channels, channel]
    }

    updateStep(stepId, { channels: newChannels })
  }

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-start justify-between border-b p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{title}</h3>
            <Badge variant={enabled ? 'default' : 'outline'}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-4 p-4">
          {/* Schedule Time */}
          <div className="flex items-center gap-4">
            <label className="w-32 shrink-0 text-sm font-medium">Send Time (UTC)</label>
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => onScheduleTimeChange(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Steps Table */}
          <div className="rounded-lg border">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div className="w-8">Step</div>
              <div>Days {triggerLabel}</div>
              <div>Channel</div>
              <div>Template</div>
              <div className="w-20"></div>
            </div>

            {steps.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No reminder steps configured
              </div>
            ) : (
              <div className="divide-y">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2"
                  >
                    <div className="flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                      {step.order}
                    </div>

                    <div>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={step.daysAfterTrigger}
                        onChange={(e) =>
                          updateStep(step.id, { daysAfterTrigger: parseInt(e.target.value) || 1 })
                        }
                        className="h-8 w-20"
                      />
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant={step.channels.includes('email') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleChannel(step.id, 'email')}
                        className="h-8"
                      >
                        <Mail className="mr-1 h-3 w-3" />
                        Email
                      </Button>
                      <Button
                        variant={step.channels.includes('sms') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleChannel(step.id, 'sms')}
                        className="h-8"
                      >
                        <MessageSquare className="mr-1 h-3 w-3" />
                        SMS
                      </Button>
                    </div>

                    <div>
                      <Input
                        value={step.templateName}
                        onChange={(e) => updateStep(step.id, { templateName: e.target.value })}
                        placeholder="Template name"
                        className="h-8"
                      />
                    </div>

                    <div className="flex w-20 justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {steps.length < maxSteps && (
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" onClick={addStep} className="w-full">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Reminder Step
                </Button>
              </div>
            )}
          </div>

          {steps.length >= maxSteps && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Maximum of {maxSteps} reminder steps allowed</AlertDescription>
            </Alert>
          )}

          {/* Escalation */}
          {escalation && onEscalationChange && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Escalation</div>
                  <p className="text-sm text-muted-foreground">
                    Mark as escalated after final reminder + wait period
                  </p>
                </div>
                <Switch
                  checked={escalation.enabled}
                  onCheckedChange={(checked) =>
                    onEscalationChange({ ...escalation, enabled: checked })
                  }
                />
              </div>

              {escalation.enabled && (
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Wait</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={escalation.daysAfterFinal}
                      onChange={(e) =>
                        onEscalationChange({
                          ...escalation,
                          daysAfterFinal: parseInt(e.target.value) || 1,
                        })
                      }
                      className="h-8 w-16"
                    />
                    <label className="text-sm">days after final reminder</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={escalation.slackNotification}
                      onCheckedChange={(checked) =>
                        onEscalationChange({ ...escalation, slackNotification: checked })
                      }
                    />
                    <label className="text-sm">Send Slack notification</label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
