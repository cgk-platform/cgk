'use client'

import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Input } from '@cgk-platform/ui'
import { Label } from '@cgk-platform/ui'
import { Switch } from '@cgk-platform/ui'
import { Button } from '@cgk-platform/ui'
import {
  Save,
  AlertTriangle,
  Mail,
  Clock,
  DollarSign,
  Bell,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { TreasurySettings, TopupSettings } from '@/lib/treasury/types'

export default function TreasurySettingsPage() {
  const [, setTreasurySettings] = useState<TreasurySettings | null>(null)
  const [, setTopupSettings] = useState<TopupSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    treasurer_email: '',
    treasurer_name: '',
    default_signers: '',
    auto_send_enabled: false,
    auto_send_delay_hours: 24,
    auto_send_max_amount_cents: 0,
    low_balance_alert_threshold_cents: 100000,
    slack_webhook_url: '',
    slack_notifications_enabled: false,
    auto_topup_enabled: false,
    auto_topup_threshold_cents: 0,
    auto_topup_amount_cents: 0,
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/treasury/settings')
        if (!response.ok) throw new Error('Failed to load settings')
        const data = await response.json()

        setTreasurySettings(data.treasury)
        setTopupSettings(data.topup)

        setFormData({
          treasurer_email: data.treasury.treasurer_email || '',
          treasurer_name: data.treasury.treasurer_name || '',
          default_signers: (data.treasury.default_signers || []).join(', '),
          auto_send_enabled: data.treasury.auto_send_enabled || false,
          auto_send_delay_hours: data.treasury.auto_send_delay_hours || 24,
          auto_send_max_amount_cents: data.treasury.auto_send_max_amount_cents || 0,
          low_balance_alert_threshold_cents:
            data.treasury.low_balance_alert_threshold_cents || 100000,
          slack_webhook_url: data.treasury.slack_webhook_url || '',
          slack_notifications_enabled: data.treasury.slack_notifications_enabled || false,
          auto_topup_enabled: data.topup.auto_topup_enabled || false,
          auto_topup_threshold_cents: data.topup.auto_topup_threshold_cents || 0,
          auto_topup_amount_cents: data.topup.auto_topup_amount_cents || 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const signersArray = formData.default_signers
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const response = await fetch('/api/admin/treasury/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treasury: {
            treasurer_email: formData.treasurer_email || null,
            treasurer_name: formData.treasurer_name || null,
            default_signers: signersArray,
            auto_send_enabled: formData.auto_send_enabled,
            auto_send_delay_hours: formData.auto_send_delay_hours,
            auto_send_max_amount_cents: formData.auto_send_max_amount_cents || null,
            low_balance_alert_threshold_cents: formData.low_balance_alert_threshold_cents,
            slack_webhook_url: formData.slack_webhook_url || null,
            slack_notifications_enabled: formData.slack_notifications_enabled,
          },
          topup: {
            auto_topup_enabled: formData.auto_topup_enabled,
            auto_topup_threshold_cents: formData.auto_topup_threshold_cents,
            auto_topup_amount_cents: formData.auto_topup_amount_cents,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const data = await response.json()
      setTreasurySettings(data.treasury)
      setTopupSettings(data.topup)
      setSuccess(true)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/treasury"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Treasury Settings
                </h1>
                <p className="text-sm text-slate-500">
                  Configure treasury automation and notifications
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-800"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Save className="h-4 w-4" />
            Settings saved successfully
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Treasurer Configuration */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Treasurer Configuration</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="treasurer_name">Treasurer Name</Label>
                <Input
                  id="treasurer_name"
                  value={formData.treasurer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, treasurer_name: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treasurer_email">Treasurer Email</Label>
                <Input
                  id="treasurer_email"
                  type="email"
                  value={formData.treasurer_email}
                  onChange={(e) =>
                    setFormData({ ...formData, treasurer_email: e.target.value })
                  }
                  placeholder="treasurer@company.com"
                />
                <p className="text-xs text-slate-500">
                  Draw request approval emails will be sent here
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_signers">Default Signers</Label>
                <Input
                  id="default_signers"
                  value={formData.default_signers}
                  onChange={(e) =>
                    setFormData({ ...formData, default_signers: e.target.value })
                  }
                  placeholder="John Smith, Jane Doe"
                />
                <p className="text-xs text-slate-500">
                  Comma-separated list of required signers for draw requests
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Send Configuration */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Auto-Send Configuration</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <Label className="text-sm font-medium text-slate-900">
                    Enable Auto-Send
                  </Label>
                  <p className="text-xs text-slate-500">
                    Automatically process approved draw requests
                  </p>
                </div>
                <Switch
                  checked={formData.auto_send_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_send_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_send_delay">Delay After Approval (hours)</Label>
                <Input
                  id="auto_send_delay"
                  type="number"
                  min={0}
                  max={168}
                  value={formData.auto_send_delay_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_send_delay_hours: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!formData.auto_send_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_send_max">Maximum Auto-Send Amount ($)</Label>
                <Input
                  id="auto_send_max"
                  type="number"
                  min={0}
                  value={formData.auto_send_max_amount_cents / 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_send_max_amount_cents: (parseFloat(e.target.value) || 0) * 100,
                    })
                  }
                  disabled={!formData.auto_send_enabled}
                />
                <p className="text-xs text-slate-500">
                  Leave at 0 for no limit. Requests above this require manual processing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Balance Alerts */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Balance Alerts</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="low_balance_threshold">Low Balance Threshold ($)</Label>
                <Input
                  id="low_balance_threshold"
                  type="number"
                  min={0}
                  value={formData.low_balance_alert_threshold_cents / 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      low_balance_alert_threshold_cents: (parseFloat(e.target.value) || 0) * 100,
                    })
                  }
                />
                <p className="text-xs text-slate-500">
                  Alert when any provider balance falls below this amount
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto Top-up */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Auto Top-up</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <Label className="text-sm font-medium text-slate-900">
                    Enable Auto Top-up
                  </Label>
                  <p className="text-xs text-slate-500">
                    Automatically top up when balance is low
                  </p>
                </div>
                <Switch
                  checked={formData.auto_topup_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_topup_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_topup_threshold">Trigger Threshold ($)</Label>
                <Input
                  id="auto_topup_threshold"
                  type="number"
                  min={0}
                  value={formData.auto_topup_threshold_cents / 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_topup_threshold_cents: (parseFloat(e.target.value) || 0) * 100,
                    })
                  }
                  disabled={!formData.auto_topup_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_topup_amount">Top-up Amount ($)</Label>
                <Input
                  id="auto_topup_amount"
                  type="number"
                  min={0}
                  value={formData.auto_topup_amount_cents / 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_topup_amount_cents: (parseFloat(e.target.value) || 0) * 100,
                    })
                  }
                  disabled={!formData.auto_topup_enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Slack Notifications */}
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Slack Notifications</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <Label className="text-sm font-medium text-slate-900">
                    Enable Slack Notifications
                  </Label>
                  <p className="text-xs text-slate-500">
                    Send treasury alerts and updates to Slack
                  </p>
                </div>
                <Switch
                  checked={formData.slack_notifications_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, slack_notifications_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                <Input
                  id="slack_webhook"
                  type="url"
                  value={formData.slack_webhook_url}
                  onChange={(e) =>
                    setFormData({ ...formData, slack_webhook_url: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={!formData.slack_notifications_enabled}
                />
                <p className="text-xs text-slate-500">
                  Create an incoming webhook in your Slack workspace
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-1">
              <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
