'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Badge, Input, Label, Select, SelectOption, Switch } from '@cgk/ui'

import type { AnalyticsSettings, TargetMetric } from '@/lib/analytics'

export default function AnalyticsSettingsPage() {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null)
  const [targets, setTargets] = useState<TargetMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [settingsRes, targetsRes] = await Promise.all([
        fetch('/api/admin/analytics/settings'),
        fetch('/api/admin/analytics/targets'),
      ])
      const settingsJson = await settingsRes.json()
      const targetsJson = await targetsRes.json()
      setSettings(settingsJson.settings)
      setTargets(targetsJson.targets || [])
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!settings) return
    setSaving(true)

    try {
      await fetch('/api/admin/analytics/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSources: settings.dataSources,
          display: settings.display,
          export: settings.export,
        }),
      })
      alert('Settings saved!')
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!settings) {
    return <div className="text-muted-foreground">Failed to load settings</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Settings</h1>
          <p className="text-muted-foreground">
            Configure data sources and preferences
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Data Sources</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataSourceRow
            name="Shopify"
            connected={settings.dataSources.shopify.connected}
            lastSync={settings.dataSources.shopify.lastSyncAt}
          />
          <DataSourceRow
            name="Google Analytics 4"
            connected={settings.dataSources.googleAnalytics.connected}
            lastSync={settings.dataSources.googleAnalytics.lastSyncAt}
            accountId={settings.dataSources.googleAnalytics.propertyId}
          />
          <DataSourceRow
            name="Meta Ads"
            connected={settings.dataSources.meta.connected}
            lastSync={settings.dataSources.meta.lastSyncAt}
            accountId={settings.dataSources.meta.accountId}
          />
          <DataSourceRow
            name="Google Ads"
            connected={settings.dataSources.googleAds.connected}
            lastSync={settings.dataSources.googleAds.lastSyncAt}
            accountId={settings.dataSources.googleAds.accountId}
          />
          <DataSourceRow
            name="TikTok Ads"
            connected={settings.dataSources.tiktok.connected}
            lastSync={settings.dataSources.tiktok.lastSyncAt}
            accountId={settings.dataSources.tiktok.accountId}
          />

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Refresh</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync data from connected sources
                </p>
              </div>
              <Switch
                checked={settings.dataSources.autoRefreshEnabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    dataSources: { ...settings.dataSources, autoRefreshEnabled: checked },
                  })
                }
              />
            </div>
            {settings.dataSources.autoRefreshEnabled && (
              <div className="mt-4">
                <Label>Refresh Frequency</Label>
                <Select
                  value={settings.dataSources.refreshFrequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dataSources: {
                        ...settings.dataSources,
                        refreshFrequency: e.target.value as 'hourly' | 'daily' | 'manual',
                      },
                    })
                  }
                  className="mt-1 w-40"
                >
                  <SelectOption value="hourly">Hourly</SelectOption>
                  <SelectOption value="daily">Daily</SelectOption>
                  <SelectOption value="manual">Manual</SelectOption>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Display Preferences</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Default Date Range</Label>
              <Select
                value={settings.display.defaultDateRange}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, defaultDateRange: e.target.value as typeof settings.display.defaultDateRange },
                  })
                }
                className="mt-1"
              >
                <SelectOption value="7d">Last 7 days</SelectOption>
                <SelectOption value="14d">Last 14 days</SelectOption>
                <SelectOption value="28d">Last 28 days</SelectOption>
                <SelectOption value="30d">Last 30 days</SelectOption>
                <SelectOption value="90d">Last 90 days</SelectOption>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select
                value={settings.display.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, currency: e.target.value },
                  })
                }
                className="mt-1"
              >
                <SelectOption value="USD">USD ($)</SelectOption>
                <SelectOption value="EUR">EUR</SelectOption>
                <SelectOption value="GBP">GBP</SelectOption>
                <SelectOption value="CAD">CAD</SelectOption>
                <SelectOption value="AUD">AUD</SelectOption>
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Select
                value={settings.display.timezone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, timezone: e.target.value },
                  })
                }
                className="mt-1"
              >
                <SelectOption value="America/New_York">Eastern Time</SelectOption>
                <SelectOption value="America/Chicago">Central Time</SelectOption>
                <SelectOption value="America/Denver">Mountain Time</SelectOption>
                <SelectOption value="America/Los_Angeles">Pacific Time</SelectOption>
                <SelectOption value="UTC">UTC</SelectOption>
              </Select>
            </div>
            <div>
              <Label>Fiscal Year Start</Label>
              <Select
                value={settings.display.fiscalYearStartMonth.toString()}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, fiscalYearStartMonth: parseInt(e.target.value) },
                  })
                }
                className="mt-1"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectOption key={i + 1} value={(i + 1).toString()}>
                    {new Date(2024, i, 1).toLocaleString('en-US', { month: 'long' })}
                  </SelectOption>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Export Settings</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Default Format</Label>
              <Select
                value={settings.export.defaultFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    export: { ...settings.export, defaultFormat: e.target.value as 'csv' | 'excel' | 'pdf' },
                  })
                }
                className="mt-1"
              >
                <SelectOption value="csv">CSV</SelectOption>
                <SelectOption value="excel">Excel</SelectOption>
                <SelectOption value="pdf">PDF</SelectOption>
              </Select>
            </div>
            <div>
              <Label>Date Format</Label>
              <Input
                value={settings.export.dateFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    export: { ...settings.export, dateFormat: e.target.value },
                  })
                }
                className="mt-1"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.export.includeHeaders}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      export: { ...settings.export, includeHeaders: e.target.checked },
                    })
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm">Include headers in exports</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Targets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold">Goals & Targets</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Add target modal')}
          >
            Add Target
          </Button>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No targets configured. Add your first target to track performance.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Metric</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {targets.map((target) => (
                  <tr key={target.id}>
                    <td className="py-3 font-medium capitalize">
                      {target.metric.replace('_', ' ')}
                    </td>
                    <td className="py-3">
                      {target.metric === 'revenue'
                        ? `$${target.targetValue.toLocaleString()}`
                        : target.metric.includes('rate')
                          ? `${target.targetValue}%`
                          : target.targetValue.toLocaleString()}
                    </td>
                    <td className="py-3 capitalize">{target.period}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" className="text-red-600">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface DataSourceRowProps {
  name: string
  connected: boolean
  lastSync: string | null
  accountId?: string
}

function DataSourceRow({ name, connected, lastSync, accountId }: DataSourceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        {accountId && <div className="text-sm text-muted-foreground">ID: {accountId}</div>}
      </div>
      <div className="flex items-center gap-4">
        {connected && lastSync && (
          <span className="text-sm text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleString()}
          </span>
        )}
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Connected' : 'Not Connected'}
        </Badge>
        {!connected && (
          <Button variant="outline" size="sm">
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-5 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
