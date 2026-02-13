/**
 * Design System Spacing Tokens
 *
 * Based on a 4px grid system with logical scale
 * Provides consistent spacing across all components and layouts
 */

/**
 * Base spacing scale (in rem, based on 16px root)
 * Follows 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const

/**
 * Semantic spacing for common use cases
 */
export const semanticSpacing = {
  /** Tight spacing within compact components */
  inset: {
    xs: spacing[1], // 4px - icon buttons
    sm: spacing[2], // 8px - small buttons
    md: spacing[3], // 12px - standard buttons
    lg: spacing[4], // 16px - cards, modals
    xl: spacing[6], // 24px - large sections
  },

  /** Spacing between related items */
  stack: {
    xs: spacing[1], // 4px - form validation
    sm: spacing[2], // 8px - form labels
    md: spacing[4], // 16px - form groups
    lg: spacing[6], // 24px - page sections
    xl: spacing[8], // 32px - major sections
  },

  /** Spacing between unrelated elements */
  section: {
    sm: spacing[8], // 32px
    md: spacing[12], // 48px
    lg: spacing[16], // 64px
    xl: spacing[24], // 96px
  },

  /** Page margin/padding */
  page: {
    x: spacing[4], // 16px mobile
    xMd: spacing[6], // 24px tablet
    xLg: spacing[8], // 32px desktop
    y: spacing[6], // 24px top/bottom
    yLg: spacing[8], // 32px desktop
  },

  /** Card internal spacing */
  card: {
    padding: spacing[6], // 24px
    paddingSm: spacing[4], // 16px compact
    gap: spacing[4], // 16px between elements
    gapSm: spacing[3], // 12px tight
  },

  /** Modal spacing */
  modal: {
    padding: spacing[6], // 24px
    headerPadding: spacing[4], // 16px
    gap: spacing[4], // 16px
  },

  /** Table cell spacing */
  table: {
    cellX: spacing[4], // 16px horizontal
    cellY: spacing[3], // 12px vertical
    headerY: spacing[3], // 12px header
  },

  /** Input spacing */
  input: {
    paddingX: spacing[3], // 12px
    paddingY: spacing[2], // 8px
    gap: spacing[2], // 8px (icon to text)
  },

  /** Button spacing */
  button: {
    paddingXSm: spacing[3], // 12px
    paddingXMd: spacing[4], // 16px
    paddingXLg: spacing[6], // 24px
    paddingY: spacing[2], // 8px
    gap: spacing[2], // 8px (icon to text)
  },
} as const

/**
 * Border radius values
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const

/**
 * Z-index scale for layering
 */
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const

/**
 * Container max widths
 */
export const containerWidth = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  prose: '65ch', // Optimal reading width
} as const

export type Spacing = keyof typeof spacing
export type BorderRadius = keyof typeof borderRadius
export type ZIndex = keyof typeof zIndex
