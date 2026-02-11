'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'
import {
  Phone,
  MessageSquare,
  Shield,
  BarChart3,
  Settings,
  Send,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, SecureApiKeyInput, TestConnectionResult } from '@/components/integrations'
import type { SmsConsentStats } from '@/lib/integrations/types'

interface SmsStatus {
  connected: boolean
  provider: string
  features: {
    smsEnabled: boolean
    creatorSmsEnabled: boolean
    customerSmsEnabled: boolean
  }
  consentStats: SmsConsentStats
}

export default function SmsPage() {
  const [status, setStatus] = useState<SmsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/sms/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch SMS status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKey) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/sms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      if (response.ok) {
        setApiKey('')
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to save API key:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhone) return
    setTestStatus('testing')
    try {
      const response = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage('Test message sent successfully')
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Failed to send test message')
      }
    } catch {
      setTestStatus('error')
      setTestMessage('Failed to send test message')
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
                status?.connected ? 'bg-purple-500/10' : 'bg-zinc-500/10'
              )}>
                <Phone className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-purple-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">SMS & Voice</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Customer messaging via Retell.ai
                </p>
                {status?.provider && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Provider: {status.provider}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/integrations/sms/audit-log">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Audit Log
                </Button>
              </Link>
              <Link href="/admin/integrations/sms/notifications">
                <Button variant="outline" size="sm">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TCPA Compliance Dashboard */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">TCPA Compliance</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold text-emerald-500">
                {status?.consentStats.totalOptedIn || 0}
              </p>
              <p className="text-sm text-muted-foreground">Opted In</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold text-rose-500">
                {status?.consentStats.totalOptedOut || 0}
              </p>
              <p className="text-sm text-muted-foreground">Opted Out</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">
                {status?.consentStats.optInRate || 0}%
              </p>
              <p className="text-sm text-muted-foreground">Opt-in Rate</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">
                {status?.consentStats.monthMessages || 0}
              </p>
              <p className="text-sm text-muted-foreground">Messages (30d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Statistics */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Message Statistics</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold">{status?.consentStats.todayMessages || 0}</p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold">{status?.consentStats.weekMessages || 0}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold">{status?.consentStats.monthMessages || 0}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Features</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">SMS Messaging</p>
                  <p className="text-xs text-muted-foreground">Core SMS functionality</p>
                </div>
              </div>
              <Badge variant={status?.features.smsEnabled ? 'success' : 'secondary'}>
                {status?.features.smsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Creator SMS</p>
                  <p className="text-xs text-muted-foreground">SMS to creators and contractors</p>
                </div>
              </div>
              <Badge variant={status?.features.creatorSmsEnabled ? 'success' : 'secondary'}>
                {status?.features.creatorSmsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Customer SMS</p>
                  <p className="text-xs text-muted-foreground">SMS to customers (order updates, marketing)</p>
                </div>
              </div>
              <Badge variant={status?.features.customerSmsEnabled ? 'success' : 'secondary'}>
                {status?.features.customerSmsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      {status?.connected && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Send Test Message</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button onClick={handleSendTestMessage} disabled={!testPhone || testStatus === 'testing'}>
                {testStatus === 'testing' ? 'Sending...' : 'Send Test'}
              </Button>
            </div>

            {testStatus !== 'idle' && (
              <div className="mt-4">
                <TestConnectionResult status={testStatus} message={testMessage} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Key Configuration */}
      {!status?.connected && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Connect SMS Provider</h3>

            <div className="space-y-4">
              <SecureApiKeyInput
                value={apiKey}
                onChange={setApiKey}
                label="Retell.ai API Key"
                description="Get your API key from the Retell.ai dashboard"
                placeholder="ret_..."
              />

              <Button onClick={handleSaveApiKey} disabled={saving || !apiKey}>
                {saving ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Categories */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Message Categories</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Understanding message types for compliance
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-medium">Transactional</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Order confirmations, shipping updates, appointment reminders.
                No explicit consent required but must be expected.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Marketing</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Promotions, sales, new products. Requires explicit written consent
                and clear opt-out instructions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
