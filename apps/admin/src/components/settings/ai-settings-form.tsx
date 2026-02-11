'use client'

import { Card, CardContent, Spinner } from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import {
  ErrorAlert,
  NumberField,
  SaveButton,
  SelectField,
  SettingsSection,
  ToggleField,
  UnsavedChangesBanner,
  UsageBar,
} from './form-elements'

import type { AISettings, AISettingsUpdate } from '@/lib/settings/types'

interface AISettingsFormProps {
  initialSettings?: AISettings | null
}

interface UsageData {
  currentMonthUsageUsd: number
  monthlyBudgetUsd: number | null
  percentUsed: number | null
}

const MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'claude', label: 'Claude' },
  { value: 'gpt4', label: 'GPT-4' },
]

const RETENTION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days (Default)' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
]

export function AISettingsForm({ initialSettings }: AISettingsFormProps) {
  const [settings, setSettings] = useState<AISettings | null>(initialSettings ?? null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [originalSettings, setOriginalSettings] = useState<AISettings | null>(
    initialSettings ?? null
  )
  const [isLoading, setIsLoading] = useState(!initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const [settingsRes, usageRes] = await Promise.all([
        fetch('/api/admin/settings/ai'),
        fetch('/api/admin/settings/ai/usage'),
      ])

      if (!settingsRes.ok) throw new Error('Failed to load AI settings')
      if (!usageRes.ok) throw new Error('Failed to load usage data')

      const settingsData = await settingsRes.json()
      const usageData = await usageRes.json()

      setSettings(settingsData.settings)
      setOriginalSettings(settingsData.settings)
      setUsage(usageData.usage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialSettings) {
      fetchSettings()
    } else {
      fetch('/api/admin/settings/ai/usage')
        .then((res) => res.json())
        .then((data) => setUsage(data.usage))
        .catch(() => {})
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
      const updates: AISettingsUpdate = {
        aiEnabled: settings.aiEnabled,
        briiEnabled: settings.briiEnabled,
        aiContentEnabled: settings.aiContentEnabled,
        aiInsightsEnabled: settings.aiInsightsEnabled,
        aiModelPreference: settings.aiModelPreference,
        aiMonthlyBudgetUsd: settings.aiMonthlyBudgetUsd,
        aiContentAutoApprove: settings.aiContentAutoApprove,
        aiMemoryEnabled: settings.aiMemoryEnabled,
        aiMemoryRetentionDays: settings.aiMemoryRetentionDays,
      }

      const res = await fetch('/api/admin/settings/ai', {
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

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setIsSaved(false)
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
          <ErrorAlert message="Failed to load AI settings" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesBanner show={isDirty} />

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <SettingsSection
        title="AI Features"
        description="Enable or disable AI capabilities for your store."
      >
        <ToggleField
          label="Enable AI"
          description="Master toggle for all AI features. Disabling this will turn off all AI functionality."
          checked={settings.aiEnabled}
          onChange={(checked) => updateSetting('aiEnabled', checked)}
        />

        <ToggleField
          label="BRII AI Assistant"
          description="Enable the BRII conversational AI assistant for your team."
          checked={settings.briiEnabled}
          onChange={(checked) => updateSetting('briiEnabled', checked)}
          disabled={!settings.aiEnabled}
        />

        <ToggleField
          label="AI Content Generation"
          description="Allow AI to generate product descriptions, blog posts, and marketing copy."
          checked={settings.aiContentEnabled}
          onChange={(checked) => updateSetting('aiContentEnabled', checked)}
          disabled={!settings.aiEnabled}
        />

        <ToggleField
          label="AI-Powered Insights"
          description="Enable AI-generated analytics insights and recommendations."
          checked={settings.aiInsightsEnabled}
          onChange={(checked) => updateSetting('aiInsightsEnabled', checked)}
          disabled={!settings.aiEnabled}
        />
      </SettingsSection>

      <SettingsSection
        title="Model Preferences"
        description="Configure which AI model to use for different tasks."
      >
        <SelectField
          label="Preferred Model"
          description="Select the AI model to use. 'Auto' will choose the best model for each task."
          value={settings.aiModelPreference}
          onChange={(value) =>
            updateSetting('aiModelPreference', value as AISettings['aiModelPreference'])
          }
          options={MODEL_OPTIONS}
          disabled={!settings.aiEnabled}
        />
      </SettingsSection>

      <SettingsSection
        title="Usage Limits"
        description="Set spending limits for AI usage."
      >
        {usage && (
          <UsageBar
            label="Current Month Usage"
            current={usage.currentMonthUsageUsd}
            limit={usage.monthlyBudgetUsd}
            unit="$"
          />
        )}

        <NumberField
          label="Monthly Budget"
          description="Maximum monthly spend on AI services. Leave empty for unlimited."
          value={settings.aiMonthlyBudgetUsd}
          onChange={(value) => updateSetting('aiMonthlyBudgetUsd', value)}
          min={0}
          step={10}
          prefix="$"
          placeholder="Unlimited"
          allowNull
          disabled={!settings.aiEnabled}
        />
      </SettingsSection>

      <SettingsSection
        title="Content Settings"
        description="Configure how AI-generated content is handled."
      >
        <ToggleField
          label="Auto-Approve AI Content"
          description="Automatically publish AI-generated content without manual review."
          checked={settings.aiContentAutoApprove}
          onChange={(checked) => updateSetting('aiContentAutoApprove', checked)}
          disabled={!settings.aiEnabled || !settings.aiContentEnabled}
          warning="This will publish AI content without human review. Use with caution."
        />
      </SettingsSection>

      <SettingsSection
        title="Memory Settings"
        description="Configure how AI remembers context from previous interactions."
      >
        <ToggleField
          label="Enable AI Memory"
          description="Allow AI to remember context from previous conversations for more personalized responses."
          checked={settings.aiMemoryEnabled}
          onChange={(checked) => updateSetting('aiMemoryEnabled', checked)}
          disabled={!settings.aiEnabled}
        />

        <SelectField
          label="Memory Retention"
          description="How long the AI should remember conversation context."
          value={String(settings.aiMemoryRetentionDays)}
          onChange={(value) => updateSetting('aiMemoryRetentionDays', parseInt(value, 10))}
          options={RETENTION_OPTIONS}
          disabled={!settings.aiEnabled || !settings.aiMemoryEnabled}
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
