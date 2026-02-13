'use client'

import { Button, cn, Input, Label } from '@cgk-platform/ui'
import { useCallback, useState } from 'react'

import { formatFollowerCount, PLATFORMS } from '@/lib/brand-preferences/constants'
import type { Platform, PlatformPreference } from '@/lib/types'

interface PlatformPreferencesEditorProps {
  platforms: PlatformPreference[]
  onChange: (platforms: PlatformPreference[]) => void
  disabled?: boolean
}

/**
 * PlatformPreferencesEditor - Manage platform preferences with follower counts
 *
 * Features:
 * - Add/remove platforms
 * - Input follower counts
 * - Optional handle field
 * - Platform-specific colors
 */
export function PlatformPreferencesEditor({
  platforms,
  onChange,
  disabled = false,
}: PlatformPreferencesEditorProps): React.JSX.Element {
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null)

  const handleTogglePlatform = useCallback(
    (platform: Platform) => {
      if (disabled) return

      const exists = platforms.find((p) => p.platform === platform)
      if (exists) {
        onChange(platforms.filter((p) => p.platform !== platform))
        if (expandedPlatform === platform) {
          setExpandedPlatform(null)
        }
      } else {
        onChange([...platforms, { platform, followerCount: 0 }])
        setExpandedPlatform(platform)
      }
    },
    [platforms, onChange, disabled, expandedPlatform]
  )

  const handleFollowerCountChange = useCallback(
    (platform: Platform, count: number) => {
      if (disabled) return

      onChange(
        platforms.map((p) =>
          p.platform === platform ? { ...p, followerCount: Math.max(0, count) } : p
        )
      )
    },
    [platforms, onChange, disabled]
  )

  const handleHandleChange = useCallback(
    (platform: Platform, handle: string) => {
      if (disabled) return

      onChange(
        platforms.map((p) =>
          p.platform === platform ? { ...p, handle: handle || undefined } : p
        )
      )
    },
    [platforms, onChange, disabled]
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PLATFORMS.map((platformInfo) => {
        const selected = platforms.find((p) => p.platform === platformInfo.id)
        const isSelected = Boolean(selected)
        const isExpanded = expandedPlatform === platformInfo.id

        return (
          <div
            key={platformInfo.id}
            className={cn(
              'rounded-xl border transition-all',
              isSelected ? 'border-primary/50' : 'border-border',
              isExpanded && 'ring-2 ring-primary/20'
            )}
          >
            {/* Platform header */}
            <button
              type="button"
              onClick={() => handleTogglePlatform(platformInfo.id)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-left transition-colors',
                isSelected ? 'bg-primary/5' : 'bg-card hover:bg-accent/50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Checkbox */}
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-background'
                )}
              >
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>

              {/* Platform icon */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${platformInfo.color}20` }}
              >
                <PlatformIcon platform={platformInfo.id} color={platformInfo.color} />
              </div>

              {/* Label and follower count */}
              <div className="flex-1">
                <div className="font-medium text-foreground">{platformInfo.label}</div>
                {isSelected && selected && selected.followerCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {formatFollowerCount(selected.followerCount)} followers
                  </div>
                )}
              </div>

              {/* Expand button */}
              {isSelected && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedPlatform(isExpanded ? null : platformInfo.id)
                  }}
                  className="h-7 w-7 p-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Button>
              )}
            </button>

            {/* Expanded details */}
            {isSelected && isExpanded && (
              <div className="space-y-3 border-t border-primary/20 bg-card px-4 py-3">
                <div>
                  <Label htmlFor={`followers-${platformInfo.id}`} className="text-xs">
                    Follower Count
                  </Label>
                  <Input
                    id={`followers-${platformInfo.id}`}
                    type="number"
                    min="0"
                    value={selected?.followerCount || ''}
                    onChange={(e) =>
                      handleFollowerCountChange(platformInfo.id, parseInt(e.target.value) || 0)
                    }
                    placeholder="e.g., 15000"
                    disabled={disabled}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`handle-${platformInfo.id}`} className="text-xs">
                    Handle (optional)
                  </Label>
                  <Input
                    id={`handle-${platformInfo.id}`}
                    type="text"
                    value={selected?.handle || ''}
                    onChange={(e) => handleHandleChange(platformInfo.id, e.target.value)}
                    placeholder="@username"
                    disabled={disabled}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Platform-specific icons
 */
function PlatformIcon({ platform, color }: { platform: Platform; color: string }): React.JSX.Element {
  const iconClass = 'h-4 w-4'
  const style = { color }

  const icons: Record<Platform, React.JSX.Element> = {
    instagram: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={style}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
    tiktok: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClass} style={style}>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
    youtube: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={style}>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </svg>
    ),
    twitter: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClass} style={style}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    facebook: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={style}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    pinterest: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClass} style={style}>
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
      </svg>
    ),
    linkedin: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={style}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    twitch: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={style}>
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
    ),
    snapchat: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClass} style={{ color: '#000' }}>
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 01.248-.052c.142 0 .29.038.416.118.195.122.263.296.263.482 0 .33-.256.594-.603.728-.227.087-.448.147-.664.192-.675.14-.91.445-.91.775 0 .08.015.163.045.242.1.267.268.48.425.676a7.06 7.06 0 01.182.24c.69.936 1.08 1.65 1.19 2.182.03.152.04.3.04.436 0 .27-.06.51-.165.715a1.39 1.39 0 01-.598.635 2.27 2.27 0 01-.76.272c-.388.07-.784.105-1.188.105-.193 0-.38-.006-.563-.018l-.165-.012a8.728 8.728 0 00-.525-.03c-.176 0-.349.009-.517.03-.152.018-.307.036-.463.036-.162 0-.321-.018-.478-.036a3.924 3.924 0 00-.494-.03c-.164 0-.328.009-.49.03l-.165.012c-.184.012-.371.018-.564.018-.403 0-.8-.035-1.187-.105a2.262 2.262 0 01-.76-.272 1.392 1.392 0 01-.599-.635 1.478 1.478 0 01-.165-.715c0-.136.01-.284.04-.436.11-.532.5-1.246 1.19-2.182a7.03 7.03 0 01.182-.24c.157-.195.325-.409.425-.676.03-.079.045-.162.045-.242 0-.33-.235-.635-.91-.775a5.84 5.84 0 01-.664-.192c-.347-.134-.603-.398-.603-.728 0-.186.068-.36.263-.482a.603.603 0 01.416-.118c.09 0 .176.015.248.052.374.181.733.285 1.033.301.198 0 .326-.045.401-.09a18.76 18.76 0 01-.033-.57c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z" />
      </svg>
    ),
    threads: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={iconClass} style={style}>
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.733 2.088-1.14 3.494-1.176 1.037-.027 2.01.1 2.9.378.003-.401-.015-.793-.055-1.17-.209-1.93-1.113-2.898-2.686-2.876-1.038.014-1.836.39-2.373 1.116l-1.7-1.12c.858-1.163 2.175-1.8 3.91-1.885h.115c1.502 0 2.695.477 3.544 1.418.73.806 1.165 1.918 1.292 3.305.018.206.03.418.036.636 1.077.558 1.928 1.356 2.467 2.354.73 1.35.953 3.118.607 4.833-.584 2.883-2.499 4.892-5.718 5.984-1.418.48-2.94.706-4.464.658zm-.21-6.03c1.31 0 2.33-.363 2.858-1.02.594-.74.815-1.843.662-3.281-.885-.269-1.85-.397-2.867-.38-1.803.046-2.91.8-2.866 1.952.034.874.737 1.99 2.213 2.73z" />
      </svg>
    ),
  }

  return icons[platform]
}
