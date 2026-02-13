'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Textarea } from '@cgk-platform/ui'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { SEOSettings } from '@/lib/landing-pages/types'

interface GlobalSEOSettingsProps {
  settings: SEOSettings
}

export function GlobalSEOSettings({ settings: initialSettings }: GlobalSEOSettingsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof SEOSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-500 bg-green-50 p-4 text-green-700 dark:bg-green-950/20 dark:text-green-400">
            Settings saved successfully.
          </div>
        )}

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Default Meta Tags</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={settings.site_name}
                onChange={(e) => update('site_name', e.target.value)}
                placeholder="Your Brand Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title-template">Title Template</Label>
              <Input
                id="title-template"
                value={settings.default_title_template}
                onChange={(e) => update('default_title_template', e.target.value)}
                placeholder="%s | Brand Name"
              />
              <p className="text-xs text-muted-foreground">
                Use %s as placeholder for page title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-description">Default Description</Label>
              <Textarea
                id="default-description"
                value={settings.default_description}
                onChange={(e) => update('default_description', e.target.value)}
                placeholder="Default meta description for pages without one..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-image">Default Open Graph Image</Label>
              <Input
                id="og-image"
                value={settings.og_default_image || ''}
                onChange={(e) => update('og_default_image', e.target.value || null)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter Handle</Label>
              <Input
                id="twitter"
                value={settings.twitter_handle || ''}
                onChange={(e) => update('twitter_handle', e.target.value || null)}
                placeholder="@yourbrand"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Verification & Indexing</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-verification">Google Site Verification</Label>
              <Input
                id="google-verification"
                value={settings.google_site_verification || ''}
                onChange={(e) => update('google_site_verification', e.target.value || null)}
                placeholder="Verification code from Google Search Console"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bing-verification">Bing Site Verification</Label>
              <Input
                id="bing-verification"
                value={settings.bing_site_verification || ''}
                onChange={(e) => update('bing_site_verification', e.target.value || null)}
                placeholder="Verification code from Bing Webmaster Tools"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="robots">robots.txt</Label>
              <Textarea
                id="robots"
                value={settings.robots_txt}
                onChange={(e) => update('robots_txt', e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sitemap"
                type="checkbox"
                checked={settings.sitemap_enabled}
                onChange={(e) => update('sitemap_enabled', e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="sitemap" className="font-normal">
                Enable automatic sitemap generation
              </Label>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Preview</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Search Result Preview
              </p>
              <div className="rounded-lg border p-4">
                <p className="text-lg text-blue-600">
                  {settings.default_title_template.replace('%s', 'Page Title')}
                </p>
                <p className="text-sm text-green-700">example.com/page</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {settings.default_description || 'No default description set.'}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Social Share Preview
              </p>
              <div className="overflow-hidden rounded-lg border">
                {settings.og_default_image ? (
                  <img
                    src={settings.og_default_image}
                    alt="OG Preview"
                    className="aspect-[1200/630] w-full bg-muted object-cover"
                  />
                ) : (
                  <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-sm text-muted-foreground">
                    No default image set
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">example.com</p>
                  <p className="font-medium">{settings.site_name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {settings.default_description || 'No description'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
