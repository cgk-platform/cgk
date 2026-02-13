'use client'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

interface Condition {
  field: string
  operator: string
  value: unknown
}

interface ConditionBuilderProps {
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'not equals' },
  { value: 'greaterThan', label: '>' },
  { value: 'lessThan', label: '<' },
  { value: 'greaterThanOrEqual', label: '>=' },
  { value: 'lessThanOrEqual', label: '<=' },
  { value: 'in', label: 'in' },
  { value: 'notIn', label: 'not in' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'exists', label: 'exists' },
  { value: 'notExists', label: 'not exists' },
  { value: 'matches', label: 'matches (regex)' },
]

const COMMON_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignedTo', label: 'Assigned To' },
  { value: 'ownerId', label: 'Owner' },
  { value: 'hasResponse', label: 'Has Response' },
  { value: 'daysSinceLastUpdate', label: 'Days Since Update' },
  { value: 'hoursInStatus', label: 'Hours in Status' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'isOverdue', label: 'Is Overdue' },
  { value: 'totalCents', label: 'Total (cents)' },
  { value: 'metadata.tier', label: 'Tier (metadata)' },
]

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([...conditions, { field: 'status', operator: 'equals', value: '' }])
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions]
    const currentCondition = newConditions[index]
    if (currentCondition) {
      newConditions[index] = { ...currentCondition, ...updates }
      onChange(newConditions)
    }
  }

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">Conditions</h3>
          <p className="text-sm text-muted-foreground">
            All conditions must pass (AND logic)
          </p>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No conditions. Rule will trigger for all matching events.
          </p>
          <Button variant="outline" size="sm" onClick={addCondition} className="mt-3">
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          {conditions.map((condition, index) => (
            <div key={index}>
              {/* AND Connector */}
              {index > 0 && (
                <div className="relative flex items-center py-2">
                  <div className="absolute left-6 top-0 h-full w-px bg-border" />
                  <div className="relative z-10 ml-3 rounded border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    AND
                  </div>
                </div>
              )}

              {/* Condition Row */}
              <div
                className={cn(
                  'group relative rounded-lg border bg-card p-4',
                  'transition-all hover:border-primary/50'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Line Number */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted font-mono text-sm text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Condition Fields */}
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {/* Field Select */}
                    <select
                      value={condition.field}
                      onChange={(e) =>
                        updateCondition(index, { field: e.target.value })
                      }
                      className={cn(
                        'h-9 rounded-md border bg-background px-3 font-mono text-sm',
                        'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      )}
                    >
                      {COMMON_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator Select */}
                    <select
                      value={condition.operator}
                      onChange={(e) =>
                        updateCondition(index, { operator: e.target.value })
                      }
                      className={cn(
                        'h-9 rounded-md border bg-primary/5 px-3 font-mono text-sm text-primary',
                        'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      )}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value Input (hide for exists/notExists) */}
                    {!['exists', 'notExists'].includes(condition.operator) && (
                      <input
                        type="text"
                        value={String(condition.value || '')}
                        onChange={(e) =>
                          updateCondition(index, { value: e.target.value })
                        }
                        placeholder="value"
                        className={cn(
                          'h-9 flex-1 min-w-[120px] rounded-md border bg-background px-3 font-mono text-sm',
                          'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                        )}
                      />
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeCondition(index)}
                    className={cn(
                      'rounded-md p-2 text-muted-foreground transition-colors',
                      'opacity-0 group-hover:opacity-100',
                      'hover:bg-destructive/10 hover:text-destructive'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick Preview */}
                <div className="mt-2 pl-11">
                  <code className="text-xs text-muted-foreground">
                    {condition.field}{' '}
                    <span className="text-primary">{condition.operator}</span>{' '}
                    {!['exists', 'notExists'].includes(condition.operator) && (
                      <span className="text-foreground">
                        {JSON.stringify(condition.value || '')}
                      </span>
                    )}
                  </code>
                </div>
              </div>
            </div>
          ))}

          {/* Add Button */}
          <div className="relative pt-2">
            {conditions.length > 0 && (
              <div className="absolute left-6 -top-2 h-4 w-px bg-border" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="ml-3"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Condition
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
