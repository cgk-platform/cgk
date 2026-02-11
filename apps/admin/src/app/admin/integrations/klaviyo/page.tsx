'use client'

import { Button, Card, CardContent, Badge, Input, Label, cn } from '@cgk/ui'
import {
  Mail,
  Building2,
  MessageSquare,
  Database,
  Server,
  CheckCircle2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  ConnectionStatusBadge,
  SecureApiKeyInput,
  TestConnectionResult,
} from '@/components/integrations'
import type { KlaviyoStatus } from '@/lib/integrations/types'

export default function KlaviyoPage() {
  const [status, setStatus] = useState<KlaviyoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [privateKey, setPrivateKey] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [smsListId, setSmsListId] = useState('')
  const [emailListId, setEmailListId] = useState('')
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [testDetails, setTestDetails] = useState<Record<string, unknown>>({})

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/klaviyo/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.smsListId) setSmsListId(data.smsListId)
        if (data.emailListId) setEmailListId(data.emailListId)
      }
    } catch (error) {
      console.error('Failed to fetch Klaviyo status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleTestConnection = async () => {
    if (!privateKey) return
    setTestStatus('testing')
    setTestDetails({})

    try {
      const response = await fetch('/api/admin/klaviyo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage(`Connected to ${data.companyName}`)
        setTestDetails({ companyName: data.companyName })
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection test failed')
      }
    } catch {
      setTestStatus('error')
      setTestMessage('Failed to test connection')
    }
  }

  const handleConnect = async () => {
    if (!privateKey) return
    setSaving(true)

    try {
      const response = await fetch('/api/admin/klaviyo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKey,
          publicKey: publicKey || undefined,
          smsListId: smsListId || undefined,
          emailListId: emailListId || undefined,
        }),
      })

      if (response.ok) {
        setPrivateKey('')
        setPublicKey('')
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Klaviyo?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/klaviyo/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({
          connected: false,
          authSource: 'database',
        })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 w-48 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                status?.connected ? 'bg-green-500/10' : 'bg-zinc-500/10'
              )}>
                <Mail className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-green-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Klaviyo</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Email and SMS marketing automation
                </p>
                {status?.companyName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Company: {status.companyName}
                  </p>
                )}
              </div>
            </div>

            {status?.connected && (
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>

          {status?.connected && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              {status.authSource === 'env' ? (
                <>
                  <Server className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Using environment variables</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Using stored credentials</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected ? (
        <>
          {/* List Configuration */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">List Configuration</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Email List</span>
                  </div>
                  {status.emailListId ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <code className="font-mono text-sm">{status.emailListId}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not configured</p>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">SMS List</span>
                  </div>
                  {status.smsListId ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <code className="font-mono text-sm">{status.smsListId}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Lists */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Update List IDs</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email-list">Email List ID</Label>
                  <Input
                    id="email-list"
                    value={emailListId}
                    onChange={(e) => setEmailListId(e.target.value)}
                    placeholder="e.g., XyZ123"
                    className="mt-1.5 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-list">SMS List ID</Label>
                  <Input
                    id="sms-list"
                    value={smsListId}
                    onChange={(e) => setSmsListId(e.target.value)}
                    placeholder="e.g., AbC456"
                    className="mt-1.5 font-mono"
                  />
                </div>
              </div>

              <Button className="mt-4" onClick={handleConnect} disabled={saving}>
                {saving ? 'Saving...' : 'Update Configuration'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Connection Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Connect Klaviyo</h3>

              <div className="space-y-4">
                <SecureApiKeyInput
                  value={privateKey}
                  onChange={setPrivateKey}
                  label="Private API Key"
                  description="Required. Found in Klaviyo Settings > API Keys"
                  placeholder="pk_..."
                />

                <SecureApiKeyInput
                  value={publicKey}
                  onChange={setPublicKey}
                  label="Public API Key (Optional)"
                  description="Used for client-side tracking"
                  placeholder="Abc123..."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email-list-new">Email List ID (Optional)</Label>
                    <Input
                      id="email-list-new"
                      value={emailListId}
                      onChange={(e) => setEmailListId(e.target.value)}
                      placeholder="e.g., XyZ123"
                      className="mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sms-list-new">SMS List ID (Optional)</Label>
                    <Input
                      id="sms-list-new"
                      value={smsListId}
                      onChange={(e) => setSmsListId(e.target.value)}
                      placeholder="e.g., AbC456"
                      className="mt-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestConnection} disabled={!privateKey || testStatus === 'testing'}>
                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={handleConnect} disabled={!privateKey || saving}>
                    {saving ? 'Connecting...' : 'Save & Connect'}
                  </Button>
                </div>

                {testStatus !== 'idle' && (
                  <TestConnectionResult
                    status={testStatus}
                    message={testMessage}
                    details={testDetails}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Getting Your API Keys</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    1
                  </span>
                  <span>Log in to your Klaviyo account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    2
                  </span>
                  <span>Go to Settings {">"} API Keys</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    3
                  </span>
                  <span>Create a new Private API key with full access</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    4
                  </span>
                  <span>Copy both the Private and Public keys</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
