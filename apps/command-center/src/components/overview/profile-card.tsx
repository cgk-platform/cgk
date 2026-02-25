'use client'

import { Card, CardContent, CardHeader, CardTitle, cn, StatusBadge } from '@cgk-platform/ui'
import { Radio, Terminal, Users } from 'lucide-react'
import Link from 'next/link'

interface ProfileCardProps {
  slug: string
  label: string
  connected: boolean
  health: {
    ok: boolean
    slackConnected: boolean
    slackBotName?: string
    heartbeatSeconds: number
    defaultAgentId: string
    agentCount: number
    sessionCount: number
  } | null
  error?: string
}

export function ProfileCard({ slug, label, connected, health, error }: ProfileCardProps) {
  return (
    <Link href={`/${slug}`}>
      <Card className={cn(
        'card-hover cursor-pointer',
        connected && 'hover:border-gold/30',
        !connected && 'opacity-60'
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">{label}</CardTitle>
          <StatusBadge
            status={connected ? 'connected' : 'disconnected'}
            showDot
          />
        </CardHeader>
        <CardContent>
          {connected && health ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gateway</span>
                <StatusBadge status={health.ok ? 'healthy' : 'degraded'} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slack</span>
                <div className="flex items-center gap-1.5">
                  {health.slackBotName && (
                    <span className="text-xs text-muted-foreground">{health.slackBotName}</span>
                  )}
                  <StatusBadge
                    status={health.slackConnected ? 'connected' : 'disconnected'}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Heartbeat</span>
                <span className="font-mono text-xs">
                  {Math.round(health.heartbeatSeconds / 60)}m
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                <div className="flex flex-col items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{health.sessionCount}</span>
                  <span className="text-2xs text-muted-foreground">Sessions</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{health.agentCount}</span>
                  <span className="text-2xs text-muted-foreground">Agents</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="h-4 w-4" />
              <span>{error || 'Gateway unreachable'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
