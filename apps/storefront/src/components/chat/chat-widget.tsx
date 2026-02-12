/**
 * Embeddable Chat Widget Component
 * Phase 2SP-CHANNELS: Live chat for tenant storefronts
 *
 * Usage:
 * Import and add <ChatWidget tenantId="your-tenant-id" /> to your layout
 *
 * @ai-pattern tenant-isolation
 * @ai-note Uses tenant-scoped API endpoints
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ============================================
// TYPES
// ============================================

interface ChatWidgetConfig {
  primaryColor: string
  secondaryColor: string
  headerText: string
  greetingMessage: string
  position: 'bottom-right' | 'bottom-left'
  offsetX: number
  offsetY: number
  autoOpenDelaySeconds: number | null
  showAgentTyping: boolean
  showReadReceipts: boolean
  offlineMessage: string
  fileUploadEnabled: boolean
  maxFileSizeMb: number
  allowedFileTypes: string[]
}

interface ChatMessage {
  id: string
  sessionId: string
  senderId: string
  senderType: 'visitor' | 'agent' | 'bot'
  content: string
  attachments: string[]
  isRead: boolean
  createdAt: string
}

interface ChatSession {
  id: string
  visitorId: string
  visitorName: string | null
  visitorEmail: string | null
  status: 'waiting' | 'active' | 'ended' | 'transferred'
  queuePosition: number | null
  startedAt: string
}

interface ChatWidgetProps {
  tenantId: string
  baseUrl?: string
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: (sessionId: string) => void
  onMessageReceived?: (message: ChatMessage) => void
  className?: string
}

// ============================================
// UTILITIES
// ============================================

function generateVisitorId(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('cgk-visitor-id') : null
  if (stored) return stored

  const id = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  if (typeof window !== 'undefined') {
    localStorage.setItem('cgk-visitor-id', id)
  }
  return id
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================
// COMPONENT
// ============================================

export function ChatWidget({
  tenantId,
  baseUrl = '',
  onSessionStart,
  onSessionEnd,
  onMessageReceived,
  className = '',
}: ChatWidgetProps) {
  // State
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [showPreChat, setShowPreChat] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const visitorIdRef = useRef<string>('')

  // Initialize visitor ID
  useEffect(() => {
    visitorIdRef.current = generateVisitorId()
  }, [])

  // Fetch widget config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`${baseUrl}/api/support/chat`, {
          headers: {
            'x-tenant-id': tenantId,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load chat configuration')
        }

        const data = await response.json()
        setConfig(data.config)
        setIsOnline(data.isOnline)
        setError(null)
      } catch (err) {
        console.error('[ChatWidget] Failed to load config:', err)
        setError('Unable to load chat. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [tenantId, baseUrl])

  // Auto-open widget after delay
  useEffect(() => {
    if (config?.autoOpenDelaySeconds && !isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, config.autoOpenDelaySeconds * 1000)

      return () => clearTimeout(timer)
    }
  }, [config?.autoOpenDelaySeconds, isOpen])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages when session is active
  useEffect(() => {
    if (!session || session.status === 'ended') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    async function fetchMessages() {
      try {
        const response = await fetch(
          `${baseUrl}/api/support/chat/${session!.id}`,
          {
            headers: {
              'x-tenant-id': tenantId,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)

          // Notify of new messages
          if (onMessageReceived && data.messages.length > messages.length) {
            const newMessages = data.messages.slice(messages.length)
            newMessages.forEach((msg: ChatMessage) => onMessageReceived(msg))
          }
        }
      } catch (err) {
        console.error('[ChatWidget] Failed to fetch messages:', err)
      }
    }

    // Initial fetch
    fetchMessages()

    // Start polling
    pollingRef.current = setInterval(fetchMessages, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [session, tenantId, baseUrl, messages.length, onMessageReceived])

  // Start chat session
  const startSession = useCallback(async () => {
    if (!visitorIdRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${baseUrl}/api/support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          visitorName: visitorName || undefined,
          visitorEmail: visitorEmail || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrerUrl: typeof document !== 'undefined' ? document.referrer : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start chat')
      }

      const data = await response.json()
      setSession(data.session)
      setShowPreChat(false)
      setIsOnline(data.isOnline)
      onSessionStart?.(data.session.id)

      // Add greeting message if configured
      if (config?.greetingMessage) {
        setMessages([
          {
            id: 'greeting',
            sessionId: data.session.id,
            senderId: 'system',
            senderType: 'bot',
            content: config.greetingMessage,
            attachments: [],
            isRead: true,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      console.error('[ChatWidget] Failed to start session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start chat')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, baseUrl, visitorName, visitorEmail, config?.greetingMessage, onSessionStart])

  // Send message
  const sendMessage = useCallback(async () => {
    if (!session || !inputValue.trim() || isSending) return

    const content = inputValue.trim()
    setInputValue('')
    setIsSending(true)

    // Optimistic update
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      sessionId: session.id,
      senderId: visitorIdRef.current,
      senderType: 'visitor',
      content,
      attachments: [],
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch(`${baseUrl}/api/support/chat/${session.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          senderId: visitorIdRef.current,
          senderType: 'visitor',
          content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? data.message : msg))
      )
    } catch (err) {
      console.error('[ChatWidget] Failed to send message:', err)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }, [session, inputValue, isSending, tenantId, baseUrl])

  // End session
  const endSession = useCallback(async () => {
    if (!session) return

    try {
      await fetch(`${baseUrl}/api/support/chat/${session.id}/end`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId,
        },
      })

      onSessionEnd?.(session.id)
      setSession(null)
      setMessages([])
      setShowPreChat(true)
    } catch (err) {
      console.error('[ChatWidget] Failed to end session:', err)
    }
  }, [session, tenantId, baseUrl, onSessionEnd])

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Don't render if config failed to load
  if (error && !config) {
    return null
  }

  // Position styles
  const positionStyles = config
    ? {
        [config.position === 'bottom-right' ? 'right' : 'left']: `${config.offsetX}px`,
        bottom: `${config.offsetY}px`,
      }
    : { right: '20px', bottom: '20px' }

  return (
    <div
      className={`fixed z-50 ${className}`}
      style={positionStyles}
    >
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            backgroundColor: config?.secondaryColor || '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: config?.primaryColor || '#374d42' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {config?.headerText || 'Chat with us'}
                </h3>
                <p className="text-xs text-white/70">
                  {isOnline ? 'We typically reply within minutes' : 'Leave a message'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              </div>
            ) : showPreChat ? (
              /* Pre-chat Form */
              <div className="flex flex-1 flex-col justify-center p-6">
                <h4 className="mb-4 text-lg font-medium text-white">
                  Start a conversation
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-white/70">
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-white/70">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    onClick={startSession}
                    disabled={isLoading}
                    className="w-full rounded-lg px-4 py-3 font-medium text-white transition-colors"
                    style={{ backgroundColor: config?.primaryColor || '#374d42' }}
                  >
                    {isLoading ? 'Starting...' : 'Start Chat'}
                  </button>
                  {!isOnline && config?.offlineMessage && (
                    <p className="text-center text-sm text-amber-400">
                      {config.offlineMessage}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Queue Position */}
                  {session?.status === 'waiting' && session.queuePosition && (
                    <div className="mb-4 rounded-lg bg-amber-500/20 p-3 text-center text-sm text-amber-400">
                      You are #{session.queuePosition} in the queue. An agent will be with you shortly.
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.senderType === 'visitor'
                              ? 'rounded-br-md text-white'
                              : 'rounded-bl-md bg-white/10 text-white'
                          }`}
                          style={
                            message.senderType === 'visitor'
                              ? { backgroundColor: config?.primaryColor || '#374d42' }
                              : undefined
                          }
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {message.content}
                          </p>
                          <div
                            className={`mt-1 flex items-center gap-1 text-xs ${
                              message.senderType === 'visitor' ? 'justify-end text-white/50' : 'text-white/40'
                            }`}
                          >
                            <span>{formatTime(message.createdAt)}</span>
                            {config?.showReadReceipts && message.senderType === 'visitor' && (
                              <span>{message.isRead ? '(read)' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-white/10 p-4">
                  {error && (
                    <p className="mb-2 text-sm text-red-400">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                      disabled={isSending || session?.status === 'ended'}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isSending || session?.status === 'ended'}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50"
                      style={{ backgroundColor: config?.primaryColor || '#374d42' }}
                      aria-label="Send message"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                  {session && (
                    <button
                      onClick={endSession}
                      className="mt-2 w-full text-center text-xs text-white/50 hover:text-white/70"
                    >
                      End conversation
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: config?.primaryColor || '#374d42' }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default ChatWidget
