'use client'

import { cn } from '@cgk-platform/ui'
import { Bot, ChevronDown, ChevronRight, Terminal, User } from 'lucide-react'
import { useState } from 'react'

interface Message {
  role: string
  content: string
  model?: string
  tokens?: number
}

interface ConversationThreadProps {
  messages: Message[]
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'user':
      return <User className="h-4 w-4" />
    case 'assistant':
      return <Bot className="h-4 w-4" />
    case 'tool':
      return <Terminal className="h-3.5 w-3.5" />
    default:
      return <Bot className="h-4 w-4" />
  }
}

function ToolMessage({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mx-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Terminal className="h-3 w-3" />
        Tool result
      </button>
      {expanded && (
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
          {content}
        </pre>
      )}
    </div>
  )
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Conversation data not available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => {
        if (msg.role === 'tool') {
          return <ToolMessage key={i} content={msg.content} />
        }

        const isUser = msg.role === 'user'
        const isSystem = msg.role === 'system'

        return (
          <div
            key={i}
            className={cn(
              'flex gap-2',
              isUser && 'justify-end',
              isSystem && 'justify-center'
            )}
          >
            {!isUser && !isSystem && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <RoleIcon role={msg.role} />
              </div>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2',
                isUser && 'bg-primary text-primary-foreground',
                !isUser && !isSystem && 'border bg-card',
                isSystem && 'bg-muted/50 text-xs text-muted-foreground'
              )}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
              <div className="mt-1 flex items-center gap-2 text-xs opacity-60">
                {msg.model && <span className="font-mono">{msg.model}</span>}
                {msg.tokens != null && <span>{msg.tokens} tokens</span>}
              </div>
            </div>

            {isUser && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                <RoleIcon role="user" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
