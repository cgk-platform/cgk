'use client'

import { Spinner } from '@cgk-platform/ui'
import { useCallback, useEffect, useRef, useState } from 'react'


import { ConversationList } from '@/components/messages/ConversationList'
import { MessageBubble } from '@/components/messages/MessageBubble'
import { MessageComposer } from '@/components/messages/MessageComposer'
import { TypingIndicator } from '@/components/messages/TypingIndicator'

interface Conversation {
  id: string
  subject: string | null
  brandName: string | null
  coordinatorName: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface Message {
  id: string
  conversationId: string
  content: string
  senderType: 'creator' | 'admin'
  senderId: string | null
  senderName: string | null
  status: 'sent' | 'delivered' | 'read'
  readAt: string | null
  aiGenerated: boolean
  attachments: Array<{ url: string; name: string; type: string; size: number }>
  createdAt: string
}

const POLL_INTERVAL = 5000 // 5 seconds

export default function MessagesPage(): React.JSX.Element {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [coordinatorName, setCoordinatorName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastCheckedRef = useRef<string | null>(null)

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch('/api/creator/messages')
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load messages')
        }
        const data = await response.json()
        setConversations(data.conversations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true)
    try {
      const response = await fetch(`/api/creator/messages/${conversationId}`)
      if (!response.ok) throw new Error('Failed to load messages')
      const data = await response.json()
      setMessages(data.messages)
      setCoordinatorName(data.conversation.coordinatorName)
      lastCheckedRef.current = new Date().toISOString()
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
    } else {
      setMessages([])
    }
  }, [selectedId, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages
  useEffect(() => {
    if (!selectedId) return

    const pollMessages = async () => {
      try {
        const url = lastCheckedRef.current
          ? `/api/creator/messages/${selectedId}/poll?since=${encodeURIComponent(lastCheckedRef.current)}`
          : `/api/creator/messages/${selectedId}/poll`

        const response = await fetch(url)
        if (!response.ok) return

        const data = await response.json()

        if (data.hasNew && data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages])

          // Update conversations list to clear unread
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedId ? { ...c, unreadCount: 0 } : c
            )
          )
        }

        setIsTyping(data.isTyping)
        lastCheckedRef.current = data.lastCheckedAt
      } catch {
        // Ignore polling errors
      }
    }

    const interval = setInterval(pollMessages, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedId])

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!selectedId) return

    try {
      const response = await fetch(`/api/creator/messages/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      // Add message to list
      setMessages((prev) => [
        ...prev,
        {
          ...data.message,
          senderType: 'creator',
          status: 'sent',
          aiGenerated: false,
          attachments: [],
        },
      ])

      // Update conversation preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                lastMessagePreview: content.slice(0, 100),
                lastMessageAt: new Date().toISOString(),
              }
            : c
        )
      )
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>

      <div className="flex h-[calc(100%-4rem)] overflow-hidden rounded-lg border">
        {/* Conversation list */}
        <div className="w-80 shrink-0 border-r">
          <div className="border-b p-4">
            <h2 className="font-semibold">Conversations</h2>
          </div>
          <div className="h-[calc(100%-57px)] overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col">
          {selectedId ? (
            <>
              {/* Messages list */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        content={message.content}
                        senderType={message.senderType}
                        senderName={message.senderName}
                        aiGenerated={message.aiGenerated}
                        attachments={message.attachments}
                        createdAt={message.createdAt}
                        status={message.status}
                      />
                    ))}
                    {isTyping && <TypingIndicator name={coordinatorName || undefined} />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <MessageComposer onSend={handleSendMessage} />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
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
                className="mb-4 opacity-50"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
