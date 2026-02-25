'use client'

import { cn } from '@cgk-platform/ui'
import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
  data?: Record<string, unknown>
}

interface LogViewerProps {
  profile: string
}

const LEVEL_COLORS: Record<string, string> = {
  trace: 'text-gray-500',
  debug: 'text-gray-400',
  info: 'text-info',
  warn: 'text-warning',
  error: 'text-destructive',
  fatal: 'text-destructive font-bold',
}

const LEVEL_OPTIONS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

export function LogViewer({ profile }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [minLevel, setMinLevel] = useState<string>('info')
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  useEffect(() => {
    const eventSource = new EventSource(`/api/openclaw/${profile}/logs/stream`)

    eventSource.addEventListener('connected', () => setConnected(true))

    eventSource.addEventListener('log', (event) => {
      const entry = JSON.parse(event.data) as LogEntry
      setLogs((prev) => [...prev.slice(-500), entry])
    })

    eventSource.addEventListener('error', () => setConnected(false))

    return () => eventSource.close()
  }, [profile])

  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  const levelPriority: Record<string, number> = {
    trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5,
  }
  const minPriority = levelPriority[minLevel] ?? 0

  const filteredLogs = logs.filter((log) => {
    if ((levelPriority[log.level] ?? 0) < minPriority) return false
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', connected ? 'bg-success' : 'bg-destructive')} />
          <span className="text-xs text-muted-foreground">
            {connected ? 'Streaming' : 'Disconnected'}
          </span>
        </div>

        <select
          value={minLevel}
          onChange={(e) => setMinLevel(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>{level.toUpperCase()}</option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs..."
          className="flex-1 rounded-md border bg-background px-3 py-1 text-xs"
        />

        <button
          onClick={() => setLogs([])}
          className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[600px] overflow-y-auto rounded-lg border bg-gray-50 p-3 font-mono text-xs dark:bg-navy-100"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {connected ? 'Waiting for logs...' : 'Connecting...'}
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className="flex gap-2 py-0.5 hover:bg-accent/30">
              <span className="shrink-0 text-muted-foreground">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className={cn('w-12 shrink-0 uppercase', LEVEL_COLORS[log.level])}>
                {log.level}
              </span>
              {log.source && (
                <span className="shrink-0 text-muted-foreground">[{log.source}]</span>
              )}
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
