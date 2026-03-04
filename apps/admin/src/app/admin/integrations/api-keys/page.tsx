'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk-platform/ui'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  Cpu,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  purpose: string
  scopes: string[]
  last_used_at: string | null
  created_at: string
  expires_at: string | null
}

interface CreatedKey {
  id: string
  name: string
  keyPrefix: string
  purpose: string
  createdAt: string
  key: string
}

type Purpose = 'openCLAW Agent' | 'MCP Server' | 'CI/CD' | 'Custom'

const PURPOSE_OPTIONS: { label: Purpose; value: string; icon: React.ReactNode }[] = [
  { label: 'openCLAW Agent', value: 'agent', icon: <Cpu className="h-4 w-4" /> },
  { label: 'MCP Server', value: 'mcp', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'CI/CD', value: 'ci-cd', icon: <Terminal className="h-4 w-4" /> },
  { label: 'Custom', value: 'custom', icon: <Wrench className="h-4 w-4" /> },
]

const PURPOSE_DISPLAY: Record<string, string> = {
  agent: 'openCLAW Agent',
  mcp: 'MCP Server',
  'ci-cd': 'CI/CD',
  general: 'General',
  custom: 'Custom',
}

// ---------------------------------------------------------------------------
// Setup snippets shown after key creation
// ---------------------------------------------------------------------------

function SetupSnippet({ purpose, rawKey }: { purpose: string; rawKey: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (purpose === 'agent') {
    const snippet = [
      `CGK_PLATFORM_API_URL=https://your-domain.com`,
      `CGK_PLATFORM_API_KEY=${rawKey}`,
      `CGK_PLATFORM_TENANT_SLUG=your-tenant`,
    ].join('\n')

    return (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Add to your openCLAW agent .env:
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{snippet}</pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => handleCopy(snippet)}
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (purpose === 'mcp') {
    const snippet = JSON.stringify(
      {
        mcpServers: {
          cgk: {
            command: 'npx',
            args: ['-y', '@cgk-platform/mcp-server'],
            env: {
              CGK_API_KEY: rawKey,
              CGK_SERVER_URL: 'https://your-domain.com/api/mcp',
            },
          },
        },
      },
      null,
      2
    )

    return (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Claude Desktop config (claude_desktop_config.json):
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{snippet}</pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => handleCopy(snippet)}
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (purpose === 'ci-cd') {
    const snippet = [
      `# In your GitHub Actions workflow:`,
      `# Settings > Secrets and variables > Actions > New repository secret`,
      `#`,
      `# Name:  CGK_API_KEY`,
      `# Value: ${rawKey}`,
      ``,
      `# Usage in workflow YAML:`,
      `env:`,
      `  CGK_API_KEY: \${{ secrets.CGK_API_KEY }}`,
    ].join('\n')

    return (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">GitHub Actions setup:</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{snippet}</pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => handleCopy(snippet)}
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Default / custom — just the key
  return null
}

// ---------------------------------------------------------------------------
// Revoke confirmation dialog
// ---------------------------------------------------------------------------

function RevokeDialog({
  keyName,
  onConfirm,
  onCancel,
}: {
  keyName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Revoke API key?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium">{keyName}</span> will stop working immediately. This
              action cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Revoke key
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPurpose, setNewKeyPurpose] = useState('agent')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [creating, setCreating] = useState(false)

  // Post-create banner
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState(false)

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async () => {
    if (!newKeyName) return
    setCreating(true)

    try {
      const body: Record<string, unknown> = {
        name: newKeyName,
        purpose: newKeyPurpose,
      }
      if (newKeyExpiry) {
        body.expiresAt = new Date(newKeyExpiry).toISOString()
      }

      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setCreatedKey(data as CreatedKey)
        setNewKeyName('')
        setNewKeyPurpose('agent')
        setNewKeyExpiry('')
        setShowCreateForm(false)
        await fetchKeys()
      } else {
        console.error('Failed to create API key:', data.error)
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)

    try {
      await fetch(`/api/admin/api-keys/${revokeTarget.id}`, { method: 'DELETE' })
      setRevokeTarget(null)
      await fetchKeys()
    } catch (error) {
      console.error('Failed to revoke API key:', error)
    } finally {
      setRevoking(false)
    }
  }

  const handleCopyKey = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey.key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
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
    <>
      {revokeTarget && (
        <RevokeDialog
          keyName={revokeTarget.name}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-xl',
                    apiKeys.length > 0 ? 'bg-rose-500/10' : 'bg-zinc-500/10'
                  )}
                >
                  <Key
                    className={cn(
                      'h-7 w-7',
                      apiKeys.length > 0 ? 'text-rose-500' : 'text-zinc-500'
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">API Keys</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Programmatic access for agents, MCP servers, and CI/CD pipelines
                  </p>
                </div>
              </div>

              <Button onClick={() => setShowCreateForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                New key
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create form */}
        {showCreateForm && (
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">Create API key</h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Nova Production Agent"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Purpose</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PURPOSE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewKeyPurpose(opt.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          newKeyPurpose === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Expiry date{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewKeyName('')
                      setNewKeyPurpose('agent')
                      setNewKeyExpiry('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newKeyName || creating}>
                    {creating ? 'Creating...' : 'Create key'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-create banner */}
        {createdKey && (
          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      API key created — copy it now
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      This is the only time you will see the full key.
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">
                        {createdKey.key}
                      </code>
                      <Button variant="outline" size="sm" onClick={handleCopyKey}>
                        {copiedKey ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>

                    <SetupSnippet purpose={createdKey.purpose} rawKey={createdKey.key} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setCreatedKey(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key list */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Active keys</h3>
              {apiKeys.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {apiKeys.length}
                </Badge>
              )}
            </div>

            {apiKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">No API keys yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a key to enable programmatic access for agents, MCP clients, and CI/CD
                  pipelines.
                </p>
                <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first key
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{key.name}</p>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {PURPOSE_DISPLAY[key.purpose] ?? key.purpose}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{key.key_prefix}...</span>
                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                        {key.last_used_at && (
                          <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                        )}
                        {key.expires_at && (
                          <span
                            className={cn(
                              new Date(key.expires_at) < new Date() && 'text-amber-500'
                            )}
                          >
                            Expires {new Date(key.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {key.scopes.length > 0 && <span>{key.scopes.join(', ')}</span>}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRevokeTarget(key)}
                      disabled={revoking}
                      className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* About API keys */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold">About API keys</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="font-medium">openCLAW Agent</p>
                <p className="text-muted-foreground">
                  Authenticate Nova and other openCLAW agents that read and write platform data via
                  the REST API.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">MCP Server</p>
                <p className="text-muted-foreground">
                  Authenticate Claude Desktop or other MCP clients connecting to the CGK MCP server
                  at /api/mcp.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">CI/CD</p>
                <p className="text-muted-foreground">
                  Authenticate GitHub Actions workflows, deploy scripts, or other automation that
                  interacts with the platform API.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">Security</p>
                <p className="text-muted-foreground">
                  Keys are stored as SHA-256 hashes — the raw key is shown only once at creation.
                  Revoke any key immediately if it is compromised.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
