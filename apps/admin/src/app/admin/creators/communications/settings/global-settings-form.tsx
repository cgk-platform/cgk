'use client'

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch } from '@cgk-platform/ui'
import { Globe, Save, Clock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { CommunicationSettings } from '@/lib/creator-communications/types'

interface GlobalSettingsFormProps {
  settings: CommunicationSettings | null
}

export function GlobalSettingsForm({ settings }: GlobalSettingsFormProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    default_from_address: settings?.default_from_address || '',
    default_reply_to: settings?.default_reply_to || '',
    quiet_hours_enabled: settings?.quiet_hours_enabled || false,
    quiet_hours_start: settings?.quiet_hours_start || '22:00',
    quiet_hours_end: settings?.quiet_hours_end || '08:00',
    quiet_hours_timezone: settings?.quiet_hours_timezone || 'America/New_York',
    unsubscribe_footer_enabled: settings?.unsubscribe_footer_enabled ?? true,
    unsubscribe_url: settings?.unsubscribe_url || '',
    max_emails_per_day: settings?.max_emails_per_day || 500,
    max_bulk_recipients: settings?.max_bulk_recipients || 500,
    bulk_send_rate_per_minute: settings?.bulk_send_rate_per_minute || 100,
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/creators/communications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global: formData }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Global Settings</h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Default Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From Address</Label>
            <Input
              id="from"
              value={formData.default_from_address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, default_from_address: e.target.value }))
              }
              placeholder="creators@yourdomain.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reply_to">Reply-To Address</Label>
            <Input
              id="reply_to"
              value={formData.default_reply_to}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, default_reply_to: e.target.value }))
              }
              placeholder="support@yourdomain.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-xs text-muted-foreground">
                No emails will be sent during quiet hours
              </p>
            </div>
            <Switch
              checked={formData.quiet_hours_enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, quiet_hours_enabled: checked }))
              }
            />
          </div>

          {formData.quiet_hours_enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start">Start Time</Label>
                  <Input
                    id="start"
                    type="time"
                    value={formData.quiet_hours_start}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quiet_hours_start: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End Time</Label>
                  <Input
                    id="end"
                    type="time"
                    value={formData.quiet_hours_end}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quiet_hours_end: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={formData.quiet_hours_timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quiet_hours_timezone: e.target.value }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max_daily">Max Emails Per Day</Label>
            <Input
              id="max_daily"
              type="number"
              value={formData.max_emails_per_day}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  max_emails_per_day: parseInt(e.target.value, 10) || 500,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_bulk">Max Bulk Recipients</Label>
            <Input
              id="max_bulk"
              type="number"
              value={formData.max_bulk_recipients}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  max_bulk_recipients: parseInt(e.target.value, 10) || 500,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Bulk Send Rate (per minute)</Label>
            <Input
              id="rate"
              type="number"
              value={formData.bulk_send_rate_per_minute}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  bulk_send_rate_per_minute: parseInt(e.target.value, 10) || 100,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Unsubscribe Footer</p>
              <p className="text-xs text-muted-foreground">
                Include unsubscribe link in all emails
              </p>
            </div>
            <Switch
              checked={formData.unsubscribe_footer_enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, unsubscribe_footer_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="mr-1.5 h-4 w-4" />
        {isSaving ? 'Saving...' : 'Save Global Settings'}
      </Button>
    </div>
  )
}
