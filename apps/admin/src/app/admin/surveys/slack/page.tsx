'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  SlackConfigForm,
  SlackConfigSkeleton,
} from '@/components/surveys'
import type { SurveySlackConfig, UpdateSlackConfigInput } from '@/lib/surveys'

export default function SurveySlackSettingsPage() {
  const [config, setConfig] = useState<SurveySlackConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/surveys/slack')
      const data = await response.json()
      setConfig(data.config)
    } catch (error) {
      console.error('Failed to fetch Slack config:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async (input: UpdateSlackConfigInput) => {
    const response = await fetch('/api/admin/surveys/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (response.ok) {
      const data = await response.json()
      setConfig(data.config)
    } else {
      throw new Error('Failed to save Slack config')
    }
  }

  const handleDelete = async () => {
    const response = await fetch('/api/admin/surveys/slack', {
      method: 'DELETE',
    })

    if (response.ok) {
      setConfig(null)
      fetchConfig() // Refresh to get empty state
    } else {
      throw new Error('Failed to delete Slack config')
    }
  }

  const handleTest = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/surveys/slack/test', {
        method: 'POST',
      })
      return response.ok
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slack Integration</h1>
        <p className="text-muted-foreground">
          Configure Slack notifications for survey responses
        </p>
      </div>

      {loading ? (
        <SlackConfigSkeleton />
      ) : (
        <SlackConfigForm
          config={config}
          onSave={handleSave}
          onDelete={config ? handleDelete : undefined}
          onTest={handleTest}
        />
      )}
    </div>
  )
}
