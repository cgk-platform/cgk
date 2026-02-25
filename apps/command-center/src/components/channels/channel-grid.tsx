'use client'

import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { Hash } from 'lucide-react'

interface Channel {
  id: string
  name: string
  connected: boolean
  requireMention: boolean
  lastMessage?: string
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

  const connected = channels.filter((c) => c.connected).length
  const total = channels.length

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {connected}/{total} channels connected
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.id} className="card-hover">
            <CardContent className="flex items-start gap-3 p-4">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{channel.name}</p>
                  <StatusBadge
                    status={channel.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{channel.id}</span>
                  {channel.requireMention && (
                    <span className="rounded bg-muted px-1 py-0.5">@mention</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
