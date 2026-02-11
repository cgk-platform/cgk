'use client'

import { Switch } from '@cgk/ui'

interface NotificationToggleProps {
  type: string
  label: string
  description: string
  emailEnabled: boolean
  smsEnabled: boolean
  onEmailChange: (enabled: boolean) => void
  onSmsChange: (enabled: boolean) => void
  smsDisabled?: boolean
}

export function NotificationToggle({
  type,
  label,
  description,
  emailEnabled,
  smsEnabled,
  onEmailChange,
  onSmsChange,
  smsDisabled = false,
}: NotificationToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-6">
        {/* Email toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id={`${type}-email`}
            checked={emailEnabled}
            onCheckedChange={onEmailChange}
          />
          <label
            htmlFor={`${type}-email`}
            className="sr-only sm:not-sr-only text-xs text-muted-foreground"
          >
            Email
          </label>
        </div>

        {/* SMS toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id={`${type}-sms`}
            checked={smsEnabled}
            onCheckedChange={onSmsChange}
            disabled={smsDisabled}
          />
          <label
            htmlFor={`${type}-sms`}
            className="sr-only sm:not-sr-only text-xs text-muted-foreground"
          >
            SMS
          </label>
        </div>
      </div>
    </div>
  )
}
