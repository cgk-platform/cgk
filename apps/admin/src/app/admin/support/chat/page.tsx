'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'

import { ChatQueue } from './components/chat-queue'

import type { ChatSession } from '@cgk/support'

interface ActiveSession extends ChatSession {
  unreadCount?: number
}

export default function ChatManagementPage() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActiveSessions() {
      try {
        const response = await fetch('/api/admin/support/chat?activeOnly=true')
        if (response.ok) {
          const data = await response.json()
          setActiveSessions(data.sessions)
        }
      } catch (error) {
        console.error('Failed to fetch active sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 15000)
    return () => clearInterval(interval)
  }, [])

  const formatDuration = (startedAt: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live Chat</h1>
          <p className="text-sm text-zinc-500">
            Manage customer chat sessions and queue
          </p>
        </div>
        <Link href="/admin/support/chat/config">
          <Button variant="outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Widget Settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Queue */}
        <div className="lg:col-span-1">
          <ChatQueue tenantId="" />
        </div>

        {/* Active Sessions */}
        <div className="lg:col-span-1">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="border-b border-zinc-800 pb-3">
              <CardTitle className="flex items-center gap-3 text-base font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                Active Conversations
                {activeSessions.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {activeSessions.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <span className="text-sm text-zinc-500">Loading...</span>
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <p className="text-sm text-zinc-500">No active conversations</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {activeSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/admin/support/chat/${session.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50"
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                        {(session.visitorName || 'A').charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-200">
                            {session.visitorName || 'Anonymous'}
                          </span>
                          {session.assignedAgent && (
                            <Badge
                              variant="outline"
                              className="border-emerald-700 text-xs text-emerald-400"
                            >
                              {session.assignedAgent.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">
                          Active for {formatDuration(session.startedAt)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-zinc-600"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
