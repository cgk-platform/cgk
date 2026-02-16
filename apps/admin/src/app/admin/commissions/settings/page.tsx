'use client'

import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Button, Input, Label, Switch } from '@cgk-platform/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CommissionConfig, TierRate } from '@/lib/creators-admin-ops'
import { DEFAULT_TIER_RATES } from '@/lib/creators-admin-ops'
import { formatMoney } from '@/lib/format'

export default function CommissionSettingsPage() {
  const [, setConfig] = useState<CommissionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [defaultRate, setDefaultRate] = useState(10)
  const [tierRates, setTierRates] = useState<TierRate[]>(DEFAULT_TIER_RATES)
  const [autoRetroactive, setAutoRetroactive] = useState(true)
  const [lookbackDays, setLookbackDays] = useState(90)

  useEffect(() => {
    fetch('/api/admin/commissions/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config)
          setDefaultRate(data.config.default_rate_percent)
          setTierRates(
            data.config.tier_rates?.length > 0
              ? data.config.tier_rates
              : DEFAULT_TIER_RATES
          )
          setAutoRetroactive(data.config.auto_retroactive)
          setLookbackDays(data.config.retroactive_lookback_days)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('[commissions-settings] Failed to load config:', error)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/commissions/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_rate_percent: defaultRate,
          tier_rates: tierRates,
          auto_retroactive: autoRetroactive,
          retroactive_lookback_days: lookbackDays,
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

  const updateTierRate = (index: number, field: keyof TierRate, value: string | number) => {
    const updated = [...tierRates]
    const tier = updated[index]
    if (tier) {
      updated[index] = { ...tier, [field]: value }
      setTierRates(updated)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/commissions" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Commission Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-10 w-32 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/commissions" className="text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Commission Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Default Rate</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="default-rate">Default Commission Rate (%)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="default-rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={defaultRate}
                onChange={(e) => setDefaultRate(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied to new creators unless overridden
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Tier-Based Rates</h2>
          <p className="text-sm text-muted-foreground">
            Creators automatically move to higher tiers based on lifetime sales
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Min Lifetime Sales</th>
                  <th className="pb-2 font-medium">Commission Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tierRates.map((tier, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-3">
                      <Input
                        value={tier.tier}
                        onChange={(e) => updateTierRate(idx, 'tier', e.target.value)}
                        className="w-28"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={tier.min_lifetime_cents / 100}
                          onChange={(e) =>
                            updateTierRate(idx, 'min_lifetime_cents', Number(e.target.value) * 100)
                          }
                          className="w-28"
                        />
                        <span className="text-xs text-muted-foreground">
                          ({formatMoney(tier.min_lifetime_cents, 'USD')})
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={tier.rate_percent}
                          onChange={(e) =>
                            updateTierRate(idx, 'rate_percent', Number(e.target.value))
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">%</span>
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
          <h2 className="text-lg font-semibold">Retroactive Application</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-apply retroactive commissions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically find and apply commissions to older orders
              </p>
            </div>
            <Switch
              checked={autoRetroactive}
              onCheckedChange={setAutoRetroactive}
            />
          </div>

          {autoRetroactive && (
            <div className="max-w-xs">
              <Label htmlFor="lookback">Lookback Period (days)</Label>
              <Input
                id="lookback"
                type="number"
                min="1"
                max="365"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="mt-1 w-24"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
