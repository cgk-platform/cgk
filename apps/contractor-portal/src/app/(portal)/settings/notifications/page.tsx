'use client'

/**
 * Contractor Notification Settings Page
 *
 * Manage email and push notification preferences.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  cn,
} from '@cgk-platform/ui'
import {
  ArrowLeft,
  Mail,
  Bell,
  Loader2,
  Check,
} from 'lucide-react'

interface NotificationSettings {
  email: {
    newProjects: boolean
    projectUpdates: boolean
    paymentReceived: boolean
    weeklyDigest: boolean
    marketingEmails: boolean
  }
  push: {
    newProjects: boolean
    projectUpdates: boolean
    paymentReceived: boolean
    messages: boolean
  }
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
          'border-2 border-transparent transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full',
            'bg-background shadow-lg ring-0 transition-transform duration-fast',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      newProjects: true,
      projectUpdates: true,
      paymentReceived: true,
      weeklyDigest: false,
      marketingEmails: false,
    },
    push: {
      newProjects: true,
      projectUpdates: true,
      paymentReceived: true,
      messages: true,
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const handleEmailChange = (key: keyof NotificationSettings['email'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      email: { ...prev.email, [key]: value },
    }))
  }

  const handlePushChange = (key: keyof NotificationSettings['push'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      push: { ...prev.push, [key]: value },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/contractor/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch {
      // Error handling - could show toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground">
          Choose what notifications you want to receive
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Email Notifications</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <Toggle
              checked={settings.email.newProjects}
              onChange={(v) => handleEmailChange('newProjects', v)}
              label="New Projects"
              description="Get notified when new projects are available"
            />
            <Toggle
              checked={settings.email.projectUpdates}
              onChange={(v) => handleEmailChange('projectUpdates', v)}
              label="Project Updates"
              description="Updates on projects you're working on"
            />
            <Toggle
              checked={settings.email.paymentReceived}
              onChange={(v) => handleEmailChange('paymentReceived', v)}
              label="Payment Received"
              description="Confirmation when payments are processed"
            />
            <Toggle
              checked={settings.email.weeklyDigest}
              onChange={(v) => handleEmailChange('weeklyDigest', v)}
              label="Weekly Digest"
              description="Summary of your activity and earnings"
            />
            <Toggle
              checked={settings.email.marketingEmails}
              onChange={(v) => handleEmailChange('marketingEmails', v)}
              label="Marketing Emails"
              description="Tips, news, and promotional content"
            />
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Push Notifications</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <Toggle
              checked={settings.push.newProjects}
              onChange={(v) => handlePushChange('newProjects', v)}
              label="New Projects"
              description="Instant alerts for new project opportunities"
            />
            <Toggle
              checked={settings.push.projectUpdates}
              onChange={(v) => handlePushChange('projectUpdates', v)}
              label="Project Updates"
              description="Status changes and feedback on your work"
            />
            <Toggle
              checked={settings.push.paymentReceived}
              onChange={(v) => handlePushChange('paymentReceived', v)}
              label="Payment Received"
              description="Alert when payments hit your account"
            />
            <Toggle
              checked={settings.push.messages}
              onChange={(v) => handlePushChange('messages', v)}
              label="Messages"
              description="New messages from clients"
            />
          </CardContent>
        </Card>

        {/* Quick Settings */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Quick Settings</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    email: {
                      newProjects: true,
                      projectUpdates: true,
                      paymentReceived: true,
                      weeklyDigest: true,
                      marketingEmails: true,
                    },
                    push: {
                      newProjects: true,
                      projectUpdates: true,
                      paymentReceived: true,
                      messages: true,
                    },
                  })
                }
              >
                Enable All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    email: {
                      newProjects: false,
                      projectUpdates: false,
                      paymentReceived: false,
                      weeklyDigest: false,
                      marketingEmails: false,
                    },
                    push: {
                      newProjects: false,
                      projectUpdates: false,
                      paymentReceived: false,
                      messages: false,
                    },
                  })
                }
              >
                Disable All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    email: {
                      newProjects: true,
                      projectUpdates: true,
                      paymentReceived: true,
                      weeklyDigest: false,
                      marketingEmails: false,
                    },
                    push: {
                      newProjects: true,
                      projectUpdates: true,
                      paymentReceived: true,
                      messages: true,
                    },
                  })
                }
              >
                Essential Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/settings">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
