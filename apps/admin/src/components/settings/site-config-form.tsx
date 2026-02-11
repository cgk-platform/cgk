'use client'

import { Button, Card, CardContent, cn, Spinner } from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import {
  ColorField,
  ErrorAlert,
  NumberField,
  SaveButton,
  SelectField,
  SettingsSection,
  TextField,
  ToggleField,
  UnsavedChangesBanner,
} from './form-elements'

import type { SiteConfig, SiteConfigUpdate } from '@/lib/settings/types'

interface SiteConfigFormProps {
  initialConfig?: SiteConfig | null
}

type TabId = 'pricing' | 'promotions' | 'banners' | 'branding' | 'navigation' | 'analytics'

const TABS: { id: TabId; label: string }[] = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'banners', label: 'Banners' },
  { id: 'branding', label: 'Branding' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'analytics', label: 'Analytics' },
]

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
]

export function SiteConfigForm({ initialConfig }: SiteConfigFormProps) {
  const [config, setConfig] = useState<SiteConfig | null>(initialConfig ?? null)
  const [originalConfig, setOriginalConfig] = useState<SiteConfig | null>(
    initialConfig ?? null
  )
  const [activeTab, setActiveTab] = useState<TabId>('pricing')
  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/config')

      if (!res.ok) throw new Error('Failed to load site configuration')

      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialConfig) {
      fetchConfig()
    }
  }, [initialConfig, fetchConfig])

  const isDirty =
    config && originalConfig
      ? JSON.stringify(config) !== JSON.stringify(originalConfig)
      : false

  const handleSave = async () => {
    if (!config || !isDirty) return

    setIsSaving(true)
    setError(null)

    try {
      const updates: SiteConfigUpdate = {
        pricingConfig: config.pricingConfig,
        saleActive: config.saleActive,
        saleName: config.saleName,
        saleStartDate: config.saleStartDate,
        saleEndDate: config.saleEndDate,
        saleConfig: config.saleConfig,
        announcementBarEnabled: config.announcementBarEnabled,
        announcementBarText: config.announcementBarText,
        announcementBarLink: config.announcementBarLink,
        announcementBarBgColor: config.announcementBarBgColor,
        announcementBarTextColor: config.announcementBarTextColor,
        promoBanners: config.promoBanners,
        logoUrl: config.logoUrl,
        logoDarkUrl: config.logoDarkUrl,
        faviconUrl: config.faviconUrl,
        brandColors: config.brandColors,
        brandFonts: config.brandFonts,
        headerNav: config.headerNav,
        footerNav: config.footerNav,
        socialLinks: config.socialLinks,
        defaultMetaTitle: config.defaultMetaTitle,
        defaultMetaDescription: config.defaultMetaDescription,
        ga4MeasurementId: config.ga4MeasurementId,
        fbPixelId: config.fbPixelId,
        tiktokPixelId: config.tiktokPixelId,
      }

      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const updateConfig = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    if (!config) return
    setConfig({ ...config, [key]: value })
    setIsSaved(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErrorAlert message="Failed to load site configuration" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesBanner show={isDirty} />

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-none border-b-2 px-4',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'pricing' && <PricingTab config={config} updateConfig={updateConfig} />}
      {activeTab === 'promotions' && (
        <PromotionsTab config={config} updateConfig={updateConfig} />
      )}
      {activeTab === 'banners' && <BannersTab config={config} updateConfig={updateConfig} />}
      {activeTab === 'branding' && <BrandingTab config={config} updateConfig={updateConfig} />}
      {activeTab === 'navigation' && (
        <NavigationTab config={config} updateConfig={updateConfig} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab config={config} updateConfig={updateConfig} />
      )}

      <div className="flex justify-end">
        <SaveButton
          isDirty={isDirty}
          isLoading={isSaving}
          isSaved={isSaved}
          onClick={handleSave}
        />
      </div>
    </div>
  )
}

interface TabProps {
  config: SiteConfig
  updateConfig: <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => void
}

function PricingTab({ config, updateConfig }: TabProps) {
  const pricing = config.pricingConfig || {}

  const updatePricing = (updates: Partial<SiteConfig['pricingConfig']>) => {
    updateConfig('pricingConfig', { ...pricing, ...updates })
  }

  return (
    <SettingsSection
      title="Product Pricing"
      description="Configure base prices and discounts for your products."
    >
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 font-medium">Subscription Discounts</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Individual Subscription Discount"
              description="Discount for single-product subscriptions"
              value={pricing.subscription?.individual?.discount ?? 0}
              onChange={(value) =>
                updatePricing({
                  subscription: {
                    ...pricing.subscription,
                    individual: { discount: value ?? 0 },
                  },
                })
              }
              min={0}
              max={100}
              suffix="%"
            />
            <NumberField
              label="Bundle Subscription Discount"
              description="Discount for bundle subscriptions"
              value={pricing.subscription?.bundle?.discount ?? 0}
              onChange={(value) =>
                updatePricing({
                  subscription: {
                    ...pricing.subscription,
                    bundle: { discount: value ?? 0 },
                  },
                })
              }
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-medium">One-Time Purchase Discounts</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Individual One-Time Discount"
              description="Discount for single-product one-time purchases"
              value={pricing.oneTime?.individual?.discount ?? 0}
              onChange={(value) =>
                updatePricing({
                  oneTime: {
                    ...pricing.oneTime,
                    individual: { discount: value ?? 0 },
                  },
                })
              }
              min={0}
              max={100}
              suffix="%"
            />
            <NumberField
              label="Bundle One-Time Discount"
              description="Discount for bundle one-time purchases"
              value={pricing.oneTime?.bundle?.discount ?? 0}
              onChange={(value) =>
                updatePricing({
                  oneTime: {
                    ...pricing.oneTime,
                    bundle: { discount: value ?? 0 },
                  },
                })
              }
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}

function PromotionsTab({ config, updateConfig }: TabProps) {
  return (
    <SettingsSection
      title="Promotions & Sales"
      description="Configure active promotions and sale events."
    >
      <ToggleField
        label="Sale Active"
        description="Enable the current sale or promotion."
        checked={config.saleActive}
        onChange={(checked) => updateConfig('saleActive', checked)}
      />

      {config.saleActive && (
        <>
          <TextField
            label="Sale Name"
            description="Display name for the current sale."
            value={config.saleName || ''}
            onChange={(value) => updateConfig('saleName', value || null)}
            placeholder="Summer Sale"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="datetime-local"
                value={config.saleStartDate?.slice(0, 16) || ''}
                onChange={(e) =>
                  updateConfig('saleStartDate', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="datetime-local"
                value={config.saleEndDate?.slice(0, 16) || ''}
                onChange={(e) =>
                  updateConfig('saleEndDate', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
          </div>
        </>
      )}
    </SettingsSection>
  )
}

function BannersTab({ config, updateConfig }: TabProps) {
  return (
    <SettingsSection
      title="Announcement Bar"
      description="Configure the top announcement bar on your storefront."
    >
      <ToggleField
        label="Enable Announcement Bar"
        description="Show the announcement bar at the top of your storefront."
        checked={config.announcementBarEnabled}
        onChange={(checked) => updateConfig('announcementBarEnabled', checked)}
      />

      {config.announcementBarEnabled && (
        <>
          <TextField
            label="Announcement Text"
            description="The message to display in the announcement bar."
            value={config.announcementBarText || ''}
            onChange={(value) => updateConfig('announcementBarText', value || null)}
            placeholder="Free shipping on orders over $50!"
            maxLength={200}
          />

          <TextField
            label="Link URL"
            description="Optional link when clicking the announcement bar."
            value={config.announcementBarLink || ''}
            onChange={(value) => updateConfig('announcementBarLink', value || null)}
            placeholder="/collections/sale"
            type="url"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Background Color"
              value={config.announcementBarBgColor}
              onChange={(value) => updateConfig('announcementBarBgColor', value)}
            />
            <ColorField
              label="Text Color"
              value={config.announcementBarTextColor}
              onChange={(value) => updateConfig('announcementBarTextColor', value)}
            />
          </div>
        </>
      )}
    </SettingsSection>
  )
}

function BrandingTab({ config, updateConfig }: TabProps) {
  const updateBrandColors = (key: string, value: string) => {
    updateConfig('brandColors', { ...config.brandColors, [key]: value })
  }

  const updateBrandFonts = (key: string, value: string) => {
    updateConfig('brandFonts', { ...config.brandFonts, [key]: value })
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Logos" description="Upload your brand logos.">
        <TextField
          label="Logo URL"
          description="URL to your primary logo image."
          value={config.logoUrl || ''}
          onChange={(value) => updateConfig('logoUrl', value || null)}
          placeholder="https://..."
          type="url"
        />
        <TextField
          label="Dark Mode Logo URL"
          description="URL to your logo for dark mode (optional)."
          value={config.logoDarkUrl || ''}
          onChange={(value) => updateConfig('logoDarkUrl', value || null)}
          placeholder="https://..."
          type="url"
        />
        <TextField
          label="Favicon URL"
          description="URL to your favicon (32x32 recommended)."
          value={config.faviconUrl || ''}
          onChange={(value) => updateConfig('faviconUrl', value || null)}
          placeholder="https://..."
          type="url"
        />
      </SettingsSection>

      <SettingsSection title="Brand Colors" description="Configure your brand color palette.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Primary Color"
            value={config.brandColors?.primary || '#000000'}
            onChange={(value) => updateBrandColors('primary', value)}
          />
          <ColorField
            label="Secondary Color"
            value={config.brandColors?.secondary || '#374d42'}
            onChange={(value) => updateBrandColors('secondary', value)}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Typography" description="Configure your brand fonts.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Heading Font"
            value={config.brandFonts?.heading || 'Inter'}
            onChange={(value) => updateBrandFonts('heading', value)}
            options={FONT_OPTIONS}
          />
          <SelectField
            label="Body Font"
            value={config.brandFonts?.body || 'Inter'}
            onChange={(value) => updateBrandFonts('body', value)}
            options={FONT_OPTIONS}
          />
        </div>
      </SettingsSection>
    </div>
  )
}

function NavigationTab({ config, updateConfig }: TabProps) {
  const updateSocialLink = (key: string, value: string) => {
    updateConfig('socialLinks', { ...config.socialLinks, [key]: value || undefined })
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Social Links"
        description="Links to your social media profiles."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Facebook"
            value={config.socialLinks?.facebook || ''}
            onChange={(value) => updateSocialLink('facebook', value)}
            placeholder="https://facebook.com/..."
            type="url"
          />
          <TextField
            label="Instagram"
            value={config.socialLinks?.instagram || ''}
            onChange={(value) => updateSocialLink('instagram', value)}
            placeholder="https://instagram.com/..."
            type="url"
          />
          <TextField
            label="Twitter / X"
            value={config.socialLinks?.twitter || ''}
            onChange={(value) => updateSocialLink('twitter', value)}
            placeholder="https://twitter.com/..."
            type="url"
          />
          <TextField
            label="TikTok"
            value={config.socialLinks?.tiktok || ''}
            onChange={(value) => updateSocialLink('tiktok', value)}
            placeholder="https://tiktok.com/@..."
            type="url"
          />
          <TextField
            label="YouTube"
            value={config.socialLinks?.youtube || ''}
            onChange={(value) => updateSocialLink('youtube', value)}
            placeholder="https://youtube.com/..."
            type="url"
          />
          <TextField
            label="LinkedIn"
            value={config.socialLinks?.linkedin || ''}
            onChange={(value) => updateSocialLink('linkedin', value)}
            placeholder="https://linkedin.com/..."
            type="url"
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Default Meta Tags" description="Default SEO meta tags.">
        <TextField
          label="Default Meta Title"
          value={config.defaultMetaTitle || ''}
          onChange={(value) => updateConfig('defaultMetaTitle', value || null)}
          placeholder="Your Store Name"
          maxLength={100}
        />
        <TextField
          label="Default Meta Description"
          value={config.defaultMetaDescription || ''}
          onChange={(value) => updateConfig('defaultMetaDescription', value || null)}
          placeholder="A short description of your store..."
          maxLength={200}
        />
      </SettingsSection>
    </div>
  )
}

function AnalyticsTab({ config, updateConfig }: TabProps) {
  return (
    <SettingsSection
      title="Analytics & Tracking"
      description="Configure your analytics and tracking pixels."
    >
      <TextField
        label="Google Analytics 4 Measurement ID"
        description="Your GA4 measurement ID (starts with G-)"
        value={config.ga4MeasurementId || ''}
        onChange={(value) => updateConfig('ga4MeasurementId', value || null)}
        placeholder="G-XXXXXXXXXX"
      />
      <TextField
        label="Meta (Facebook) Pixel ID"
        description="Your Meta Pixel ID for conversion tracking."
        value={config.fbPixelId || ''}
        onChange={(value) => updateConfig('fbPixelId', value || null)}
        placeholder="123456789012345"
      />
      <TextField
        label="TikTok Pixel ID"
        description="Your TikTok Pixel ID for conversion tracking."
        value={config.tiktokPixelId || ''}
        onChange={(value) => updateConfig('tiktokPixelId', value || null)}
        placeholder="XXXXXXXXXXXXXXXXXX"
      />
    </SettingsSection>
  )
}
