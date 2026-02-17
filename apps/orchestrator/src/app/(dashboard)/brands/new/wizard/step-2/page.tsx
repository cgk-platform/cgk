'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShoppingBag,
  Unlink,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { useWizard } from '../context'

/**
 * Step 2: Shopify Connection
 *
 * Connects the brand to a Shopify store via OAuth or manual access token.
 */
export default function Step2Page() {
  const { data, updateData, completeStep, goBack } = useWizard()

  const [mode, setMode] = useState<'oauth' | 'manual'>('oauth')
  const [storeDomain, setStoreDomain] = useState(data.shopifyStoreDomain || '')
  const [accessToken, setAccessToken] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Format store domain
  const formatDomain = useCallback((input: string) => {
    let domain = input.trim().toLowerCase()
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '')
    // Remove trailing slash
    domain = domain.replace(/\/$/, '')
    // Add .myshopify.com if not present
    if (domain && !domain.includes('.')) {
      domain = `${domain}.myshopify.com`
    }
    return domain
  }, [])

  // Handle OAuth flow
  const handleOAuthConnect = useCallback(async () => {
    if (!storeDomain) return

    setIsConnecting(true)
    setError(null)

    try {
      const formattedDomain = formatDomain(storeDomain)

      // Redirect to Shopify OAuth
      const response = await fetch('/api/platform/shopify/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: formattedDomain,
          brandSlug: data.slug,
        }),
      })

      const result = await response.json()

      if (result.authUrl) {
        // Open OAuth popup or redirect
        window.location.href = result.authUrl
      } else {
        throw new Error(result.error || 'Failed to initiate OAuth')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }, [storeDomain, data.slug, formatDomain])

  // Handle manual token connection
  const handleManualConnect = useCallback(async () => {
    if (!storeDomain || !accessToken) return

    setIsConnecting(true)
    setError(null)

    try {
      const formattedDomain = formatDomain(storeDomain)

      // Verify the token works
      const response = await fetch('/api/platform/shopify/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: formattedDomain,
          accessToken,
        }),
      })

      const result = await response.json()

      if (result.valid) {
        setConnectionStatus('success')
        updateData({
          shopifyConnected: true,
          shopifyStoreDomain: formattedDomain,
          shopifyAccessToken: accessToken,
        })
      } else {
        throw new Error(result.error || 'Invalid access token')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }, [storeDomain, accessToken, formatDomain, updateData])

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    updateData({
      shopifyConnected: false,
      shopifyStoreDomain: undefined,
      shopifyAccessToken: undefined,
    })
    setConnectionStatus('idle')
    setStoreDomain('')
    setAccessToken('')
  }, [updateData])

  // Handle continue
  const handleContinue = useCallback(() => {
    completeStep()
  }, [completeStep])

  // Handle skip
  const handleSkip = useCallback(() => {
    completeStep()
  }, [completeStep])

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {data.shopifyConnected ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <ShoppingBag className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-emerald-400">Shopify Connected</h3>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Connected to{' '}
                <span className="font-mono text-emerald-400">{data.shopifyStoreDomain}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground hover:text-destructive"
                onClick={handleDisconnect}
              >
                <Unlink className="mr-1 h-3 w-3" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Selection */}
          <div className="flex gap-2 rounded-lg border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setMode('oauth')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'oauth'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OAuth (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual Token
            </button>
          </div>

          {/* Store Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="store" className="text-sm font-medium">
              Shopify Store Domain
            </Label>
            <div className="relative">
              <ShoppingBag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="store"
                type="text"
                placeholder="your-store.myshopify.com"
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
                className="pl-10 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your Shopify store domain (e.g., your-store.myshopify.com)
            </p>
          </div>

          {/* Manual Token Input */}
          {mode === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium">
                Admin API Access Token
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="shpat_xxxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Create a custom app in Shopify Admin &gt; Settings &gt; Apps and sales channels &gt;
                Develop apps
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Connection Failed</p>
                <p className="mt-1 text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display (for manual mode) */}
          {connectionStatus === 'success' && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Connection Verified</p>
                <p className="mt-1 text-xs text-emerald-400/80">
                  Successfully connected to Shopify store
                </p>
              </div>
            </div>
          )}

          {/* Connect Button */}
          <Button
            onClick={mode === 'oauth' ? handleOAuthConnect : handleManualConnect}
            disabled={!storeDomain || (mode === 'manual' && !accessToken) || isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : mode === 'oauth' ? (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect with Shopify
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Verify Connection
              </>
            )}
          </Button>

          {/* OAuth Info */}
          {mode === 'oauth' && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="mb-2 text-sm font-medium">OAuth Connection</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>- You will be redirected to Shopify to authorize access</li>
                <li>- The CGK platform will request necessary API scopes</li>
                <li>- Tokens are securely stored and encrypted</li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* Required Scopes Info */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-2 text-sm font-medium">Required API Scopes</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            read_products
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            write_products
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            read_orders
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            read_customers
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            read_inventory
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            write_checkouts
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>

        <div className="flex gap-2">
          {!data.shopifyConnected && (
            <Button type="button" variant="outline" onClick={handleSkip}>
              Skip for Now
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={!data.shopifyConnected && connectionStatus !== 'success'}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
