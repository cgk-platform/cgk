'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, Input } from '@cgk-platform/ui'
import { ArrowLeft, Save, Phone, Send, ExternalLink } from 'lucide-react'

export default function SmsConfigPage() {
  const [config, setConfig] = useState({
    apiKey: '',
    phoneNumberId: '',
    webhookUrl: '',
    voice: 'nat',
    model: 'turbo',
  })
  const [saving, setSaving] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/bri/integrations/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch (error) {
      console.error('Failed to save SMS config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestSms = async () => {
    if (!testPhone) return
    setTesting(true)
    try {
      await fetch('/api/admin/bri/integrations/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: testPhone }),
      })
    } catch (error) {
      console.error('Failed to send test SMS:', error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/bri/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SMS Configuration</h1>
          <p className="text-sm text-muted-foreground">Configure Retell.ai for SMS messaging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Retell.ai Settings
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">API Key</label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk_..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone Number ID</label>
              <Input
                value={config.phoneNumberId}
                onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                placeholder="pn_..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Webhook URL</label>
              <Input
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Voice</label>
              <select
                value={config.voice}
                onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="nat">Nat</option>
                <option value="josh">Josh</option>
                <option value="rachel">Rachel</option>
                <option value="maya">Maya</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="base">Base</option>
                <option value="turbo">Turbo</option>
                <option value="enhanced">Enhanced</option>
              </select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Test SMS */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Test SMS
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Phone Number</label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleTestSms}
                disabled={testing || !testPhone}
                variant="outline"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test SMS
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">Help</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To configure SMS, you'll need a Retell.ai account with a phone number provisioned.
              </p>
              <a
                href="https://www.retell.ai/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Open Retell.ai Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
