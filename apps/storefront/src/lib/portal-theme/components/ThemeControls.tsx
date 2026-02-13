'use client'

/**
 * Theme Controls Component
 *
 * Admin interface for customizing portal theme settings.
 * Provides color pickers, typography controls, and layout options.
 */

import { cn } from '@cgk-platform/ui'
import { useState, useCallback, useMemo } from 'react'

import { usePortalTheme } from './PortalThemeProvider'
import type {
  CustomerPortalThemeConfig,
  ThemeControl,
  ThemeControlCategory,
} from '../types'
import { PORTAL_THEME_PRESETS } from '../defaults'

/**
 * Theme control definitions
 */
const THEME_CONTROLS: ThemeControl[] = [
  // Colors
  {
    key: 'primaryColor',
    label: 'Primary Color',
    description: 'Main brand color used for buttons and highlights',
    category: 'colors',
    type: 'color',
    defaultValue: '#374d42',
    cssVariable: '--portal-primary',
  },
  {
    key: 'secondaryColor',
    label: 'Secondary Color',
    description: 'Complementary color for secondary actions',
    category: 'colors',
    type: 'color',
    defaultValue: '#828282',
    cssVariable: '--portal-secondary',
  },
  {
    key: 'accentColor',
    label: 'Accent Color',
    description: 'Color for highlights and emphasis',
    category: 'colors',
    type: 'color',
    defaultValue: '#374d42',
    cssVariable: '--portal-accent',
  },
  {
    key: 'backgroundColor',
    label: 'Background Color',
    description: 'Main page background',
    category: 'colors',
    type: 'color',
    defaultValue: '#f5f5f4',
    cssVariable: '--portal-background',
  },
  {
    key: 'cardBackgroundColor',
    label: 'Card Background',
    description: 'Background color for cards and elevated surfaces',
    category: 'colors',
    type: 'color',
    defaultValue: '#ffffff',
    cssVariable: '--portal-card',
  },
  {
    key: 'foregroundColor',
    label: 'Text Color',
    description: 'Primary text color',
    category: 'colors',
    type: 'color',
    defaultValue: '#171717',
    cssVariable: '--portal-foreground',
  },
  {
    key: 'borderColor',
    label: 'Border Color',
    description: 'Color for borders and dividers',
    category: 'colors',
    type: 'color',
    defaultValue: '#e5e5e5',
    cssVariable: '--portal-border',
  },

  // Typography
  {
    key: 'fontFamily',
    label: 'Body Font',
    description: 'Font for body text',
    category: 'typography',
    type: 'font',
    options: [
      { value: 'system-ui, sans-serif', label: 'System (Default)' },
      { value: '"Inter", sans-serif', label: 'Inter' },
      { value: '"DM Sans", sans-serif', label: 'DM Sans' },
      { value: '"Instrument Sans", sans-serif', label: 'Instrument Sans' },
      { value: '"Space Grotesk", sans-serif', label: 'Space Grotesk' },
      { value: '"Outfit", sans-serif', label: 'Outfit' },
      { value: '"Work Sans", sans-serif', label: 'Work Sans' },
    ],
    defaultValue: 'system-ui, sans-serif',
  },
  {
    key: 'headingFontFamily',
    label: 'Heading Font',
    description: 'Font for headings (leave empty to use body font)',
    category: 'typography',
    type: 'font',
    options: [
      { value: '', label: 'Same as body' },
      { value: '"Libre Baskerville", serif', label: 'Libre Baskerville' },
      { value: '"Playfair Display", serif', label: 'Playfair Display' },
      { value: '"Cormorant Garamond", serif', label: 'Cormorant Garamond' },
      { value: '"DM Serif Display", serif', label: 'DM Serif Display' },
    ],
    defaultValue: '',
  },
  {
    key: 'baseFontSize',
    label: 'Base Font Size',
    description: 'Base size for body text in pixels',
    category: 'typography',
    type: 'number',
    min: 14,
    max: 20,
    step: 1,
    unit: 'px',
    defaultValue: 16,
  },
  {
    key: 'lineHeight',
    label: 'Line Height',
    description: 'Line height for body text',
    category: 'typography',
    type: 'range',
    min: 1.2,
    max: 2,
    step: 0.05,
    defaultValue: 1.5,
  },

  // Layout
  {
    key: 'cardBorderRadius',
    label: 'Card Corners',
    description: 'Border radius for cards',
    category: 'layout',
    type: 'select',
    options: [
      { value: '0px', label: 'Square' },
      { value: '4px', label: 'Slight' },
      { value: '8px', label: 'Rounded' },
      { value: '12px', label: 'More Rounded' },
      { value: '16px', label: 'Very Rounded' },
    ],
    defaultValue: '8px',
  },
  {
    key: 'buttonBorderRadius',
    label: 'Button Corners',
    description: 'Border radius for buttons',
    category: 'layout',
    type: 'select',
    options: [
      { value: '0px', label: 'Square' },
      { value: '4px', label: 'Slight' },
      { value: '6px', label: 'Rounded' },
      { value: '8px', label: 'More Rounded' },
      { value: '9999px', label: 'Pill' },
    ],
    defaultValue: '6px',
  },
  {
    key: 'spacing',
    label: 'Content Density',
    description: 'Spacing between elements',
    category: 'layout',
    type: 'select',
    options: [
      { value: 'compact', label: 'Compact' },
      { value: 'normal', label: 'Normal' },
      { value: 'relaxed', label: 'Relaxed' },
    ],
    defaultValue: 'normal',
  },

  // Sidebar
  {
    key: 'sidebar.style',
    label: 'Sidebar Style',
    description: 'Visual style of the sidebar',
    category: 'sidebar',
    type: 'select',
    options: [
      { value: 'attached', label: 'Attached' },
      { value: 'floating', label: 'Floating' },
      { value: 'minimal', label: 'Minimal' },
    ],
    defaultValue: 'attached',
  },
  {
    key: 'sidebar.activeIndicator',
    label: 'Active Indicator',
    description: 'How active nav items are highlighted',
    category: 'sidebar',
    type: 'select',
    options: [
      { value: 'fill', label: 'Fill Background' },
      { value: 'bar', label: 'Left Bar' },
      { value: 'dot', label: 'Dot' },
      { value: 'none', label: 'None' },
    ],
    defaultValue: 'fill',
  },
  {
    key: 'sidebar.showIcons',
    label: 'Show Icons',
    description: 'Display icons in navigation',
    category: 'sidebar',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'sidebar.showBorder',
    label: 'Show Border',
    description: 'Display border on sidebar',
    category: 'sidebar',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'sidebarBackgroundColor',
    label: 'Sidebar Background',
    description: 'Background color for sidebar (leave empty for default)',
    category: 'sidebar',
    type: 'color',
    defaultValue: '',
  },

  // Header
  {
    key: 'header.style',
    label: 'Header Style',
    description: 'Visual style of the header',
    category: 'header',
    type: 'select',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'branded', label: 'Branded (Centered Logo)' },
    ],
    defaultValue: 'standard',
  },
  {
    key: 'header.showWelcome',
    label: 'Show Welcome Message',
    description: 'Display personalized greeting',
    category: 'header',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'header.showAvatar',
    label: 'Show User Avatar',
    description: 'Display user avatar in header',
    category: 'header',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'header.sticky',
    label: 'Sticky Header',
    description: 'Keep header fixed on scroll',
    category: 'header',
    type: 'toggle',
    defaultValue: true,
  },

  // Cards
  {
    key: 'card.style',
    label: 'Card Style',
    description: 'Default card appearance',
    category: 'cards',
    type: 'select',
    options: [
      { value: 'elevated', label: 'Elevated (Shadow)' },
      { value: 'outlined', label: 'Outlined (Border)' },
      { value: 'flat', label: 'Flat (No Border)' },
    ],
    defaultValue: 'elevated',
  },
  {
    key: 'card.hoverEffect',
    label: 'Hover Effect',
    description: 'Animation on card hover',
    category: 'cards',
    type: 'select',
    options: [
      { value: 'lift', label: 'Lift Up' },
      { value: 'glow', label: 'Glow' },
      { value: 'border', label: 'Border Highlight' },
      { value: 'none', label: 'None' },
    ],
    defaultValue: 'lift',
  },
  {
    key: 'card.shadowIntensity',
    label: 'Shadow Intensity',
    description: 'Strength of card shadows',
    category: 'cards',
    type: 'range',
    min: 0,
    max: 50,
    step: 5,
    defaultValue: 10,
  },

  // Buttons
  {
    key: 'button.primaryStyle',
    label: 'Primary Button Style',
    description: 'Appearance of primary buttons',
    category: 'buttons',
    type: 'select',
    options: [
      { value: 'solid', label: 'Solid Fill' },
      { value: 'outline', label: 'Outline' },
      { value: 'ghost', label: 'Ghost' },
    ],
    defaultValue: 'solid',
  },
  {
    key: 'button.textTransform',
    label: 'Button Text Style',
    description: 'Text transformation for buttons',
    category: 'buttons',
    type: 'select',
    options: [
      { value: 'none', label: 'Normal' },
      { value: 'uppercase', label: 'UPPERCASE' },
      { value: 'capitalize', label: 'Capitalize' },
    ],
    defaultValue: 'none',
  },

  // Advanced
  {
    key: 'darkModeEnabled',
    label: 'Enable Dark Mode',
    description: 'Allow users to toggle dark mode',
    category: 'advanced',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'customCss',
    label: 'Custom CSS',
    description: 'Additional custom CSS styles',
    category: 'advanced',
    type: 'text',
    defaultValue: '',
  },
]

/**
 * Category labels and order
 */
const CATEGORY_CONFIG: Record<ThemeControlCategory, { label: string; order: number }> = {
  colors: { label: 'Colors', order: 1 },
  typography: { label: 'Typography', order: 2 },
  layout: { label: 'Layout', order: 3 },
  sidebar: { label: 'Sidebar', order: 4 },
  header: { label: 'Header', order: 5 },
  cards: { label: 'Cards', order: 6 },
  buttons: { label: 'Buttons', order: 7 },
  advanced: { label: 'Advanced', order: 8 },
}

interface ThemeControlsProps {
  className?: string
  onSave?: () => void
  onReset?: () => void
}

/**
 * Theme Controls Component
 *
 * Complete admin interface for customizing portal themes.
 */
export function ThemeControls({
  className,
  onSave,
  onReset,
}: ThemeControlsProps): React.ReactElement {
  const {
    theme,
    previewState,
    isPreviewMode,
    updatePreview,
    applyPreview,
    cancelPreview,
    startPreview,
  } = usePortalTheme()

  const [activeCategory, setActiveCategory] = useState<ThemeControlCategory>('colors')

  // Get controls grouped by category
  const controlsByCategory = useMemo(() => {
    const grouped = new Map<ThemeControlCategory, ThemeControl[]>()

    for (const control of THEME_CONTROLS) {
      const existing = grouped.get(control.category) || []
      grouped.set(control.category, [...existing, control])
    }

    return grouped
  }, [])

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return Object.entries(CATEGORY_CONFIG)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key as ThemeControlCategory)
  }, [])

  // Handle value change
  const handleChange = useCallback(
    (key: string, value: unknown) => {
      if (!isPreviewMode) {
        startPreview()
      }

      // Handle nested keys like 'sidebar.style'
      if (key.includes('.')) {
        const parts = key.split('.')
        const parentKey = parts[0]
        const childKey = parts[1]
        if (parentKey && childKey) {
          const parentValue = theme[parentKey as keyof CustomerPortalThemeConfig]
          const parentObj = typeof parentValue === 'object' && parentValue !== null
            ? (parentValue as unknown as Record<string, unknown>)
            : {}
          const update: Record<string, unknown> = {
            [parentKey]: {
              ...parentObj,
              [childKey]: value,
            },
          }
          updatePreview(update as Partial<CustomerPortalThemeConfig>)
        }
      } else {
        const update: Record<string, unknown> = { [key]: value }
        updatePreview(update as Partial<CustomerPortalThemeConfig>)
      }
    },
    [isPreviewMode, startPreview, updatePreview, theme]
  )

  // Handle save
  const handleSave = useCallback(async () => {
    await applyPreview()
    onSave?.()
  }, [applyPreview, onSave])

  // Handle reset
  const handleReset = useCallback(() => {
    cancelPreview()
    onReset?.()
  }, [cancelPreview, onReset])

  // Get current value for a control
  const getValue = useCallback(
    (key: string): unknown => {
      const activeTheme = isPreviewMode && previewState ? previewState.theme : theme

      if (key.includes('.')) {
        const parts = key.split('.')
        const parentKey = parts[0]
        const childKey = parts[1]
        if (!parentKey || !childKey) return undefined
        const parentObj = activeTheme[parentKey as keyof CustomerPortalThemeConfig]
        return parentObj && typeof parentObj === 'object'
          ? (parentObj as unknown as Record<string, unknown>)[childKey]
          : undefined
      }

      return activeTheme[key as keyof CustomerPortalThemeConfig]
    },
    [theme, previewState, isPreviewMode]
  )

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Preset selector */}
      <div className="border-b border-[hsl(var(--portal-border))] p-4">
        <label className="mb-2 block text-sm font-medium text-[hsl(var(--portal-foreground))]">
          Start from a Preset
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PORTAL_THEME_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (!isPreviewMode) startPreview()
                updatePreview(preset.preview as Partial<CustomerPortalThemeConfig>)
              }}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                'border-[hsl(var(--portal-border))]',
                'hover:border-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-muted))]'
              )}
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-[hsl(var(--portal-border))] px-2">
        {sortedCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeCategory === category
                ? 'border-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary))]'
                : 'border-transparent text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))]'
            )}
          >
            {CATEGORY_CONFIG[category].label}
          </button>
        ))}
      </div>

      {/* Controls for active category */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {controlsByCategory.get(activeCategory)?.map((control) => (
            <ControlInput
              key={control.key}
              control={control}
              value={getValue(control.key)}
              onChange={(value) => handleChange(control.key, value)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {isPreviewMode && previewState?.isDirty && (
        <div className="flex gap-3 border-t border-[hsl(var(--portal-border))] p-4">
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'flex-1 rounded-lg border px-4 py-2 text-sm font-medium',
              'border-[hsl(var(--portal-border))]',
              'text-[hsl(var(--portal-foreground))]',
              'hover:bg-[hsl(var(--portal-muted))]',
              'transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'hover:opacity-90',
              'transition-opacity'
            )}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Individual control input component
 */
interface ControlInputProps {
  control: ThemeControl
  value: unknown
  onChange: (value: unknown) => void
}

function ControlInput({ control, value, onChange }: ControlInputProps): React.ReactElement {
  const baseInputClasses = cn(
    'w-full rounded-lg border px-3 py-2 text-sm',
    'border-[hsl(var(--portal-border))]',
    'bg-[hsl(var(--portal-card))]',
    'text-[hsl(var(--portal-foreground))]',
    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
    'transition-colors'
  )

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--portal-foreground))]">
        {control.label}
      </label>
      {control.description && (
        <p className="mb-2 text-xs text-[hsl(var(--portal-muted-foreground))]">
          {control.description}
        </p>
      )}

      {control.type === 'color' && (
        <div className="flex gap-2">
          <input
            type="color"
            value={(value as string) || control.defaultValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-[hsl(var(--portal-border))] p-1"
          />
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={control.defaultValue as string}
            className={baseInputClasses}
          />
        </div>
      )}

      {control.type === 'select' && (
        <select
          value={(value as string) ?? control.defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        >
          {control.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {control.type === 'font' && (
        <select
          value={(value as string) ?? control.defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInputClasses)}
          style={{ fontFamily: (value as string) || undefined }}
        >
          {control.options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{ fontFamily: option.value || undefined }}
            >
              {option.label}
            </option>
          ))}
        </select>
      )}

      {control.type === 'number' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(value as number) ?? control.defaultValue}
            onChange={(e) => onChange(Number(e.target.value))}
            min={control.min}
            max={control.max}
            step={control.step}
            className={baseInputClasses}
          />
          {control.unit && (
            <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              {control.unit}
            </span>
          )}
        </div>
      )}

      {control.type === 'range' && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={(value as number) ?? control.defaultValue}
            onChange={(e) => onChange(Number(e.target.value))}
            min={control.min}
            max={control.max}
            step={control.step}
            className="flex-1"
          />
          <span className="w-12 text-right text-sm text-[hsl(var(--portal-muted-foreground))]">
            {String(value ?? control.defaultValue)}
          </span>
        </div>
      )}

      {control.type === 'toggle' && (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value ?? control.defaultValue)}
          onClick={() => onChange(!value)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            (value ?? control.defaultValue)
              ? 'bg-[hsl(var(--portal-primary))]'
              : 'bg-[hsl(var(--portal-muted))]'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
              (value ?? control.defaultValue) ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      )}

      {control.type === 'text' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={control.defaultValue as string}
          rows={4}
          className={cn(baseInputClasses, 'font-mono text-xs')}
        />
      )}
    </div>
  )
}

export { THEME_CONTROLS }
