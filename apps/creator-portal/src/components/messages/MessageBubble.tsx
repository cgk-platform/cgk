'use client'

import { cn } from '@cgk-platform/ui'

interface MessageAttachment {
  url: string
  name: string
  type: string
  size: number
}

interface MessageBubbleProps {
  content: string
  senderType: 'creator' | 'admin'
  senderName: string | null
  aiGenerated: boolean
  attachments: MessageAttachment[]
  createdAt: string
  status?: 'sent' | 'delivered' | 'read'
}

/**
 * Format timestamp for display
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MessageBubble({
  content,
  senderType,
  senderName,
  aiGenerated,
  attachments,
  createdAt,
  status,
}: MessageBubbleProps): React.JSX.Element {
  const isCreator = senderType === 'creator'

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isCreator ? 'items-end' : 'items-start'
      )}
    >
      {/* Sender name for admin messages */}
      {!isCreator && senderName && (
        <span className="ml-1 text-xs text-muted-foreground">
          {senderName}
          {aiGenerated && (
            <span className="ml-1 text-xs text-muted-foreground/70">(AI)</span>
          )}
        </span>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isCreator
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Content */}
        <p className="whitespace-pre-wrap text-sm">{content}</p>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 text-xs transition-colors',
                  isCreator
                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                    : 'bg-background hover:bg-background/80'
                )}
              >
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
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="flex-1 truncate">{attachment.name}</span>
                <span className="text-xs opacity-70">
                  {formatFileSize(attachment.size)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp and status */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-xs text-muted-foreground">{formatTime(createdAt)}</span>
        {isCreator && status && (
          <span className="text-xs text-muted-foreground">
            {status === 'sent' && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {status === 'delivered' && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 7 17l-5-5" />
                <path d="m22 10-7.5 7.5L13 16" />
              </svg>
            )}
            {status === 'read' && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500"
              >
                <path d="M18 6 7 17l-5-5" />
                <path d="m22 10-7.5 7.5L13 16" />
              </svg>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
