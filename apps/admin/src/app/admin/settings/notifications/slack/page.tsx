'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Badge, Switch, RadixSelect as Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@cgk-platform/ui'
import { NOTIFICATION_TYPES } from '@cgk-platform/slack/types'

interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  isMember: boolean
}

interface ChannelMapping {
  id: string
  notificationType: string
  channelId: string
  channelName: string | null
  isEnabled: boolean
}

type NotificationCategory = 'creator' | 'commerce' | 'reviews' | 'treasury' | 'system' | 'analytics' | 'surveys' | 'dam'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  creator: 'Creator',
  commerce: 'Commerce',
  reviews: 'Reviews',
  treasury: 'Treasury',
  system: 'System',
  analytics: 'Analytics',
  surveys: 'Surveys',
  dam: 'Digital Assets',
}

export default function SlackNotificationSettingsPage() {
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [mappings, setMappings] = useState<Map<string, ChannelMapping>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['creator', 'commerce']))
  const [pendingChanges, setPendingChanges] = useState<Map<string, { channelId: string; isEnabled: boolean }>>(new Map())

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch channels
      const channelsRes = await fetch('/api/admin/notifications/slack/channels')
      if (!channelsRes.ok) {
        setConnected(false)
        setLoading(false)
        return
      }
      const channelsData = await channelsRes.json()
      setChannels(channelsData.channels || [])
      setConnected(true)

      // Fetch mappings
      const mappingsRes = await fetch('/api/admin/notifications/slack/mappings')
      if (mappingsRes.ok) {
        const mappingsData = await mappingsRes.json()
        const mappingsMap = new Map<string, ChannelMapping>()
        for (const m of mappingsData.mappings || []) {
          mappingsMap.set(m.notificationType, m)
        }
        setMappings(mappingsMap)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(category: string) {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  function handleChannelChange(notificationType: string, channelId: string) {
    const current = pendingChanges.get(notificationType) ?? {
      channelId: mappings.get(notificationType)?.channelId ?? '',
      isEnabled: mappings.get(notificationType)?.isEnabled ?? true,
    }
    setPendingChanges(new Map(pendingChanges.set(notificationType, { ...current, channelId })))
  }

  function handleEnabledChange(notificationType: string, isEnabled: boolean) {
    const current = pendingChanges.get(notificationType) ?? {
      channelId: mappings.get(notificationType)?.channelId ?? '',
      isEnabled: mappings.get(notificationType)?.isEnabled ?? true,
    }
    setPendingChanges(new Map(pendingChanges.set(notificationType, { ...current, isEnabled })))
  }

  async function handleSave() {
    if (pendingChanges.size === 0) return

    setSaving(true)
    try {
      const updates = Array.from(pendingChanges.entries()).map(([type, data]) => ({
        notificationType: type,
        channelId: data.channelId,
        channelName: channels.find(c => c.id === data.channelId)?.name ?? null,
        isEnabled: data.isEnabled,
      }))

      const res = await fetch('/api/admin/notifications/slack/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: updates }),
      })

      if (res.ok) {
        // Refresh mappings
        await fetchData()
        setPendingChanges(new Map())
      }
    } catch (error) {
      console.error('Failed to save mappings:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(notificationType: string) {
    try {
      await fetch('/api/admin/notifications/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType, useSampleData: true }),
      })
    } catch (error) {
      console.error('Failed to send test:', error)
    }
  }

  async function handleRefreshChannels() {
    try {
      const res = await fetch('/api/admin/notifications/slack/channels/refresh', {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Failed to refresh channels:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Slack Notification Settings</h2>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Slack Notification Settings</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Slack is not connected. Please{' '}
              <a href="/admin/settings/integrations/slack" className="text-primary underline">
                connect your Slack workspace
              </a>{' '}
              first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const groupedTypes = NOTIFICATION_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = []
    }
    acc[type.category]!.push(type)
    return acc
  }, {} as Record<string, typeof NOTIFICATION_TYPES>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Slack Notification Settings</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshChannels}>
            Refresh Channels
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || pendingChanges.size === 0}
          >
            {saving ? 'Saving...' : `Save Changes${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure which Slack channel receives each notification type. Toggle notifications on or off as needed.
      </p>

      {Object.entries(groupedTypes).map(([category, types]) => (
        <Card key={category}>
          <CardContent className="p-0">
            <button
              className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {CATEGORY_LABELS[category as NotificationCategory]}
                </span>
                <Badge variant="secondary">{types.length}</Badge>
              </div>
              <svg
                className={`h-5 w-5 transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedCategories.has(category) && (
              <div className="border-t divide-y">
                {types.map((type) => {
                  const mapping = mappings.get(type.type)
                  const pending = pendingChanges.get(type.type)
                  const currentChannelId = pending?.channelId ?? mapping?.channelId ?? ''
                  const currentEnabled = pending?.isEnabled ?? mapping?.isEnabled ?? true

                  return (
                    <div key={type.type} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{type.description}</p>
                        <p className="text-sm text-muted-foreground truncate">{type.type}</p>
                      </div>

                      <Select
                        value={currentChannelId}
                        onValueChange={(value) => handleChannelChange(type.type, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.isPrivate ? '🔒 ' : '#'}{channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Switch
                        checked={currentEnabled}
                        onCheckedChange={(checked) => handleEnabledChange(type.type, checked)}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(type.type)}
                        disabled={!currentChannelId || !currentEnabled}
                      >
                        Test
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
