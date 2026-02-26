'use client'

import { useEffect, useRef, useState } from 'react'

interface UseSSEStreamOptions {
  onEvent: (type: string, data: Record<string, unknown>) => void
}

export function useSSEStream(url: string, { onEvent }: UseSSEStreamOptions) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function connect() {
      try {
        setError(null)
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok || !res.body) {
          setError(`Stream failed: ${res.status}`)
          return
        }
        setConnected(true)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (active) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            let eventType = 'message'
            let data = ''
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7)
              else if (line.startsWith('data: ')) data = line.slice(6)
            }
            if (data) {
              try {
                onEventRef.current(eventType, JSON.parse(data))
              } catch {
                // skip malformed data
              }
            }
          }
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Connection lost')
      } finally {
        setConnected(false)
      }

      // Reconnect after 3s
      if (active) {
        setTimeout(() => {
          if (active) connect()
        }, 3000)
      }
    }

    connect()
    return () => {
      active = false
      controller.abort()
    }
  }, [url])

  return { connected, error }
}
