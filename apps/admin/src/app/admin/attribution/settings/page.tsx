'use client'

import { Button, Card, CardContent, Switch, Label, Alert, AlertDescription } from '@cgk/ui'
import { Save, RefreshCw, Loader2 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import {
  ATTRIBUTION_MODELS,
  ATTRIBUTION_WINDOWS,
  type AttributionSettings,
  type AttributionSettingsUpdate,
  type AttributionModel,
  type AttributionWindow,
  type AttributionMode,
  type FairingSyncInterval,
} from '@/lib/attribution'

export default function AttributionSettingsPage() {
  const [settings, setSettings] = useState<AttributionSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/attribution/settings')
      const data = await response.json()
      setSettings(data.settings)
    } catch (err) {
      setError('Failed to load settings')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setSaveSuccess(false)
    setError(null)

    try {
      const update: AttributionSettingsUpdate = {
        enabled: settings.enabled,
        defaultModel: settings.defaultModel,
        defaultWindow: settings.defaultWindow,
        attributionMode: settings.attributionMode,
        enabledModels: settings.enabledModels,
        enabledWindows: settings.enabledWindows,
        timeDecayHalfLifeHours: settings.timeDecayHalfLifeHours,
        positionBasedWeights: settings.positionBasedWeights,
        fairingBridgeEnabled: settings.fairingBridgeEnabled,
        fairingSyncInterval: settings.fairingSyncInterval,
      }

      const response = await fetch('/api/admin/attribution/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError('Failed to save settings')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFairingSync = async () => {
    setIsSyncing(true)
    try {
      // In a real implementation, this would trigger a Fairing sync job
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } finally {
      setIsSyncing(false)
    }
  }

  const updateSetting = <K extends keyof AttributionSettings>(
    key: K,
    value: AttributionSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  const toggleModel = (model: AttributionModel) => {
    if (!settings) return
    const newModels = settings.enabledModels.includes(model)
      ? settings.enabledModels.filter((m) => m !== model)
      : [...settings.enabledModels, model]
    updateSetting('enabledModels', newModels)
  }

  const toggleWindow = (window: AttributionWindow) => {
    if (!settings) return
    const newWindows = settings.enabledWindows.includes(window)
      ? settings.enabledWindows.filter((w) => w !== window)
      : [...settings.enabledWindows, window]
    updateSetting('enabledWindows', newWindows)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-4 space-y-3">
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!settings) {
    return (
      <Alert variant="error">
        <AlertDescription>Failed to load attribution settings.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Global Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-medium">Global Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Attribution Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track marketing touchpoints and calculate attribution
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Attribution Model</Label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) =>
                    updateSetting('defaultModel', e.target.value as AttributionModel)
                  }
                  className="w-full rounded-md border p-2"
                >
                  {ATTRIBUTION_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Default Attribution Window</Label>
                <select
                  value={settings.defaultWindow}
                  onChange={(e) =>
                    updateSetting('defaultWindow', e.target.value as AttributionWindow)
                  }
                  className="w-full rounded-md border p-2"
                >
                  {ATTRIBUTION_WINDOWS.map((window) => (
                    <option key={window.value} value={window.value}>
                      {window.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attribution Mode</Label>
              <select
                value={settings.attributionMode}
                onChange={(e) =>
                  updateSetting('attributionMode', e.target.value as AttributionMode)
                }
                className="w-full rounded-md border p-2"
              >
                <option value="clicks_only">Clicks Only</option>
                <option value="clicks_plus_views">Clicks + Views</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Choose whether to include view-through conversions in attribution
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-medium">Enabled Models</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Select which attribution models are available in the dashboard
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ATTRIBUTION_MODELS.map((model) => (
              <label
                key={model.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={settings.enabledModels.includes(model.value)}
                  onChange={() => toggleModel(model.value)}
                  className="mt-1 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium">{model.label}</p>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 space-y-4 border-t pt-6">
            <h4 className="font-medium">Model-Specific Settings</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Time Decay Half-Life (hours)</Label>
                <input
                  type="number"
                  value={settings.timeDecayHalfLifeHours}
                  onChange={(e) =>
                    updateSetting('timeDecayHalfLifeHours', parseInt(e.target.value) || 168)
                  }
                  className="w-full rounded-md border p-2"
                  min={1}
                  max={720}
                />
                <p className="text-xs text-muted-foreground">
                  Touchpoints lose half their value after this many hours (default: 168 = 7 days)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Position-Based Weights</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={settings.positionBasedWeights.first}
                      onChange={(e) =>
                        updateSetting('positionBasedWeights', {
                          ...settings.positionBasedWeights,
                          first: parseInt(e.target.value) || 40,
                        })
                      }
                      className="w-full rounded-md border p-2"
                      min={0}
                      max={100}
                    />
                    <p className="mt-1 text-center text-xs text-muted-foreground">First</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={settings.positionBasedWeights.middle}
                      onChange={(e) =>
                        updateSetting('positionBasedWeights', {
                          ...settings.positionBasedWeights,
                          middle: parseInt(e.target.value) || 20,
                        })
                      }
                      className="w-full rounded-md border p-2"
                      min={0}
                      max={100}
                    />
                    <p className="mt-1 text-center text-xs text-muted-foreground">Middle</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={settings.positionBasedWeights.last}
                      onChange={(e) =>
                        updateSetting('positionBasedWeights', {
                          ...settings.positionBasedWeights,
                          last: parseInt(e.target.value) || 40,
                        })
                      }
                      className="w-full rounded-md border p-2"
                      min={0}
                      max={100}
                    />
                    <p className="mt-1 text-center text-xs text-muted-foreground">Last</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Window Configuration */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-medium">Enabled Windows</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Select which attribution windows are available in the dashboard
          </p>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTION_WINDOWS.map((window) => (
              <label
                key={window.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={settings.enabledWindows.includes(window.value)}
                  onChange={() => toggleWindow(window.value)}
                  className="rounded border-gray-300"
                />
                <span>{window.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fairing Integration */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-medium">Fairing Survey Bridge</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Fairing Bridge</Label>
                <p className="text-sm text-muted-foreground">
                  Import post-purchase survey responses for attribution validation
                </p>
              </div>
              <Switch
                checked={settings.fairingBridgeEnabled}
                onCheckedChange={(checked) => updateSetting('fairingBridgeEnabled', checked)}
              />
            </div>

            {settings.fairingBridgeEnabled && (
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sync Interval</Label>
                  <select
                    value={settings.fairingSyncInterval}
                    onChange={(e) =>
                      updateSetting('fairingSyncInterval', e.target.value as FairingSyncInterval)
                    }
                    className="w-full rounded-md border p-2"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Manual Sync</Label>
                  <Button
                    variant="outline"
                    onClick={handleFairingSync}
                    disabled={isSyncing}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  {settings.fairingLastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(settings.fairingLastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
