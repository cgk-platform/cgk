'use client'

import { Button, Card, CardContent, CardHeader, Spinner } from '@cgk-platform/ui'
import { useEffect, useState } from 'react'


import { NotificationToggle } from '@/components/settings/NotificationToggle'
import type { NotificationSettings, NotificationTypeInfo } from '@/lib/types'

const notificationTypes: NotificationTypeInfo[] = [
  {
    type: 'project_assigned',
    label: 'New Project Assigned',
    description: 'When you are assigned to a new project',
  },
  {
    type: 'project_updated',
    label: 'Project Updates',
    description: 'When project details or requirements change',
  },
  {
    type: 'message_received',
    label: 'New Messages',
    description: 'When you receive a message from your coordinator',
  },
  {
    type: 'payment_received',
    label: 'Payment Notifications',
    description: 'When you receive a payment or withdrawal completes',
  },
  {
    type: 'deadline_reminder',
    label: 'Deadline Reminders',
    description: 'Reminders about upcoming project deadlines',
  },
  {
    type: 'revision_requested',
    label: 'Revision Requests',
    description: 'When revisions are requested on your submissions',
  },
]

export default function NotificationSettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasPhone, setHasPhone] = useState(false)

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch notification settings
        const notifResponse = await fetch('/api/creator/settings/notifications')
        if (!notifResponse.ok) {
          if (notifResponse.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load settings')
        }
        const notifData = await notifResponse.json()
        setSettings(notifData.settings)

        // Check if phone number is set
        const profileResponse = await fetch('/api/creator/settings')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setHasPhone(!!profileData.profile?.phone)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleToggle = (
    type: string,
    channel: 'email' | 'sms',
    enabled: boolean
  ) => {
    if (!settings) return

    const key = `${channel}${type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')}` as keyof NotificationSettings

    setSettings({
      ...settings,
      [key]: enabled,
    })
  }

  const handleSave = async () => {
    if (!settings) return

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/creator/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess('Notification preferences saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center text-muted-foreground">
        Failed to load notification settings
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Choose how you want to be notified about important updates
          </p>
        </CardHeader>
        <CardContent>
          {/* Header row */}
          <div className="mb-2 flex items-center justify-end gap-6 border-b pb-2">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <span className="text-xs font-medium text-muted-foreground">SMS</span>
          </div>

          {/* SMS warning if no phone */}
          {!hasPhone && (
            <div className="mb-4 rounded-md bg-muted px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Add a phone number in{' '}
                <a href="/settings/profile" className="text-foreground hover:underline">
                  Profile Settings
                </a>{' '}
                to enable SMS notifications.
              </p>
            </div>
          )}

          {/* Notification types */}
          <div className="divide-y">
            {notificationTypes.map((type) => {
              const emailKey = `email${type.type
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join('')}` as keyof NotificationSettings
              const smsKey = `sms${type.type
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join('')}` as keyof NotificationSettings

              return (
                <NotificationToggle
                  key={type.type}
                  type={type.type}
                  label={type.label}
                  description={type.description}
                  emailEnabled={settings[emailKey]}
                  smsEnabled={settings[smsKey]}
                  onEmailChange={(enabled) => handleToggle(type.type, 'email', enabled)}
                  onSmsChange={(enabled) => handleToggle(type.type, 'sms', enabled)}
                  smsDisabled={!hasPhone}
                />
              )
            })}
          </div>

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
