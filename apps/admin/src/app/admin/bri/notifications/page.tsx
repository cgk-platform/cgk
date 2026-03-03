'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Switch, Badge } from '@cgk-platform/ui'
import { Bell, Save, Slack, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react'

const NOTIFICATION_EVENTS = [
  { id: 'project_created', label: 'Project Created', group: 'projects' },
  { id: 'project_assigned', label: 'Project Assigned', group: 'projects' },
  { id: 'project_accepted', label: 'Project Accepted', group: 'projects' },
  { id: 'project_declined', label: 'Project Declined', group: 'projects' },
  { id: 'project_started', label: 'Project Started', group: 'projects' },
  { id: 'project_submitted', label: 'Project Submitted', group: 'projects' },
  { id: 'project_approved', label: 'Project Approved', group: 'projects' },
  { id: 'project_revision', label: 'Revision Requested', group: 'projects' },
  { id: 'payment_pending', label: 'Payment Pending', group: 'payments' },
  { id: 'payment_sent', label: 'Payment Sent', group: 'payments' },
  { id: 'payment_failed', label: 'Payment Failed', group: 'payments' },
  { id: 'reminder', label: 'Reminder', group: 'other' },
  { id: 'escalation', label: 'Escalation', group: 'other' },
]

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'] as const

interface EventConfig {
  event: string
  slack: boolean
  sms: boolean
  email: boolean
  recipients: string[]
  priority: typeof PRIORITY_OPTIONS[number]
}

export default function NotificationsPage() {
  const [events, setEvents] = useState<EventConfig[]>(
    NOTIFICATION_EVENTS.map((e) => ({
      event: e.id,
      slack: true,
      sms: false,
      email: false,
      recipients: ['primary'],
      priority: 'normal' as const,
    }))
  )
  const [defaultChannel, setDefaultChannel] = useState('')
  const [quietStart, setQuietStart] = useState('')
  const [quietEnd, setQuietEnd] = useState('')
  const [quietTimezone, setQuietTimezone] = useState('America/New_York')
  const [channelStatus, setChannelStatus] = useState({
    slack: false,
    sms: false,
    email: false,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/bri/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.settings?.events) {
          setEvents(data.settings.events)
        }
        if (data.settings?.defaultSlackChannel) {
          setDefaultChannel(data.settings.defaultSlackChannel)
        }
        if (data.settings?.quietHoursStart) {
          setQuietStart(data.settings.quietHoursStart)
        }
        if (data.settings?.quietHoursEnd) {
          setQuietEnd(data.settings.quietHoursEnd)
        }
        if (data.settings?.quietHoursTimezone) {
          setQuietTimezone(data.settings.quietHoursTimezone)
        }
        if (data.channelStatus) {
          setChannelStatus(data.channelStatus)
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
      await fetch('/api/admin/bri/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events,
          defaultSlackChannel: defaultChannel || null,
          quietHoursStart: quietStart || null,
          quietHoursEnd: quietEnd || null,
          quietHoursTimezone: quietTimezone,
        }),
      })
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateEvent = (eventId: string, updates: Partial<EventConfig>) => {
    setEvents(events.map((e) => (e.event === eventId ? { ...e, ...updates } : e)))
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
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Configure notification events and channels</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Channel Status */}
      <div className="grid grid-cols-3 gap-4">
        <ChannelStatusCard
          name="Slack"
          icon={<Slack className="h-4 w-4" />}
          connected={channelStatus.slack}
        />
        <ChannelStatusCard
          name="SMS"
          icon={<Phone className="h-4 w-4" />}
          connected={channelStatus.sms}
        />
        <ChannelStatusCard
          name="Email"
          icon={<Mail className="h-4 w-4" />}
          connected={channelStatus.email}
        />
      </div>

      {/* Events Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Event Configuration
          </h3>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Event</th>
                  <th className="text-center p-3 font-medium w-20">Slack</th>
                  <th className="text-center p-3 font-medium w-20">SMS</th>
                  <th className="text-center p-3 font-medium w-20">Email</th>
                  <th className="text-center p-3 font-medium w-28">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => {
                  const eventInfo = NOTIFICATION_EVENTS.find((e) => e.id === event.event)
                  return (
                    <tr key={event.event} className="hover:bg-muted/30">
                      <td className="p-3">
                        <span className="text-sm">{eventInfo?.label ?? event.event}</span>
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={event.slack}
                          onCheckedChange={(checked) => updateEvent(event.event, { slack: checked })}
                          disabled={!channelStatus.slack}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={event.sms}
                          onCheckedChange={(checked) => updateEvent(event.event, { sms: checked })}
                          disabled={!channelStatus.sms}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={event.email}
                          onCheckedChange={(checked) => updateEvent(event.event, { email: checked })}
                          disabled={!channelStatus.email}
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={event.priority}
                          onChange={(e) =>
                            updateEvent(event.event, {
                              priority: e.target.value as EventConfig['priority'],
                            })
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-background"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Slack Configuration</h3>
          </CardHeader>
          <CardContent>
            <label className="text-xs text-muted-foreground">Default Channel</label>
            <Input
              value={defaultChannel}
              onChange={(e) => setDefaultChannel(e.target.value)}
              placeholder="#general"
              className="mt-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Quiet Hours</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Start Time</label>
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Timezone</label>
              <select
                value={quietTimezone}
                onChange={(e) => setQuietTimezone(e.target.value)}
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
    </div>
  )
}

function ChannelStatusCard({
  name,
  icon,
  connected,
}: {
  name: string
  icon: React.ReactNode
  connected: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <span className="text-sm font-medium">{name}</span>
        </div>
        {connected ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
