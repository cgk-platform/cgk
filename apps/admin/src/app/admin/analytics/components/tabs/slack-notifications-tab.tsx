'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Badge, Input, Label, Select, SelectOption, Switch } from '@cgk/ui'

import type { SlackAlert, SlackAlertType } from '@/lib/analytics'

const ALERT_TYPES: { value: SlackAlertType; label: string; description: string }[] = [
  { value: 'revenue_daily', label: 'Daily Revenue Summary', description: 'Daily revenue summary at end of day' },
  { value: 'revenue_milestone', label: 'Revenue Milestone', description: 'Notify when revenue milestones are reached' },
  { value: 'revenue_threshold', label: 'Revenue Threshold', description: 'Alert when revenue falls below threshold' },
  { value: 'high_value_order', label: 'High-Value Order', description: 'Notify when high-value orders are placed' },
  { value: 'order_spike', label: 'Order Volume Spike', description: 'Alert on unusual order volume increases' },
  { value: 'order_drop', label: 'Order Volume Drop', description: 'Alert on unusual order volume decreases' },
  { value: 'first_time_customer', label: 'First-Time Customer', description: 'Notify on first-time customer orders' },
  { value: 'churn_spike', label: 'Churn Spike', description: 'Alert on subscription churn increases' },
  { value: 'mrr_milestone', label: 'MRR Milestone', description: 'Notify when MRR milestones are reached' },
  { value: 'failed_payments', label: 'Failed Payments', description: 'Alert on payment failures' },
  { value: 'low_stock', label: 'Low Stock Warning', description: 'Alert when products are running low' },
  { value: 'out_of_stock', label: 'Out of Stock', description: 'Alert when products are out of stock' },
  { value: 'reorder_needed', label: 'Reorder Needed', description: 'Alert when inventory needs reordering' },
]

export function SlackNotificationsTab() {
  const [alerts, setAlerts] = useState<SlackAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/slack-alerts')
      const json = await res.json()
      setAlerts(json.alerts || [])
    } catch (error) {
      console.error('Failed to fetch slack alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleAlert(id: string, isEnabled: boolean) {
    try {
      await fetch(`/api/admin/analytics/slack-alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      })
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isEnabled } : a))
      )
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  async function deleteAlert(id: string) {
    try {
      await fetch(`/api/admin/analytics/slack-alerts/${id}`, {
        method: 'DELETE',
      })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  async function testAlert(id: string, alertType: string, channelId: string) {
    try {
      const res = await fetch('/api/admin/analytics/slack-alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertType, channelId }),
      })
      const json = await res.json()
      alert(json.message || 'Test alert sent!')
    } catch (error) {
      console.error('Failed to send test alert:', error)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Slack Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Configure alerts to be sent to your Slack channels
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Alert</Button>
      </div>

      {/* Add Alert Form */}
      {showAddForm && (
        <AddAlertForm
          onSave={() => {
            setShowAddForm(false)
            fetchAlerts()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Existing Alerts */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl">🔔</div>
            <h3 className="mt-4 font-semibold">No alerts configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first Slack alert to get notified about important events
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((alert) => {
            const alertType = ALERT_TYPES.find((t) => t.value === alert.alertType)
            return (
              <Card key={alert.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <h4 className="font-medium">{alertType?.label || alert.alertType}</h4>
                    <p className="text-sm text-muted-foreground">
                      {alertType?.description || 'Custom alert'}
                    </p>
                  </div>
                  <Switch
                    checked={alert.isEnabled}
                    onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Channel:</span>
                    <Badge variant="secondary">#{alert.channelName || alert.channelId}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="capitalize">{alert.config.frequency}</span>
                  </div>
                  {alert.config.threshold && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Threshold:</span>
                      <span>${alert.config.threshold.toLocaleString()}</span>
                    </div>
                  )}
                  {alert.lastTriggeredAt && (
                    <div className="text-xs text-muted-foreground">
                      Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAlert(alert.id, alert.alertType, alert.channelId)}
                    >
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface AddAlertFormProps {
  onSave: () => void
  onCancel: () => void
}

function AddAlertForm({ onSave, onCancel }: AddAlertFormProps) {
  const [alertType, setAlertType] = useState<SlackAlertType>('revenue_daily')
  const [channelId, setChannelId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [frequency, setFrequency] = useState<'realtime' | 'daily' | 'weekly'>('daily')
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await fetch('/api/admin/analytics/slack-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType,
          channelId,
          channelName,
          config: {
            frequency,
            threshold: threshold ? parseFloat(threshold) : undefined,
            businessHoursOnly: false,
          },
        }),
      })
      onSave()
    } catch (error) {
      console.error('Failed to create alert:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Add New Alert</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="alertType">Alert Type</Label>
            <Select
              id="alertType"
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as SlackAlertType)}
            >
              {ALERT_TYPES.map((type) => (
                <SelectOption key={type.value} value={type.value}>
                  {type.label}
                </SelectOption>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="channelId">Slack Channel ID</Label>
              <Input
                id="channelId"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="C0123456789"
                required
              />
            </div>
            <div>
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="general"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              >
                <SelectOption value="realtime">Real-time</SelectOption>
                <SelectOption value="daily">Daily</SelectOption>
                <SelectOption value="weekly">Weekly</SelectOption>
              </Select>
            </div>
            <div>
              <Label htmlFor="threshold">Threshold (optional)</Label>
              <Input
                id="threshold"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Alert'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
