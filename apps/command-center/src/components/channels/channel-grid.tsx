'use client'

import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { Hash } from 'lucide-react'

interface Channel {
  id: string
  label: string
  detailLabel?: string
  configured: boolean
  running: boolean
  connected: boolean
  botTokenSource?: string
  probe: {
    ok: boolean
    status: number
    elapsedMs: number
    botName?: string
    teamName?: string
  } | null
  lastError: string | null
}

interface ChannelGridProps {
  channels: Channel[]
}

export function ChannelGrid({ channels }: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No channels configured
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.id} className="card-hover">
            <CardContent className="flex items-start gap-3 p-4">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{channel.label}</p>
                  <StatusBadge
                    status={channel.connected ? 'connected' : channel.configured ? 'degraded' : 'disconnected'}
                  />
                </div>
                {channel.detailLabel && (
                  <p className="text-xs text-muted-foreground">{channel.detailLabel}</p>
                )}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {channel.probe && (
                    <div className="flex items-center gap-2">
                      <span>Bot: {channel.probe.botName || 'unknown'}</span>
                      {channel.probe.teamName && (
                        <span>({channel.probe.teamName})</span>
                      )}
                      <span className="font-mono">{channel.probe.elapsedMs}ms</span>
                    </div>
                  )}
                  {channel.lastError && (
                    <p className="truncate text-destructive" title={channel.lastError}>
                      {channel.lastError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {channel.botTokenSource && (
                      <span className="rounded bg-muted px-1 py-0.5">
                        token: {channel.botTokenSource}
                      </span>
                    )}
                    {channel.running && (
                      <span className="rounded bg-success/10 px-1 py-0.5 text-success">
                        socket active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
