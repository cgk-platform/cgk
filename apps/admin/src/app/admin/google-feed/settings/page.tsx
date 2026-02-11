'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface GoogleFeedSettings {
  id: string
  merchantId: string | null
  feedName: string
  feedToken: string
  targetCountry: string
  language: string
  currency: string
  updateFrequency: 'hourly' | 'daily' | 'weekly'
  feedFormat: 'xml' | 'json' | 'tsv'
  defaultBrand: string | null
  defaultAvailability: string
  defaultCondition: string
  defaultShippingLabel: string | null
  exclusionRules: Array<{ type: string; value: string; enabled: boolean }>
  categoryMapping: Record<string, string>
  customLabelRules: Record<string, unknown>
  includeVariants: boolean
  includeOutOfStock: boolean
  minimumPriceCents: number
  isConnected: boolean
  connectionVerifiedAt: string | null
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
]

const CURRENCIES = ['USD', 'CAD', 'GBP', 'AUD', 'EUR']

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
]

export default function GoogleFeedSettingsPage() {
  const [settings, setSettings] = useState<GoogleFeedSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  const [formData, setFormData] = useState<{
    merchantId: string
    feedName: string
    targetCountry: string
    language: string
    currency: string
    updateFrequency: 'hourly' | 'daily' | 'weekly'
    feedFormat: 'xml' | 'json' | 'tsv'
    defaultBrand: string
    defaultAvailability: string
    defaultCondition: string
    includeVariants: boolean
    includeOutOfStock: boolean
    minimumPriceCents: number
  }>({
    merchantId: '',
    feedName: 'Product Feed',
    targetCountry: 'US',
    language: 'en',
    currency: 'USD',
    updateFrequency: 'daily',
    feedFormat: 'xml',
    defaultBrand: '',
    defaultAvailability: 'in_stock',
    defaultCondition: 'new',
    includeVariants: true,
    includeOutOfStock: false,
    minimumPriceCents: 0,
  })

  const [exclusionRules, setExclusionRules] = useState<Array<{ type: string; value: string; enabled: boolean }>>([])

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/google-feed/settings')
        if (res.ok) {
          const { settings: loadedSettings } = await res.json()
          if (loadedSettings) {
            setSettings(loadedSettings)
            setFormData({
              merchantId: loadedSettings.merchantId || '',
              feedName: loadedSettings.feedName || 'Product Feed',
              targetCountry: loadedSettings.targetCountry || 'US',
              language: loadedSettings.language || 'en',
              currency: loadedSettings.currency || 'USD',
              updateFrequency: loadedSettings.updateFrequency || 'daily',
              feedFormat: loadedSettings.feedFormat || 'xml',
              defaultBrand: loadedSettings.defaultBrand || '',
              defaultAvailability: loadedSettings.defaultAvailability || 'in_stock',
              defaultCondition: loadedSettings.defaultCondition || 'new',
              includeVariants: loadedSettings.includeVariants ?? true,
              includeOutOfStock: loadedSettings.includeOutOfStock ?? false,
              minimumPriceCents: loadedSettings.minimumPriceCents || 0,
            })
            setExclusionRules(loadedSettings.exclusionRules || [])
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/google-feed/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          exclusionRules,
        }),
      })

      if (res.ok) {
        const { settings: updatedSettings } = await res.json()
        setSettings(updatedSettings)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/google-feed/settings/test-connection', {
        method: 'POST',
      })
      const result = await res.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: 'Connection test failed' })
    } finally {
      setTesting(false)
    }
  }

  const addExclusionRule = () => {
    setExclusionRules([
      ...exclusionRules,
      { type: 'tag', value: '', enabled: true },
    ])
  }

  const updateExclusionRule = (index: number, field: keyof (typeof exclusionRules)[number], value: string | boolean) => {
    const updated = [...exclusionRules]
    const currentRule = updated[index]
    if (currentRule) {
      updated[index] = { ...currentRule, [field]: value }
      setExclusionRules(updated)
    }
  }

  const removeExclusionRule = (index: number) => {
    setExclusionRules(exclusionRules.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const feedUrl = settings?.feedToken
    ? `${window.location.origin}/api/feeds/google/${settings.feedToken}/products.${formData.feedFormat}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feed Settings</h1>
          <p className="text-muted-foreground">
            Configure your Google Merchant Center integration
          </p>
        </div>
        <Link
          href="/admin/google-feed"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Overview
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="space-y-8"
      >
        {/* Merchant Center Connection */}
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Merchant Center Connection</h2>
          <p className="text-sm text-muted-foreground">
            Connect to Google Merchant Center for automatic feed updates
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Merchant ID</label>
              <input
                type="text"
                value={formData.merchantId}
                onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                placeholder="123456789"
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !formData.merchantId}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <span
                  className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}
                >
                  {testResult.success ? 'Connected!' : testResult.error}
                </span>
              )}
            </div>
          </div>

          {settings?.isConnected && (
            <div className="mt-4 rounded-md bg-green-50 p-3">
              <p className="text-sm text-green-800">
                Connected to Merchant Center
                {settings.connectionVerifiedAt && (
                  <span className="ml-2 text-green-600">
                    (verified {new Date(settings.connectionVerifiedAt).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Feed Configuration */}
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Feed Configuration</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Feed Name</label>
              <input
                type="text"
                value={formData.feedName}
                onChange={(e) => setFormData({ ...formData, feedName: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Target Country</label>
              <select
                value={formData.targetCountry}
                onChange={(e) => setFormData({ ...formData, targetCountry: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Update Frequency</label>
              <select
                value={formData.updateFrequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    updateFrequency: e.target.value as 'hourly' | 'daily' | 'weekly',
                  })
                }
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Feed Format</label>
              <select
                value={formData.feedFormat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    feedFormat: e.target.value as 'xml' | 'json' | 'tsv',
                  })
                }
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                <option value="xml">XML</option>
                <option value="json">JSON</option>
                <option value="tsv">TSV</option>
              </select>
            </div>
          </div>

          {feedUrl && (
            <div className="mt-4">
              <label className="block text-sm font-medium">Feed URL</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-muted p-2 text-sm">{feedUrl}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(feedUrl)}
                  className="rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Product Defaults */}
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Product Defaults</h2>
          <p className="text-sm text-muted-foreground">
            Default values when product data is not available
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Default Brand</label>
              <input
                type="text"
                value={formData.defaultBrand}
                onChange={(e) => setFormData({ ...formData, defaultBrand: e.target.value })}
                placeholder="Your Brand Name"
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Default Availability</label>
              <select
                value={formData.defaultAvailability}
                onChange={(e) => setFormData({ ...formData, defaultAvailability: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="preorder">Preorder</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Default Condition</label>
              <select
                value={formData.defaultCondition}
                onChange={(e) => setFormData({ ...formData, defaultCondition: e.target.value })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                <option value="new">New</option>
                <option value="refurbished">Refurbished</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.includeVariants}
                onChange={(e) => setFormData({ ...formData, includeVariants: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Include product variants separately</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.includeOutOfStock}
                onChange={(e) => setFormData({ ...formData, includeOutOfStock: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Include out of stock products</span>
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium">Minimum Price (cents)</label>
            <input
              type="number"
              value={formData.minimumPriceCents}
              onChange={(e) =>
                setFormData({ ...formData, minimumPriceCents: parseInt(e.target.value, 10) || 0 })
              }
              min={0}
              className="mt-1 block w-48 rounded-md border px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Products below this price will be excluded
            </p>
          </div>
        </section>

        {/* Exclusion Rules */}
        <section className="rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Exclusion Rules</h2>
              <p className="text-sm text-muted-foreground">
                Automatically exclude products based on rules
              </p>
            </div>
            <button
              type="button"
              onClick={addExclusionRule}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
            >
              Add Rule
            </button>
          </div>

          {exclusionRules.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No exclusion rules configured.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {exclusionRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateExclusionRule(index, 'enabled', e.target.checked)}
                    className="rounded"
                  />
                  <select
                    value={rule.type}
                    onChange={(e) => updateExclusionRule(index, 'type', e.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                  >
                    <option value="tag">Has tag</option>
                    <option value="vendor">Vendor equals</option>
                    <option value="product_type">Product type equals</option>
                    <option value="price_below">Price below (cents)</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                  {rule.type !== 'out_of_stock' && (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateExclusionRule(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeExclusionRule(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Link
            href="/admin/google-feed"
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
