'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Hash, RefreshCw, Send } from 'lucide-react'

import { Alert, AlertDescription, Badge, Button, Card, CardContent, Switch } from '@cgk/ui'

import type {
  CreatorNotificationType,
  CreatorNotificationTypeInfo,
  CreatorSlackNotificationConfig,
  SlackChannel,
} from '../../../../../lib/creators/lifecycle-types'
import { CREATOR_NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_TEMPLATES } from '../../../../../lib/creators/lifecycle-types'

export default function SlackNotificationsPage() {
  const [config, setConfig] = useState<CreatorSlackNotificationConfig[]>([])
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [testingType, setTestingType] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [configRes, channelsRes] = await Promise.all([
        fetch('/api/admin/creators/slack-notifications'),
        fetch('/api/admin/creators/slack-notifications/channels'),
      ])

      if (!configRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load configuration')
      }

      const configData = await configRes.json()
      const channelsData = await channelsRes.json()

      setConfig(configData.config)
      setChannels(channelsData.channels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/creators/slack-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(type: CreatorNotificationType) {
    setTestingType(type)

    try {
      const res = await fetch('/api/admin/creators/slack-notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Test failed')
        return
      }

      setSuccess(data.message || 'Test notification sent')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestingType(null)
    }
  }

  function updateConfig(type: CreatorNotificationType, updates: Partial<CreatorSlackNotificationConfig>) {
    setConfig((prev) =>
      prev.map((c) => (c.type === type ? { ...c, ...updates } : c))
    )
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Slack Notifications</h1>
          <p className="text-muted-foreground">
            Configure Slack notifications for creator lifecycle events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Settings
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

      <Card>
        <CardContent className="divide-y p-0">
          {config.map((notification) => {
            const typeInfo = CREATOR_NOTIFICATION_TYPES.find((t: CreatorNotificationTypeInfo) => t.type === notification.type)

            return (
              <div key={notification.type} className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                  {notification.customEmoji || typeInfo?.emoji}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{typeInfo?.label}</span>
                    <Badge variant={notification.enabled ? 'default' : 'outline'}>
                      {notification.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{typeInfo?.description}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Channel</label>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <select
                          value={notification.channelId}
                          onChange={(e) => {
                            const channel = channels.find((c) => c.id === e.target.value)
                            updateConfig(notification.type, {
                              channelId: e.target.value,
                              channelName: channel?.name || '',
                            })
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Select channel...</option>
                          {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              #{channel.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Action Buttons</label>
                      <div className="flex h-9 items-center">
                        <Switch
                          checked={notification.includeActionButtons}
                          onCheckedChange={(checked) =>
                            updateConfig(notification.type, { includeActionButtons: checked })
                          }
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Include action buttons in message
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Message Template</label>
                    <textarea
                      value={notification.messageTemplate}
                      onChange={(e) =>
                        updateConfig(notification.type, { messageTemplate: e.target.value })
                      }
                      placeholder={DEFAULT_NOTIFICATION_TEMPLATES[notification.type]}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Available variables: {'{{creatorName}}'}, {'{{creatorEmail}}'}, {'{{projectTitle}}'}, etc.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Switch
                    checked={notification.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig(notification.type, { enabled: checked })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(notification.type)}
                    disabled={!notification.enabled || !notification.channelId || testingType === notification.type}
                  >
                    {testingType === notification.type ? (
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-3 w-3" />
                    )}
                    Test
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
