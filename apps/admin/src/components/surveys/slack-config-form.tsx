'use client'

import { Button, Card, CardContent, Input, Label, Switch, cn } from '@cgk/ui'
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Hash,
  Link as LinkIcon,
  MessageSquare,
  Send,
  Slack,
} from 'lucide-react'
import { useState } from 'react'

import type { SurveySlackConfig, UpdateSlackConfigInput } from '@/lib/surveys'

interface SlackConfigFormProps {
  config: SurveySlackConfig | null
  surveyId?: string
  onSave: (input: UpdateSlackConfigInput) => Promise<void>
  onDelete?: () => Promise<void>
  onTest?: () => Promise<boolean>
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}))

export function SlackConfigForm({
  config,
  surveyId,
  onSave,
  onDelete,
  onTest,
}: SlackConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null)

  const [formData, setFormData] = useState<UpdateSlackConfigInput>({
    webhook_url: config?.webhook_url || '',
    channel_name: config?.channel_name || '',
    notify_on_complete: config?.notify_on_complete ?? true,
    notify_on_nps_low: config?.notify_on_nps_low ?? true,
    nps_low_threshold: config?.nps_low_threshold ?? 6,
    daily_digest: config?.daily_digest ?? false,
    weekly_digest: config?.weekly_digest ?? false,
    digest_day: config?.digest_day ?? 1,
    digest_hour: config?.digest_hour ?? 9,
    is_active: config?.is_active ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSave(formData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    if (!onTest) return
    setIsTesting(true)
    setTestSuccess(null)
    try {
      const success = await onTest()
      setTestSuccess(success)
    } catch {
      setTestSuccess(false)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to disconnect Slack integration?')) return
    setIsLoading(true)
    try {
      await onDelete()
    } finally {
      setIsLoading(false)
    }
  }

  const isConnected = Boolean(config?.webhook_url)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                isConnected ? 'bg-emerald-100' : 'bg-muted'
              )}
            >
              <Slack
                className={cn('h-6 w-6', isConnected ? 'text-emerald-600' : 'text-muted-foreground')}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Slack Integration</h3>
                {isConnected ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isConnected
                  ? `Sending notifications to ${config?.channel_name || 'your channel'}`
                  : 'Connect Slack to receive survey notifications'}
              </p>
            </div>
            {isConnected && onDelete && (
              <Button type="button" variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Webhook Configuration</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Create an{' '}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Incoming Webhook
                </a>{' '}
                in your Slack workspace
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel_name">Channel Name (Optional)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="channel_name"
                  placeholder="survey-responses"
                  value={formData.channel_name || ''}
                  onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For reference only. The webhook determines the actual channel.
              </p>
            </div>
          </div>

          {/* Test Button */}
          {formData.webhook_url && onTest && (
            <div className="flex items-center gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isTesting ? 'Sending...' : 'Send Test Message'}
              </Button>
              {testSuccess === true && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  Message sent successfully
                </span>
              )}
              {testSuccess === false && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Failed to send message
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Notification Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Real-time notifications */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Survey Completions</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone completes a survey
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.notify_on_complete}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notify_on_complete: checked })
                }
              />
            </div>

            {/* Low NPS alerts */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Low NPS Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when NPS score is below threshold
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={formData.nps_low_threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, nps_low_threshold: Number(e.target.value) })
                  }
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  disabled={!formData.notify_on_nps_low}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      Below {n}
                    </option>
                  ))}
                </select>
                <Switch
                  checked={formData.notify_on_nps_low}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notify_on_nps_low: checked })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Digest Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Daily digest */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-muted-foreground">
                    Summary of the previous day&apos;s responses
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.daily_digest}
                onCheckedChange={(checked) => setFormData({ ...formData, daily_digest: checked })}
              />
            </div>

            {/* Weekly digest */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">
                    Summary of the week&apos;s responses
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.weekly_digest}
                onCheckedChange={(checked) => setFormData({ ...formData, weekly_digest: checked })}
              />
            </div>

            {/* Digest timing */}
            {(formData.daily_digest || formData.weekly_digest) && (
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">Digest Delivery Time</p>
                <div className="flex flex-wrap items-center gap-4">
                  {formData.weekly_digest && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="digest_day" className="text-sm text-muted-foreground">
                        Day:
                      </Label>
                      <select
                        id="digest_day"
                        value={formData.digest_day}
                        onChange={(e) =>
                          setFormData({ ...formData, digest_day: Number(e.target.value) })
                        }
                        className="rounded-md border bg-background px-3 py-1.5 text-sm"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="digest_hour" className="text-sm text-muted-foreground">
                      Time:
                    </Label>
                    <select
                      id="digest_hour"
                      value={formData.digest_hour}
                      onChange={(e) =>
                        setFormData({ ...formData, digest_hour: Number(e.target.value) })
                      }
                      className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                      {HOURS.map((hour) => (
                        <option key={hour.value} value={hour.value}>
                          {hour.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enable/Disable & Save */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <div>
            <p className="font-medium">
              {formData.is_active ? 'Integration Active' : 'Integration Disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {formData.is_active
                ? 'Notifications will be sent to Slack'
                : 'No notifications will be sent'}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

export function SlackConfigSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}
