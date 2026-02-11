'use client'

import { Button, Card, CardContent, CardHeader, CardTitle, cn, Switch } from '@cgk/ui'
import { Bell, Mail, MessageSquare, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { NotificationSetting } from '@/lib/creator-communications/types'

interface NotificationSettingsFormProps {
  notifications: NotificationSetting[]
}

export function NotificationSettingsForm({ notifications }: NotificationSettingsFormProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState(notifications)

  const updateSetting = (
    notificationType: string,
    field: keyof NotificationSetting,
    value: boolean,
  ) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.notification_type === notificationType ? { ...s, [field]: value } : s,
      ),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = settings.map((s) => ({
        notification_type: s.notification_type,
        email_enabled: s.email_enabled,
        sms_enabled: s.sms_enabled,
        push_enabled: s.push_enabled,
        is_enabled: s.is_enabled,
      }))

      const response = await fetch('/api/admin/creators/communications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updates }),
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

  // Group by category
  const grouped = settings.reduce(
    (acc, setting) => {
      const cat = setting.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(setting)
      return acc
    },
    {} as Record<string, NotificationSetting[]>,
  )

  const categoryLabels: Record<string, string> = {
    onboarding: 'Onboarding',
    projects: 'Projects',
    payments: 'Payments',
    esign: 'E-Sign',
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    onboarding: <Bell className="h-4 w-4" />,
    projects: <MessageSquare className="h-4 w-4" />,
    payments: <Mail className="h-4 w-4" />,
    esign: <Mail className="h-4 w-4" />,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notification Types</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-1.5 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {Object.entries(grouped).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {categoryIcons[category]}
              {categoryLabels[category] || category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr,80px,80px,80px,80px] gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <div>Notification</div>
              <div className="text-center">Email</div>
              <div className="text-center">SMS</div>
              <div className="text-center">Push</div>
              <div className="text-center">Enabled</div>
            </div>

            {/* Rows */}
            {categorySettings.map((setting) => (
              <div
                key={setting.notification_type}
                className={cn(
                  'grid grid-cols-[1fr,80px,80px,80px,80px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30',
                  !setting.is_enabled && 'opacity-50',
                )}
              >
                <div>
                  <p className="font-medium">{setting.display_name}</p>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground">
                      {setting.description}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={setting.email_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.notification_type, 'email_enabled', checked)
                    }
                    disabled={!setting.is_enabled}
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={setting.sms_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.notification_type, 'sms_enabled', checked)
                    }
                    disabled={!setting.is_enabled}
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={setting.push_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.notification_type, 'push_enabled', checked)
                    }
                    disabled={!setting.is_enabled}
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={setting.is_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.notification_type, 'is_enabled', checked)
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
