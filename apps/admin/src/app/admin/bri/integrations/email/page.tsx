'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, Input } from '@cgk-platform/ui'
import { ArrowLeft, Save, Mail, Send, ExternalLink } from 'lucide-react'

export default function EmailConfigPage() {
  const [config, setConfig] = useState({
    apiKey: '',
    fromEmail: '',
  })
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/bri/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch (error) {
      console.error('Failed to save email config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTesting(true)
    try {
      await fetch('/api/admin/bri/integrations/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail || undefined }),
      })
    } catch (error) {
      console.error('Failed to send test email:', error)
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
          <h1 className="text-2xl font-semibold tracking-tight">Email Configuration</h1>
          <p className="text-sm text-muted-foreground">Configure Resend for email messaging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Resend Settings
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">API Key</label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="re_..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From Email</label>
              <Input
                value={config.fromEmail}
                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                placeholder="Bri <bri@yourdomain.com>"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: Display Name &lt;email@domain.com&gt;
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Test Email */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Test Email
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  Email (optional, defaults to your email)
                </label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleTestEmail}
                disabled={testing}
                variant="outline"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">Help</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To configure email, you'll need a Resend account with a verified domain.
              </p>
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Open Resend Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
