'use client'

import { useCallback } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

import { Button, Input, Label, cn } from '@cgk/ui'

import type { WizardData, WizardStep4Data, Guardrail } from '@/lib/ab-tests/types'

interface Step4Props {
  data: WizardData
  updateData: (data: Partial<WizardData>) => void
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

const guardrailMetrics = [
  { value: 'bounce_rate', label: 'Bounce Rate' },
  { value: 'cart_abandonment', label: 'Cart Abandonment' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversion_rate', label: 'Conversion Rate' },
  { value: 'page_load_time', label: 'Page Load Time' },
]

export function Step4Schedule({ data, updateData }: Step4Props) {
  const step4: WizardStep4Data = data.step4 || {
    startOption: 'now',
    endOption: 'auto_significance',
    timezone: 'America/New_York',
    guardrails: [],
  }

  const update = useCallback(
    (changes: Partial<WizardStep4Data>) => {
      updateData({ step4: { ...step4, ...changes } })
    },
    [step4, updateData]
  )

  const addGuardrail = useCallback(() => {
    const newGuardrail: Guardrail = {
      id: `guardrail-${Date.now()}`,
      name: 'New Guardrail',
      metric: 'bounce_rate',
      threshold: 10,
      direction: 'above',
      isTriggered: false,
    }
    update({ guardrails: [...step4.guardrails, newGuardrail] })
  }, [step4.guardrails, update])

  const updateGuardrail = useCallback(
    (index: number, changes: Partial<Guardrail>) => {
      const newGuardrails = [...step4.guardrails]
      const current = newGuardrails[index]
      if (!current) return
      newGuardrails[index] = {
        id: changes.id ?? current.id,
        name: changes.name ?? current.name,
        metric: changes.metric ?? current.metric,
        threshold: changes.threshold ?? current.threshold,
        direction: changes.direction ?? current.direction,
        isTriggered: changes.isTriggered ?? current.isTriggered,
        currentValue: changes.currentValue ?? current.currentValue,
      }
      update({ guardrails: newGuardrails })
    },
    [step4.guardrails, update]
  )

  const removeGuardrail = useCallback(
    (index: number) => {
      const newGuardrails = step4.guardrails.filter((_, i) => i !== index)
      update({ guardrails: newGuardrails })
    },
    [step4.guardrails, update]
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Schedule & Guardrails</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure when to run the test and set up safety guardrails.
        </p>
      </div>

      {/* Start Options */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-slate-700">
          When should this test start?
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update({ startOption: 'now' })}
            className={cn(
              'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
              step4.startOption === 'now'
                ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-sm font-medium text-slate-900">Start Immediately</span>
            <span className="mt-1 text-xs text-slate-500">
              Test goes live as soon as you create it
            </span>
          </button>

          <button
            type="button"
            onClick={() => update({ startOption: 'scheduled' })}
            className={cn(
              'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
              step4.startOption === 'scheduled'
                ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-sm font-medium text-slate-900">Schedule for Later</span>
            <span className="mt-1 text-xs text-slate-500">
              Set a specific date and time to start
            </span>
          </button>
        </div>

        {step4.startOption === 'scheduled' && (
          <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={step4.scheduledStartAt || ''}
                onChange={(e) => update({ scheduledStartAt: e.target.value })}
                className="w-auto"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Timezone</Label>
              <select
                value={step4.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* End Options */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-slate-700">
          When should this test end?
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => update({ endOption: 'auto_significance' })}
            className={cn(
              'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
              step4.endOption === 'auto_significance'
                ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-sm font-medium text-slate-900">Auto-end on Significance</span>
            <span className="mt-1 text-xs text-slate-500">
              Stop when statistical significance is reached
            </span>
          </button>

          <button
            type="button"
            onClick={() => update({ endOption: 'scheduled' })}
            className={cn(
              'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
              step4.endOption === 'scheduled'
                ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-sm font-medium text-slate-900">Schedule End Date</span>
            <span className="mt-1 text-xs text-slate-500">
              Run for a fixed duration
            </span>
          </button>

          <button
            type="button"
            onClick={() => update({ endOption: 'manual' })}
            className={cn(
              'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
              step4.endOption === 'manual'
                ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-sm font-medium text-slate-900">Manual</span>
            <span className="mt-1 text-xs text-slate-500">
              End the test manually when ready
            </span>
          </button>
        </div>

        {step4.endOption === 'scheduled' && (
          <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">End Date & Time</Label>
              <Input
                type="datetime-local"
                value={step4.scheduledEndAt || ''}
                onChange={(e) => update({ scheduledEndAt: e.target.value })}
                className="w-auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* Timezone (if not shown above) */}
      {step4.startOption === 'now' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Timezone</Label>
          <select
            value={step4.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Guardrails */}
      <div className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-slate-700">Safety Guardrails</Label>
            <p className="mt-0.5 text-xs text-slate-500">
              Automatically pause the test if key metrics degrade significantly
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addGuardrail}>
            <Plus className="mr-1 h-4 w-4" />
            Add Guardrail
          </Button>
        </div>

        {step4.guardrails.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No guardrails configured</p>
            <p className="mt-1 text-xs text-slate-400">
              Guardrails help prevent negative impacts during testing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {step4.guardrails.map((guardrail, index) => (
              <GuardrailCard
                key={guardrail.id}
                guardrail={guardrail}
                onUpdate={(changes) => updateGuardrail(index, changes)}
                onRemove={() => removeGuardrail(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface GuardrailCardProps {
  guardrail: Guardrail
  onUpdate: (changes: Partial<Guardrail>) => void
  onRemove: () => void
}

function GuardrailCard({ guardrail, onUpdate, onRemove }: GuardrailCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1 space-y-3">
        <Input
          value={guardrail.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Guardrail name"
          className="max-w-xs"
        />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">If</span>
          <select
            value={guardrail.metric}
            onChange={(e) => onUpdate({ metric: e.target.value })}
            className="h-8 rounded-md border border-slate-200 px-2 text-sm"
          >
            {guardrailMetrics.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <span className="text-slate-500">goes</span>
          <select
            value={guardrail.direction}
            onChange={(e) => onUpdate({ direction: e.target.value as 'above' | 'below' })}
            className="h-8 rounded-md border border-slate-200 px-2 text-sm"
          >
            <option value="above">above</option>
            <option value="below">below</option>
          </select>

          <Input
            type="number"
            value={guardrail.threshold}
            onChange={(e) => onUpdate({ threshold: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 font-mono"
          />
          <span className="text-slate-500">% relative to control</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
