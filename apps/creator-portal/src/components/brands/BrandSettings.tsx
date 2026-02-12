'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import type {
  BrandNotificationOverrides,
  BrandPreferences,
  BrandSampleAddress,
  NotificationType,
  UpdateBrandPreferencesInput,
} from '@/lib/types'

interface BrandSettingsProps {
  brandSlug: string
  brandName: string
  onSaved?: () => void
}

const NOTIFICATION_TYPES: { type: NotificationType; label: string; description: string }[] = [
  { type: 'project_assigned', label: 'Project Assigned', description: 'When you are assigned a new project' },
  { type: 'project_updated', label: 'Project Updates', description: 'Updates on your active projects' },
  { type: 'message_received', label: 'Messages', description: 'New messages from coordinators' },
  { type: 'payment_received', label: 'Payments', description: 'Payment confirmations' },
  { type: 'deadline_reminder', label: 'Deadline Reminders', description: 'Upcoming project deadlines' },
  { type: 'revision_requested', label: 'Revision Requests', description: 'When revisions are requested' },
]

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
]

/**
 * BrandSettings - Per-brand settings configuration
 *
 * Allows creators to override:
 * - Notification preferences per brand
 * - Sample shipping address per brand
 * - Contact preferences
 */
export function BrandSettings({
  brandSlug,
  brandName,
  onSaved,
}: BrandSettingsProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Preferences state
  const [_preferences, setPreferences] = useState<BrandPreferences | null>(null)
  const [muteAll, setMuteAll] = useState(false)
  const [notificationOverrides, setNotificationOverrides] = useState<
    Map<NotificationType, { email: boolean | null; sms: boolean | null }>
  >(new Map())
  const [useDefaultAddress, setUseDefaultAddress] = useState(true)
  const [sampleAddress, setSampleAddress] = useState<BrandSampleAddress>({
    useDefault: true,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    countryCode: 'US',
  })
  const [preferredContactMethod, setPreferredContactMethod] = useState<'email' | 'sms' | 'both' | null>(null)

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/creator/brands/${brandSlug}/preferences`)

        if (!response.ok) {
          throw new Error('Failed to load preferences')
        }

        const data = await response.json()
        const prefs = data.preferences as BrandPreferences

        setPreferences(prefs)
        setMuteAll(prefs.notificationOverrides.muteAll)
        setPreferredContactMethod(prefs.preferredContactMethod)

        // Set up notification overrides
        const overrideMap = new Map<NotificationType, { email: boolean | null; sms: boolean | null }>()
        const notifOverrides = prefs.notificationOverrides

        NOTIFICATION_TYPES.forEach(({ type }) => {
          const key = type.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as keyof Omit<BrandNotificationOverrides, 'muteAll'>
          const override = notifOverrides[key]
          overrideMap.set(type, override || { email: null, sms: null })
        })

        setNotificationOverrides(overrideMap)

        // Set up sample address
        if (prefs.sampleAddress) {
          setUseDefaultAddress(prefs.sampleAddress.useDefault)
          setSampleAddress(prefs.sampleAddress)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences')
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [brandSlug])

  // Handle notification toggle
  const handleNotificationToggle = useCallback(
    (type: NotificationType, channel: 'email' | 'sms', value: boolean | null) => {
      setNotificationOverrides((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(type) || { email: null, sms: null }
        newMap.set(type, { ...current, [channel]: value })
        return newMap
      })
    },
    []
  )

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Build notification overrides object
      const notifOverrides: Partial<BrandNotificationOverrides> = { muteAll }

      notificationOverrides.forEach((value, type) => {
        const key = type.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as keyof Omit<BrandNotificationOverrides, 'muteAll'>

        // Only include if there's an override (not all null)
        if (value.email !== null || value.sms !== null) {
          notifOverrides[key] = { email: value.email ?? false, sms: value.sms ?? false }
        }
      })

      const body: UpdateBrandPreferencesInput = {
        notificationOverrides: notifOverrides,
        preferredContactMethod,
      }

      // Include sample address only if not using default
      if (!useDefaultAddress) {
        body.sampleAddress = sampleAddress
      } else {
        body.sampleAddress = null
      }

      const response = await fetch(`/api/creator/brands/${brandSlug}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save preferences')
      }

      setSuccessMessage('Preferences saved successfully')
      onSaved?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }, [brandSlug, muteAll, notificationOverrides, useDefaultAddress, sampleAddress, preferredContactMethod, onSaved])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success messages */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
          <CardDescription>
            Override your global notification settings for {brandName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mute All Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Mute all notifications</Label>
              <p className="text-sm text-muted-foreground">
                Silence all notifications from {brandName}
              </p>
            </div>
            <Switch
              checked={muteAll}
              onCheckedChange={setMuteAll}
            />
          </div>

          {/* Individual notification types */}
          {!muteAll && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set to override your global settings. Leave unchecked to use your default preferences.
              </p>

              <div className="divide-y rounded-lg border">
                {NOTIFICATION_TYPES.map(({ type, label, description }) => {
                  const override = notificationOverrides.get(type) || { email: null, sms: null }

                  return (
                    <div key={type} className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="font-medium">{label}</Label>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <NotificationToggle
                          label="Email"
                          value={override.email}
                          onChange={(v) => handleNotificationToggle(type, 'email', v)}
                        />
                        <NotificationToggle
                          label="SMS"
                          value={override.sms}
                          onChange={(v) => handleNotificationToggle(type, 'sms', v)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Address Override */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sample Product Address</CardTitle>
          <CardDescription>
            Use a different shipping address for samples from {brandName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="use-default-address"
              checked={!useDefaultAddress}
              onCheckedChange={(checked) => setUseDefaultAddress(!checked)}
            />
            <Label htmlFor="use-default-address">
              Use a different address for this brand
            </Label>
          </div>

          {!useDefaultAddress && (
            <div className="mt-4 grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input
                  id="address1"
                  value={sampleAddress.addressLine1 || ''}
                  onChange={(e) =>
                    setSampleAddress((prev) => ({ ...prev, addressLine1: e.target.value || null }))
                  }
                  placeholder="Street address"
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={sampleAddress.addressLine2 || ''}
                  onChange={(e) =>
                    setSampleAddress((prev) => ({ ...prev, addressLine2: e.target.value || null }))
                  }
                  placeholder="Apt, suite, etc. (optional)"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={sampleAddress.city || ''}
                  onChange={(e) =>
                    setSampleAddress((prev) => ({ ...prev, city: e.target.value || null }))
                  }
                  placeholder="City"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  value={sampleAddress.state || ''}
                  onChange={(e) =>
                    setSampleAddress((prev) => ({ ...prev, state: e.target.value || null }))
                  }
                  placeholder="State"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="postal">Postal Code</Label>
                <Input
                  id="postal"
                  value={sampleAddress.postalCode || ''}
                  onChange={(e) =>
                    setSampleAddress((prev) => ({ ...prev, postalCode: e.target.value || null }))
                  }
                  placeholder="12345"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <RadixSelect
                  value={sampleAddress.countryCode}
                  onValueChange={(value) =>
                    setSampleAddress((prev) => ({ ...prev, countryCode: value }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </RadixSelect>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Preferences</CardTitle>
          <CardDescription>
            How should {brandName} coordinators contact you?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadixSelect
            value={preferredContactMethod || 'none'}
            onValueChange={(value) =>
              setPreferredContactMethod(value === 'none' ? null : (value as 'email' | 'sms' | 'both'))
            }
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No preference (use global)</SelectItem>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="sms">SMS only</SelectItem>
              <SelectItem value="both">Both email and SMS</SelectItem>
            </SelectContent>
          </RadixSelect>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Three-state notification toggle: null (use global), true (enabled), false (disabled)
 */
function NotificationToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (value: boolean | null) => void
}): React.JSX.Element {
  // Cycle through states: null -> true -> false -> null
  const handleClick = () => {
    if (value === null) {
      onChange(true)
    } else if (value === true) {
      onChange(false)
    } else {
      onChange(null)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
        value === null
          ? 'bg-muted text-muted-foreground'
          : value
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
      }`}
      title={
        value === null
          ? 'Using global setting'
          : value
            ? 'Override: Enabled'
            : 'Override: Disabled'
      }
    >
      <span className="w-3">
        {value === null ? (
          <MinusIcon className="h-3 w-3" />
        ) : value ? (
          <CheckIcon className="h-3 w-3" />
        ) : (
          <XIcon className="h-3 w-3" />
        )}
      </span>
      {label}
    </button>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
    </svg>
  )
}
