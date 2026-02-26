'use client'

import { Card, CardContent, CardHeader, CardTitle, cn, StatusBadge } from '@cgk-platform/ui'
import { Bot, Heart, Users, Zap } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useSSEStream } from '@/hooks/use-sse-stream'

interface FeedEvent {
  id: string
  type: string
  profile: string
  summary: string
  timestamp: number
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tick: Heart,
  agent: Bot,
  presence: Users,
}

const PROFILE_COLORS: Record<string, string> = {
  cgk: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  rawdog: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  vitahustle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

function summarizeEvent(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'tick':
      return `Heartbeat${data.agentId ? ` (${data.agentId})` : ''}`
    case 'agent': {
      const action = (data.action as string) || (data.event as string) || 'activity'
      const agent = (data.agentId as string) || ''
      return agent ? `${agent}: ${action}` : action
    }
    case 'presence': {
      const status = (data.status as string) || 'update'
      return `Presence: ${status}`
    }
    case 'connected':
      return 'Stream connected'
    default:
      return type
  }
}

const MAX_EVENTS = 100

type FilterSet = Set<string>

export function ActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [profileFilters, setProfileFilters] = useState<FilterSet>(
    () => new Set(['cgk', 'rawdog', 'vitahustle'])
  )
  const [typeFilters, setTypeFilters] = useState<FilterSet>(
    () => new Set(['tick', 'agent', 'presence'])
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)
  const eventCounter = useRef(0)

  const onEvent = useCallback((type: string, data: Record<string, unknown>) => {
    if (type === 'heartbeat') return

    const profile = (data.profile as string) || 'system'
    const event: FeedEvent = {
      id: `${Date.now()}-${eventCounter.current++}`,
      type,
      profile,
      summary: summarizeEvent(type, data),
      timestamp: Date.now(),
    }

    setEvents((prev) => {
      const next = [event, ...prev]
      return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
    })

    if (!isPausedRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [])

  const { connected, error } = useSSEStream('/api/openclaw/stream', { onEvent })

  const toggleFilter = (_current: FilterSet, setFn: React.Dispatch<React.SetStateAction<FilterSet>>, key: string) => {
    setFn((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visibleEvents = events.filter(
    (e) => profileFilters.has(e.profile) && typeFilters.has(e.type)
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">Live Activity</CardTitle>
            <StatusBadge
              status={connected ? 'connected' : error ? 'failed' : 'pending'}
              label={connected ? 'live' : error ? 'error' : 'connecting'}
            />
          </div>
          <div className="flex gap-1">
            {['cgk', 'rawdog', 'vitahustle'].map((p) => (
              <button
                key={p}
                onClick={() => toggleFilter(profileFilters, setProfileFilters, p)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase transition-colors',
                  profileFilters.has(p)
                    ? PROFILE_COLORS[p]
                    : 'border-transparent text-muted-foreground/40'
                )}
              >
                {p}
              </button>
            ))}
            <div className="mx-1 w-px bg-border" />
            {['tick', 'agent', 'presence'].map((t) => {
              const Icon = EVENT_ICONS[t]!
              return (
                <button
                  key={t}
                  onClick={() => toggleFilter(typeFilters, setTypeFilters, t)}
                  className={cn(
                    'rounded-md p-1 transition-colors',
                    typeFilters.has(t)
                      ? 'text-foreground'
                      : 'text-muted-foreground/30'
                  )}
                  title={t}
                >
                  <Icon className="h-3 w-3" />
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="max-h-48 overflow-y-auto"
          onMouseEnter={() => { isPausedRef.current = true }}
          onMouseLeave={() => { isPausedRef.current = false }}
        >
          {visibleEvents.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {events.length === 0 ? 'Waiting for events...' : 'No events match filters'}
            </p>
          ) : (
            <div className="divide-y">
              {visibleEvents.slice(0, 50).map((event) => {
                const Icon = EVENT_ICONS[event.type] || Zap
                return (
                  <div key={event.id} className="flex items-center gap-2 px-4 py-1.5 text-xs">
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded border px-1 py-0.5 text-[10px] font-medium uppercase',
                        PROFILE_COLORS[event.profile] || 'text-muted-foreground'
                      )}
                    >
                      {event.profile}
                    </span>
                    <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{event.summary}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
