'use client'

import { Button, Card, CardContent, Badge, Input, Label, Textarea, cn } from '@cgk/ui'
import {
  Globe,
  RefreshCw,
  Code,
  Zap,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, OAuthConnectButton, TestConnectionResult } from '@/components/integrations'

interface GoogleAdsStatus {
  connected: boolean
  mode: 'api' | 'script' | 'none'
  customerId?: string
  customerName?: string
  lastSyncedAt?: string
  tokenExpiresAt?: string
}

const GOOGLE_ADS_SCRIPT = `// CGK Google Ads Script
// Paste this script in Google Ads > Tools & Settings > Bulk Actions > Scripts

function main() {
  const ENDPOINT = '%ENDPOINT%';
  const API_KEY = '%API_KEY%';

  // Get date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRange = formatDate(thirtyDaysAgo) + ',' + formatDate(today);

  // Fetch campaign data
  const query = 'SELECT campaign.id, campaign.name, metrics.cost_micros, ' +
    'metrics.impressions, metrics.clicks, segments.date ' +
    'FROM campaign WHERE segments.date DURING LAST_30_DAYS';

  const report = AdsApp.report(query);
  const rows = report.rows();

  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    data.push({
      campaignId: row['campaign.id'],
      campaignName: row['campaign.name'],
      costMicros: row['metrics.cost_micros'],
      impressions: row['metrics.impressions'],
      clicks: row['metrics.clicks'],
      date: row['segments.date']
    });
  }

  // Send to CGK
  const response = UrlFetchApp.fetch(ENDPOINT, {
    method: 'POST',
    contentType: 'application/json',
    headers: { 'X-API-Key': API_KEY },
    payload: JSON.stringify({ data: data })
  });

  Logger.log('Sync complete: ' + response.getContentText());
}

function formatDate(date) {
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyyMMdd');
}
`

export default function GoogleAdsPage() {
  const [status, setStatus] = useState<GoogleAdsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'api' | 'script'>('api')
  const [customerId, setCustomerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/google-ads/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.mode !== 'none') {
          setMode(data.mode)
        }
        if (data.customerId) {
          setCustomerId(data.customerId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch Google Ads status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/google-ads/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Ads?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/google-ads/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({ connected: false, mode: 'none' })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleSaveScriptMode = async () => {
    if (!customerId) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/google-ads/script-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })
      if (response.ok) {
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyScript = async () => {
    const script = GOOGLE_ADS_SCRIPT
      .replace('%ENDPOINT%', `${window.location.origin}/api/admin/google-ads/script-data`)
      .replace('%API_KEY%', 'YOUR_API_KEY_HERE')

    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      const response = await fetch('/api/admin/google-ads/test', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage(`Connected to ${data.customerName}`)
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection test failed')
      }
    } catch {
      setTestStatus('error')
      setTestMessage('Failed to test connection')
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
                status?.connected ? 'bg-red-500/10' : 'bg-zinc-500/10'
              )}>
                <Globe className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-red-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Google Ads</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                    details={status?.mode === 'script' ? 'Script Mode' : undefined}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search and display advertising
                </p>
                {status?.customerName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Account: {status.customerName} ({status.customerId})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.connected && status?.mode === 'api' && (
                <Button variant="outline" size="sm" onClick={handleTestConnection}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
              )}
              {status?.mode === 'api' && (
                <OAuthConnectButton
                  provider="google"
                  connected={status?.connected}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              )}
            </div>
          </div>

          {testStatus !== 'idle' && (
            <div className="mt-4">
              <TestConnectionResult status={testStatus} message={testMessage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Connection Mode</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose how to connect Google Ads. API mode provides full automation,
            while Script mode works around Google's API approval requirements.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMode('api')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                mode === 'api' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-medium">API Mode</span>
                {mode === 'api' && (
                  <Badge variant="default" className="ml-auto">Selected</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Full automation via Google Ads API. Requires API approval.
              </p>
            </button>

            <button
              onClick={() => setMode('script')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                mode === 'script' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Script Mode</span>
                {mode === 'script' && (
                  <Badge variant="default" className="ml-auto">Selected</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Use Google Ads Scripts to sync data. No API approval needed.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* API Mode Configuration */}
      {mode === 'api' && !status?.connected && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">API Access Required</p>
                <p className="text-muted-foreground">
                  Google Ads API requires approval from Google. If you don't have API access yet,
                  use Script Mode instead.
                </p>
              </div>
            </div>

            <OAuthConnectButton
              provider="google"
              connected={false}
              onConnect={handleConnect}
            />
          </CardContent>
        </Card>
      )}

      {/* Script Mode Configuration */}
      {mode === 'script' && (
        <>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Customer ID</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer-id">Google Ads Customer ID</Label>
                  <Input
                    id="customer-id"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value.replace(/[^0-9-]/g, ''))}
                    placeholder="123-456-7890"
                    className="mt-1.5 font-mono"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Found in Google Ads top-right corner. Format: XXX-XXX-XXXX
                  </p>
                </div>

                <Button onClick={handleSaveScriptMode} disabled={saving || !customerId}>
                  {saving ? 'Saving...' : 'Save Customer ID'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Google Ads Script</h3>
                <Button variant="outline" size="sm" onClick={handleCopyScript}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Script
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Copy this script and add it to Google Ads Scripts. Schedule it to run daily
                to sync your spend data.
              </p>

              <div className="relative">
                <Textarea
                  value={GOOGLE_ADS_SCRIPT.slice(0, 500) + '...'}
                  readOnly
                  className="h-40 font-mono text-xs"
                />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to Google Ads {">"} Tools & Settings {">"} Bulk Actions {">"} Scripts</li>
                  <li>Click the + button to create a new script</li>
                  <li>Paste the copied script</li>
                  <li>Replace YOUR_API_KEY_HERE with your CGK API key</li>
                  <li>Authorize and schedule the script to run daily</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
