import { cn } from '@cgk/ui'

import { formatDateTime } from '@/lib/format'
import type { Thread, Message } from '@/lib/messaging/types'

interface ThreadDetailProps {
  thread: Thread
  messages: Message[]
}

export function ThreadDetail({ thread, messages }: ThreadDetailProps) {
  return (
    <div className="flex flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{thread.subject}</h2>
        <p className="text-sm text-muted-foreground">
          Conversation with {thread.creator_name} ({thread.creator_email})
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3',
          isOutbound ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        <div className="flex items-center gap-2 text-xs opacity-70">
          <span className="font-medium">{message.sender_name}</span>
          <span>via {message.channel}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
        <div className="mt-2 text-xs opacity-70">
          {formatDateTime(message.created_at)}
          {message.delivered_at && isOutbound && ' - Delivered'}
          {message.read_at && !isOutbound && ' - Read'}
        </div>
      </div>
    </div>
  )
}
