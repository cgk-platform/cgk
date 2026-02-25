'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { useCallback, useEffect, useState } from 'react'

import { ConnectionBar } from '@/components/overview/connection-bar'
import { ProfileCard } from '@/components/overview/profile-card'

interface NormalizedHealth {
  ok: boolean
  ts: number
  slackConnected: boolean
  slackConfigured: boolean
  slackBotName?: string
  slackTeamName?: string
  heartbeatSeconds: number
  defaultAgentId: string
  agentCount: number
  agents: Array<{
    agentId: string
    isDefault: boolean
    heartbeatEnabled: boolean
    heartbeatEvery?: string
  }>
  sessionCount: number
}

interface ProfileHealth {
  connected: boolean
  health: NormalizedHealth | null
  error?: string
}

export default function OverviewPage() {
  const [profiles, setProfiles] = useState<Record<string, ProfileHealth>>({})
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/health')
      const data = await res.json()
      setProfiles(data.profiles || {})
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 15_000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">openCLAW Command Center</h1>
        <p className="text-muted-foreground">
          Unified dashboard for all gateway profiles
        </p>
      </div>

      {!loading && Object.keys(profiles).length > 0 && (
        <ConnectionBar profiles={profiles} />
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-lg border bg-card"
              />
            ))}
          </>
        ) : (
          Object.entries(PROFILES).map(([slug, config]) => (
            <ProfileCard
              key={slug}
              slug={slug}
              label={config.label}
              connected={profiles[slug]?.connected ?? false}
              health={profiles[slug]?.health ?? null}
              error={profiles[slug]?.error}
            />
          ))
        )}
      </div>
    </div>
  )
}
