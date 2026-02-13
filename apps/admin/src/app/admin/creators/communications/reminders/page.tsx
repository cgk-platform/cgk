'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription, Button, Card, CardContent, Switch } from '@cgk-platform/ui'

import type { CreatorReminderConfig, ReminderStep } from '../../../../../lib/creators/lifecycle-types'

import { ReminderChainConfig } from '../../../../../components/admin/creators/reminder-chain-config'

export default function RemindersSettingsPage() {
  const [config, setConfig] = useState<CreatorReminderConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/creators/reminder-config')
      if (!res.ok) throw new Error('Failed to load configuration')
      const data = await res.json()
      setConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!config) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/creators/reminder-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalEnabled: config.approvalEnabled,
          approvalScheduleTime: config.approvalScheduleTime,
          approvalSteps: config.approvalSteps,
          approvalEscalationEnabled: config.approvalEscalationEnabled,
          approvalEscalationDays: config.approvalEscalationDays,
          approvalEscalationSlack: config.approvalEscalationSlack,
          welcomeCallEnabled: config.welcomeCallEnabled,
          welcomeCallScheduleTime: config.welcomeCallScheduleTime,
          welcomeCallSteps: config.welcomeCallSteps,
          welcomeCallEventTypeId: config.welcomeCallEventTypeId,
          maxOnePerDay: config.maxOnePerDay,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await res.json()
      setConfig(data.config)
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function updateConfig(updates: Partial<CreatorReminderConfig>) {
    if (!config) return
    setConfig({ ...config, ...updates })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load configuration</p>
          <Button variant="outline" className="mt-4" onClick={loadConfig}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automated Reminders</h1>
          <p className="text-muted-foreground">
            Configure reminder chains for creator onboarding
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConfig}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Global Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Max 1 reminder per day per creator</div>
              <p className="text-sm text-muted-foreground">
                Prevent multiple reminders being sent to the same creator on the same day
              </p>
            </div>
            <Switch
              checked={config.maxOnePerDay}
              onCheckedChange={(checked) => updateConfig({ maxOnePerDay: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approval Reminders */}
      <ReminderChainConfig
        title="Approval Reminders"
        description="Send reminders to approved creators who haven't logged in yet"
        enabled={config.approvalEnabled}
        onEnabledChange={(enabled: boolean) => updateConfig({ approvalEnabled: enabled })}
        scheduleTime={config.approvalScheduleTime}
        onScheduleTimeChange={(time: string) => updateConfig({ approvalScheduleTime: time })}
        steps={config.approvalSteps}
        onStepsChange={(steps: ReminderStep[]) => updateConfig({ approvalSteps: steps })}
        escalation={{
          enabled: config.approvalEscalationEnabled,
          daysAfterFinal: config.approvalEscalationDays,
          slackNotification: config.approvalEscalationSlack,
        }}
        onEscalationChange={(escalation: { enabled: boolean; daysAfterFinal: number; slackNotification: boolean }) =>
          updateConfig({
            approvalEscalationEnabled: escalation.enabled,
            approvalEscalationDays: escalation.daysAfterFinal,
            approvalEscalationSlack: escalation.slackNotification,
          })
        }
        triggerLabel="After Approval"
        maxSteps={5}
      />

      {/* Welcome Call Reminders */}
      <ReminderChainConfig
        title="Welcome Call Reminders"
        description="Send reminders to creators who logged in but haven't scheduled their welcome call"
        enabled={config.welcomeCallEnabled}
        onEnabledChange={(enabled: boolean) => updateConfig({ welcomeCallEnabled: enabled })}
        scheduleTime={config.welcomeCallScheduleTime}
        onScheduleTimeChange={(time: string) => updateConfig({ welcomeCallScheduleTime: time })}
        steps={config.welcomeCallSteps}
        onStepsChange={(steps: ReminderStep[]) => updateConfig({ welcomeCallSteps: steps })}
        triggerLabel="After Login"
        maxSteps={5}
      />

      {/* Cal.com Integration */}
      {config.welcomeCallEnabled && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Cal.com Event Type</div>
                <p className="text-sm text-muted-foreground">
                  Link to the Cal.com event type used for welcome calls
                </p>
              </div>
              <input
                type="text"
                value={config.welcomeCallEventTypeId || ''}
                onChange={(e) => updateConfig({ welcomeCallEventTypeId: e.target.value })}
                placeholder="Event Type ID"
                className="flex h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
