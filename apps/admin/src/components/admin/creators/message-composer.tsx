'use client'

import { Button, Textarea } from '@cgk/ui'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { MESSAGE_CHANNELS, type MessageChannel } from '@/lib/messaging/types'

interface MessageComposerProps {
  threadId: string
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState<MessageChannel>('email')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!content.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/admin/creators/inbox/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), channel }),
      })

      if (response.ok) {
        setContent('')
        router.refresh()
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend()
    }
  }

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground">Send via:</span>
        {MESSAGE_CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`rounded-md px-2 py-1 text-xs capitalize ${
              channel === ch ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Cmd+Enter to send)"
          className="min-h-[80px] resize-none"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          size="icon"
          className="h-20 w-12"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
