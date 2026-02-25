'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@cgk-platform/ui'
import { use, useCallback, useEffect, useState } from 'react'

interface HealthData {
  connected: boolean
  health: {
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
  } | null
  error?: string
}

interface AgentData {
  defaultId: string
  scope: string
  agents: Array<{ id: string }>
}

export default function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [health, setHealth] = useState<HealthData | null>(null)
  const [agent, setAgent] = useState<AgentData | null>(null)

  const fetchData = useCallback(async () => {
    const [healthRes, agentRes] = await Promise.allSettled([
      fetch(`/api/openclaw/${profile}/health`).then((r) => r.json()),
      fetch(`/api/openclaw/${profile}/agents`).then((r) => r.json()),
    ])
    if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
    if (agentRes.status === 'fulfilled') setAgent(agentRes.value)
  }, [profile])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const h = health?.health

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{config?.label || profile}</h1>
        <p className="text-muted-foreground">Gateway profile overview</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health?.connected && h ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={h.ok ? 'healthy' : 'degraded'} showDot />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slack</span>
                  <div className="flex items-center gap-2">
                    {h.slackBotName && (
                      <span className="text-xs text-muted-foreground">
                        {h.slackBotName}
                        {h.slackTeamName ? ` (${h.slackTeamName})` : ''}
                      </span>
                    )}
                    <StatusBadge status={h.slackConnected ? 'connected' : 'disconnected'} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heartbeat</span>
                  <span className="font-mono text-xs">{Math.round(h.heartbeatSeconds / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-semibold">{h.sessionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Agent</span>
                  <span className="font-mono text-xs">{h.defaultAgentId}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {health?.error || 'Connecting...'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {agent?.agents ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default</span>
                  <span className="font-mono text-xs">{agent.defaultId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scope</span>
                  <span className="font-mono text-xs">{agent.scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Count</span>
                  <span className="font-semibold">{agent.agents.length}</span>
                </div>
                {h?.agents && h.agents.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Agent Details
                    </h4>
                    {h.agents.map((a) => (
                      <div key={a.agentId} className="flex items-center justify-between">
                        <span className="font-mono text-xs">{a.agentId}</span>
                        <div className="flex items-center gap-2">
                          {a.heartbeatEvery && (
                            <span className="text-xs text-muted-foreground">
                              HB: {a.heartbeatEvery}
                            </span>
                          )}
                          <StatusBadge status={a.isDefault ? 'active' : 'ready'} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
