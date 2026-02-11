'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'
import {
  MessageSquare,
  Settings,
  Bot,
  Users,
  ShoppingCart,
  Megaphone,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, OAuthConnectButton } from '@/components/integrations'
import type { SlackNotificationCategory } from '@/lib/integrations/types'

interface SlackStatus {
  connected: boolean
  workspaceName?: string
  channels: { id: string; name: string }[]
  installedAt?: string
}

const NOTIFICATION_CATEGORIES: SlackNotificationCategory[] = [
  {
    id: 'creators',
    label: 'Creator Notifications',
    icon: 'users',
    notifications: [
      { id: 'creator_application', label: 'New Applications', description: 'When a creator applies', enabled: true },
      { id: 'creator_approved', label: 'Creator Approved', description: 'When a creator is approved', enabled: true },
      { id: 'creator_content', label: 'Content Submitted', description: 'When content is submitted', enabled: true },
      { id: 'creator_payment', label: 'Payment Requested', description: 'When payment is requested', enabled: true },
    ],
  },
  {
    id: 'orders',
    label: 'Order Notifications',
    icon: 'cart',
    notifications: [
      { id: 'high_value_order', label: 'High Value Orders', description: 'Orders over $200', enabled: true },
      { id: 'subscription_created', label: 'New Subscription', description: 'When a subscription starts', enabled: true },
      { id: 'subscription_cancelled', label: 'Subscription Cancelled', description: 'When a subscription ends', enabled: false },
      { id: 'refund_requested', label: 'Refund Requested', description: 'When a refund is requested', enabled: true },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'megaphone',
    notifications: [
      { id: 'campaign_started', label: 'Campaign Started', description: 'When a campaign goes live', enabled: true },
      { id: 'ab_test_complete', label: 'A/B Test Complete', description: 'When a test reaches significance', enabled: true },
      { id: 'review_posted', label: 'Review Posted', description: 'New product reviews', enabled: false },
    ],
  },
  {
    id: 'system',
    label: 'System Alerts',
    icon: 'alert',
    notifications: [
      { id: 'error_alert', label: 'Error Alerts', description: 'System errors and failures', enabled: true },
      { id: 'security_alert', label: 'Security Alerts', description: 'Security-related events', enabled: true },
      { id: 'api_limit', label: 'API Limits', description: 'Rate limit warnings', enabled: true },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: 'clock',
    notifications: [
      { id: 'daily_summary', label: 'Daily Summary', description: 'Daily metrics digest', enabled: true },
      { id: 'weekly_report', label: 'Weekly Report', description: 'Weekly performance report', enabled: true },
      { id: 'task_reminder', label: 'Task Reminders', description: 'Scheduled task reminders', enabled: false },
    ],
  },
]

const MCP_TOOLS = [
  { category: 'Blog', tools: ['create_post', 'update_post', 'list_posts', 'delete_post', 'publish_post'] },
  { category: 'Promotions', tools: ['create_promo', 'list_promos', 'update_promo', 'delete_promo'] },
  { category: 'Landing Pages', tools: ['create_page', 'update_page', 'list_pages', 'add_block', 'publish_page'] },
  { category: 'UGC Orders', tools: ['create_ugc_order', 'list_ugc_orders', 'update_ugc_order'] },
  { category: 'Site Config', tools: ['get_config', 'update_hero', 'update_nav', 'update_footer'] },
  { category: 'Reviews', tools: ['list_reviews', 'feature_review', 'respond_to_review'] },
  { category: 'Scheduling', tools: ['list_bookings', 'create_event_type', 'update_availability'] },
  { category: 'Analytics', tools: ['get_revenue', 'get_attribution', 'get_top_products'] },
  { category: 'Slack', tools: ['send_message', 'create_channel', 'archive_channel', 'get_messages', 'react'] },
]

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  cart: ShoppingCart,
  megaphone: Megaphone,
  alert: AlertTriangle,
  clock: Clock,
}

export default function SlackPage() {
  const [status, setStatus] = useState<SlackStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationConfig, setNotificationConfig] = useState<Record<string, { enabled: boolean; channelId?: string }>>({})
  const [saving, setSaving] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/slack')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.notificationConfig) {
          setNotificationConfig(data.notificationConfig)
        }
      }
    } catch (error) {
      console.error('Failed to fetch Slack status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/slack/oauth/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/slack', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({ connected: false, channels: [] })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const toggleNotification = (notificationId: string) => {
    setNotificationConfig(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        enabled: !prev[notificationId]?.enabled,
      },
    }))
  }

  const setNotificationChannel = (notificationId: string, channelId: string) => {
    setNotificationConfig(prev => ({
      ...prev,
      [notificationId]: {
        enabled: prev[notificationId]?.enabled ?? false,
        channelId,
      },
    }))
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationConfig }),
      })
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 w-48 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                status?.connected ? 'bg-purple-500/10' : 'bg-zinc-500/10'
              )}>
                <MessageSquare className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-purple-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Slack</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Team notifications and AI tools
                </p>
                {status?.workspaceName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Workspace: {status.workspaceName}
                  </p>
                )}
              </div>
            </div>

            <OAuthConnectButton
              provider="slack"
              connected={status?.connected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </CardContent>
      </Card>

      {status?.connected && (
        <>
          {/* Notification Configuration */}
          {NOTIFICATION_CATEGORIES.map((category) => {
            const Icon = iconMap[category.icon] || Settings

            return (
              <Card key={category.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{category.label}</h3>
                  </div>

                  <div className="space-y-3">
                    {category.notifications.map((notification) => {
                      const config = notificationConfig[notification.id] || {
                        enabled: notification.enabled,
                      }

                      return (
                        <div
                          key={notification.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleNotification(notification.id)}
                              className={cn(
                                'relative h-5 w-9 rounded-full transition-colors',
                                config.enabled ? 'bg-primary' : 'bg-muted'
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                                  config.enabled ? 'left-[18px]' : 'left-0.5'
                                )}
                              />
                            </button>
                            <div>
                              <p className="font-medium text-sm">{notification.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {notification.description}
                              </p>
                            </div>
                          </div>

                          {config.enabled && (
                            <select
                              value={config.channelId || ''}
                              onChange={(e) => setNotificationChannel(notification.id, e.target.value)}
                              className="rounded-md border bg-background px-2 py-1 text-sm"
                            >
                              <option value="">Select channel...</option>
                              {status.channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                  #{channel.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

          {/* MCP Tools Reference */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">MCP Tools via Slack</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The CGK MCP server exposes {MCP_TOOLS.reduce((acc, cat) => acc + cat.tools.length, 0)} tools
                that can be accessed via Claude in Slack. Here are the available tools:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MCP_TOOLS.map((category) => (
                  <div key={category.category} className="rounded-lg border p-3">
                    <h4 className="font-medium text-sm mb-2">{category.category}</h4>
                    <div className="flex flex-wrap gap-1">
                      {category.tools.map((tool) => (
                        <Badge key={tool} variant="secondary" className="text-xs font-mono">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Setup Instructions */}
      {!status?.connected && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Setup Instructions</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                  1
                </span>
                <span>Click "Connect with Slack" to add the CGK bot to your workspace</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                  2
                </span>
                <span>Authorize the requested permissions for notifications and commands</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                  3
                </span>
                <span>Configure which notifications go to which channels</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                  4
                </span>
                <span>Invite @cgk-bot to channels where you want to use MCP tools</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
