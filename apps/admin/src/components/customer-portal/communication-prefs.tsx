'use client'

import { Button, Card, CardContent, Switch, cn } from '@cgk-platform/ui'
import { Mail, MessageSquare, Bell, Save } from 'lucide-react'
import { useState, useTransition } from 'react'

import type { CommunicationPreference } from '@/lib/customer-portal/types'

interface CommunicationPrefsProps {
  customerId: string
  customerName: string
  preferences: CommunicationPreference | null
  onUpdate: (prefs: Partial<Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>) => Promise<void>
}

interface PrefToggle {
  key: keyof Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>
  label: string
  description: string
  icon: typeof Mail
  category: 'email' | 'sms'
}

const PREF_TOGGLES: PrefToggle[] = [
  {
    key: 'orderConfirmations',
    label: 'Order Confirmations',
    description: 'Receive emails when orders are placed or updated',
    icon: Mail,
    category: 'email',
  },
  {
    key: 'shippingUpdates',
    label: 'Shipping Updates',
    description: 'Receive emails with tracking and delivery notifications',
    icon: Mail,
    category: 'email',
  },
  {
    key: 'subscriptionReminders',
    label: 'Subscription Reminders',
    description: 'Receive emails before subscription orders are processed',
    icon: Mail,
    category: 'email',
  },
  {
    key: 'marketingEmails',
    label: 'Marketing Emails',
    description: 'Receive promotional emails and newsletters',
    icon: Mail,
    category: 'email',
  },
  {
    key: 'smsNotifications',
    label: 'SMS Notifications',
    description: 'Receive text messages for order and shipping updates',
    icon: MessageSquare,
    category: 'sms',
  },
  {
    key: 'promotionalSms',
    label: 'Promotional SMS',
    description: 'Receive text messages with special offers and promotions',
    icon: MessageSquare,
    category: 'sms',
  },
]

const DEFAULT_PREFS: Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'> = {
  orderConfirmations: true,
  shippingUpdates: true,
  subscriptionReminders: true,
  marketingEmails: false,
  smsNotifications: false,
  promotionalSms: false,
}

export function CommunicationPrefs({
  customerName,
  preferences,
  onUpdate,
}: CommunicationPrefsProps) {
  const initialPrefs = preferences
    ? {
        orderConfirmations: preferences.orderConfirmations,
        shippingUpdates: preferences.shippingUpdates,
        subscriptionReminders: preferences.subscriptionReminders,
        marketingEmails: preferences.marketingEmails,
        smsNotifications: preferences.smsNotifications,
        promotionalSms: preferences.promotionalSms,
      }
    : DEFAULT_PREFS

  const [localPrefs, setLocalPrefs] = useState(initialPrefs)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const emailToggles = PREF_TOGGLES.filter((t) => t.category === 'email')
  const smsToggles = PREF_TOGGLES.filter((t) => t.category === 'sms')

  const updatePref = (key: keyof typeof localPrefs, value: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      await onUpdate(localPrefs)
      setHasChanges(false)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Communication Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Manage notification settings for {customerName}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending || !hasChanges}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email Preferences */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">Email Preferences</h4>
            </div>
            <div className="space-y-1">
              {emailToggles.map((toggle) => (
                <PrefToggleRow
                  key={toggle.key}
                  toggle={toggle}
                  enabled={localPrefs[toggle.key as keyof typeof localPrefs]}
                  onChange={(enabled) => updatePref(toggle.key as keyof typeof localPrefs, enabled)}
                  disabled={isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SMS Preferences */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">SMS Preferences</h4>
            </div>
            <div className="space-y-1">
              {smsToggles.map((toggle) => (
                <PrefToggleRow
                  key={toggle.key}
                  toggle={toggle}
                  enabled={localPrefs[toggle.key as keyof typeof localPrefs]}
                  onChange={(enabled) => updatePref(toggle.key as keyof typeof localPrefs, enabled)}
                  disabled={isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium">Important Notes</h4>
              <ul className="mt-1 text-sm text-muted-foreground space-y-1">
                <li>
                  Customers can also manage these preferences from their portal account settings.
                </li>
                <li>
                  Transactional emails (password reset, account verification) cannot be disabled.
                </li>
                <li>
                  Changes made here will be reflected immediately in the customer&apos;s account.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface PrefToggleRowProps {
  toggle: PrefToggle
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function PrefToggleRow({ toggle, enabled, onChange, disabled }: PrefToggleRowProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4 transition-colors',
        enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={toggle.label}
      />
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium">{toggle.label}</label>
        <p className="mt-0.5 text-sm text-muted-foreground">{toggle.description}</p>
      </div>
    </div>
  )
}
