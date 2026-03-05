'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { Button } from '@cgk-platform/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'

import { ConversationThread } from '@/components/sessions/conversation-thread'
import { SessionDetail } from '@/components/sessions/session-detail'

interface SessionData {
  session: Record<string, unknown>
  usage: Record<string, unknown> | null
  source: string
}

interface Message {
  role: string
  content: string
  model?: string
  tokens?: number
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ profile: string; sessionId: string }>
}) {
  const { profile, sessionId } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/sessions/${sessionId}`)
      if (!res.ok) {
        const errData = await res.json()
        setError(errData.error || 'Failed to load session')
        return
      }
      const result = await res.json()
      setData(result)
    } catch {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [profile, sessionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Extract conversation messages if available
  const messages: Message[] = []
  if (data?.session) {
    const conversation = data.session.conversation as Array<Record<string, unknown>> | undefined
    const history = data.session.history as Array<Record<string, unknown>> | undefined
    const msgs = conversation || history
    if (msgs && Array.isArray(msgs)) {
      for (const msg of msgs) {
        messages.push({
          role: (msg.role as string) || 'unknown',
          content: typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content, null, 2),
          model: msg.model as string | undefined,
          tokens: msg.tokens as number | undefined,
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${profile}/sessions`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Session — {config?.label || profile}
          </h1>
          <p className="truncate font-mono text-xs text-muted-foreground">{sessionId}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <>
          <SessionDetail
            session={data.session}
            usage={data.usage}
            source={data.source}
          />
          <div>
            <h2 className="mb-3 text-lg font-semibold">Conversation</h2>
            <ConversationThread messages={messages} />
          </div>
        </>
      ) : null}
    </div>
  )
}
