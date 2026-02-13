'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'

import type { ChatSession } from '@cgk-platform/support'

interface ChatQueueProps {
  tenantId: string
}

interface QueueStats {
  waitingCount: number
  activeCount: number
  avgWaitTimeSeconds: number | null
}

export function ChatQueue({ tenantId: _tenantId }: ChatQueueProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/support/chat/queue')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
        setStats(data.stats)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    // Poll every 10 seconds
    const interval = setInterval(fetchQueue, 10000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  const handleClaim = async (sessionId: string) => {
    setClaiming(sessionId)
    try {
      const response = await fetch(`/api/admin/support/chat/${sessionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'current-user' }), // TODO: Get actual agent ID
      })

      if (response.ok) {
        // Remove from queue and refresh
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        fetchQueue()
      }
    } catch (error) {
      console.error('Failed to claim session:', error)
    } finally {
      setClaiming(null)
    }
  }

  const formatWaitTime = (seconds: number | null): string => {
    if (seconds === null) return '--'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const getWaitTimeClass = (createdAt: Date): string => {
    const waitSeconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    if (waitSeconds > 300) return 'text-red-500' // > 5 min
    if (waitSeconds > 120) return 'text-amber-500' // > 2 min
    return 'text-emerald-500'
  }

  const getWaitSeconds = (createdAt: Date): number => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  }

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm text-zinc-400">Loading queue...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Waiting
              </span>
              <span className="font-mono text-2xl font-bold text-amber-400">
                {stats?.waitingCount ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Active
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-400">
                {stats?.activeCount ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Avg Wait
              </span>
              <span className="font-mono text-2xl font-bold text-zinc-300">
                {formatWaitTime(stats?.avgWaitTimeSeconds ?? null)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Header */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="border-b border-zinc-800 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-base font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Chat Queue
            </CardTitle>
            <span className="text-xs text-zinc-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <div className="mb-2 text-4xl opacity-20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-500">No visitors waiting</p>
              <p className="text-xs text-zinc-600">New chats will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {sessions.map((session, index) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50"
                >
                  {/* Queue Position */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-mono text-sm font-bold text-zinc-400">
                    {session.queuePosition ?? index + 1}
                  </div>

                  {/* Visitor Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-zinc-200">
                        {session.visitorName || 'Anonymous Visitor'}
                      </span>
                      {session.visitorEmail && (
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-xs text-zinc-400"
                        >
                          {session.visitorEmail}
                        </Badge>
                      )}
                    </div>
                    {session.pageUrl && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {new URL(session.pageUrl).pathname}
                      </p>
                    )}
                  </div>

                  {/* Wait Time */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`font-mono text-sm font-bold ${getWaitTimeClass(session.createdAt)}`}
                    >
                      {formatWaitTime(getWaitSeconds(session.createdAt))}
                    </div>
                    <div className="text-xs text-zinc-600">waiting</div>
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    onClick={() => handleClaim(session.id)}
                    disabled={claiming === session.id}
                    className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {claiming === session.id ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Claiming...
                      </span>
                    ) : (
                      'Claim Chat'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
