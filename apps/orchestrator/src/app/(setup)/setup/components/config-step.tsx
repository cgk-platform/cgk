'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import { Settings, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Platform Configuration Step
 *
 * Sets platform-wide configuration like name and default settings.
 */
export function ConfigStep({ onComplete, onBack }: StepProps) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    platformName: 'CGK Platform',
    supportEmail: '',
    defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  })

  const saveConfig = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(data.error || 'Failed to save configuration')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
          <Settings className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Platform Configuration</h2>
          <p className="text-zinc-400 text-sm">Set up basic platform settings and preferences</p>
        </div>
      </div>

      {/* Form */}
      {status !== 'success' ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
          {/* Platform Name */}
          <div className="space-y-2">
            <Label
              htmlFor="platformName"
              className="text-zinc-400 text-xs uppercase tracking-wider"
            >
              Platform Name
            </Label>
            <Input
              id="platformName"
              type="text"
              placeholder="My Platform"
              value={formData.platformName}
              onChange={(e) => setFormData((prev) => ({ ...prev, platformName: e.target.value }))}
              className="bg-zinc-900 border-zinc-700"
            />
            <p className="text-xs text-zinc-600">
              Displayed in the dashboard header and emails
            </p>
          </div>

          {/* Support Email */}
          <div className="space-y-2">
            <Label
              htmlFor="supportEmail"
              className="text-zinc-400 text-xs uppercase tracking-wider"
            >
              Support Email <span className="text-zinc-600">(Optional)</span>
            </Label>
            <Input
              id="supportEmail"
              type="email"
              placeholder="support@example.com"
              value={formData.supportEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, supportEmail: e.target.value }))}
              className="bg-zinc-900 border-zinc-700"
            />
            <p className="text-xs text-zinc-600">
              Contact email for platform support requests
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-zinc-400 text-xs uppercase tracking-wider">
              Default Timezone
            </Label>
            <Input
              id="timezone"
              type="text"
              value={formData.defaultTimezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, defaultTimezone: e.target.value }))
              }
              className="bg-zinc-900 border-zinc-700"
            />
            <p className="text-xs text-zinc-600">
              Used for scheduling and reporting defaults
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Save Failed</p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Success State */
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Configuration Saved</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Platform settings have been configured
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          These settings can be changed later in the Settings page. This step also marks the
          platform setup as complete.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onBack} className="text-zinc-400">
          Back
        </Button>

        <div className="flex items-center gap-3">
          {status !== 'success' ? (
            <Button
              onClick={saveConfig}
              disabled={saving || !formData.platformName.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          ) : (
            <Button onClick={onComplete} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
