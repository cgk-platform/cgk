'use client'

import { Badge, Button } from '@cgk-platform/ui'

interface SessionCardProps {
  id: string
  deviceInfo: string
  deviceType: string
  ipAddress: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
  onRevoke: (id: string) => void
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get device icon based on type
 */
function getDeviceIcon(deviceType: string): React.ReactNode {
  switch (deviceType) {
    case 'mobile':
      return (
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
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      )
    case 'tablet':
      return (
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
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
          <line x1="12" x2="12.01" y1="18" y2="18" />
        </svg>
      )
    default:
      return (
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
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
      )
  }
}

export function SessionCard({
  id,
  deviceInfo,
  deviceType,
  ipAddress,
  lastActiveAt,
  isCurrent,
  onRevoke,
}: SessionCardProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {getDeviceIcon(deviceType)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{deviceInfo}</p>
            {isCurrent && (
              <Badge variant="outline" className="text-xs">
                This device
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ipAddress} - Last active {formatRelativeTime(lastActiveAt)}
          </p>
        </div>
      </div>
      {!isCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRevoke(id)}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Sign out
        </Button>
      )}
    </div>
  )
}
