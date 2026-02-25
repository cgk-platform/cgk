'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@cgk-platform/ui'
import { use, useCallback, useEffect, useState } from 'react'

interface HealthData {
  connected: boolean
  health: {
    status: string
    uptime: number
    version: string
    agentCount: number
    slackConnected: boolean
    activeSessionCount: number
    cronJobCount: number
    skillCount: number
    memoryUsage?: { rss: number; heapUsed: number; heapTotal: number }
  } | null
  error?: string
}

interface AgentData {
  identity: {
    name: string
    model: string
    workspace: string
  } | null
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
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
            {health?.connected && health.health ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={health.health.status} showDot />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono text-xs">{health.health.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span>{formatUptime(health.health.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slack</span>
                  <StatusBadge status={health.health.slackConnected ? 'connected' : 'disconnected'} />
                </div>
                {health.health.memoryUsage && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RSS</span>
                      <span className="font-mono text-xs">
                        {formatBytes(health.health.memoryUsage.rss)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Heap</span>
                      <span className="font-mono text-xs">
                        {formatBytes(health.health.memoryUsage.heapUsed)} / {formatBytes(health.health.memoryUsage.heapTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {health?.error || 'Connecting...'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Agent Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {agent?.identity ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{agent.identity.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs">{agent.identity.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="max-w-48 truncate font-mono text-xs">
                    {agent.identity.workspace}
                  </span>
                </div>
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
