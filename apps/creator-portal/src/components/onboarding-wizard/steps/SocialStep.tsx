'use client'

import { cn, Input, Label } from '@cgk-platform/ui'
import { useCallback, useState } from 'react'

import type { SocialData, SocialConnection } from '../../../lib/onboarding-wizard/types'

interface SocialStepProps {
  data: SocialData
  errors: Record<string, string>
  onChange: (data: SocialData) => void
}

type Platform = SocialConnection['platform']

interface PlatformInfo {
  id: Platform
  name: string
  color: string
  placeholder: string
  urlPrefix: string
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    placeholder: 'yourhandle',
    urlPrefix: 'https://instagram.com/',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#000000',
    placeholder: 'yourhandle',
    urlPrefix: 'https://tiktok.com/@',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    placeholder: 'channel URL or @handle',
    urlPrefix: 'https://youtube.com/',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    color: '#000000',
    placeholder: 'yourhandle',
    urlPrefix: 'https://x.com/',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    placeholder: 'profile URL',
    urlPrefix: 'https://linkedin.com/in/',
  },
]

/**
 * Social Accounts Step
 *
 * Connect and manage social media accounts.
 */
export function SocialStep({
  data,
  errors,
  onChange,
}: SocialStepProps): React.JSX.Element {
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [handleInput, setHandleInput] = useState('')

  const handleConnect = useCallback(
    (platform: Platform) => {
      const platformInfo = PLATFORMS.find((p) => p.id === platform)
      if (!platformInfo) return

      const existingConnection = data.connections.find((c) => c.platform === platform)
      if (existingConnection) {
        setHandleInput(existingConnection.handle)
      } else {
        setHandleInput('')
      }
      setEditingPlatform(platform)
    },
    [data.connections]
  )

  const handleSaveConnection = useCallback(() => {
    if (!editingPlatform || !handleInput.trim()) return

    const platformInfo = PLATFORMS.find((p) => p.id === editingPlatform)
    if (!platformInfo) return

    const cleanHandle = handleInput.replace(/^@/, '').trim()
    const url = platformInfo.urlPrefix + cleanHandle

    const existingIndex = data.connections.findIndex(
      (c) => c.platform === editingPlatform
    )

    let newConnections: SocialConnection[]
    const newConnection: SocialConnection = {
      platform: editingPlatform,
      handle: cleanHandle,
      url,
      verified: false,
      followerCount: null,
    }

    if (existingIndex >= 0) {
      newConnections = [...data.connections]
      newConnections[existingIndex] = newConnection
    } else {
      newConnections = [...data.connections, newConnection]
    }

    // Auto-set primary if first connection
    const newPrimary = data.primaryPlatform || editingPlatform

    onChange({
      connections: newConnections,
      primaryPlatform: newPrimary,
    })

    setEditingPlatform(null)
    setHandleInput('')
  }, [editingPlatform, handleInput, data, onChange])

  const handleRemoveConnection = useCallback(
    (platform: Platform) => {
      const newConnections = data.connections.filter((c) => c.platform !== platform)
      const newPrimary =
        data.primaryPlatform === platform
          ? newConnections[0]?.platform || null
          : data.primaryPlatform

      onChange({
        connections: newConnections,
        primaryPlatform: newPrimary,
      })
    },
    [data, onChange]
  )

  const handleSetPrimary = useCallback(
    (platform: Platform) => {
      onChange({ ...data, primaryPlatform: platform })
    },
    [data, onChange]
  )

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="rounded-lg bg-wizard-hover p-4">
        <p className="text-sm text-wizard-text">
          Connect your social accounts to help brands discover you and understand
          your reach. We&apos;ll never post without your permission.
        </p>
      </div>

      {/* Error message */}
      {errors.connections && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{errors.connections}</p>
        </div>
      )}

      {/* Platform list */}
      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const connection = data.connections.find((c) => c.platform === platform.id)
          const isConnected = !!connection
          const isPrimary = data.primaryPlatform === platform.id
          const isEditing = editingPlatform === platform.id

          return (
            <div
              key={platform.id}
              className={cn(
                'rounded-lg border p-4 transition-all',
                isConnected && 'border-wizard-success/30 bg-wizard-success/5',
                !isConnected && 'border-wizard-border bg-white'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform.id} color={platform.color} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-wizard-text">
                        {platform.name}
                      </span>
                      {isPrimary && (
                        <span className="rounded-full bg-wizard-accent/10 px-2 py-0.5 text-[10px] font-medium text-wizard-accent">
                          Primary
                        </span>
                      )}
                    </div>
                    {isConnected && connection && (
                      <a
                        href={connection.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-wizard-muted hover:text-wizard-accent"
                      >
                        @{connection.handle}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      {!isPrimary && data.connections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(platform.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-wizard-muted transition-colors hover:bg-wizard-hover hover:text-wizard-text"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleConnect(platform.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-wizard-muted transition-colors hover:bg-wizard-hover hover:text-wizard-text"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveConnection(platform.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(platform.id)}
                      className="rounded-lg bg-wizard-text px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-wizard-text/90"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="mt-4 border-t border-wizard-border pt-4">
                  <Label className="text-sm font-medium text-wizard-text">
                    {platform.name} Handle
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-wizard-muted">
                        @
                      </span>
                      <Input
                        value={handleInput}
                        onChange={(e) => setHandleInput(e.target.value)}
                        placeholder={platform.placeholder}
                        className="pl-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveConnection()
                          if (e.key === 'Escape') setEditingPlatform(null)
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlatform(null)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-wizard-muted transition-colors hover:bg-wizard-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConnection}
                      disabled={!handleInput.trim()}
                      className="rounded-lg bg-wizard-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-wizard-accent-hover disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Primary platform error */}
      {errors.primaryPlatform && data.connections.length > 0 && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{errors.primaryPlatform}</p>
        </div>
      )}
    </div>
  )
}

function PlatformIcon({
  platform,
  color,
}: {
  platform: Platform
  color: string
}): React.JSX.Element {
  const icons: Record<Platform, React.JSX.Element> = {
    instagram: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color}>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-wizard-hover">
      {icons[platform]}
    </div>
  )
}
