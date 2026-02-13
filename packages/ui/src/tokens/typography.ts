/**
 * Design System Typography Tokens
 *
 * Font pairing: Instrument Serif (display) + Geist Sans (body)
 * These tokens provide a cohesive typographic scale across all apps.
 */

/**
 * Font families
 * Note: Actual font loading happens in app layout.tsx via next/font/google
 */
export const fontFamily = {
  /** Display headlines, hero text - Instrument Serif */
  display: 'var(--font-display), Georgia, "Times New Roman", serif',
  /** Headings, navigation, UI labels - Geist Sans */
  heading: 'var(--font-sans), system-ui, -apple-system, sans-serif',
  /** Body text, paragraphs - Geist Sans */
  body: 'var(--font-sans), system-ui, -apple-system, sans-serif',
  /** Code, numbers, IDs - Geist Mono */
  mono: 'var(--font-mono), ui-monospace, "Cascadia Code", monospace',
} as const

/**
 * Font sizes with matching line heights
 * Uses a modular scale (1.25 ratio) for harmonic progression
 */
export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
  base: ['1rem', { lineHeight: '1.5rem' }], // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  '5xl': ['3rem', { lineHeight: '1.2' }], // 48px
  '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
  '7xl': ['4.5rem', { lineHeight: '1.1' }], // 72px
} as const

/**
 * Font weights
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

/**
 * Letter spacing
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const

/**
 * Pre-composed typography styles
 * Use these for consistent text hierarchy across the platform
 */
export const textStyles = {
  // Display styles (Instrument Serif)
  displayLarge: {
    fontFamily: fontFamily.display,
    fontSize: '3.75rem', // 60px
    lineHeight: '1.1',
    fontWeight: '400',
    letterSpacing: '-0.025em',
  },
  displayMedium: {
    fontFamily: fontFamily.display,
    fontSize: '3rem', // 48px
    lineHeight: '1.15',
    fontWeight: '400',
    letterSpacing: '-0.02em',
  },
  displaySmall: {
    fontFamily: fontFamily.display,
    fontSize: '2.25rem', // 36px
    lineHeight: '1.2',
    fontWeight: '400',
    letterSpacing: '-0.015em',
  },

  // Heading styles (Geist Sans)
  h1: {
    fontFamily: fontFamily.heading,
    fontSize: '2.25rem', // 36px
    lineHeight: '1.2',
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  h2: {
    fontFamily: fontFamily.heading,
    fontSize: '1.875rem', // 30px
    lineHeight: '1.25',
    fontWeight: '600',
    letterSpacing: '-0.02em',
  },
  h3: {
    fontFamily: fontFamily.heading,
    fontSize: '1.5rem', // 24px
    lineHeight: '1.35',
    fontWeight: '600',
    letterSpacing: '-0.015em',
  },
  h4: {
    fontFamily: fontFamily.heading,
    fontSize: '1.25rem', // 20px
    lineHeight: '1.4',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  h5: {
    fontFamily: fontFamily.heading,
    fontSize: '1.125rem', // 18px
    lineHeight: '1.45',
    fontWeight: '600',
    letterSpacing: '0',
  },
  h6: {
    fontFamily: fontFamily.heading,
    fontSize: '1rem', // 16px
    lineHeight: '1.5',
    fontWeight: '600',
    letterSpacing: '0',
  },

  // Body styles (Geist Sans)
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize: '1.125rem', // 18px
    lineHeight: '1.75',
    fontWeight: '400',
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: '1rem', // 16px
    lineHeight: '1.625',
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: '0.875rem', // 14px
    lineHeight: '1.5',
    fontWeight: '400',
  },

  // UI styles
  label: {
    fontFamily: fontFamily.heading,
    fontSize: '0.875rem', // 14px
    lineHeight: '1.4',
    fontWeight: '500',
    letterSpacing: '0.01em',
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: '0.75rem', // 12px
    lineHeight: '1.35',
    fontWeight: '400',
  },
  overline: {
    fontFamily: fontFamily.heading,
    fontSize: '0.75rem', // 12px
    lineHeight: '1.35',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },

  // Code/Data styles (Geist Mono)
  code: {
    fontFamily: fontFamily.mono,
    fontSize: '0.875rem', // 14px
    lineHeight: '1.6',
    fontWeight: '400',
  },
  data: {
    fontFamily: fontFamily.mono,
    fontSize: '0.875rem',
    lineHeight: '1.4',
    fontWeight: '500',
    fontVariantNumeric: 'tabular-nums',
  },
} as const

export type TextStyle = keyof typeof textStyles
