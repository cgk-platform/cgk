'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  CreditCard,
  Mail,
  Globe,
  Cpu,
  Video,
  Mic,
  Bot,
  Sparkles,
} from 'lucide-react'

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cgk-platform/ui'

// Types
interface TenantCredentialStatus {
  service: string
  displayName: string
  connected: boolean
  lastVerifiedAt: string | null
  hasError: boolean
  errorMessage: string | null
  accountInfo?: Record<string, unknown>
}

interface ApiCredentialsResponse {
  stripe: TenantCredentialStatus | null
  resend: TenantCredentialStatus | null
  wise: TenantCredentialStatus | null
  services: TenantCredentialStatus[]
}

// Service definitions
const SERVICES = {
  stripe: {
    name: 'Stripe',
    description: 'Accept payments and process payouts',
    icon: CreditCard,
    category: 'payments',
  },
  resend: {
    name: 'Resend',
    description: 'Send transactional emails',
    icon: Mail,
    category: 'email',
  },
  wise: {
    name: 'Wise',
    description: 'International payouts to creators',
    icon: Globe,
    category: 'payments',
  },
  mux: {
    name: 'Mux Video',
    description: 'Video hosting and streaming',
    icon: Video,
    category: 'media',
  },
  assemblyai: {
    name: 'AssemblyAI',
    description: 'Audio transcription and AI',
    icon: Mic,
    category: 'ai',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'AI assistant and automation',
    icon: Bot,
    category: 'ai',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models and embeddings',
    icon: Sparkles,
    category: 'ai',
  },
} as const

type ServiceId = keyof typeof SERVICES

// Credential form component
function CredentialForm({
  service,
  currentStatus,
  onSave,
  onDelete,
  onVerify,
  loading,
}: {
  service: ServiceId
  currentStatus: TenantCredentialStatus | null
  onSave: (data: Record<string, string>) => Promise<void>
  onDelete: () => Promise<void>
  onVerify: () => Promise<void>
  loading: boolean
}) {
  const info = SERVICES[service]
  const Icon = info.icon
  const [showSecrets, setShowSecrets] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(!currentStatus?.connected)

  // Service-specific fields
  const fields = getServiceFields(service)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave(formData)
    setIsEditing(false)
    setFormData({})
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to disconnect ${info.name}?`)) {
      return
    }
    await onDelete()
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{info.name}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentStatus?.connected ? (
              <>
                <Badge variant={currentStatus.hasError ? 'destructive' : 'default'}>
                  {currentStatus.hasError ? (
                    <>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Error
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </>
                  )}
                </Badge>
              </>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentStatus?.connected && !isEditing ? (
          <div className="space-y-4">
            {currentStatus.lastVerifiedAt && (
              <p className="text-sm text-muted-foreground">
                Last verified: {new Date(currentStatus.lastVerifiedAt).toLocaleString()}
              </p>
            )}
            {currentStatus.hasError && currentStatus.errorMessage && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{currentStatus.errorMessage}</AlertDescription>
              </Alert>
            )}
            {currentStatus.accountInfo && Object.keys(currentStatus.accountInfo).length > 0 && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">Account Info</p>
                {Object.entries(currentStatus.accountInfo).map(([key, value]) => (
                  <p key={key} className="text-muted-foreground">
                    {key}: {String(value)}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Update Credentials
              </Button>
              <Button variant="outline" size="sm" onClick={onVerify} disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Verify
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <div className="relative mt-1">
                  <Input
                    id={field.name}
                    type={field.secret && !showSecrets ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                  />
                  {field.secret && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {currentStatus?.connected ? 'Update' : 'Connect'}
              </Button>
              {currentStatus?.connected && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

// Service-specific field definitions
function getServiceFields(service: ServiceId) {
  switch (service) {
    case 'stripe':
      return [
        {
          name: 'secretKey',
          label: 'Secret Key',
          placeholder: 'sk_live_...',
          secret: true,
          required: true,
          hint: 'Found in Stripe Dashboard > Developers > API keys',
        },
        {
          name: 'publishableKey',
          label: 'Publishable Key',
          placeholder: 'pk_live_...',
          secret: false,
          required: false,
          hint: 'Optional - for client-side Stripe.js',
        },
        {
          name: 'webhookSecret',
          label: 'Webhook Secret',
          placeholder: 'whsec_...',
          secret: true,
          required: false,
          hint: 'Optional - for receiving Stripe webhooks',
        },
      ]
    case 'resend':
      return [
        {
          name: 'apiKey',
          label: 'API Key',
          placeholder: 're_...',
          secret: true,
          required: true,
          hint: 'Found in Resend Dashboard > API Keys',
        },
        {
          name: 'defaultFromEmail',
          label: 'Default From Email',
          placeholder: 'orders@yourdomain.com',
          secret: false,
          required: false,
          hint: 'Must be a verified domain in Resend',
        },
        {
          name: 'defaultFromName',
          label: 'Default From Name',
          placeholder: 'Your Store',
          secret: false,
          required: false,
        },
      ]
    case 'wise':
      return [
        {
          name: 'apiKey',
          label: 'API Token',
          placeholder: 'Your Wise API token',
          secret: true,
          required: true,
          hint: 'Found in Wise Business > Settings > API tokens',
        },
        {
          name: 'webhookSecret',
          label: 'Webhook Secret',
          placeholder: 'Your webhook signature key',
          secret: true,
          required: false,
        },
      ]
    case 'mux':
      return [
        {
          name: 'apiKey',
          label: 'Token ID',
          placeholder: 'Your Mux Token ID',
          secret: false,
          required: true,
          hint: 'Found in Mux Dashboard > Settings > API Access Tokens',
        },
        {
          name: 'apiSecret',
          label: 'Token Secret',
          placeholder: 'Your Mux Token Secret',
          secret: true,
          required: true,
        },
      ]
    case 'assemblyai':
      return [
        {
          name: 'apiKey',
          label: 'API Key',
          placeholder: 'Your AssemblyAI API key',
          secret: true,
          required: true,
          hint: 'Found in AssemblyAI Dashboard',
        },
      ]
    case 'anthropic':
      return [
        {
          name: 'apiKey',
          label: 'API Key',
          placeholder: 'sk-ant-...',
          secret: true,
          required: true,
          hint: 'Found in Anthropic Console > API Keys',
        },
      ]
    case 'openai':
      return [
        {
          name: 'apiKey',
          label: 'API Key',
          placeholder: 'sk-...',
          secret: true,
          required: true,
          hint: 'Found in OpenAI Dashboard > API Keys',
        },
      ]
    default:
      return [
        {
          name: 'apiKey',
          label: 'API Key',
          placeholder: 'Your API key',
          secret: true,
          required: true,
        },
      ]
  }
}

// Main page component
export default function TenantCredentialsPage() {
  const [credentials, setCredentials] = useState<ApiCredentialsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integrations/credentials')
      if (!res.ok) throw new Error('Failed to fetch credentials')
      const data = await res.json()
      setCredentials(data)
    } catch (err) {
      console.error('Failed to fetch credentials:', err)
      setError('Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

  // Save credentials for a specific service
  async function handleSave(service: string, data: Record<string, string>) {
    setActionLoading(service)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/integrations/credentials/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save credentials')
      }

      await fetchCredentials()
      setSuccess(`${SERVICES[service as ServiceId]?.name || service} connected successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setActionLoading(null)
    }
  }

  // Delete credentials for a service
  async function handleDelete(service: string) {
    setActionLoading(service)
    setError(null)

    try {
      const res = await fetch(`/api/admin/integrations/credentials/${service}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete credentials')

      await fetchCredentials()
      setSuccess(`${SERVICES[service as ServiceId]?.name || service} disconnected`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credentials')
    } finally {
      setActionLoading(null)
    }
  }

  // Verify credentials
  async function handleVerify(service: string) {
    setActionLoading(service)
    setError(null)

    try {
      const res = await fetch(`/api/admin/integrations/credentials/${service}/verify`, {
        method: 'POST',
      })

      const data = await res.json()
      if (!data.valid) {
        throw new Error(data.error || 'Verification failed')
      }

      await fetchCredentials()
      setSuccess(`${SERVICES[service as ServiceId]?.name || service} verified successfully`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setActionLoading(null)
    }
  }

  // Get status for a service
  function getStatus(service: string): TenantCredentialStatus | null {
    if (!credentials) return null

    if (service === 'stripe') return credentials.stripe
    if (service === 'resend') return credentials.resend
    if (service === 'wise') return credentials.wise

    return credentials.services.find((s) => s.service === service) || null
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
          <h2 className="text-lg font-semibold">API Credentials</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your own accounts for payments, email, video, and AI services.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCredentials} disabled={loading}>
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

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="media">
            <Video className="mr-2 h-4 w-4" />
            Media
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Cpu className="mr-2 h-4 w-4" />
            AI Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6 space-y-4">
          <CredentialForm
            service="stripe"
            currentStatus={getStatus('stripe')}
            onSave={(data) => handleSave('stripe', data)}
            onDelete={() => handleDelete('stripe')}
            onVerify={() => handleVerify('stripe')}
            loading={actionLoading === 'stripe'}
          />
          <CredentialForm
            service="wise"
            currentStatus={getStatus('wise')}
            onSave={(data) => handleSave('wise', data)}
            onDelete={() => handleDelete('wise')}
            onVerify={() => handleVerify('wise')}
            loading={actionLoading === 'wise'}
          />
        </TabsContent>

        <TabsContent value="email" className="mt-6 space-y-4">
          <CredentialForm
            service="resend"
            currentStatus={getStatus('resend')}
            onSave={(data) => handleSave('resend', data)}
            onDelete={() => handleDelete('resend')}
            onVerify={() => handleVerify('resend')}
            loading={actionLoading === 'resend'}
          />
        </TabsContent>

        <TabsContent value="media" className="mt-6 space-y-4">
          <CredentialForm
            service="mux"
            currentStatus={getStatus('mux')}
            onSave={(data) => handleSave('mux', data)}
            onDelete={() => handleDelete('mux')}
            onVerify={() => handleVerify('mux')}
            loading={actionLoading === 'mux'}
          />
          <CredentialForm
            service="assemblyai"
            currentStatus={getStatus('assemblyai')}
            onSave={(data) => handleSave('assemblyai', data)}
            onDelete={() => handleDelete('assemblyai')}
            onVerify={() => handleVerify('assemblyai')}
            loading={actionLoading === 'assemblyai'}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6 space-y-4">
          <CredentialForm
            service="anthropic"
            currentStatus={getStatus('anthropic')}
            onSave={(data) => handleSave('anthropic', data)}
            onDelete={() => handleDelete('anthropic')}
            onVerify={() => handleVerify('anthropic')}
            loading={actionLoading === 'anthropic'}
          />
          <CredentialForm
            service="openai"
            currentStatus={getStatus('openai')}
            onSave={(data) => handleSave('openai', data)}
            onDelete={() => handleDelete('openai')}
            onVerify={() => handleVerify('openai')}
            loading={actionLoading === 'openai'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
