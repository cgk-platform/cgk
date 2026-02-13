'use client'

import { Button, Switch, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@cgk-platform/ui'
import { Settings, Save, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantRecoverySettings } from '@/lib/abandoned-checkouts/types'

interface RecoverySettingsButtonProps {
  settings: TenantRecoverySettings | null
}

export function RecoverySettingsButton({ settings }: RecoverySettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Settings className="mr-2 h-4 w-4" />
        Recovery Settings
      </Button>

      {isOpen && (
        <RecoverySettingsModal settings={settings} onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}

interface RecoverySettingsModalProps {
  settings: TenantRecoverySettings | null
  onClose: () => void
}

function RecoverySettingsModal({ settings, onClose }: RecoverySettingsModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    enabled: settings?.enabled ?? true,
    abandonmentTimeoutHours: settings?.abandonmentTimeoutHours ?? 1,
    maxRecoveryEmails: settings?.maxRecoveryEmails ?? 3,
    sequence1DelayHours: settings?.sequence1DelayHours ?? 1,
    sequence2DelayHours: settings?.sequence2DelayHours ?? 24,
    sequence3DelayHours: settings?.sequence3DelayHours ?? 72,
    sequence1IncentiveCode: settings?.sequence1IncentiveCode ?? '',
    sequence2IncentiveCode: settings?.sequence2IncentiveCode ?? '',
    sequence3IncentiveCode: settings?.sequence3IncentiveCode ?? '',
    sequence1Enabled: settings?.sequence1Enabled ?? true,
    sequence2Enabled: settings?.sequence2Enabled ?? true,
    sequence3Enabled: settings?.sequence3Enabled ?? false,
    checkoutExpiryDays: settings?.checkoutExpiryDays ?? 30,
    highValueThresholdCents: settings?.highValueThresholdCents ?? 10000,
  })

  const handleSave = async () => {
    setError(null)

    const response = await fetch('/api/admin/abandoned-checkouts/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        sequence1IncentiveCode: formData.sequence1IncentiveCode || null,
        sequence2IncentiveCode: formData.sequence2IncentiveCode || null,
        sequence3IncentiveCode: formData.sequence3IncentiveCode || null,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to save settings')
      return
    }

    startTransition(() => {
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recovery Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure abandoned checkout recovery behavior
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium">Enable Recovery Emails</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send recovery emails to customers
              </p>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>

          {/* Timing Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Timing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="abandonmentTimeout">Abandonment Timeout (hours)</Label>
                  <Input
                    id="abandonmentTimeout"
                    type="number"
                    min={1}
                    value={formData.abandonmentTimeoutHours}
                    onChange={(e) => setFormData({ ...formData, abandonmentTimeoutHours: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wait time before considering a checkout abandoned
                  </p>
                </div>
                <div>
                  <Label htmlFor="expiryDays">Checkout Expiry (days)</Label>
                  <Input
                    id="expiryDays"
                    type="number"
                    min={1}
                    value={formData.checkoutExpiryDays}
                    onChange={(e) => setFormData({ ...formData, checkoutExpiryDays: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mark as expired after this many days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Sequences */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Email Sequences</CardTitle>
              <CardDescription>Configure up to 3 recovery email sequences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sequence 1 */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Sequence 1 (Initial Recovery)</Label>
                  <Switch
                    checked={formData.sequence1Enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sequence1Enabled: checked })}
                  />
                </div>
                {formData.sequence1Enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="seq1Delay">Delay (hours after abandonment)</Label>
                      <Input
                        id="seq1Delay"
                        type="number"
                        min={1}
                        value={formData.sequence1DelayHours}
                        onChange={(e) => setFormData({ ...formData, sequence1DelayHours: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seq1Code">Incentive Code (optional)</Label>
                      <Input
                        id="seq1Code"
                        placeholder="e.g., COMEBACK10"
                        value={formData.sequence1IncentiveCode}
                        onChange={(e) => setFormData({ ...formData, sequence1IncentiveCode: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sequence 2 */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Sequence 2 (Follow-up)</Label>
                  <Switch
                    checked={formData.sequence2Enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sequence2Enabled: checked })}
                  />
                </div>
                {formData.sequence2Enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="seq2Delay">Delay (hours after abandonment)</Label>
                      <Input
                        id="seq2Delay"
                        type="number"
                        min={1}
                        value={formData.sequence2DelayHours}
                        onChange={(e) => setFormData({ ...formData, sequence2DelayHours: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seq2Code">Incentive Code (optional)</Label>
                      <Input
                        id="seq2Code"
                        placeholder="e.g., SAVE15"
                        value={formData.sequence2IncentiveCode}
                        onChange={(e) => setFormData({ ...formData, sequence2IncentiveCode: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sequence 3 */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Sequence 3 (Last Chance)</Label>
                  <Switch
                    checked={formData.sequence3Enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sequence3Enabled: checked })}
                  />
                </div>
                {formData.sequence3Enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="seq3Delay">Delay (hours after abandonment)</Label>
                      <Input
                        id="seq3Delay"
                        type="number"
                        min={1}
                        value={formData.sequence3DelayHours}
                        onChange={(e) => setFormData({ ...formData, sequence3DelayHours: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seq3Code">Incentive Code (optional)</Label>
                      <Input
                        id="seq3Code"
                        placeholder="e.g., FINAL20"
                        value={formData.sequence3IncentiveCode}
                        onChange={(e) => setFormData({ ...formData, sequence3IncentiveCode: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* High Value Threshold */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Value Threshold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="highValue">High Value Cart Threshold ($)</Label>
                <Input
                  id="highValue"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.highValueThresholdCents / 100}
                  onChange={(e) => setFormData({ ...formData, highValueThresholdCents: Math.round(Number(e.target.value) * 100) })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Carts above this value will be highlighted for priority follow-up
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
