'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Settings, Zap } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

import { ActionList } from './action-list'
import { ConditionBuilder } from './condition-builder'
import { TriggerConfigForm } from './trigger-config-form'

type TriggerType = 'status_change' | 'time_elapsed' | 'scheduled' | 'event' | 'manual'

interface WorkflowRule {
  id?: string
  name: string
  description: string
  isActive: boolean
  priority: number
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  conditions: Array<{ field: string; operator: string; value: unknown }>
  actions: Array<{ type: string; config: Record<string, unknown> }>
  cooldownHours: number | null
  maxExecutions: number | null
  requiresApproval: boolean
  approverRole: string | null
  entityTypes: string[]
}

interface WorkflowRuleEditorProps {
  initialRule?: WorkflowRule
  isNew?: boolean
}

type EditorSection = 'trigger' | 'conditions' | 'actions' | 'settings'

const SECTIONS = [
  { id: 'trigger' as const, label: 'Trigger', icon: Zap },
  { id: 'conditions' as const, label: 'Conditions', icon: Settings },
  { id: 'actions' as const, label: 'Actions', icon: Zap },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

const ENTITY_TYPES = ['project', 'task', 'order', 'creator', 'customer']

export function WorkflowRuleEditor({ initialRule, isNew = false }: WorkflowRuleEditorProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<EditorSection>('trigger')
  const [saving, setSaving] = useState(false)

  const [rule, setRule] = useState<WorkflowRule>(
    initialRule || {
      name: '',
      description: '',
      isActive: true,
      priority: 10,
      triggerType: 'status_change',
      triggerConfig: { type: 'status_change' },
      conditions: [],
      actions: [],
      cooldownHours: null,
      maxExecutions: null,
      requiresApproval: false,
      approverRole: null,
      entityTypes: [],
    }
  )

  const updateRule = (updates: Partial<WorkflowRule>) => {
    setRule((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = async (activate = false) => {
    if (!rule.name.trim()) {
      alert('Rule name is required')
      return
    }

    if (rule.actions.length === 0) {
      alert('At least one action is required')
      return
    }

    setSaving(true)

    try {
      const body = {
        ...rule,
        isActive: activate ? true : rule.isActive,
      }

      const res = await fetch(
        isNew
          ? '/api/admin/workflows/rules'
          : `/api/admin/workflows/rules/${rule.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to save rule')
      }

      const data = await res.json()
      router.push(`/admin/workflows/${data.rule.id}`)
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/workflows"
              className="rounded-md p-2 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => updateRule({ name: e.target.value })}
                placeholder="Rule name..."
                className={cn(
                  'bg-transparent text-xl font-semibold',
                  'border-b border-transparent focus:border-primary',
                  'focus:outline-none'
                )}
              />
              <input
                type="text"
                value={rule.description}
                onChange={(e) => updateRule({ description: e.target.value })}
                placeholder="Add a description..."
                className={cn(
                  'mt-1 block w-full bg-transparent text-sm text-muted-foreground',
                  'focus:outline-none'
                )}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              Save & Activate
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-56 border-r bg-muted/20 p-4">
          <nav className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              // Show validation indicators
              let indicator = null
              if (section.id === 'trigger' && rule.triggerType) {
                indicator = (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>
                )
              }
              if (section.id === 'conditions' && rule.conditions.length > 0) {
                indicator = (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {rule.conditions.length}
                  </span>
                )
              }
              if (section.id === 'actions') {
                indicator = rule.actions.length > 0 ? (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    {rule.actions.length}
                  </span>
                ) : (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    !
                  </span>
                )
              }

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                  {indicator}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'trigger' && (
            <TriggerConfigForm
              triggerType={rule.triggerType}
              triggerConfig={rule.triggerConfig as { type: TriggerType }}
              onTypeChange={(type) =>
                updateRule({
                  triggerType: type,
                  triggerConfig: { type },
                })
              }
              onConfigChange={(config) => updateRule({ triggerConfig: config })}
            />
          )}

          {activeSection === 'conditions' && (
            <ConditionBuilder
              conditions={rule.conditions}
              onChange={(conditions) => updateRule({ conditions })}
            />
          )}

          {activeSection === 'actions' && (
            <ActionList
              actions={rule.actions}
              onChange={(actions) => updateRule({ actions })}
            />
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground">Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure rule behavior and limits
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Active</div>
                  <div className="text-sm text-muted-foreground">
                    Rule will only execute when active
                  </div>
                </div>
                <button
                  onClick={() => updateRule({ isActive: !rule.isActive })}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    rule.isActive ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                      rule.isActive ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              {/* Entity Types */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Entity Types</label>
                  <p className="text-xs text-muted-foreground">
                    Which entities this rule applies to (empty = all)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ENTITY_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const current = rule.entityTypes || []
                        const updated = current.includes(type)
                          ? current.filter((t) => t !== type)
                          : [...current, type]
                        updateRule({ entityTypes: updated })
                      }}
                      className={cn(
                        'rounded-md border px-3 py-1 font-mono text-sm transition-colors',
                        (rule.entityTypes || []).includes(type)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <p className="text-xs text-muted-foreground">
                  Higher priority rules run first (default: 10)
                </p>
                <input
                  type="number"
                  value={rule.priority}
                  onChange={(e) => updateRule({ priority: parseInt(e.target.value) || 10 })}
                  className="mt-1 block w-32 rounded-md border bg-background px-3 py-2 font-mono text-sm"
                />
              </div>

              {/* Execution Limits */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Cooldown (hours)</label>
                  <p className="text-xs text-muted-foreground">
                    Min hours between executions per entity
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={rule.cooldownHours || ''}
                    onChange={(e) =>
                      updateRule({ cooldownHours: parseInt(e.target.value) || null })
                    }
                    placeholder="No limit"
                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Executions</label>
                  <p className="text-xs text-muted-foreground">
                    Max times rule can fire per entity
                  </p>
                  <input
                    type="number"
                    min="1"
                    value={rule.maxExecutions || ''}
                    onChange={(e) =>
                      updateRule({ maxExecutions: parseInt(e.target.value) || null })
                    }
                    placeholder="No limit"
                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Approval Workflow */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Require Approval</div>
                    <div className="text-sm text-muted-foreground">
                      Actions will wait for human approval before executing
                    </div>
                  </div>
                  <button
                    onClick={() => updateRule({ requiresApproval: !rule.requiresApproval })}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      rule.requiresApproval ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                        rule.requiresApproval ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>

                {rule.requiresApproval && (
                  <div>
                    <label className="text-sm font-medium">Approver Role (optional)</label>
                    <select
                      value={rule.approverRole || ''}
                      onChange={(e) => updateRule({ approverRole: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Any admin</option>
                      <option value="owner">Owner only</option>
                      <option value="admin">Admin or above</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
