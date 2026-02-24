import type { CreateBundleInput, UpdateBundleInput } from './types'

interface ValidationError {
  field: string
  message: string
}

const VALID_DISCOUNT_TYPES = ['percentage', 'fixed'] as const
const VALID_LAYOUTS = ['grid', 'list'] as const
const VALID_IMAGE_RATIOS = ['square', 'portrait', 'landscape'] as const
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const RGB_COLOR_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/

function validateColor(value: string): boolean {
  if (HEX_COLOR_RE.test(value)) return true
  const match = RGB_COLOR_RE.exec(value)
  if (!match) return false
  return [match[1], match[2], match[3]].every((v) => {
    const n = parseInt(v!, 10)
    return n >= 0 && n <= 255
  })
}

export function validateCreateBundle(input: CreateBundleInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  } else if (input.name.length > 255) {
    errors.push({ field: 'name', message: 'Name must be 255 characters or fewer' })
  }

  if (input.discount_type && !VALID_DISCOUNT_TYPES.includes(input.discount_type)) {
    errors.push({ field: 'discount_type', message: 'Must be "percentage" or "fixed"' })
  }

  if (input.min_items !== undefined) {
    if (input.min_items < 1 || input.min_items > 100) {
      errors.push({ field: 'min_items', message: 'Must be between 1 and 100' })
    }
  }

  if (input.max_items !== undefined) {
    if (input.max_items < 1 || input.max_items > 100) {
      errors.push({ field: 'max_items', message: 'Must be between 1 and 100' })
    }
  }

  if (input.min_items !== undefined && input.max_items !== undefined) {
    if (input.min_items > input.max_items) {
      errors.push({ field: 'min_items', message: 'min_items must be less than or equal to max_items' })
    }
  }

  if (input.tiers && input.tiers.length > 0) {
    const counts = new Set<number>()
    for (let i = 0; i < input.tiers.length; i++) {
      const tier = input.tiers[i]!
      if (tier.count < 1) {
        errors.push({ field: `tiers[${i}].count`, message: 'Tier count must be at least 1' })
      }
      if (tier.discount <= 0) {
        errors.push({ field: `tiers[${i}].discount`, message: 'Tier discount must be positive' })
      }
      if (input.discount_type === 'percentage' && tier.discount > 100) {
        errors.push({ field: `tiers[${i}].discount`, message: 'Percentage discount cannot exceed 100' })
      }
      if (counts.has(tier.count)) {
        errors.push({ field: `tiers[${i}].count`, message: 'Tier counts must be unique' })
      }
      counts.add(tier.count)
    }
  }

  if (input.layout && !VALID_LAYOUTS.includes(input.layout)) {
    errors.push({ field: 'layout', message: 'Must be "grid" or "list"' })
  }

  if (input.image_ratio && !VALID_IMAGE_RATIOS.includes(input.image_ratio)) {
    errors.push({ field: 'image_ratio', message: 'Must be "square", "portrait", or "landscape"' })
  }

  if (input.columns_desktop !== undefined) {
    if (input.columns_desktop < 1 || input.columns_desktop > 6) {
      errors.push({ field: 'columns_desktop', message: 'Must be between 1 and 6' })
    }
  }

  if (input.bg_color && !validateColor(input.bg_color)) {
    errors.push({ field: 'bg_color', message: 'Must be a valid hex (#fff or #ffffff) or rgb() color' })
  }

  if (input.text_color && !validateColor(input.text_color)) {
    errors.push({ field: 'text_color', message: 'Must be a valid hex (#fff or #ffffff) or rgb() color' })
  }

  if (input.accent_color && !validateColor(input.accent_color)) {
    errors.push({ field: 'accent_color', message: 'Must be a valid hex (#fff or #ffffff) or rgb() color' })
  }

  return errors
}

export function validateUpdateBundle(input: UpdateBundleInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name cannot be empty' })
    } else if (input.name.length > 255) {
      errors.push({ field: 'name', message: 'Name must be 255 characters or fewer' })
    }
  }

  if (input.status && !['draft', 'active', 'archived'].includes(input.status)) {
    errors.push({ field: 'status', message: 'Must be "draft", "active", or "archived"' })
  }

  // Reuse same field validations for optional fields
  if (input.discount_type && !VALID_DISCOUNT_TYPES.includes(input.discount_type)) {
    errors.push({ field: 'discount_type', message: 'Must be "percentage" or "fixed"' })
  }

  if (input.min_items !== undefined && (input.min_items < 1 || input.min_items > 100)) {
    errors.push({ field: 'min_items', message: 'Must be between 1 and 100' })
  }

  if (input.max_items !== undefined && (input.max_items < 1 || input.max_items > 100)) {
    errors.push({ field: 'max_items', message: 'Must be between 1 and 100' })
  }

  if (input.min_items !== undefined && input.max_items !== undefined && input.min_items > input.max_items) {
    errors.push({ field: 'min_items', message: 'min_items must be less than or equal to max_items' })
  }

  if (input.tiers && input.tiers.length > 0) {
    const counts = new Set<number>()
    for (let i = 0; i < input.tiers.length; i++) {
      const tier = input.tiers[i]!
      if (tier.count < 1) {
        errors.push({ field: `tiers[${i}].count`, message: 'Tier count must be at least 1' })
      }
      if (tier.discount <= 0) {
        errors.push({ field: `tiers[${i}].discount`, message: 'Tier discount must be positive' })
      }
      if (input.discount_type === 'percentage' && tier.discount > 100) {
        errors.push({ field: `tiers[${i}].discount`, message: 'Percentage discount cannot exceed 100' })
      }
      if (counts.has(tier.count)) {
        errors.push({ field: `tiers[${i}].count`, message: 'Tier counts must be unique' })
      }
      counts.add(tier.count)
    }
  }

  if (input.layout && !VALID_LAYOUTS.includes(input.layout)) {
    errors.push({ field: 'layout', message: 'Must be "grid" or "list"' })
  }

  if (input.image_ratio && !VALID_IMAGE_RATIOS.includes(input.image_ratio)) {
    errors.push({ field: 'image_ratio', message: 'Must be "square", "portrait", or "landscape"' })
  }

  if (input.columns_desktop !== undefined && (input.columns_desktop < 1 || input.columns_desktop > 6)) {
    errors.push({ field: 'columns_desktop', message: 'Must be between 1 and 6' })
  }

  if (input.bg_color && !validateColor(input.bg_color)) {
    errors.push({ field: 'bg_color', message: 'Must be a valid hex or rgb() color' })
  }

  if (input.text_color && !validateColor(input.text_color)) {
    errors.push({ field: 'text_color', message: 'Must be a valid hex or rgb() color' })
  }

  if (input.accent_color && !validateColor(input.accent_color)) {
    errors.push({ field: 'accent_color', message: 'Must be a valid hex or rgb() color' })
  }

  return errors
}
