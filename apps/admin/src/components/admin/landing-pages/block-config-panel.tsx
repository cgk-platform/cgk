'use client'

import { Input, Label, Textarea } from '@cgk-platform/ui'

import type { Block, BlockConfig, BlockType } from '@/lib/landing-pages/types'

interface BlockConfigPanelProps {
  block: Block
  onUpdate: (config: BlockConfig) => void
}

export function BlockConfigPanel({ block, onUpdate }: BlockConfigPanelProps) {
  const { type, config } = block
  const fields = getConfigFields(type)

  const handleChange = (key: string, value: unknown) => {
    onUpdate({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{getBlockLabel(type)}</h3>
        <p className="text-sm text-muted-foreground">Configure this block</p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(value) => handleChange(field.key, value)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">
          This block has no configurable options.
        </p>
      )}
    </div>
  )
}

interface ConfigFieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'number' | 'select' | 'color' | 'boolean'
  placeholder?: string
  options?: { value: string; label: string }[]
}

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type={field.type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      )

    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
          />
        </div>
      )

    case 'textarea':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Textarea
            id={field.key}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <select
            id={field.key}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )

    case 'color':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <div className="flex gap-2">
            <Input
              id={field.key}
              type="color"
              value={(value as string) || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-16 p-1"
            />
            <Input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>
      )

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.key}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <Label htmlFor={field.key} className="font-normal">
            {field.label}
          </Label>
        </div>
      )

    default:
      return null
  }
}

function getBlockLabel(type: BlockType): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getConfigFields(type: BlockType): ConfigFieldDef[] {
  // Common fields by block type category
  const commonFields: ConfigFieldDef[] = [
    { key: 'id', label: 'Block ID', type: 'text', placeholder: 'Unique identifier' },
    { key: 'className', label: 'Custom CSS Class', type: 'text', placeholder: 'custom-class' },
  ]

  const typeFields: Partial<Record<BlockType, ConfigFieldDef[]>> = {
    'hero': [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Main headline' },
      { key: 'subheading', label: 'Subheading', type: 'textarea', placeholder: 'Supporting text' },
      { key: 'cta_text', label: 'CTA Text', type: 'text', placeholder: 'Shop Now' },
      { key: 'cta_url', label: 'CTA URL', type: 'url', placeholder: '/shop' },
      { key: 'background_image', label: 'Background Image', type: 'url', placeholder: 'https://...' },
      { key: 'background_color', label: 'Background Color', type: 'color' },
    ],
    'pdp-hero': [
      { key: 'product_id', label: 'Product ID', type: 'text', placeholder: 'Shopify product ID' },
      { key: 'show_reviews', label: 'Show Reviews', type: 'boolean' },
      { key: 'show_trust_badges', label: 'Show Trust Badges', type: 'boolean' },
    ],
    'cta-banner': [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'text', label: 'Body Text', type: 'textarea' },
      { key: 'cta_text', label: 'Button Text', type: 'text' },
      { key: 'cta_url', label: 'Button URL', type: 'url' },
      { key: 'background_color', label: 'Background Color', type: 'color' },
    ],
    'markdown': [
      { key: 'content', label: 'Content (Markdown)', type: 'textarea' },
    ],
    'rich-text': [
      { key: 'content', label: 'Content (HTML)', type: 'textarea' },
    ],
    'image': [
      { key: 'src', label: 'Image URL', type: 'url' },
      { key: 'alt', label: 'Alt Text', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ],
    'video': [
      { key: 'src', label: 'Video URL', type: 'url', placeholder: 'YouTube or Vimeo URL' },
      { key: 'autoplay', label: 'Autoplay', type: 'boolean' },
      { key: 'loop', label: 'Loop', type: 'boolean' },
      { key: 'muted', label: 'Muted', type: 'boolean' },
    ],
    'spacer': [
      { key: 'height', label: 'Height (px)', type: 'number', placeholder: '40' },
    ],
    'testimonials': [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'layout', label: 'Layout', type: 'select', options: [
        { value: 'carousel', label: 'Carousel' },
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
      ]},
    ],
    'faq-accordion': [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'allow_multiple', label: 'Allow Multiple Open', type: 'boolean' },
    ],
    'product-grid': [
      { key: 'collection_id', label: 'Collection ID', type: 'text' },
      { key: 'columns', label: 'Columns', type: 'number', placeholder: '4' },
      { key: 'limit', label: 'Product Limit', type: 'number', placeholder: '8' },
    ],
    'newsletter-signup': [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'button_text', label: 'Button Text', type: 'text', placeholder: 'Subscribe' },
      { key: 'success_message', label: 'Success Message', type: 'text' },
    ],
  }

  return [...(typeFields[type] || []), ...commonFields]
}
