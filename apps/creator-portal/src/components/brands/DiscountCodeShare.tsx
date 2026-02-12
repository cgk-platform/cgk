'use client'

import { Badge, Button, Card, CardContent, formatCurrency } from '@cgk/ui'
import { useCallback, useState } from 'react'

interface DiscountCodeShareProps {
  code: string
  shareLink: string | null
  usageCount: number
  revenueAttributedCents: number
}

/**
 * DiscountCodeShare - Hero component for displaying and sharing discount codes
 *
 * Features:
 * - Large, prominent code display with monospace typography
 * - Click-to-copy with visual feedback
 * - Share menu with link copy and QR download
 * - Usage and revenue stats
 */
export function DiscountCodeShare({
  code,
  shareLink,
  usageCount,
  revenueAttributedCents,
}: DiscountCodeShareProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareAction, setShareAction] = useState<'code' | 'link' | null>(null)

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }, [code])

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink)
      setShareAction('link')
      setTimeout(() => setShareAction(null), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }, [shareLink])

  const handleDownloadQR = useCallback(() => {
    if (!shareLink) return

    // Generate QR code URL using a free API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(shareLink)}&format=png`

    // Create download link
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `${code}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [code, shareLink])

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-primary/20 bg-gradient-to-br from-card to-muted/30">
      {/* Decorative pattern */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 rounded-full bg-primary/5" />
      <div className="pointer-events-none absolute -bottom-2 -left-2 h-20 w-20 rounded-full bg-primary/5" />

      <CardContent className="relative p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Code display with copy */}
          <div className="flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Discount Code
            </p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="group relative flex items-center gap-3 rounded-lg bg-background px-4 py-3 shadow-sm ring-1 ring-border transition-all hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Click to copy"
            >
              <code className="font-mono text-2xl font-bold tracking-widest text-foreground">
                {code}
              </code>
              <span
                className={`flex items-center gap-1 text-xs transition-all ${
                  copied
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copy
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Share button */}
          {shareLink && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="gap-2"
              >
                <ShareIcon className="h-4 w-4" />
                Share
              </Button>

              {/* Share dropdown menu */}
              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-popover p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyLink()
                        setShowShareMenu(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {shareAction === 'link' ? 'Link copied!' : 'Copy share link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadQR()
                        setShowShareMenu(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <QRIcon className="h-4 w-4" />
                      Download QR code
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-6 border-t pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {usageCount}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {usageCount === 1 ? 'use' : 'uses'}
            </span>
          </div>
          {revenueAttributedCents > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="font-mono">
                {formatCurrency(revenueAttributedCents / 100)}
              </Badge>
              <span className="text-sm text-muted-foreground">attributed</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Icon components
function CopyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function QRIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}
