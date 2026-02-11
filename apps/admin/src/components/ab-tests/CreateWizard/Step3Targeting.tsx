'use client'

import { useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button, Input, Label, cn } from '@cgk/ui'

import type {
  WizardData,
  WizardStep3Data,
  TargetingCondition,
  ConditionField,
  ConditionOperator,
  TargetingAction,
} from '@/lib/ab-tests/types'

interface Step3Props {
  data: WizardData
  updateData: (data: Partial<WizardData>) => void
}

type RuleData = WizardStep3Data['targetingRules'][number]

const conditionFields: { value: ConditionField; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'utm_source', label: 'UTM Source' },
  { value: 'utm_medium', label: 'UTM Medium' },
  { value: 'utm_campaign', label: 'UTM Campaign' },
  { value: 'device_type', label: 'Device Type' },
  { value: 'browser', label: 'Browser' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'query_param', label: 'Query Parameter' },
]

const conditionOperators: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'in', label: 'In list' },
  { value: 'not_in', label: 'Not in list' },
  { value: 'regex', label: 'Matches regex' },
]

const targetingActions: { value: TargetingAction; label: string; description: string }[] = [
  { value: 'include', label: 'Include', description: 'Only include matching visitors' },
  { value: 'exclude', label: 'Exclude', description: 'Exclude matching visitors' },
  { value: 'assign_variant', label: 'Assign Variant', description: 'Force a specific variant' },
]

export function Step3Targeting({ data, updateData }: Step3Props) {
  const step3: WizardStep3Data = data.step3 || {
    targetingRules: [],
    exclusionGroups: [],
  }

  const update = useCallback(
    (changes: Partial<WizardStep3Data>) => {
      updateData({ step3: { ...step3, ...changes } })
    },
    [step3, updateData]
  )

  const addRule = useCallback(() => {
    const newRule: RuleData = {
      name: `Rule ${step3.targetingRules.length + 1}`,
      conditions: [
        { field: 'url', operator: 'contains', value: '' },
      ],
      logic: 'and',
      action: 'include',
    }
    update({ targetingRules: [...step3.targetingRules, newRule] })
  }, [step3.targetingRules, update])

  const updateRule = useCallback(
    (index: number, changes: Partial<RuleData>) => {
      const newRules = [...step3.targetingRules]
      const current = newRules[index]
      if (!current) return
      newRules[index] = {
        name: changes.name ?? current.name,
        conditions: changes.conditions ?? current.conditions,
        logic: changes.logic ?? current.logic,
        action: changes.action ?? current.action,
        assignedVariantId: changes.assignedVariantId ?? current.assignedVariantId,
      }
      update({ targetingRules: newRules })
    },
    [step3.targetingRules, update]
  )

  const removeRule = useCallback(
    (index: number) => {
      const newRules = step3.targetingRules.filter((_, i) => i !== index)
      update({ targetingRules: newRules })
    },
    [step3.targetingRules, update]
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Targeting Rules</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define who should see this test. Leave empty to include all visitors.
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-sm text-cyan-800">
          <strong>Optional:</strong> Targeting rules help you run tests on specific segments.
          Without rules, all visitors to the base URL will be included in the test.
        </p>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {step3.targetingRules.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">No targeting rules defined.</p>
            <p className="mt-1 text-xs text-slate-400">
              All visitors to the base URL will be included in this test.
            </p>
            <Button variant="outline" size="sm" onClick={addRule} className="mt-4">
              <Plus className="mr-1 h-4 w-4" />
              Add Targeting Rule
            </Button>
          </div>
        ) : (
          <>
            {step3.targetingRules.map((rule, index) => (
              <RuleCard
                key={index}
                rule={rule}
                index={index}
                variants={data.step2?.variants || []}
                onUpdate={(changes) => updateRule(index, changes)}
                onRemove={() => removeRule(index)}
              />
            ))}
            <Button variant="outline" onClick={addRule}>
              <Plus className="mr-1 h-4 w-4" />
              Add Another Rule
            </Button>
          </>
        )}
      </div>

      {/* Exclusion Groups */}
      <div className="space-y-3 border-t border-slate-200 pt-6">
        <Label className="text-sm font-medium text-slate-700">Exclusion Groups</Label>
        <p className="text-xs text-slate-500">
          Prevent users from being in multiple tests at once by assigning to an exclusion group.
        </p>
        <Input
          placeholder="Enter exclusion group name (optional)"
          value={step3.exclusionGroups[0] || ''}
          onChange={(e) => update({ exclusionGroups: e.target.value ? [e.target.value] : [] })}
          className="max-w-md"
        />
      </div>
    </div>
  )
}

interface RuleCardProps {
  rule: RuleData
  index: number
  variants: { name: string }[]
  onUpdate: (changes: Partial<RuleData>) => void
  onRemove: () => void
}

function RuleCard({ rule, index, variants, onUpdate, onRemove }: RuleCardProps) {
  const updateCondition = (condIndex: number, changes: Partial<TargetingCondition>) => {
    const newConditions = [...rule.conditions]
    const current = newConditions[condIndex]
    if (!current) return
    newConditions[condIndex] = {
      field: changes.field ?? current.field,
      operator: changes.operator ?? current.operator,
      value: changes.value ?? current.value,
      key: changes.key ?? current.key,
    }
    onUpdate({ conditions: newConditions })
  }

  const addCondition = () => {
    onUpdate({
      conditions: [
        ...rule.conditions,
        { field: 'url', operator: 'contains', value: '' },
      ],
    })
  }

  const removeCondition = (condIndex: number) => {
    if (rule.conditions.length <= 1) return
    onUpdate({
      conditions: rule.conditions.filter((_, i) => i !== condIndex),
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Rule Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {index + 1}
          </span>
          <Input
            value={rule.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 w-48 text-sm font-medium"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Conditions */}
      <div className="space-y-3 p-4">
        {rule.conditions.map((condition, condIndex) => (
          <div key={condIndex} className="flex items-center gap-2">
            {condIndex > 0 && (
              <select
                value={rule.logic}
                onChange={(e) => onUpdate({ logic: e.target.value as 'and' | 'or' })}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold uppercase text-slate-600"
              >
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}

            {/* Field */}
            <select
              value={condition.field}
              onChange={(e) => updateCondition(condIndex, { field: e.target.value as ConditionField })}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm"
            >
              {conditionFields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Operator */}
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(condIndex, { operator: e.target.value as ConditionOperator })}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm"
            >
              {conditionOperators.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Value */}
            <Input
              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
              onChange={(e) => updateCondition(condIndex, { value: e.target.value })}
              placeholder="Value"
              className="flex-1"
            />

            {/* Remove Condition */}
            {rule.conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(condIndex)}
                className="rounded p-1 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <Button variant="ghost" size="sm" onClick={addCondition}>
          <Plus className="mr-1 h-4 w-4" />
          Add Condition
        </Button>
      </div>

      {/* Action */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-center gap-4">
          <Label className="text-xs font-medium text-slate-500">THEN</Label>
          <div className="flex gap-2">
            {targetingActions.map((action) => (
              <button
                key={action.value}
                type="button"
                onClick={() => onUpdate({ action: action.value })}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  rule.action === action.value
                    ? action.value === 'exclude'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-cyan-100 text-cyan-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>

          {rule.action === 'assign_variant' && variants.length > 0 && (
            <select
              value={rule.assignedVariantId || ''}
              onChange={(e) => onUpdate({ assignedVariantId: e.target.value })}
              className="h-8 rounded-md border border-slate-200 px-2 text-sm"
            >
              <option value="">Select variant</option>
              {variants.map((v, i) => (
                <option key={i} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}
