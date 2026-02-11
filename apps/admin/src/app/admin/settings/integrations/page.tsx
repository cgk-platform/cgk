'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Check, ExternalLink, RefreshCw, X } from 'lucide-react'

import { Alert, AlertDescription, Badge, Button, Card, CardContent, Input, Label, Spinner } from '@cgk/ui'

interface IntegrationStatus {
  provider: 'meta' | 'google_ads' | 'tiktok' | 'klaviyo'
  connected: boolean
  status: string
  accountName: string | null
  tokenExpiresAt: string | null
  needsReauth: boolean
  lastError: string | null
  lastSyncAt: string | null
}

const PROVIDER_INFO = {
  meta: {
    name: 'Meta Ads',
    description: 'Connect Facebook and Instagram Ads for spend tracking and Conversions API.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
      </svg>
    ),
  },
  google_ads: {
    name: 'Google Ads',
    description: 'Connect Google Ads for campaign performance and conversion tracking.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  },
  tiktok: {
    name: 'TikTok Ads',
    description: 'Connect TikTok Ads for campaign management and Events API.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  klaviyo: {
    name: 'Klaviyo',
    description: 'Connect Klaviyo for email and SMS marketing automation.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm0 2.5l8 4.6v9.2l-8 4.6-8-4.6V7.1l8-4.6z" />
      </svg>
    ),
  },
}

function formatExpiryTime(expiresAt: string | null): string {
  if (!expiresAt) return 'Never'

  const expiry = new Date(expiresAt)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()

  if (diff < 0) return 'Expired'
  if (diff < 3600000) return 'Expires in less than 1 hour'
  if (diff < 86400000) return `Expires in ${Math.floor(diff / 3600000)} hours`
  return `Expires in ${Math.floor(diff / 86400000)} days`
}

function IntegrationCard({
  status,
  onConnect,
  onDisconnect,
  onReauth,
  loading,
}: {
  status: IntegrationStatus
  onConnect: () => void
  onDisconnect: () => void
  onReauth: () => void
  loading: boolean
}) {
  const info = PROVIDER_INFO[status.provider]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-muted-foreground">{info.icon}</div>
            <div>
              <h3 className="font-semibold">{info.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>

              {status.connected && (
                <div className="mt-3 space-y-1">
                  {status.accountName && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Account:</span>{' '}
                      <span className="font-medium">{status.accountName}</span>
                    </p>
                  )}
                  {status.tokenExpiresAt && (
                    <p className="text-sm text-muted-foreground">
                      {formatExpiryTime(status.tokenExpiresAt)}
                    </p>
                  )}
                  {status.lastSyncAt && (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {new Date(status.lastSyncAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {status.lastError && (
                <Alert variant="error" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{status.lastError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <Badge variant={status.needsReauth ? 'destructive' : 'default'}>
                  {status.needsReauth ? (
                    <>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Needs Re-auth
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </>
                  )}
                </Badge>
                {status.needsReauth ? (
                  <Button size="sm" onClick={onReauth} disabled={loading}>
                    {loading ? <Spinner className="h-4 w-4" /> : 'Re-authorize'}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onDisconnect} disabled={loading}>
                    {loading ? <Spinner className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={onConnect} disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KlaviyoCard({
  status,
  onConnect,
  onDisconnect,
  loading,
}: {
  status: IntegrationStatus
  onConnect: (apiKey: string, publicKey?: string) => void
  onDisconnect: () => void
  loading: boolean
}) {
  const [apiKey, setApiKey] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [showForm, setShowForm] = useState(false)
  const info = PROVIDER_INFO.klaviyo

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-muted-foreground">{info.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold">{info.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>

              {status.connected && status.accountName && (
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Account:</span>{' '}
                  <span className="font-medium">{status.accountName}</span>
                </p>
              )}

              {showForm && !status.connected && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="private-key">Private API Key</Label>
                    <Input
                      id="private-key"
                      type="password"
                      placeholder="pk_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="public-key">Public API Key (Optional)</Label>
                    <Input
                      id="public-key"
                      placeholder="For client-side tracking"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onConnect(apiKey, publicKey || undefined)}
                      disabled={!apiKey || loading}
                    >
                      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Connect
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <Badge>
                  <Check className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
                <Button size="sm" variant="outline" onClick={onDisconnect} disabled={loading}>
                  {loading ? <Spinner className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </Button>
              </>
            ) : !showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function IntegrationsSettingsPage() {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchStatuses()

    // Check URL params for success/error messages
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')
    const urlSuccess = params.get('success')

    if (urlError) {
      setError(decodeURIComponent(urlError))
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (urlSuccess) {
      setSuccess(`${urlSuccess.replace('_', ' ')} connected successfully!`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function fetchStatuses() {
    try {
      const res = await fetch('/api/admin/integrations')
      const data = await res.json()
      if (data.integrations) {
        setStatuses(data.integrations)
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err)
      setError('Failed to load integration statuses')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuthConnect(provider: 'meta' | 'google_ads' | 'tiktok') {
    setActionLoading(provider)
    try {
      const providerPath = provider.replace('_', '-')
      const res = await fetch(`/api/admin/integrations/${providerPath}/oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/admin/settings/integrations' }),
      })
      const data = await res.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setError(data.error || 'Failed to start OAuth')
      }
    } catch (err) {
      setError('Failed to start OAuth flow')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDisconnect(provider: 'meta' | 'google_ads' | 'tiktok' | 'klaviyo') {
    if (!confirm(`Are you sure you want to disconnect ${PROVIDER_INFO[provider].name}?`)) {
      return
    }

    setActionLoading(provider)
    try {
      const providerPath = provider.replace('_', '-')
      await fetch(`/api/admin/integrations/${providerPath}/disconnect`, {
        method: 'DELETE',
      })
      await fetchStatuses()
      setSuccess(`${PROVIDER_INFO[provider].name} disconnected`)
    } catch (err) {
      setError('Failed to disconnect')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleKlaviyoConnect(apiKey: string, publicKey?: string) {
    setActionLoading('klaviyo')
    try {
      const res = await fetch('/api/admin/integrations/klaviyo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateApiKey: apiKey, publicApiKey: publicKey }),
      })
      const data = await res.json()

      if (data.connected) {
        await fetchStatuses()
        setSuccess('Klaviyo connected successfully!')
      } else {
        setError(data.error || 'Failed to connect Klaviyo')
      }
    } catch (err) {
      setError('Failed to connect Klaviyo')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect third-party ad platforms and marketing tools.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatuses} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {(['meta', 'google_ads', 'tiktok'] as const).map((provider) => {
          const status = statuses.find((s) => s.provider === provider) || {
            provider,
            connected: false,
            status: 'not_connected',
            accountName: null,
            tokenExpiresAt: null,
            needsReauth: false,
            lastError: null,
            lastSyncAt: null,
          }

          return (
            <IntegrationCard
              key={provider}
              status={status}
              onConnect={() => handleOAuthConnect(provider)}
              onDisconnect={() => handleDisconnect(provider)}
              onReauth={() => handleOAuthConnect(provider)}
              loading={actionLoading === provider}
            />
          )
        })}

        <KlaviyoCard
          status={
            statuses.find((s) => s.provider === 'klaviyo') || {
              provider: 'klaviyo',
              connected: false,
              status: 'not_connected',
              accountName: null,
              tokenExpiresAt: null,
              needsReauth: false,
              lastError: null,
              lastSyncAt: null,
            }
          }
          onConnect={handleKlaviyoConnect}
          onDisconnect={() => handleDisconnect('klaviyo')}
          loading={actionLoading === 'klaviyo'}
        />
      </div>
    </div>
  )
}
