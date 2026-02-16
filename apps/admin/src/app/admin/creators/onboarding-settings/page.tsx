'use client'

import { Card, CardContent, CardHeader, Button, Input, Label, Switch } from '@cgk-platform/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { OnboardingConfig, OnboardingStep } from '@/lib/creators-admin-ops'
import { DEFAULT_ONBOARDING_STEPS } from '@/lib/creators-admin-ops'

export default function OnboardingSettingsPage() {
  const [, setConfig] = useState<OnboardingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [steps, setSteps] = useState<OnboardingStep[]>(DEFAULT_ONBOARDING_STEPS)
  const [maxDays, setMaxDays] = useState(30)
  const [autoDeactivate, setAutoDeactivate] = useState(true)
  const [defaultCommission, setDefaultCommission] = useState(10)
  const [autoGenerateCode, setAutoGenerateCode] = useState(true)
  const [codeFormat, setCodeFormat] = useState('{NAME}{RANDOM2}')

  useEffect(() => {
    fetch('/api/admin/creators/onboarding/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config)
          setSteps(data.config.steps || DEFAULT_ONBOARDING_STEPS)
          setMaxDays(data.config.max_completion_days || 30)
          setAutoDeactivate(data.config.auto_deactivate ?? true)
          setDefaultCommission(data.config.default_commission_percent || 10)
          setAutoGenerateCode(data.config.auto_generate_code ?? true)
          setCodeFormat(data.config.code_format || '{NAME}{RANDOM2}')
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('[onboarding-settings] Failed to load settings:', error)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/creators/onboarding/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          max_completion_days: maxDays,
          auto_deactivate: autoDeactivate,
          default_commission_percent: defaultCommission,
          auto_generate_code: autoGenerateCode,
          code_format: codeFormat,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        alert('Settings saved successfully')
      } else {
        alert('Failed to save settings')
      }
    } catch {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateStep = (index: number, field: keyof OnboardingStep, value: unknown) => {
    const updated = [...steps]
    const currentStep = updated[index]
    if (currentStep) {
      updated[index] = { ...currentStep, [field]: value } as OnboardingStep
      setSteps(updated)
    }
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= steps.length) return

    const updated = [...steps]
    const currentStep = updated[index]
    const swapStep = updated[newIndex]
    if (currentStep && swapStep) {
      updated[index] = swapStep
      updated[newIndex] = currentStep
      // Update order values
      setSteps(updated.map((step, i) => ({ ...step, order: i + 1 })))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/creators" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Onboarding Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-40 w-full rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/creators" className="text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Onboarding Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Required Steps</h2>
          <p className="text-sm text-muted-foreground">
            Configure the onboarding steps creators must complete
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Step Name</th>
                  <th className="pb-2 font-medium">Required</th>
                  <th className="pb-2 font-medium">Reminder Days</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {steps.map((step, idx) => (
                  <tr key={step.id} className="align-top">
                    <td className="py-3">
                      <span className="text-muted-foreground">{step.order}</span>
                    </td>
                    <td className="py-3">
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(idx, 'name', e.target.value)}
                        className="w-64"
                      />
                    </td>
                    <td className="py-3">
                      <Switch
                        checked={step.required}
                        onCheckedChange={(checked) => updateStep(idx, 'required', checked)}
                      />
                    </td>
                    <td className="py-3">
                      <Input
                        value={step.reminderDays.join(', ')}
                        onChange={(e) => {
                          const days = e.target.value
                            .split(',')
                            .map((d) => parseInt(d.trim()))
                            .filter((d) => !isNaN(d))
                          updateStep(idx, 'reminderDays', days)
                        }}
                        placeholder="e.g. 3, 7, 14"
                        className="w-32"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="rounded p-1 hover:bg-muted disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="rounded p-1 hover:bg-muted disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Timeline</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="max-days">Max days to complete required steps</Label>
            <Input
              id="max-days"
              type="number"
              min="1"
              max="365"
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
              className="mt-1 w-24"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-deactivate if incomplete</Label>
              <p className="text-sm text-muted-foreground">
                Automatically deactivate creators who don't complete onboarding in time
              </p>
            </div>
            <Switch checked={autoDeactivate} onCheckedChange={setAutoDeactivate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Auto-Assign Settings</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="default-commission">Default Commission Rate (%)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="default-commission"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={defaultCommission}
                onChange={(e) => setDefaultCommission(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-generate Discount Code</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate a unique discount code for new creators
              </p>
            </div>
            <Switch checked={autoGenerateCode} onCheckedChange={setAutoGenerateCode} />
          </div>

          {autoGenerateCode && (
            <div className="max-w-xs">
              <Label htmlFor="code-format">Code Format</Label>
              <Input
                id="code-format"
                value={codeFormat}
                onChange={(e) => setCodeFormat(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use {'{NAME}'} for creator name, {'{RANDOM2}'} for 2 random digits.
                Example: JANE42
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/creators">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
