'use client'

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch, Textarea } from '@cgk-platform/ui'
import { Save, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { GiftCardSettings } from '@/lib/gift-card/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<GiftCardSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/gift-cards/settings')
      const data = await res.json()
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/admin/gift-cards/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const data = await res.json()
      setSettings(data.settings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Card Settings</h1>
          <p className="text-muted-foreground">
            Configure gift card system behavior and email notifications
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          Settings saved successfully!
        </div>
      )}

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Gift Card System</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable the entire gift card system
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications when store credit is issued
              </p>
            </div>
            <Switch
              checked={settings.email_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, email_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_amount">Default Store Credit Amount (cents)</Label>
            <Input
              id="default_amount"
              type="number"
              value={settings.default_amount_cents}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_amount_cents: parseInt(e.target.value, 10) || 0,
                })
              }
              placeholder="1000"
            />
            <p className="text-xs text-muted-foreground">
              Default amount in cents (e.g., 1000 = $10.00)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from_email">From Email Address</Label>
            <Input
              id="from_email"
              type="email"
              value={settings.from_email}
              onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
              placeholder="support@example.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Admin Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to admin when credits are issued
              </p>
            </div>
            <Switch
              checked={settings.admin_notification_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, admin_notification_enabled: checked })
              }
            />
          </div>

          {settings.admin_notification_enabled && (
            <div className="space-y-2">
              <Label htmlFor="admin_email">Admin Notification Email</Label>
              <Input
                id="admin_email"
                type="email"
                value={settings.admin_notification_email}
                onChange={(e) =>
                  setSettings({ ...settings, admin_notification_email: e.target.value })
                }
                placeholder="admin@example.com"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={settings.email_template.subject}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, subject: e.target.value },
                })
              }
              placeholder="You received store credit!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={settings.email_template.headline}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, headline: e.target.value },
                })
              }
              placeholder="Store Credit Received"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting</Label>
            <Input
              id="greeting"
              value={settings.email_template.greeting}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, greeting: e.target.value },
                })
              }
              placeholder="Hi {{customer_name}},"
            />
            <p className="text-xs text-muted-foreground">
              Available variables: {'{{customer_name}}'}, {'{{customer_email}}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body Text</Label>
            <Textarea
              id="body"
              value={settings.email_template.body}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, body: e.target.value },
                })
              }
              placeholder="Great news! You have received {{amount}} in store credit."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Available variables: {'{{amount}}'}, {'{{order_name}}'}, {'{{customer_name}}'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cta_text">CTA Button Text</Label>
              <Input
                id="cta_text"
                value={settings.email_template.cta_text}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email_template: { ...settings.email_template, cta_text: e.target.value },
                  })
                }
                placeholder="Shop Now"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_url">CTA Button URL</Label>
              <Input
                id="cta_url"
                value={settings.email_template.cta_url}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    email_template: { ...settings.email_template, cta_url: e.target.value },
                  })
                }
                placeholder="{{store_url}}"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="how_to_use">How to Use Text</Label>
            <Textarea
              id="how_to_use"
              value={settings.email_template.how_to_use}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, how_to_use: e.target.value },
                })
              }
              placeholder="Your store credit will be automatically applied at checkout."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer">Footer Text</Label>
            <Input
              id="footer"
              value={settings.email_template.footer}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_template: { ...settings.email_template, footer: e.target.value },
                })
              }
              placeholder="Thank you for being a valued customer!"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
