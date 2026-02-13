'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Switch, Textarea } from '@cgk-platform/ui'
import { CalendarClock, Save, Bell, AlertTriangle, Clock } from 'lucide-react'

interface FollowupSettings {
  enableDeliveryReminders: boolean
  deliveryReminderDays: number
  trafficScriptsOnProduction: boolean
  trafficScriptDelayHours: number
  daysBeforeDeadline: string
  daysAfterDeadline: string
  escalateAfterDays: number
  escalationChannel: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  quietHoursTimezone: string
  templateOverrides: Record<string, unknown>
}

const DEFAULT_SETTINGS: FollowupSettings = {
  enableDeliveryReminders: true,
  deliveryReminderDays: 7,
  trafficScriptsOnProduction: true,
  trafficScriptDelayHours: 0,
  daysBeforeDeadline: '1, 0',
  daysAfterDeadline: '1, 2, 3',
  escalateAfterDays: 5,
  escalationChannel: null,
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursTimezone: 'America/New_York',
  templateOverrides: {},
}

export default function FollowupsPage() {
  const [settings, setSettings] = useState<FollowupSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/bri/followups')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        }
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/bri/followups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow-up Settings</h1>
          <p className="text-sm text-muted-foreground">Configure automated follow-up timing and escalation</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Delivery Follow-ups */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Delivery Follow-ups
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Delivery Reminders</p>
                <p className="text-xs text-muted-foreground">Send follow-up after creator delivers content</p>
              </div>
              <Switch
                checked={settings.enableDeliveryReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableDeliveryReminders: checked })
                }
              />
            </div>
            {settings.enableDeliveryReminders && (
              <div>
                <label className="text-xs text-muted-foreground">Days After Delivery</label>
                <Input
                  type="number"
                  value={settings.deliveryReminderDays}
                  onChange={(e) =>
                    setSettings({ ...settings, deliveryReminderDays: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Script Trafficking */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Script Trafficking
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Traffic Scripts on Production Start</p>
                <p className="text-xs text-muted-foreground">Automatically send scripts when production begins</p>
              </div>
              <Switch
                checked={settings.trafficScriptsOnProduction}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, trafficScriptsOnProduction: checked })
                }
              />
            </div>
            {settings.trafficScriptsOnProduction && (
              <div>
                <label className="text-xs text-muted-foreground">Delay Hours (optional)</label>
                <Input
                  type="number"
                  value={settings.trafficScriptDelayHours}
                  onChange={(e) =>
                    setSettings({ ...settings, trafficScriptDelayHours: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadlines & Escalations */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Deadlines & Escalations
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Days Before Deadline to Remind</label>
              <Input
                value={settings.daysBeforeDeadline}
                onChange={(e) => setSettings({ ...settings, daysBeforeDeadline: e.target.value })}
                placeholder="1, 0"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Comma-separated, e.g., "1, 0" for 1 day before and day of</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Days After Deadline to Remind</label>
              <Input
                value={settings.daysAfterDeadline}
                onChange={(e) => setSettings({ ...settings, daysAfterDeadline: e.target.value })}
                placeholder="1, 2, 3"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Comma-separated, e.g., "1, 2, 3" for daily reminders</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Escalate After X Days Overdue</label>
              <Input
                type="number"
                value={settings.escalateAfterDays}
                onChange={(e) =>
                  setSettings({ ...settings, escalateAfterDays: parseInt(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Escalation Slack Channel</label>
              <Input
                value={settings.escalationChannel ?? ''}
                onChange={(e) =>
                  setSettings({ ...settings, escalationChannel: e.target.value || null })
                }
                placeholder="#escalations"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quiet Hours
            </h3>
            <p className="text-xs text-muted-foreground">
              Don't send automated follow-ups during these hours
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Start Time</label>
                <Input
                  type="time"
                  value={settings.quietHoursStart ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursStart: e.target.value || null })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  value={settings.quietHoursEnd ?? ''}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHoursEnd: e.target.value || null })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Timezone</label>
              <select
                value={settings.quietHoursTimezone}
                onChange={(e) => setSettings({ ...settings, quietHoursTimezone: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">Template Overrides</h3>
          <p className="text-xs text-muted-foreground">
            Custom templates for follow-up messages (JSON format)
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={JSON.stringify(settings.templateOverrides, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                setSettings({ ...settings, templateOverrides: parsed })
              } catch {
                // Invalid JSON, keep current value
              }
            }}
            rows={8}
            className="font-mono text-sm"
            placeholder="{}"
          />
        </CardContent>
      </Card>
    </div>
  )
}
