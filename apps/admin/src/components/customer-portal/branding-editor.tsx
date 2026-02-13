'use client'

import { Button, Card, CardContent, Input, Label, cn } from '@cgk-platform/ui'
import { Palette, Type, CornerUpLeft, Save } from 'lucide-react'
import { useState, useTransition } from 'react'

import type { PortalBranding } from '@/lib/customer-portal/types'
import { DEFAULT_PORTAL_BRANDING } from '@/lib/customer-portal/types'

interface BrandingEditorProps {
  branding: PortalBranding
  onUpdate: (branding: Partial<PortalBranding>) => Promise<void>
}

const GOOGLE_FONTS = [
  'system-ui',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
]

export function BrandingEditor({ branding, onUpdate }: BrandingEditorProps) {
  const [localBranding, setLocalBranding] = useState<PortalBranding>(branding)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const updateField = <K extends keyof PortalBranding>(key: K, value: PortalBranding[K]) => {
    setLocalBranding((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      await onUpdate(localBranding)
      setHasChanges(false)
    })
  }

  const handleReset = () => {
    setLocalBranding(DEFAULT_PORTAL_BRANDING)
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your customer portal.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            <CornerUpLeft className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isPending || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colors Section */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Colors</h3>
            </div>

            <div className="space-y-4">
              <ColorPicker
                label="Primary Color"
                value={localBranding.primaryColor}
                onChange={(v) => updateField('primaryColor', v)}
                description="Main brand color for buttons and links"
              />
              <ColorPicker
                label="Secondary Color"
                value={localBranding.secondaryColor}
                onChange={(v) => updateField('secondaryColor', v)}
                description="Used for secondary text and icons"
              />
              <ColorPicker
                label="Accent Color"
                value={localBranding.accentColor}
                onChange={(v) => updateField('accentColor', v)}
                description="Highlight color for CTAs and badges"
              />
              <ColorPicker
                label="Background"
                value={localBranding.backgroundColor}
                onChange={(v) => updateField('backgroundColor', v)}
                description="Page background color"
              />
              <ColorPicker
                label="Card Background"
                value={localBranding.cardBackgroundColor}
                onChange={(v) => updateField('cardBackgroundColor', v)}
                description="Background for cards and panels"
              />
              <ColorPicker
                label="Border Color"
                value={localBranding.borderColor}
                onChange={(v) => updateField('borderColor', v)}
                description="Color for borders and dividers"
              />
            </div>
          </CardContent>
        </Card>

        {/* Typography Section */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Type className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Typography</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm">Heading Font</Label>
                <select
                  value={localBranding.headingFont}
                  onChange={(e) => updateField('headingFont', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {GOOGLE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm">Body Font</Label>
                <select
                  value={localBranding.bodyFont}
                  onChange={(e) => updateField('bodyFont', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {GOOGLE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm">Card Border Radius (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={localBranding.cardBorderRadius}
                  onChange={(e) => updateField('cardBorderRadius', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-sm">Button Border Radius (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={localBranding.buttonBorderRadius}
                  onChange={(e) => updateField('buttonBorderRadius', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Logo & Favicon</h3>

            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm">Logo URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/logo.svg"
                  value={localBranding.logoUrl || ''}
                  onChange={(e) => updateField('logoUrl', e.target.value || null)}
                />
                {localBranding.logoUrl && (
                  <div className="mt-2 flex h-16 items-center justify-center rounded-md border bg-muted/50 p-2">
                    <img
                      src={localBranding.logoUrl}
                      alt="Logo preview"
                      className="h-full max-w-[200px] object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-1.5 block text-sm">Favicon URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={localBranding.faviconUrl || ''}
                  onChange={(e) => updateField('faviconUrl', e.target.value || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom CSS Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Custom CSS</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Add custom CSS to further customize the portal appearance. Use with caution.
            </p>
            <textarea
              value={localBranding.customCss || ''}
              onChange={(e) => updateField('customCss', e.target.value || null)}
              placeholder=".portal-header { background: #000; }"
              className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold">Preview</h3>
          <div
            className="rounded-lg border p-6"
            style={{
              backgroundColor: localBranding.backgroundColor,
              fontFamily: localBranding.bodyFont,
            }}
          >
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: localBranding.cardBackgroundColor,
                borderRadius: `${localBranding.cardBorderRadius}px`,
                border: `1px solid ${localBranding.borderColor}`,
              }}
            >
              <h4
                className="text-lg font-semibold"
                style={{
                  color: localBranding.primaryColor,
                  fontFamily: localBranding.headingFont,
                }}
              >
                Welcome to Your Account
              </h4>
              <p className="mt-1 text-sm" style={{ color: localBranding.secondaryColor }}>
                Manage your orders, subscriptions, and profile settings.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-white"
                  style={{
                    backgroundColor: localBranding.primaryColor,
                    borderRadius: `${localBranding.buttonBorderRadius}px`,
                  }}
                >
                  View Orders
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: localBranding.accentColor,
                    color: '#fff',
                    borderRadius: `${localBranding.buttonBorderRadius}px`,
                  }}
                >
                  Manage Subscription
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
}

function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(value)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <Label className="text-sm">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHex ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border bg-transparent"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('w-28 font-mono text-sm', !isValidHex && 'border-destructive')}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  )
}
