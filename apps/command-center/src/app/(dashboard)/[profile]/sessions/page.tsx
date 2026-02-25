'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { SessionList } from '@/components/sessions/session-list'
import { SessionUsage } from '@/components/sessions/session-usage'

export default function SessionsPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [sessions, setSessions] = useState<unknown[]>([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/sessions`)
      const data = await res.json()
      setSessions(data.sessions || [])
      setUsage(data.usage || null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Sessions — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">Active and recent sessions</p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <>
          <SessionUsage usage={usage} />
          <SessionList sessions={sessions as Parameters<typeof SessionList>[0]['sessions']} />
        </>
      )}
    </div>
  )
}
