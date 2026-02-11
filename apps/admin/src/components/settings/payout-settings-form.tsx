'use client'

import { Card, CardContent, cn, Spinner } from '@cgk/ui'
import {
  Banknote,
  Building2,
  CreditCard,
  DollarSign,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  ErrorAlert,
  NumberField,
  SaveButton,
  SelectField,
  SettingsSection,
  ToggleField,
  UnsavedChangesBanner,
} from './form-elements'

import type { PayoutSettings, PayoutSettingsUpdate } from '@/lib/settings/types'

interface PayoutSettingsFormProps {
  initialSettings?: PayoutSettings | null
}

const PAYMENT_METHODS = [
  { id: 'stripe_connect', label: 'Stripe Connect', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: Wallet },
  { id: 'wise', label: 'Wise', icon: Building2 },
  { id: 'venmo', label: 'Venmo', icon: DollarSign },
  { id: 'check', label: 'Check', icon: Banknote },
] as const

const SCHEDULE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'on_demand', label: 'On Demand' },
]

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

const FEE_TYPE_OPTIONS = [
  { value: 'none', label: 'No Fee' },
  { value: 'flat', label: 'Flat Fee' },
  { value: 'percentage', label: 'Percentage' },
]

function getMonthDayOptions() {
  return Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `Day ${i + 1}`,
  }))
}

function getScheduleDescription(schedule: string, day: number): string {
  switch (schedule) {
    case 'weekly':
      return `Payouts process every ${WEEKDAY_OPTIONS.find((w) => w.value === String(day))?.label || 'Friday'}`
    case 'bi_weekly':
      return `Payouts process every other ${WEEKDAY_OPTIONS.find((w) => w.value === String(day))?.label || 'Friday'}`
    case 'monthly':
      return `Payouts process on day ${day} of each month`
    case 'on_demand':
      return 'Payouts process only when requested by the payee'
    default:
      return ''
  }
}

export function PayoutSettingsForm({ initialSettings }: PayoutSettingsFormProps) {
  const [settings, setSettings] = useState<PayoutSettings | null>(initialSettings ?? null)
  const [originalSettings, setOriginalSettings] = useState<PayoutSettings | null>(
    initialSettings ?? null
  )
  const [isLoading, setIsLoading] = useState(!initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/settings/payouts')

      if (!res.ok) throw new Error('Failed to load payout settings')

      const data = await res.json()
      setSettings(data.settings)
      setOriginalSettings(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialSettings) {
      fetchSettings()
    }
  }, [initialSettings, fetchSettings])

  const isDirty =
    settings && originalSettings
      ? JSON.stringify(settings) !== JSON.stringify(originalSettings)
      : false

  const handleSave = async () => {
    if (!settings || !isDirty) return

    setIsSaving(true)
    setError(null)

    try {
      const updates: PayoutSettingsUpdate = {
        defaultPaymentMethod: settings.defaultPaymentMethod,
        stripeConnectEnabled: settings.stripeConnectEnabled,
        paypalEnabled: settings.paypalEnabled,
        wiseEnabled: settings.wiseEnabled,
        checkEnabled: settings.checkEnabled,
        venmoEnabled: settings.venmoEnabled,
        payoutSchedule: settings.payoutSchedule,
        payoutDay: settings.payoutDay,
        minPayoutThresholdUsd: settings.minPayoutThresholdUsd,
        maxPendingWithdrawals: settings.maxPendingWithdrawals,
        holdPeriodDays: settings.holdPeriodDays,
        autoPayoutEnabled: settings.autoPayoutEnabled,
        payoutFeeType: settings.payoutFeeType,
        payoutFeeAmount: settings.payoutFeeAmount,
        requireTaxInfo: settings.requireTaxInfo,
      }

      const res = await fetch('/api/admin/settings/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const data = await res.json()
      setSettings(data.settings)
      setOriginalSettings(data.settings)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof PayoutSettings>(
    key: K,
    value: PayoutSettings[K]
  ) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setIsSaved(false)
  }

  const toggleMethod = (
    method: (typeof PAYMENT_METHODS)[number]['id'],
    enabled: boolean
  ) => {
    const keyMap: Record<string, keyof PayoutSettings> = {
      stripe_connect: 'stripeConnectEnabled',
      paypal: 'paypalEnabled',
      wise: 'wiseEnabled',
      check: 'checkEnabled',
      venmo: 'venmoEnabled',
    }
    const key = keyMap[method]
    if (key && settings) {
      updateSetting(key, enabled)
    }
  }

  const isMethodEnabled = (method: (typeof PAYMENT_METHODS)[number]['id']): boolean => {
    if (!settings) return false
    const keyMap: Record<string, keyof PayoutSettings> = {
      stripe_connect: 'stripeConnectEnabled',
      paypal: 'paypalEnabled',
      wise: 'wiseEnabled',
      check: 'checkEnabled',
      venmo: 'venmoEnabled',
    }
    const key = keyMap[method]
    return key ? Boolean(settings[key]) : false
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErrorAlert message="Failed to load payout settings" />
        </CardContent>
      </Card>
    )
  }

  const isMonthlySchedule = settings.payoutSchedule === 'monthly'
  const isOnDemand = settings.payoutSchedule === 'on_demand'

  return (
    <div className="space-y-6">
      <UnsavedChangesBanner show={isDirty} />

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <SettingsSection
        title="Payment Methods"
        description="Enable the payment methods available for payouts."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAYMENT_METHODS.map((method) => {
            const enabled = isMethodEnabled(method.id)
            const isDefault = settings.defaultPaymentMethod === method.id
            const Icon = method.icon

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => toggleMethod(method.id, !enabled)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                  enabled
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    enabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {enabled ? (isDefault ? 'Default' : 'Enabled') : 'Disabled'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <SelectField
          label="Default Payment Method"
          description="The preferred payment method for new payees."
          value={settings.defaultPaymentMethod}
          onChange={(value) =>
            updateSetting(
              'defaultPaymentMethod',
              value as PayoutSettings['defaultPaymentMethod']
            )
          }
          options={PAYMENT_METHODS.filter((m) => isMethodEnabled(m.id)).map((m) => ({
            value: m.id,
            label: m.label,
          }))}
        />
      </SettingsSection>

      <SettingsSection
        title="Payout Schedule"
        description="Configure when payouts are processed."
      >
        <SelectField
          label="Schedule"
          description="How often to process payouts."
          value={settings.payoutSchedule}
          onChange={(value) =>
            updateSetting('payoutSchedule', value as PayoutSettings['payoutSchedule'])
          }
          options={SCHEDULE_OPTIONS}
        />

        {!isOnDemand && (
          <SelectField
            label={isMonthlySchedule ? 'Day of Month' : 'Day of Week'}
            description={isMonthlySchedule ? 'Which day to process payouts.' : 'Which day to process payouts.'}
            value={String(settings.payoutDay)}
            onChange={(value) => updateSetting('payoutDay', parseInt(value, 10))}
            options={isMonthlySchedule ? getMonthDayOptions() : WEEKDAY_OPTIONS}
          />
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          {getScheduleDescription(settings.payoutSchedule, settings.payoutDay)}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Thresholds & Limits"
        description="Set minimum amounts and limits for payouts."
      >
        <NumberField
          label="Minimum Payout Threshold"
          description="Minimum balance before a payout can be requested."
          value={Number(settings.minPayoutThresholdUsd)}
          onChange={(value) => updateSetting('minPayoutThresholdUsd', value ?? 10)}
          min={1}
          step={1}
          prefix="$"
        />

        <NumberField
          label="Hold Period"
          description="Days to hold funds before they become eligible for payout."
          value={settings.holdPeriodDays}
          onChange={(value) => updateSetting('holdPeriodDays', value ?? 7)}
          min={0}
          max={90}
          suffix="days"
        />

        <NumberField
          label="Maximum Pending Withdrawals"
          description="Maximum number of simultaneous pending withdrawal requests per payee."
          value={settings.maxPendingWithdrawals}
          onChange={(value) => updateSetting('maxPendingWithdrawals', value ?? 3)}
          min={1}
          max={10}
        />
      </SettingsSection>

      <SettingsSection title="Auto-Payout" description="Automatic payout processing.">
        <ToggleField
          label="Enable Auto-Payout"
          description="Automatically process payouts when balance meets threshold and schedule criteria."
          checked={settings.autoPayoutEnabled}
          onChange={(checked) => updateSetting('autoPayoutEnabled', checked)}
        />
      </SettingsSection>

      <SettingsSection title="Payout Fees" description="Configure fees for payouts.">
        <SelectField
          label="Fee Type"
          description="How to calculate payout fees."
          value={settings.payoutFeeType}
          onChange={(value) =>
            updateSetting('payoutFeeType', value as PayoutSettings['payoutFeeType'])
          }
          options={FEE_TYPE_OPTIONS}
        />

        {settings.payoutFeeType !== 'none' && (
          <NumberField
            label={settings.payoutFeeType === 'flat' ? 'Flat Fee Amount' : 'Fee Percentage'}
            description={
              settings.payoutFeeType === 'flat'
                ? 'Fixed fee deducted from each payout.'
                : 'Percentage of payout amount to deduct as fee.'
            }
            value={Number(settings.payoutFeeAmount)}
            onChange={(value) => updateSetting('payoutFeeAmount', value ?? 0)}
            min={0}
            step={settings.payoutFeeType === 'flat' ? 0.5 : 0.1}
            prefix={settings.payoutFeeType === 'flat' ? '$' : undefined}
            suffix={settings.payoutFeeType === 'percentage' ? '%' : undefined}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Compliance" description="Tax and legal requirements.">
        <ToggleField
          label="Require Tax Information"
          description="Require W-9 or equivalent tax documentation before processing payouts."
          checked={settings.requireTaxInfo}
          onChange={(checked) => updateSetting('requireTaxInfo', checked)}
        />
      </SettingsSection>

      <div className="flex justify-end">
        <SaveButton
          isDirty={isDirty}
          isLoading={isSaving}
          isSaved={isSaved}
          onClick={handleSave}
        />
      </div>
    </div>
  )
}
