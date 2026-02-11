'use client'

import { useState } from 'react'
import { Badge, Card, CardContent, CardHeader } from '@cgk/ui'
import {
  MessageSquare,
  User,
  Bot,
  Hash,
  Clock,
  Wrench,
  ChevronRight,
} from 'lucide-react'

import type { BriConversation, ConversationMessage } from '@/lib/bri/types'

interface ConversationsViewProps {
  conversations: BriConversation[]
}

export function ConversationsView({ conversations }: ConversationsViewProps) {
  const [selectedConversation, setSelectedConversation] = useState<BriConversation | null>(
    conversations[0] ?? null
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="text-sm text-muted-foreground">View and analyze conversation history</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversation List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-220px)] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">All Conversations</h3>
                <span className="text-xs text-muted-foreground">{conversations.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">{conv.userId}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getLastMessagePreview(conv.messages)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {conv.messages.length}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(conv.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">{selectedConversation.userId}</h3>
                      {selectedConversation.isActive && (
                        <Badge variant="success" className="text-[10px]">Active</Badge>
                      )}
                    </div>
                    {selectedConversation.channelId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Hash className="h-3 w-3" />
                        {selectedConversation.channelId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Started {formatDate(selectedConversation.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last message {formatDate(selectedConversation.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Tools Used */}
              {selectedConversation.toolsUsed.length > 0 && (
                <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tools:</span>
                    {selectedConversation.toolsUsed.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-[10px]">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <CardContent className="p-4 overflow-y-auto flex-1">
                <div className="space-y-4">
                  {selectedConversation.messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a conversation to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div
          className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary text-primary-foreground' : 'bg-violet-500 text-white'
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p
            className={`text-[10px] mt-1 ${
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}

function getLastMessagePreview(messages: ConversationMessage[]): string {
  if (messages.length === 0) return 'No messages'
  const last = messages[messages.length - 1]
  if (!last) return 'No messages'
  return last.content.slice(0, 50) + (last.content.length > 50 ? '...' : '')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffHours < 168) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
