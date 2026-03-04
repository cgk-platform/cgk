'use client'

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
  Spinner,
  Switch,
} from '@cgk-platform/ui'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TenantConfig {
  slug: string
  name: string
  schema: string
  primaryColor: string
  secondaryColor: string
  logo: string
  domain: string
  apps?: {
    storefront?: string
    admin?: string
  }
}

interface PlatformConfigData {
  deployment: {
    name: string
    organization?: string
    mode: 'single-tenant' | 'multi-tenant'
  }
  tenants: TenantConfig[]
  vercel?: {
    team: string
    projects: string[]
  }
  hub?: {
    database?: string
    cache?: string
    provider?: string
  }
  features?: {
    multiTenant?: boolean
    shopifyIntegration?: boolean
    stripeConnect?: boolean
    wisePayments?: boolean
    creatorPortal?: boolean
    contractorPortal?: boolean
    videoTranscription?: boolean
    aiFeatures?: boolean
    analyticsIntegrations?: boolean
    openclawIntegration?: boolean
    commandCenter?: boolean
    creativeStudio?: boolean
  }
}

export default function PlatformConfigPage() {
  const [config, setConfig] = useState<PlatformConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/platform-config')
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load configuration')
      }

      setConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    const validationError = validateConfig(config)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const res = await fetch('/api/platform-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const validateConfig = (cfg: PlatformConfigData): string | null => {
    if (!cfg.deployment.name) {
      return 'Deployment name is required'
    }

    if (cfg.tenants.length === 0) {
      return 'At least one tenant is required'
    }

    for (const tenant of cfg.tenants) {
      if (!tenant.slug || !/^[a-z0-9-]+$/.test(tenant.slug)) {
        return `Invalid tenant slug: ${tenant.slug || 'empty'}. Must be lowercase alphanumeric with hyphens.`
      }

      if (!tenant.name) {
        return `Tenant name is required for slug: ${tenant.slug}`
      }

      if (!tenant.schema || !/^tenant_[a-z0-9_]+$/.test(tenant.schema)) {
        return `Invalid schema name for ${tenant.slug}. Must start with tenant_ and contain only lowercase, numbers, underscores.`
      }

      if (!tenant.primaryColor || !/^#[0-9A-F]{6}$/i.test(tenant.primaryColor)) {
        return `Invalid primary color for ${tenant.slug}. Must be hex color (#RRGGBB).`
      }

      if (!tenant.secondaryColor || !/^#[0-9A-F]{6}$/i.test(tenant.secondaryColor)) {
        return `Invalid secondary color for ${tenant.slug}. Must be hex color (#RRGGBB).`
      }

      if (!tenant.domain || tenant.domain.length < 3) {
        return `Invalid domain for ${tenant.slug}. Must be at least 3 characters.`
      }
    }

    const slugs = new Set<string>()
    const schemas = new Set<string>()
    const domains = new Set<string>()

    for (const tenant of cfg.tenants) {
      if (slugs.has(tenant.slug)) {
        return `Duplicate tenant slug: ${tenant.slug}`
      }
      slugs.add(tenant.slug)

      if (schemas.has(tenant.schema)) {
        return `Duplicate schema name: ${tenant.schema}`
      }
      schemas.add(tenant.schema)

      if (domains.has(tenant.domain)) {
        return `Duplicate domain: ${tenant.domain}`
      }
      domains.add(tenant.domain)
    }

    return null
  }

  const addTenant = () => {
    if (!config) return

    const newTenant: TenantConfig = {
      slug: '',
      name: '',
      schema: '',
      primaryColor: '#2B3E50',
      secondaryColor: '#FFB81C',
      logo: '/brands/new-brand/logo.svg',
      domain: '',
      apps: {
        storefront: '',
        admin: '',
      },
    }

    setConfig({
      ...config,
      tenants: [...config.tenants, newTenant],
    })
  }

  const removeTenant = (index: number) => {
    if (!config) return

    if (config.tenants.length === 1) {
      setError('Cannot remove the last tenant. At least one tenant is required.')
      return
    }

    setConfig({
      ...config,
      tenants: config.tenants.filter((_, i) => i !== index),
    })
  }

  const updateTenant = (index: number, field: keyof TenantConfig, value: string) => {
    if (!config) return

    const updatedTenants = [...config.tenants]
    const tenant = { ...updatedTenants[index] }

    if (field === 'apps') {
      return
    }

    if (field.startsWith('apps.')) {
      const appsField = field.split('.')[1] as 'storefront' | 'admin'
      tenant.apps = { ...tenant.apps, [appsField]: value }
    } else {
      ;(tenant as Record<string, unknown>)[field] = value
    }

    updatedTenants[index] = tenant
    setConfig({ ...config, tenants: updatedTenants })
  }

  const updateDeployment = (field: keyof PlatformConfigData['deployment'], value: string) => {
    if (!config) return
    setConfig({
      ...config,
      deployment: { ...config.deployment, [field]: value },
    })
  }

  const updateFeature = (feature: string, value: boolean) => {
    if (!config) return
    setConfig({
      ...config,
      features: { ...config.features, [feature]: value },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!config) {
    return (
      <Alert variant="error">
        <AlertDescription>Failed to load configuration</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Configuration</h1>
          <p className="text-muted-foreground">
            Manage your deployment settings, tenants, and feature flags
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving} variant="default">
          {saving ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Configuration saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deployment Settings</CardTitle>
          <CardDescription>Basic information about your deployment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deployment-name">Deployment Name</Label>
              <Input
                id="deployment-name"
                value={config.deployment.name}
                onChange={(e) => updateDeployment('name', e.target.value)}
                placeholder="e.g., My Brand Platform"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deployment-org">Organization</Label>
              <Input
                id="deployment-org"
                value={config.deployment.organization || ''}
                onChange={(e) => updateDeployment('organization', e.target.value)}
                placeholder="e.g., My Company LLC"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deployment-mode">Mode</Label>
            <Select
              id="deployment-mode"
              value={config.deployment.mode}
              onChange={(e) =>
                updateDeployment('mode', e.target.value as 'single-tenant' | 'multi-tenant')
              }
            >
              <SelectOption value="single-tenant">Single Tenant</SelectOption>
              <SelectOption value="multi-tenant">Multi-Tenant</SelectOption>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tenants</CardTitle>
              <CardDescription>Configure your brands and their settings</CardDescription>
            </div>
            <Button onClick={addTenant} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.tenants.map((tenant, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">
                  Tenant {index + 1}
                  {tenant.name ? `: ${tenant.name}` : ''}
                </h3>
                <Button
                  onClick={() => removeTenant(index)}
                  variant="ghost"
                  size="sm"
                  disabled={config.tenants.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-slug`}>Slug</Label>
                  <Input
                    id={`tenant-${index}-slug`}
                    value={tenant.slug}
                    onChange={(e) => updateTenant(index, 'slug', e.target.value)}
                    placeholder="e.g., my-brand"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase alphanumeric with hyphens
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-name`}>Name</Label>
                  <Input
                    id={`tenant-${index}-name`}
                    value={tenant.name}
                    onChange={(e) => updateTenant(index, 'name', e.target.value)}
                    placeholder="e.g., My Brand"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-schema`}>Schema</Label>
                  <Input
                    id={`tenant-${index}-schema`}
                    value={tenant.schema}
                    onChange={(e) => updateTenant(index, 'schema', e.target.value)}
                    placeholder="e.g., tenant_my_brand"
                  />
                  <p className="text-xs text-muted-foreground">Must start with tenant_</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-domain`}>Domain</Label>
                  <Input
                    id={`tenant-${index}-domain`}
                    value={tenant.domain}
                    onChange={(e) => updateTenant(index, 'domain', e.target.value)}
                    placeholder="e.g., mybrand.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-primary`}>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`tenant-${index}-primary`}
                      type="color"
                      value={tenant.primaryColor}
                      onChange={(e) => updateTenant(index, 'primaryColor', e.target.value)}
                      className="h-10 w-20"
                    />
                    <Input
                      value={tenant.primaryColor}
                      onChange={(e) => updateTenant(index, 'primaryColor', e.target.value)}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-secondary`}>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`tenant-${index}-secondary`}
                      type="color"
                      value={tenant.secondaryColor}
                      onChange={(e) => updateTenant(index, 'secondaryColor', e.target.value)}
                      className="h-10 w-20"
                    />
                    <Input
                      value={tenant.secondaryColor}
                      onChange={(e) => updateTenant(index, 'secondaryColor', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-logo`}>Logo Path</Label>
                  <Input
                    id={`tenant-${index}-logo`}
                    value={tenant.logo}
                    onChange={(e) => updateTenant(index, 'logo', e.target.value)}
                    placeholder="/brands/my-brand/logo.svg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-storefront`}>Storefront Domain</Label>
                  <Input
                    id={`tenant-${index}-storefront`}
                    value={tenant.apps?.storefront || ''}
                    onChange={(e) =>
                      updateTenant(index, 'apps.storefront' as keyof TenantConfig, e.target.value)
                    }
                    placeholder="shop.mybrand.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tenant-${index}-admin`}>Admin Domain</Label>
                  <Input
                    id={`tenant-${index}-admin`}
                    value={tenant.apps?.admin || ''}
                    onChange={(e) =>
                      updateTenant(index, 'apps.admin' as keyof TenantConfig, e.target.value)
                    }
                    placeholder="admin.mybrand.com"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-multiTenant">Multi-Tenant Support</Label>
              <Switch
                id="feature-multiTenant"
                checked={config.features?.multiTenant ?? true}
                onCheckedChange={(checked) => updateFeature('multiTenant', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-shopify">Shopify Integration</Label>
              <Switch
                id="feature-shopify"
                checked={config.features?.shopifyIntegration ?? true}
                onCheckedChange={(checked) => updateFeature('shopifyIntegration', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-stripe">Stripe Connect</Label>
              <Switch
                id="feature-stripe"
                checked={config.features?.stripeConnect ?? true}
                onCheckedChange={(checked) => updateFeature('stripeConnect', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-wise">Wise Payments</Label>
              <Switch
                id="feature-wise"
                checked={config.features?.wisePayments ?? true}
                onCheckedChange={(checked) => updateFeature('wisePayments', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-creator">Creator Portal</Label>
              <Switch
                id="feature-creator"
                checked={config.features?.creatorPortal ?? true}
                onCheckedChange={(checked) => updateFeature('creatorPortal', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-contractor">Contractor Portal</Label>
              <Switch
                id="feature-contractor"
                checked={config.features?.contractorPortal ?? true}
                onCheckedChange={(checked) => updateFeature('contractorPortal', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-video">Video Transcription</Label>
              <Switch
                id="feature-video"
                checked={config.features?.videoTranscription ?? true}
                onCheckedChange={(checked) => updateFeature('videoTranscription', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-ai">AI Features</Label>
              <Switch
                id="feature-ai"
                checked={config.features?.aiFeatures ?? true}
                onCheckedChange={(checked) => updateFeature('aiFeatures', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-analytics">Analytics Integrations</Label>
              <Switch
                id="feature-analytics"
                checked={config.features?.analyticsIntegrations ?? true}
                onCheckedChange={(checked) => updateFeature('analyticsIntegrations', checked)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">AI Agent Integration</h3>
              <p className="text-xs text-muted-foreground">
                Features powered by the openCLAW agent platform
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="feature-openclaw">openCLAW Integration</Label>
                <Switch
                  id="feature-openclaw"
                  checked={config.features?.openclawIntegration ?? false}
                  onCheckedChange={(checked) => updateFeature('openclawIntegration', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="feature-command-center">Command Center</Label>
                <Switch
                  id="feature-command-center"
                  checked={config.features?.commandCenter ?? false}
                  onCheckedChange={(checked) => updateFeature('commandCenter', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="feature-creative-studio">Creative Studio</Label>
                <Switch
                  id="feature-creative-studio"
                  checked={config.features?.creativeStudio ?? false}
                  onCheckedChange={(checked) => updateFeature('creativeStudio', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
