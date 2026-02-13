'use client'

import { Button } from '@cgk-platform/ui'
import type { PlatformLogEntry } from '@cgk-platform/logging'
import { Pause, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { LogLine } from './log-line'

interface LogStreamProps {
  initialLogs?: PlatformLogEntry[]
  autoRefresh?: boolean
}

const MAX_LOGS = 500 // Maximum logs to keep in memory

export function LogStream({ initialLogs = [], autoRefresh = true }: LogStreamProps) {
  const [logs, setLogs] = useState<PlatformLogEntry[]>(initialLogs)
  const [paused, setPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Connect to SSE stream
  useEffect(() => {
    if (!autoRefresh || paused) {
      return
    }

    const eventSource = new EventSource('/api/platform/logs/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data) as PlatformLogEntry
        setLogs((prev) => {
          const newLogs = [log, ...prev]
          // Keep only the most recent logs
          return newLogs.slice(0, MAX_LOGS)
        })
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      // EventSource will auto-reconnect
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [autoRefresh, paused])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  // Detect manual scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop } = containerRef.current
      // If user scrolled down (past first row), disable auto-scroll
      setAutoScroll(scrollTop === 0)
    }
  }, [])

  const handlePauseToggle = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  const handleClear = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Stream controls */}
      <div className="flex items-center justify-between p-3 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connected ? 'Connected' : paused ? 'Paused' : 'Disconnected'}
            </span>
          </div>

          <span className="text-sm text-gray-500">{logs.length} logs</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePauseToggle}>
            {paused ? (
              <>
                <Play className="w-4 h-4 mr-1" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleClear}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Log list with virtual scrolling area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-900"
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            {connected ? 'Waiting for logs...' : 'No logs yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && logs.length > 0 && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAutoScroll(true)
              if (containerRef.current) {
                containerRef.current.scrollTop = 0
              }
            }}
          >
            Scroll paused. Click to resume auto-scroll.
          </Button>
        </div>
      )}
    </div>
  )
}
