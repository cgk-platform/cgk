'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { ArrowLeft, Settings, MessageSquare, BarChart3, Palette, Target, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

import type { Survey, SurveyStatus, SurveyType, UpdateSurveyInput } from '@/lib/surveys'
import { SURVEY_TYPE_LABELS, SURVEY_STATUS_LABELS } from '@/lib/surveys'

const TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'questions', label: 'Questions', icon: MessageSquare, href: 'questions' },
  { id: 'targeting', label: 'Targeting', icon: Target },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: 'analytics' },
]

export default function SurveyEditorPage() {
  const params = useParams()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('settings')
  const [formData, setFormData] = useState<UpdateSurveyInput>({})
  const [hasChanges, setHasChanges] = useState(false)

  const fetchSurvey = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}`)
      const data = await response.json()

      if (response.ok) {
        setSurvey(data.survey)
        setFormData({
          name: data.survey.name,
          slug: data.survey.slug,
          survey_type: data.survey.survey_type,
          title: data.survey.title,
          subtitle: data.survey.subtitle,
          thank_you_message: data.survey.thank_you_message,
          redirect_url: data.survey.redirect_url,
          target_config: data.survey.target_config,
          branding_config: data.survey.branding_config,
          response_limit: data.survey.response_limit,
          expires_at: data.survey.expires_at,
        })
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchSurvey()
  }, [fetchSurvey])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setSurvey(data.survey)
      setHasChanges(false)
    } catch {
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: SurveyStatus) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const data = await response.json()
        setSurvey(data.survey)
      }
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof UpdateSurveyInput>(
    field: K,
    value: UpdateSurveyInput[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  if (loading) {
    return <SurveyEditorSkeleton />
  }

  if (error && !survey) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-red-600">{error}</p>
        <Link href="/admin/surveys" className="mt-4">
          <Button>Back to Surveys</Button>
        </Link>
      </div>
    )
  }

  if (!survey) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/surveys">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{survey.name}</h1>
              <Badge
                className={
                  survey.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : survey.status === 'draft'
                      ? 'bg-gray-100 text-gray-700'
                      : survey.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                }
              >
                {SURVEY_STATUS_LABELS[survey.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{survey.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {survey.status === 'draft' && (
            <Button onClick={() => handleStatusChange('active')} disabled={saving}>
              Publish Survey
            </Button>
          )}
          {survey.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
              disabled={saving}
            >
              Pause Survey
            </Button>
          )}
          {survey.status === 'paused' && (
            <Button onClick={() => handleStatusChange('active')} disabled={saving}>
              Resume Survey
            </Button>
          )}
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={`/admin/surveys/${surveyId}/${tab.href}`}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          }
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'settings' && (
        <SettingsTab formData={formData} updateField={updateField} />
      )}
      {activeTab === 'targeting' && (
        <TargetingTab formData={formData} updateField={updateField} />
      )}
      {activeTab === 'branding' && (
        <BrandingTab formData={formData} updateField={updateField} />
      )}
    </div>
  )
}

function SettingsTab({
  formData,
  updateField,
}: {
  formData: UpdateSurveyInput
  updateField: <K extends keyof UpdateSurveyInput>(field: K, value: UpdateSurveyInput[K]) => void
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Internal Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Survey Slug</label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) =>
                updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Survey Type</label>
            <select
              value={formData.survey_type || 'post_purchase'}
              onChange={(e) => updateField('survey_type', e.target.value as SurveyType)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(SURVEY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subtitle</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Thank You Message</label>
            <textarea
              value={formData.thank_you_message || ''}
              onChange={(e) => updateField('thank_you_message', e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Redirect URL (Optional)</label>
            <input
              type="url"
              value={formData.redirect_url || ''}
              onChange={(e) => updateField('redirect_url', e.target.value)}
              placeholder="https://example.com/thank-you"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Response Limit</label>
            <input
              type="number"
              value={formData.response_limit || ''}
              onChange={(e) =>
                updateField('response_limit', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Unlimited"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited responses
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expiration Date</label>
            <input
              type="datetime-local"
              value={formData.expires_at?.slice(0, 16) || ''}
              onChange={(e) =>
                updateField('expires_at', e.target.value ? new Date(e.target.value).toISOString() : undefined)
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TargetingTab({
  formData,
  updateField,
}: {
  formData: UpdateSurveyInput
  updateField: <K extends keyof UpdateSurveyInput>(field: K, value: UpdateSurveyInput[K]) => void
}) {
  const targetConfig = formData.target_config || {}

  const updateTargetConfig = (key: string, value: unknown) => {
    updateField('target_config', { ...targetConfig, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Targeting Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Order Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                value={targetConfig.minOrderValue || ''}
                onChange={(e) =>
                  updateTargetConfig(
                    'minOrderValue',
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="0.00"
                className="w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Maximum Order Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                value={targetConfig.maxOrderValue || ''}
                onChange={(e) =>
                  updateTargetConfig(
                    'maxOrderValue',
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="No limit"
                className="w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Product Tags (comma-separated)</label>
          <input
            type="text"
            value={(targetConfig.productTags || []).join(', ')}
            onChange={(e) =>
              updateTargetConfig(
                'productTags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
            placeholder="e.g., new-arrival, sale, premium"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Only show survey for orders containing products with these tags
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="firstTimeOnly"
            checked={targetConfig.firstTimeOnly || false}
            onChange={(e) => updateTargetConfig('firstTimeOnly', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="firstTimeOnly" className="text-sm">
            Show only to first-time customers
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="excludeDiscounted"
            checked={targetConfig.excludeDiscounted || false}
            onChange={(e) => updateTargetConfig('excludeDiscounted', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="excludeDiscounted" className="text-sm">
            Exclude orders with discount codes
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

function BrandingTab({
  formData,
  updateField,
}: {
  formData: UpdateSurveyInput
  updateField: <K extends keyof UpdateSurveyInput>(field: K, value: UpdateSurveyInput[K]) => void
}) {
  const brandingConfig = formData.branding_config || {}

  const updateBrandingConfig = (key: string, value: string) => {
    updateField('branding_config', { ...brandingConfig, [key]: value })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={brandingConfig.primaryColor || '#000000'}
                onChange={(e) => updateBrandingConfig('primaryColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <input
                type="text"
                value={brandingConfig.primaryColor || ''}
                onChange={(e) => updateBrandingConfig('primaryColor', e.target.value)}
                placeholder="#000000"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={brandingConfig.backgroundColor || '#ffffff'}
                onChange={(e) => updateBrandingConfig('backgroundColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <input
                type="text"
                value={brandingConfig.backgroundColor || ''}
                onChange={(e) => updateBrandingConfig('backgroundColor', e.target.value)}
                placeholder="#ffffff"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={brandingConfig.textColor || '#000000'}
                onChange={(e) => updateBrandingConfig('textColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <input
                type="text"
                value={brandingConfig.textColor || ''}
                onChange={(e) => updateBrandingConfig('textColor', e.target.value)}
                placeholder="#000000"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Typography & Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Family</label>
            <select
              value={brandingConfig.fontFamily || ''}
              onChange={(e) => updateBrandingConfig('fontFamily', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">System Default</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Poppins">Poppins</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Logo URL</label>
            <input
              type="url"
              value={brandingConfig.logoUrl || ''}
              onChange={(e) => updateBrandingConfig('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: brandingConfig.backgroundColor || '#ffffff',
              color: brandingConfig.textColor || '#000000',
              fontFamily: brandingConfig.fontFamily || 'inherit',
            }}
          >
            {brandingConfig.logoUrl && (
              <img
                src={brandingConfig.logoUrl}
                alt="Logo"
                className="mb-4 h-8 object-contain"
              />
            )}
            <h3
              className="text-lg font-semibold"
              style={{ color: brandingConfig.primaryColor || '#000000' }}
            >
              {formData.title || 'Survey Title'}
            </h3>
            <p className="mt-1 text-sm opacity-70">
              {formData.subtitle || 'Survey subtitle will appear here'}
            </p>
            <div className="mt-4 space-y-2">
              <div
                className="rounded-md border p-3"
                style={{ borderColor: brandingConfig.primaryColor || '#e5e7eb' }}
              >
                <span className="text-sm">Sample question option</span>
              </div>
              <div className="rounded-md border border-transparent bg-gray-100 p-3">
                <span className="text-sm">Another option</span>
              </div>
            </div>
            <button
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: brandingConfig.primaryColor || '#000000' }}
            >
              Submit
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SurveyEditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
