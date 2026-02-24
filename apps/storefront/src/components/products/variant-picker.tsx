/**
 * Variant Picker
 *
 * Color swatches (circles) and size buttons for product variant selection.
 * CGK-branded styling with navy active state.
 */

'use client'

import { cn } from '@cgk-platform/ui'

interface VariantOption {
  name: string
  values: string[]
}

interface VariantPickerProps {
  options: VariantOption[]
  selectedOptions: Record<string, string>
  onOptionChange: (name: string, value: string) => void
}

// Map color names to CSS colors for swatch display
const COLOR_MAP: Record<string, string> = {
  'White': '#FFFFFF',
  'Cream': '#FFFDD0',
  'Ivory': '#FFFFF0',
  'Beige': '#F5F5DC',
  'Taupe': '#8B7D6B',
  'Gray': '#808080',
  'Grey': '#808080',
  'Light Gray': '#D3D3D3',
  'Dark Gray': '#404040',
  'Charcoal': '#36454F',
  'Black': '#000000',
  'Navy': '#182F5C',
  'Navy Blue': '#182F5C',
  'Blue': '#4169E1',
  'Light Blue': '#ADD8E6',
  'Burgundy': '#800020',
  'Wine': '#722F37',
  'Red': '#DC2626',
  'Sage': '#9DC183',
  'Green': '#228B22',
  'Teal': '#008080',
  'Purple': '#7B2D8E',
  'Lavender': '#E6E6FA',
  'Pink': '#FFC0CB',
  'Blush': '#DE5D83',
  'Gold': '#D29B28',
  'Brown': '#8B4513',
  'Chocolate': '#3D1C02',
  'Aqua': '#00CED1',
  'Coral': '#FF6B6B',
  'Mocha': '#967969',
}

function getSwatchColor(value: string): string | null {
  // Check exact match first
  if (COLOR_MAP[value]) return COLOR_MAP[value]
  // Check case-insensitive
  const lower = value.toLowerCase()
  for (const [key, color] of Object.entries(COLOR_MAP)) {
    if (key.toLowerCase() === lower) return color
  }
  return null
}

export function VariantPicker({
  options,
  selectedOptions,
  onOptionChange,
}: VariantPickerProps) {
  return (
    <div className="space-y-5">
      {options.map((option) => {
        const isColor = option.name.toLowerCase() === 'color'

        return (
          <div key={option.name}>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {option.name}: <span className="font-semibold text-cgk-navy">{selectedOptions[option.name]}</span>
            </label>

            {isColor ? (
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const swatchColor = getSwatchColor(value)
                  const isSelected = selectedOptions[option.name] === value
                  const isWhite = swatchColor?.toUpperCase() === '#FFFFFF' || swatchColor?.toUpperCase() === '#FFFFF0'

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onOptionChange(option.name, value)}
                      className={cn(
                        'relative h-9 w-9 rounded-full border-2 transition-all',
                        isSelected
                          ? 'border-cgk-navy ring-2 ring-cgk-navy/30'
                          : 'border-gray-200 hover:border-gray-400',
                        isWhite && !isSelected && 'border-gray-300'
                      )}
                      title={value}
                      aria-label={`Color: ${value}`}
                    >
                      <span
                        className="absolute inset-1 rounded-full"
                        style={{
                          backgroundColor: swatchColor ?? '#E5E7EB',
                        }}
                      />
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const isSelected = selectedOptions[option.name] === value

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onOptionChange(option.name, value)}
                      className={cn(
                        'rounded-btn border px-4 py-2 text-sm font-medium transition-all',
                        isSelected
                          ? 'border-cgk-navy bg-cgk-navy text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-cgk-navy hover:text-cgk-navy'
                      )}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
