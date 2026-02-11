'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Mail,
  MessageSquare,
  MoreVertical,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'

import { Button } from '@cgk/ui'
import { cn } from '@cgk/ui'

interface Message {
  id: string
  direction: string
  channel: string
  body: string
  senderType: string
  senderId: string | null
  aiDrafted: boolean
  createdAt: string
}

interface Thread {
  id: string
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
    contactType: string
  }
  subject: string | null
  status: string
  priority: string
  assignedTo: { id: string; name: string } | null
  snoozedUntil: string | null
  createdAt: string
}

interface ThreadDetailProps {
  threadId: string
}

export function ThreadDetail({ threadId }: ThreadDetailProps) {
  const router = useRouter()
  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const fetchThread = useCallback(async () => {
    try {
      const [threadRes, messagesRes] = await Promise.all([
        fetch(`/api/admin/inbox/threads/${threadId}`),
        fetch(`/api/admin/inbox/threads/${threadId}/messages`),
      ])

      const threadData = await threadRes.json()
      const messagesData = await messagesRes.json()

      setThread(threadData.thread)
      setMessages(messagesData.messages || [])
    } catch (error) {
      console.error('Failed to fetch thread:', error)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    fetchThread()
  }, [fetchThread])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      await fetch(`/api/admin/inbox/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          body: newMessage,
        }),
      })
      setNewMessage('')
      fetchThread()
    } catch (error) {
      console.error('Failed to send:', error)
    } finally {
      setSending(false)
    }
  }

  const handleAction = async (action: 'close' | 'snooze' | 'assign') => {
    if (action === 'close') {
      await fetch(`/api/admin/inbox/threads/${threadId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      router.push('/admin/inbox')
    } else if (action === 'snooze') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)

      await fetch(`/api/admin/inbox/threads/${threadId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until: tomorrow.toISOString() }),
      })
      router.push('/admin/inbox')
    }
    setShowActions(false)
  }

  const generateAIDraft = async () => {
    try {
      const res = await fetch('/api/admin/inbox/copilot/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      })
      const data = await res.json()
      if (data.draft?.body) {
        setNewMessage(data.draft.body)
      }
    } catch (error) {
      console.error('Failed to generate draft:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Thread not found</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">{thread.contact.name}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {thread.contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {thread.contact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showActions && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-card py-1 shadow-lg">
                <button
                  onClick={() => handleAction('snooze')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <Clock className="h-4 w-4" />
                  Snooze
                </button>
                <button
                  onClick={() => handleAction('close')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  Close Thread
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject */}
      {thread.subject && (
        <div className="border-b px-4 py-2">
          <div className="text-sm font-medium">{thread.subject}</div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOutbound = message.direction === 'outbound'

          return (
            <div
              key={message.id}
              className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-4 py-2',
                  isOutbound
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                  message.aiDrafted && isOutbound && 'ring-1 ring-purple-500'
                )}
              >
                {message.aiDrafted && (
                  <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                    <Sparkles className="h-3 w-3" />
                    AI Draft
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{message.body}</div>
                <div
                  className={cn(
                    'mt-1 text-xs',
                    isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}
                >
                  {new Date(message.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              rows={3}
              className={cn(
                'block w-full resize-none rounded-md border bg-background px-3 py-2 text-sm',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleSend()
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={generateAIDraft}
              title="Generate AI draft"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Press <kbd className="rounded border px-1">Cmd</kbd> +{' '}
          <kbd className="rounded border px-1">Enter</kbd> to send
        </div>
      </div>
    </div>
  )
}
