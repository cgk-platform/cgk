'use client'

import { useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Hash,
  RefreshCw,
  Send,
  Settings,
  XCircle,
} from 'lucide-react'

interface SlackStatus {
  connected: boolean
  workspaceName?: string
  channels: { id: string; name: string }[]
  notificationConfig?: Record<string, { enabled: boolean; channelId?: string }>
  installedAt?: string
}

interface DigestSchedule {
  id: string
  label: string
  description: string
  enabled: boolean
  channelId: string
  frequency: 'daily' | 'weekly'
}

const DEFAULT_DIGESTS: DigestSchedule[] = [
  { id: 'daily_orders', label: 'Daily Order Summary', description: 'Orders, revenue, and fulfillment summary', enabled: false, channelId: '', frequency: 'daily' },
  { id: 'daily_creators', label: 'Daily Creator Activity', description: 'Creator applications, content submissions, and payments', enabled: false, channelId: '', frequency: 'daily' },
  { id: 'weekly_analytics', label: 'Weekly Analytics Digest', description: 'Revenue trends, top performers, and key metrics', enabled: false, channelId: '', frequency: 'weekly' },
  { id: 'weekly_esign', label: 'Weekly E-Sign Report', description: 'Pending signatures, completed contracts, and reminders', enabled: false, channelId: '', frequency: 'weekly' },
]

const NOTIFICATION_CATEGORIES = [
  {
    id: 'creators',
    label: 'Creators',
    notifications: [
      { id: 'creator_application', label: 'New Applications', description: 'When a creator applies' },
      { id: 'creator_approved', label: 'Creator Approved', description: 'When a creator is approved' },
      { id: 'creator_content', label: 'Content Submitted', description: 'When content is submitted' },
      { id: 'creator_payment', label: 'Payment Requested', description: 'When a payment is requested' },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    notifications: [
      { id: 'high_value_order', label: 'High Value Orders', description: 'Orders over $200' },
      { id: 'subscription_created', label: 'New Subscription', description: 'When a subscription starts' },
      { id: 'refund_requested', label: 'Refund Requested', description: 'When a refund is requested' },
    ],
  },
  {
    id: 'treasury',
    label: 'Treasury',
    notifications: [
      { id: 'payout_approval', label: 'Payout Approval', description: 'When a payout needs approval' },
      { id: 'payout_completed', label: 'Payout Completed', description: 'When a payout is processed' },
      { id: 'large_payout', label: 'Large Payout Alert', description: 'Payouts over $1,000' },
    ],
  },
]

export default function SlackCommunicationsPage() {
  const [status, setStatus] = useState<SlackStatus | null>(null)
  const [digests, setDigests] = useState<DigestSchedule[]>(DEFAULT_DIGESTS)
  const [notificationConfig, setNotificationConfig] = useState<Record<string, { enabled: boolean; channelId?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/slack')
      if (!res.ok) throw new Error('Failed to load Slack status')
      const data: SlackStatus = await res.json()
      setStatus(data)
      if (data.notificationConfig) setNotificationConfig(data.notificationConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationConfig }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setSuccessMsg('Settings saved')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/integrations/slack/test', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(`Connected to ${data.workspaceName || 'Slack workspace'}`)
      } else {
        setError(data.error || 'Connection test failed')
      }
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  function toggleNotification(notifId: string, enabled: boolean) {
    setNotificationConfig((prev) => ({ ...prev, [notifId]: { ...(prev[notifId] || {}), enabled } }))
  }

  function setNotificationChannel(notifId: string, channelId: string) {
    setNotificationConfig((prev) => ({ ...prev, [notifId]: { ...(prev[notifId] || { enabled: false }), channelId } }))
  }

  function toggleDigest(digestId: string, enabled: boolean) {
    setDigests((prev) => prev.map((d) => (d.id === digestId ? { ...d, enabled } : d)))
  }

  function setDigestChannel(digestId: string, channelId: string) {
    setDigests((prev) => prev.map((d) => (d.id === digestId ? { ...d, channelId } : d)))
  }

  const channels = status?.channels || []

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
          <h1 className="text-2xl font-semibold tracking-tight">Slack Integration</h1>
          <p className="text-sm text-muted-foreground">Configure Slack notifications, digests, and workspace settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStatus}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button onClick={handleSave} disabled={saving || !status?.connected}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>

      {error && <Alert variant="error"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {successMsg && <Alert variant="success"><Check className="h-4 w-4" /><AlertDescription>{successMsg}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Workspace Connection</CardTitle>
          <CardDescription>Current Slack workspace connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">{status?.connected ? status.workspaceName || 'Connected' : 'Not connected'}</p>
                {status?.installedAt && <p className="text-sm text-muted-foreground">Connected {new Date(status.installedAt).toLocaleDateString()}</p>}
                <p className="text-sm text-muted-foreground">{channels.length} channel{channels.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            <div className="flex gap-2">
              {status?.connected && (
                <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                  {testing ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                  Test Connection
                </Button>
              )}
              {!status?.connected && (
                <Button size="sm" asChild>
                  <a href="/admin/integrations/slack"><Settings className="mr-1.5 h-3.5 w-3.5" />Configure</a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Digest Schedules</CardTitle>
          <CardDescription>Configure automated summaries delivered to Slack channels</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {digests.map((digest) => (
            <div key={digest.id} className="flex items-center gap-4 px-6 py-4">
              <input type="checkbox" checked={digest.enabled} onChange={(e) => toggleDigest(digest.id, e.target.checked)} disabled={!status?.connected} className="h-4 w-4 rounded border-input" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{digest.label}</span>
                  <Badge variant="outline" className="text-xs">{digest.frequency}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{digest.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <select value={digest.channelId} onChange={(e) => setDigestChannel(digest.id, e.target.value)} disabled={!status?.connected || !digest.enabled} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">Select channel...</option>
                  {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {NOTIFICATION_CATEGORIES.map((category) => (
        <Card key={category.id}>
          <CardHeader><CardTitle className="text-base">{category.label} Notifications</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {category.notifications.map((notif) => {
              const config = notificationConfig[notif.id] || { enabled: false }
              return (
                <div key={notif.id} className="flex items-center gap-4 px-6 py-3">
                  <input type="checkbox" checked={config.enabled} onChange={(e) => toggleNotification(notif.id, e.target.checked)} disabled={!status?.connected} className="h-4 w-4 rounded border-input" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notif.label}</p>
                    <p className="text-xs text-muted-foreground">{notif.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <select value={config.channelId || ''} onChange={(e) => setNotificationChannel(notif.id, e.target.value)} disabled={!status?.connected || !config.enabled} className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                      <option value="">Default channel</option>
                      {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
