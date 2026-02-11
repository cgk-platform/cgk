'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'
import {
  Cpu,
  Key,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Apple,
  Monitor,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, SecureApiKeyInput } from '@/components/integrations'
import type { McpApiKey, McpCapability } from '@/lib/integrations/types'

const MCP_CAPABILITIES: McpCapability[] = [
  { id: 'blog', icon: '📝', title: 'Blog', description: 'Create & manage posts', toolCount: 5 },
  { id: 'promo-codes', icon: '🎟️', title: 'Promo Codes', description: 'Shopify discount codes', toolCount: 4 },
  { id: 'promotions', icon: '🏷️', title: 'Promotions', description: 'Schedule site-wide sales', toolCount: 4 },
  { id: 'landing', icon: '🎨', title: 'Landing Pages', description: 'Build campaign pages', toolCount: 6 },
  { id: 'ugc', icon: '📦', title: 'UGC Orders', description: 'Send free samples', toolCount: 3 },
  { id: 'config', icon: '⚙️', title: 'Site Config', description: 'Edit hero, nav, footer', toolCount: 5 },
  { id: 'reviews', icon: '⭐', title: 'Yotpo Reviews', description: 'Feature reviews', toolCount: 3 },
  { id: 'scheduling', icon: '📅', title: 'Scheduling', description: 'Calendly-style bookings', toolCount: 4 },
  { id: 'calendar', icon: '🗓️', title: 'Calendar Assistant', description: 'Personal calendar', toolCount: 3 },
  { id: 'analytics', icon: '📊', title: 'Analytics', description: 'Revenue insights', toolCount: 4 },
  { id: 'subscription-emails', icon: '📧', title: 'Subscription Emails', description: 'Email templates', toolCount: 3 },
  { id: 'slack', icon: '💬', title: 'Slack', description: 'Full workspace control', toolCount: 45 },
]

interface McpStatus {
  connected: boolean
  apiKeys: McpApiKey[]
  serverUrl: string
}

export default function McpPage() {
  const [status, setStatus] = useState<McpStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<'macos' | 'windows'>('macos')
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [copiedConfig, setCopiedConfig] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/mcp/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch MCP status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleCreateKey = async () => {
    if (!newKeyName) return
    setCreatingKey(true)

    try {
      const response = await fetch('/api/admin/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await response.json()

      if (response.ok) {
        setNewKeyValue(data.key)
        setNewKeyName('')
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to create key:', error)
    } finally {
      setCreatingKey(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return

    try {
      await fetch(`/api/admin/mcp/keys/${keyId}`, {
        method: 'DELETE',
      })
      await fetchStatus()
    } catch (error) {
      console.error('Failed to revoke key:', error)
    }
  }

  const getClaudeConfig = () => {
    const serverUrl = status?.serverUrl || 'https://your-domain.com/api/mcp'
    const apiKey = status?.apiKeys[0]?.prefix ? `${status.apiKeys[0].prefix}...` : 'YOUR_API_KEY'

    if (platform === 'macos') {
      return `{
  "mcpServers": {
    "cgk": {
      "command": "npx",
      "args": ["-y", "@cgk/mcp-server"],
      "env": {
        "CGK_API_KEY": "${apiKey}",
        "CGK_SERVER_URL": "${serverUrl}"
      }
    }
  }
}`
    } else {
      return `{
  "mcpServers": {
    "cgk": {
      "command": "npx.cmd",
      "args": ["-y", "@cgk/mcp-server"],
      "env": {
        "CGK_API_KEY": "${apiKey}",
        "CGK_SERVER_URL": "${serverUrl}"
      }
    }
  }
}`
    }
  }

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(getClaudeConfig())
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
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
                status?.apiKeys.length ? 'bg-rose-500/10' : 'bg-zinc-500/10'
              )}>
                <Cpu className={cn(
                  'h-7 w-7',
                  status?.apiKeys.length ? 'text-rose-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">MCP Server</h2>
                  <ConnectionStatusBadge
                    status={status?.apiKeys.length ? 'connected' : 'disconnected'}
                    details={status?.apiKeys.length ? `${status.apiKeys.length} API keys` : undefined}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Claude AI integration tools
                </p>
              </div>
            </div>

            <Link href="/admin/integrations/mcp/analytics">
              <Button variant="outline" size="sm">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">5-Minute Setup</h3>

          {/* Platform Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={platform === 'macos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlatform('macos')}
            >
              <Apple className="mr-2 h-4 w-4" />
              macOS
            </Button>
            <Button
              variant={platform === 'windows' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlatform('windows')}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Windows
            </Button>
          </div>

          <ol className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                1
              </span>
              <div className="flex-1">
                <p className="font-medium">Create an API key below</p>
                <p className="text-muted-foreground">This authenticates Claude with your CGK instance</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                2
              </span>
              <div className="flex-1">
                <p className="font-medium">Copy the Claude Desktop config</p>
                <div className="mt-2 relative">
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">
                    {getClaudeConfig()}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={handleCopyConfig}
                  >
                    {copiedConfig ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                3
              </span>
              <div className="flex-1">
                <p className="font-medium">Add to Claude Desktop</p>
                <p className="text-muted-foreground">
                  {platform === 'macos'
                    ? 'Paste into ~/Library/Application Support/Claude/claude_desktop_config.json'
                    : 'Paste into %APPDATA%\\Claude\\claude_desktop_config.json'}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                4
              </span>
              <div className="flex-1">
                <p className="font-medium">Restart Claude Desktop</p>
                <p className="text-muted-foreground">The CGK tools will appear in the tool selector</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">API Keys</h3>
            </div>
          </div>

          {/* Create New Key */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Claude Desktop)"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <Button onClick={handleCreateKey} disabled={!newKeyName || creatingKey}>
              <Plus className="mr-2 h-4 w-4" />
              {creatingKey ? 'Creating...' : 'Create Key'}
            </Button>
          </div>

          {/* New Key Display */}
          {newKeyValue && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-emerald-500">API Key Created</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Copy this key now. You won't be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-sm">
                      {newKeyValue}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(newKeyValue)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key List */}
          <div className="space-y-2">
            {status?.apiKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No API keys yet. Create one to get started.
              </div>
            ) : (
              status?.apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{key.prefix}...</span>
                      <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeKey(key.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capability Reference */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Capabilities</h3>
            <Badge variant="secondary" className="ml-auto">
              {MCP_CAPABILITIES.reduce((acc, cap) => acc + (cap.toolCount || 0), 0)} tools
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MCP_CAPABILITIES.map((cap) => (
              <div key={cap.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cap.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cap.title}</p>
                    <p className="text-xs text-muted-foreground">{cap.description}</p>
                  </div>
                  {cap.toolCount && (
                    <Badge variant="secondary" className="text-xs">
                      {cap.toolCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Troubleshooting</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-medium">Tools not appearing in Claude?</p>
              <p className="text-muted-foreground">
                Make sure you've restarted Claude Desktop after updating the config file.
                Check that the config JSON is valid (no trailing commas).
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Authentication errors?</p>
              <p className="text-muted-foreground">
                Verify your API key is correct and hasn't been revoked.
                Check the server URL matches your deployment.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Need Claude Web/Mobile access?</p>
              <p className="text-muted-foreground">
                Claude Connect for web and mobile requires OAuth authentication.
                Contact support for enterprise OAuth client setup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
