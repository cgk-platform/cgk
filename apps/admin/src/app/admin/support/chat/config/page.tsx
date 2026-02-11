'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@cgk/ui'

import type { ChatWidgetConfig } from '@cgk/support'

export default function ChatConfigPage() {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/admin/support/chat/config')
        if (response.ok) {
          const data = await response.json()
          setConfig(data.config)
          setIsOnline(data.isOnline)
        }
      } catch (err) {
        setError('Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSave = async () => {
    if (!config) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/support/chat/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      setConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = <K extends keyof ChatWidgetConfig>(
    key: K,
    value: ChatWidgetConfig[K]
  ) => {
    if (config) {
      setConfig({ ...config, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-zinc-500">Loading configuration...</span>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-red-500">{error || 'Failed to load configuration'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/support/chat"
              className="text-zinc-400 hover:text-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              Chat Widget Configuration
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Customize your chat widget appearance and behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-500'}`}
            />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look of your chat widget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig('primaryColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => updateConfig('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={config.secondaryColor}
                    onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headerText">Header Text</Label>
              <Input
                id="headerText"
                value={config.headerText}
                onChange={(e) => updateConfig('headerText', e.target.value)}
                placeholder="Chat with us"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greetingMessage">Greeting Message</Label>
              <Textarea
                id="greetingMessage"
                value={config.greetingMessage}
                onChange={(e) => updateConfig('greetingMessage', e.target.value)}
                placeholder="Hi! How can we help you today?"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Position</Label>
                <div className="flex gap-2">
                  <Button
                    variant={config.position === 'bottom-right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('position', 'bottom-right')}
                    className="flex-1"
                  >
                    Bottom Right
                  </Button>
                  <Button
                    variant={config.position === 'bottom-left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('position', 'bottom-left')}
                    className="flex-1"
                  >
                    Bottom Left
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoOpenDelay">Auto-open Delay (seconds)</Label>
                <Input
                  id="autoOpenDelay"
                  type="number"
                  value={config.autoOpenDelaySeconds ?? ''}
                  onChange={(e) =>
                    updateConfig(
                      'autoOpenDelaySeconds',
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )
                  }
                  placeholder="Disabled"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader>
            <CardTitle>Behavior</CardTitle>
            <CardDescription>Configure chat widget behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Agent Typing</Label>
                <p className="text-sm text-zinc-500">
                  Show typing indicator when agent is typing
                </p>
              </div>
              <Switch
                checked={config.showAgentTyping}
                onCheckedChange={(checked) => updateConfig('showAgentTyping', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Read Receipts</Label>
                <p className="text-sm text-zinc-500">
                  Show when messages have been read
                </p>
              </div>
              <Switch
                checked={config.showReadReceipts}
                onCheckedChange={(checked) => updateConfig('showReadReceipts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>File Uploads</Label>
                <p className="text-sm text-zinc-500">
                  Allow visitors to upload files
                </p>
              </div>
              <Switch
                checked={config.fileUploadEnabled}
                onCheckedChange={(checked) => updateConfig('fileUploadEnabled', checked)}
              />
            </div>

            {config.fileUploadEnabled && (
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={config.maxFileSizeMb}
                  onChange={(e) =>
                    updateConfig('maxFileSizeMb', parseInt(e.target.value, 10))
                  }
                  min={1}
                  max={50}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set when your chat is available. Outside these hours, visitors will see the
              offline message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Business Hours</Label>
                <p className="text-sm text-zinc-500">
                  Restrict chat availability to specific hours
                </p>
              </div>
              <Switch
                checked={config.businessHoursEnabled}
                onCheckedChange={(checked) =>
                  updateConfig('businessHoursEnabled', checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offlineMessage">Offline Message</Label>
              <Textarea
                id="offlineMessage"
                value={config.offlineMessage}
                onChange={(e) => updateConfig('offlineMessage', e.target.value)}
                placeholder="We're currently offline. Leave a message!"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
