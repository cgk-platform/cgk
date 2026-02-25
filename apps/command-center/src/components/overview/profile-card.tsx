'use client'

import { Card, CardContent, CardHeader, CardTitle, cn, StatusBadge } from '@cgk-platform/ui'
import { Clock, Radio, Terminal, Puzzle } from 'lucide-react'
import Link from 'next/link'

interface ProfileCardProps {
  slug: string
  label: string
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
  } | null
  error?: string
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
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
            status={connected ? (health?.status || 'connected') : 'disconnected'}
            showDot
          />
        </CardHeader>
        <CardContent>
          {connected && health ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-xs">{health.version}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uptime</span>
                <span>{formatUptime(health.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slack</span>
                <StatusBadge
                  status={health.slackConnected ? 'connected' : 'disconnected'}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                <div className="flex flex-col items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{health.activeSessionCount}</span>
                  <span className="text-2xs text-muted-foreground">Sessions</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{health.cronJobCount}</span>
                  <span className="text-2xs text-muted-foreground">Cron</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{health.skillCount}</span>
                  <span className="text-2xs text-muted-foreground">Skills</span>
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
