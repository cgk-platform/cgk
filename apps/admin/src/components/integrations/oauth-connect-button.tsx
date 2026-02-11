'use client'

import { Button, cn } from '@cgk/ui'
import { LogIn, Loader2, Unplug } from 'lucide-react'
import { useState } from 'react'

type OAuthProvider = 'meta' | 'google' | 'tiktok' | 'shopify' | 'slack'

interface OAuthConnectButtonProps {
  provider: OAuthProvider
  connected?: boolean
  onConnect: () => void | Promise<void>
  onDisconnect?: () => void | Promise<void>
  className?: string
}

const providerConfig: Record<OAuthProvider, { label: string; color: string }> = {
  meta: { label: 'Connect with Meta', color: 'bg-blue-600 hover:bg-blue-700' },
  google: { label: 'Connect with Google', color: 'bg-red-600 hover:bg-red-700' },
  tiktok: { label: 'Connect with TikTok', color: 'bg-zinc-900 hover:bg-zinc-800' },
  shopify: { label: 'Connect with Shopify', color: 'bg-emerald-600 hover:bg-emerald-700' },
  slack: { label: 'Connect with Slack', color: 'bg-purple-600 hover:bg-purple-700' },
}

export function OAuthConnectButton({
  provider,
  connected = false,
  onConnect,
  onDisconnect,
  className,
}: OAuthConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const config = providerConfig[provider]

  const handleClick = async () => {
    setLoading(true)
    try {
      if (connected && onDisconnect) {
        await onDisconnect()
      } else {
        await onConnect()
      }
    } finally {
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className={cn('gap-2', className)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Unplug className="h-4 w-4" />
        )}
        Disconnect
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={cn('gap-2 text-white', config.color, className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {config.label}
    </Button>
  )
}
