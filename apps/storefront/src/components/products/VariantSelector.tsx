/**
 * VariantSelector Component
 *
 * Allows users to select product variants (size, color, etc.)
 * Handles availability state and updates selected variant.
 */

'use client'

import type { ProductVariant } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'

interface ProductOption {
  name: string
  values: string[]
}

interface VariantSelectorProps {
  options: ProductOption[]
  variants: ProductVariant[]
  selectedOptions: Record<string, string>
  onOptionChange: (name: string, value: string) => void
  className?: string
}

export function VariantSelector({
  options,
  variants,
  selectedOptions,
  onOptionChange,
  className,
}: VariantSelectorProps) {

  // Check if a specific option value is available given current selections
  const isOptionAvailable = (optionName: string, value: string): boolean => {
    // Build the option combination to check
    const testOptions: Record<string, string> = {
      ...selectedOptions,
      [optionName.toLowerCase()]: value,
    }

    // Find if any variant matches this combination and is available
    return variants.some((variant) => {
      if (!variant.availableForSale) return false

      return variant.selectedOptions.every(
        (opt) =>
          !testOptions[opt.name.toLowerCase()] ||
          testOptions[opt.name.toLowerCase()] === opt.value
      )
    })
  }

  // Detect if option is a color based on name or if values look like colors
  const isColorOption = (option: ProductOption): boolean => {
    const colorNames = ['color', 'colour', 'farbe', 'couleur']
    if (colorNames.includes(option.name.toLowerCase())) return true

    // Check if values look like color names or hex codes
    const colorPatterns = [
      /^#[0-9a-f]{3,6}$/i,
      /^(red|blue|green|black|white|pink|purple|yellow|orange|brown|gray|grey|navy|teal|coral|beige|ivory|cream|gold|silver)$/i,
    ]

    return option.values.some((v) =>
      colorPatterns.some((pattern) => pattern.test(v))
    )
  }

  if (options.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {options.map((option) => {
        const isColor = isColorOption(option)
        const selectedValue = selectedOptions[option.name.toLowerCase()]

        return (
          <div key={option.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {option.name}
                {selectedValue && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {selectedValue}
                  </span>
                )}
              </label>
            </div>

            <div
              className={cn(
                'flex flex-wrap gap-2',
                isColor && 'gap-3'
              )}
              role="radiogroup"
              aria-label={`Select ${option.name}`}
            >
              {option.values.map((value) => {
                const isSelected = selectedValue === value
                const isAvailable = isOptionAvailable(option.name, value)

                if (isColor) {
                  return (
                    <ColorSwatch
                      key={value}
                      color={value}
                      isSelected={isSelected}
                      isAvailable={isAvailable}
                      onClick={() => onOptionChange(option.name, value)}
                    />
                  )
                }

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onOptionChange(option.name, value)}
                    disabled={!isAvailable}
                    className={cn(
                      'relative min-w-[44px] rounded-md border px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-gray-300 bg-white hover:border-gray-400',
                      !isAvailable &&
                        'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    )}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${option.name}: ${value}${!isAvailable ? ' (unavailable)' : ''}`}
                  >
                    {value}
                    {!isAvailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-px w-full rotate-45 bg-gray-400" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Color Swatch Component
 */
interface ColorSwatchProps {
  color: string
  isSelected: boolean
  isAvailable: boolean
  onClick: () => void
}

function ColorSwatch({ color, isSelected, isAvailable, onClick }: ColorSwatchProps) {
  // Map common color names to CSS colors
  const colorMap: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    pink: '#ec4899',
    purple: '#a855f7',
    brown: '#92400e',
    gray: '#6b7280',
    grey: '#6b7280',
    navy: '#1e3a5a',
    teal: '#14b8a6',
    coral: '#f87171',
    beige: '#d4c4a8',
    ivory: '#fffff0',
    cream: '#fffdd0',
    gold: '#ffd700',
    silver: '#c0c0c0',
  }

  const bgColor = color.startsWith('#')
    ? color
    : colorMap[color.toLowerCase()] || '#888888'

  const isLight = isLightColor(bgColor)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      className={cn(
        'relative h-10 w-10 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-2'
          : 'border-gray-300 hover:border-gray-400',
        !isAvailable && 'cursor-not-allowed opacity-50'
      )}
      style={{ backgroundColor: bgColor }}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${color}${!isAvailable ? ' (unavailable)' : ''}`}
      title={color}
    >
      {/* Checkmark for selected */}
      {isSelected && (
        <svg
          className={cn(
            'absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2',
            isLight ? 'text-gray-900' : 'text-white'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}

      {/* Strikethrough for unavailable */}
      {!isAvailable && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-px w-8 rotate-45 bg-gray-600" />
        </span>
      )}
    </button>
  )
}

/**
 * Check if a hex color is light (for contrast detection)
 */
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '')
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

export default VariantSelector
