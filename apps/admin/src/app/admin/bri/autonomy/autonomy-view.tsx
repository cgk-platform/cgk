'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Switch } from '@cgk/ui'
import {
  Brain,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Save,
  AlertTriangle,
} from 'lucide-react'

import type { AutonomySettings, ActionAutonomy, AutonomyLevel } from '@/lib/bri/types'

interface AutonomyViewProps {
  tenantSlug: string
  initialData: { settings: AutonomySettings; actions: ActionAutonomy[] } | null
}

const DEFAULT_SETTINGS: AutonomySettings = {
  level: 'balanced',
  adaptToFeedback: true,
  trackSuccessPatterns: true,
  adjustToUserPreferences: true,
  maxActionsPerHour: 100,
  maxCostPerDay: 50,
  requireHumanForHighValue: true,
  highValueThreshold: 1000,
}

const AUTONOMOUS_ACTIONS = [
  'lookup_information',
  'send_routine_checkins',
  'generate_reports',
  'answer_questions',
  'log_communications',
  'schedule_reminders',
  'search_creative_ideas',
  'query_knowledge_base',
]

const SUGGEST_CONFIRM_ACTIONS = [
  'send_first_message_to_creator',
  'change_project_status',
  'extend_deadlines',
  'escalate_to_team',
  'create_creative_idea',
  'generate_script',
]

const HUMAN_REQUIRED_ACTIONS = [
  'process_payments',
  'approve_submissions',
  'decline_projects',
  'modify_rates',
  'delete_data',
  'send_bulk_messages',
]

const ALL_ACTIONS = [
  ...AUTONOMOUS_ACTIONS.map((a) => ({ type: a, defaultLevel: 'autonomous' as const })),
  ...SUGGEST_CONFIRM_ACTIONS.map((a) => ({ type: a, defaultLevel: 'suggest_and_confirm' as const })),
  ...HUMAN_REQUIRED_ACTIONS.map((a) => ({ type: a, defaultLevel: 'human_required' as const })),
]

export function AutonomyView({ initialData }: AutonomyViewProps) {
  const [settings, setSettings] = useState<AutonomySettings>(
    initialData?.settings ?? DEFAULT_SETTINGS
  )
  const [actions, setActions] = useState<ActionAutonomy[]>(
    initialData?.actions ?? ALL_ACTIONS.map((a) => ({
      actionType: a.type,
      enabled: true,
      requiresApproval: a.defaultLevel !== 'autonomous',
      maxPerDay: null,
      cooldownHours: null,
    }))
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/bri/autonomy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, actions }),
      })
      if (!response.ok) {
        console.error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save autonomy settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateAction = (actionType: string, updates: Partial<ActionAutonomy>) => {
    setActions(actions.map((a) =>
      a.actionType === actionType ? { ...a, ...updates } : a
    ))
  }

  const getActionForType = (type: string) => {
    return actions.find((a) => a.actionType === type) ?? {
      actionType: type,
      enabled: true,
      requiresApproval: false,
      maxPerDay: null,
      cooldownHours: null,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Autonomy Settings</h1>
          <p className="text-sm text-muted-foreground">Control Bri's autonomy levels and action permissions</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Autonomy Level Selection */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Autonomy Level
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <LevelCard
              level="conservative"
              title="Conservative"
              description="More approvals, lower risk. Bri will ask for confirmation more often."
              selected={settings.level === 'conservative'}
              onSelect={() => setSettings({ ...settings, level: 'conservative', maxActionsPerHour: 50 })}
            />
            <LevelCard
              level="balanced"
              title="Balanced"
              description="Default balance of autonomy and oversight."
              selected={settings.level === 'balanced'}
              onSelect={() => setSettings({ ...settings, level: 'balanced', maxActionsPerHour: 100 })}
            />
            <LevelCard
              level="proactive"
              title="Proactive"
              description="More autonomy, faster execution. Best for trusted workflows."
              selected={settings.level === 'proactive'}
              onSelect={() => setSettings({ ...settings, level: 'proactive', maxActionsPerHour: 200 })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Learning Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Learning Settings
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingToggle
              label="Adapt to Feedback"
              description="Learn from corrections and feedback"
              checked={settings.adaptToFeedback}
              onChange={(checked) => setSettings({ ...settings, adaptToFeedback: checked })}
            />
            <SettingToggle
              label="Track Success Patterns"
              description="Identify and repeat successful approaches"
              checked={settings.trackSuccessPatterns}
              onChange={(checked) => setSettings({ ...settings, trackSuccessPatterns: checked })}
            />
            <SettingToggle
              label="Adjust to User Preferences"
              description="Personalize responses based on user history"
              checked={settings.adjustToUserPreferences}
              onChange={(checked) => setSettings({ ...settings, adjustToUserPreferences: checked })}
            />
          </CardContent>
        </Card>

        {/* Safety Rails */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Safety Rails
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Max Actions Per Hour
              </label>
              <Input
                type="number"
                value={settings.maxActionsPerHour}
                onChange={(e) => setSettings({ ...settings, maxActionsPerHour: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Max Cost Per Day ($)
              </label>
              <Input
                type="number"
                value={settings.maxCostPerDay}
                onChange={(e) => setSettings({ ...settings, maxCostPerDay: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <SettingToggle
              label="Require Human for High Value"
              description="Always require approval for high-value actions"
              checked={settings.requireHumanForHighValue}
              onChange={(checked) => setSettings({ ...settings, requireHumanForHighValue: checked })}
            />
            {settings.requireHumanForHighValue && (
              <div>
                <label className="text-xs text-muted-foreground">High Value Threshold ($)</label>
                <Input
                  type="number"
                  value={settings.highValueThreshold}
                  onChange={(e) => setSettings({ ...settings, highValueThreshold: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Action Overrides */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Per-Action Overrides
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Customize permissions for specific action types
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Autonomous Actions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Autonomous (no approval needed by default)
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-center p-3 font-medium w-24">Enabled</th>
                      <th className="text-center p-3 font-medium w-32">Requires Approval</th>
                      <th className="text-center p-3 font-medium w-28">Max/Day</th>
                      <th className="text-center p-3 font-medium w-28">Cooldown (h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {AUTONOMOUS_ACTIONS.map((actionType) => (
                      <ActionRow
                        key={actionType}
                        actionType={actionType}
                        action={getActionForType(actionType)}
                        onUpdate={updateAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suggest & Confirm Actions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Suggest & Confirm (approval required by default)
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-center p-3 font-medium w-24">Enabled</th>
                      <th className="text-center p-3 font-medium w-32">Requires Approval</th>
                      <th className="text-center p-3 font-medium w-28">Max/Day</th>
                      <th className="text-center p-3 font-medium w-28">Cooldown (h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {SUGGEST_CONFIRM_ACTIONS.map((actionType) => (
                      <ActionRow
                        key={actionType}
                        actionType={actionType}
                        action={getActionForType(actionType)}
                        onUpdate={updateAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Human Required Actions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Human Required (always requires approval)
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-center p-3 font-medium w-24">Enabled</th>
                      <th className="text-center p-3 font-medium w-32">Requires Approval</th>
                      <th className="text-center p-3 font-medium w-28">Max/Day</th>
                      <th className="text-center p-3 font-medium w-28">Cooldown (h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {HUMAN_REQUIRED_ACTIONS.map((actionType) => (
                      <ActionRow
                        key={actionType}
                        actionType={actionType}
                        action={getActionForType(actionType)}
                        onUpdate={updateAction}
                        locked
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LevelCard({
  level,
  title,
  description,
  selected,
  onSelect,
}: {
  level: AutonomyLevel
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  const icons = {
    conservative: <Shield className="h-5 w-5" />,
    balanced: <Brain className="h-5 w-5" />,
    proactive: <Zap className="h-5 w-5" />,
  }

  return (
    <button
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={selected ? 'text-primary' : 'text-muted-foreground'}>
          {icons[level]}
        </div>
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ActionRow({
  actionType,
  action,
  onUpdate,
  locked = false,
}: {
  actionType: string
  action: ActionAutonomy
  onUpdate: (actionType: string, updates: Partial<ActionAutonomy>) => void
  locked?: boolean
}) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="p-3">
        <span className="font-mono text-xs">{actionType}</span>
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={action.enabled}
          onCheckedChange={(checked) => onUpdate(actionType, { enabled: checked })}
        />
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={locked || action.requiresApproval}
          onCheckedChange={(checked) => onUpdate(actionType, { requiresApproval: checked })}
          disabled={locked}
        />
      </td>
      <td className="p-3">
        <Input
          type="number"
          placeholder="-"
          value={action.maxPerDay ?? ''}
          onChange={(e) =>
            onUpdate(actionType, { maxPerDay: e.target.value ? parseInt(e.target.value) : null })
          }
          className="h-8 text-center text-xs"
        />
      </td>
      <td className="p-3">
        <Input
          type="number"
          placeholder="-"
          value={action.cooldownHours ?? ''}
          onChange={(e) =>
            onUpdate(actionType, { cooldownHours: e.target.value ? parseFloat(e.target.value) : null })
          }
          className="h-8 text-center text-xs"
        />
      </td>
    </tr>
  )
}
