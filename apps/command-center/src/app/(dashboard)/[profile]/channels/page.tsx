'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { ChannelGrid } from '@/components/channels/channel-grid'

interface Channel {
  id: string
  label: string
  detailLabel?: string
  configured: boolean
  running: boolean
  connected: boolean
  botTokenSource?: string
  appTokenSource?: string
  probe: {
    ok: boolean
    status: number
    elapsedMs: number
    botName?: string
    teamName?: string
  } | null
  lastError: string | null
}

export default function ChannelsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/channels`)
      const data = await res.json()
      setChannels(data.channels || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Channels — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">Communication channel status</p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <ChannelGrid channels={channels} />
      )}
    </div>
  )
}
