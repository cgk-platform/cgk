'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { ConfigViewer } from '@/components/config/config-viewer'
import { RefreshButton } from '@/components/ui/refresh-button'

export default function ConfigPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/openclaw/${profile}/config`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to load config')
      } else {
        setData(json.config || json)
      }
    } catch {
      setError('Failed to fetch config')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Config — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            Gateway configuration (resolved, read-only)
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <ConfigViewer config={data} />
      ) : null}
    </div>
  )
}
