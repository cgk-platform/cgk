'use client'

import { Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Send, Plus, MessageSquare, Lock, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'

import type { CreatorConversation, CreatorMessage } from '@/lib/creators/types'
import { formatDateTime } from '@/lib/format'

interface CreatorInboxClientProps {
  creatorId: string
  creatorName: string
  conversations: CreatorConversation[]
  activeConversationId?: string
  initialMessages: CreatorMessage[]
}

export function CreatorInboxClient({
  creatorId,
  creatorName,
  conversations,
  activeConversationId,
  initialMessages,
}: CreatorInboxClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<CreatorMessage[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return

    if (!activeConversationId) {
      // Create new conversation
      setIsSending(true)
      try {
        const res = await fetch(`/api/admin/creators/${creatorId}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: newSubject || null,
            content: newMessage.trim(),
            isInternal,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setNewMessage('')
          setNewSubject('')
          setShowNewConversation(false)
          router.push(`/admin/creators/${creatorId}/inbox?conversation=${data.conversation.id}`)
          router.refresh()
        }
      } finally {
        setIsSending(false)
      }
      return
    }

    // Send message to existing conversation
    setIsSending(true)
    try {
      const res = await fetch(
        `/api/admin/creators/${creatorId}/conversations/${activeConversationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newMessage.trim(),
            isInternal,
          }),
        },
      )

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
        setIsInternal(false)
      }
    } finally {
      setIsSending(false)
    }
  }, [newMessage, newSubject, isInternal, activeConversationId, creatorId, router])

  const selectConversation = useCallback(
    (conversationId: string) => {
      router.push(`/admin/creators/${creatorId}/inbox?conversation=${conversationId}`)
    },
    [creatorId, router],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowNewConversation(true)
              router.push(`/admin/creators/${creatorId}/inbox`)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No conversations yet</p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowNewConversation(true)}
              >
                Start Conversation
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId
              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                    isActive ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {conversation.subject || 'No subject'}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {conversation.last_message_preview || 'No messages'}
                      </div>
                    </div>
                    {conversation.unread_admin > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {conversation.unread_admin}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(conversation.last_message_at)}
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="lg:col-span-2">
        <CardContent className="flex h-[600px] flex-col p-0">
          {showNewConversation || !activeConversationId ? (
            <div className="flex flex-1 flex-col">
              <div className="border-b p-4">
                <h3 className="font-semibold">New Conversation</h3>
                <p className="text-sm text-muted-foreground">Start a new thread with {creatorName}</p>
              </div>
              <div className="flex-1 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject (optional)</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Enter subject..."
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t p-4">
                <div className="flex items-start gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Internal note (hidden from creator)
                  </label>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b p-4">
                <h3 className="font-semibold">
                  {activeConversation?.subject || 'Conversation'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Started {formatDateTime(activeConversation?.created_at || '')}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAdmin = message.sender_type === 'admin'
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            message.is_internal
                              ? 'border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                              : isAdmin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                          }`}
                        >
                          {message.is_internal && (
                            <div className="mb-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <Lock className="h-3 w-3" />
                              Internal note
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                          <div
                            className={`mt-1 flex items-center gap-2 text-xs ${
                              message.is_internal
                                ? 'text-amber-600 dark:text-amber-400'
                                : isAdmin
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            <span>{message.sender_name}</span>
                            <span>-</span>
                            <span>{formatDateTime(message.created_at)}</span>
                            {message.scheduled_for && !message.sent_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t p-4">
                <div className="flex items-start gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Internal note
                  </label>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
