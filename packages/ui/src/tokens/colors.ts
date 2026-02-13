/**
 * Design System Color Tokens
 *
 * These tokens define the CGK platform's Navy + Gold aesthetic.
 * CSS variables are defined in globals.css; this file provides
 * TypeScript constants for programmatic access.
 */

/**
 * Semantic color scale - maps to CSS variables
 * Usage: Use these in component logic when needed
 */
export const colors = {
  // Neutrals (warm undertone)
  gray: {
    50: 'hsl(40 20% 98%)', // Warm off-white backgrounds
    100: 'hsl(40 15% 95%)', // Card backgrounds
    200: 'hsl(40 10% 88%)', // Borders, dividers
    300: 'hsl(40 8% 78%)', // Disabled states
    400: 'hsl(40 8% 65%)', // Placeholder text
    500: 'hsl(40 5% 55%)', // Secondary text
    600: 'hsl(40 6% 42%)', // Icons
    700: 'hsl(40 8% 28%)', // Body text
    800: 'hsl(40 8% 18%)', // Headings
    900: 'hsl(40 10% 10%)', // Rich near-black
  },

  // Primary (Deep Navy)
  navy: {
    50: 'hsl(222 40% 96%)',
    100: 'hsl(222 42% 92%)',
    200: 'hsl(222 44% 84%)',
    300: 'hsl(222 45% 70%)',
    400: 'hsl(222 46% 55%)',
    500: 'hsl(222 47% 40%)',
    600: 'hsl(222 47% 28%)',
    700: 'hsl(222 47% 20%)',
    800: 'hsl(222 47% 14%)',
    900: 'hsl(222 47% 11%)', // Primary button color
    950: 'hsl(222 50% 6%)',
  },

  // Gold Accent (The differentiator)
  gold: {
    50: 'hsl(38 92% 95%)',
    100: 'hsl(38 90% 88%)',
    200: 'hsl(38 88% 78%)',
    300: 'hsl(38 85% 65%)', // Hover states
    400: 'hsl(38 90% 55%)',
    500: 'hsl(38 92% 50%)', // Primary accent
    600: 'hsl(38 95% 42%)', // Active states
    700: 'hsl(38 95% 35%)',
    800: 'hsl(38 92% 28%)',
    900: 'hsl(38 90% 22%)',
  },

  // Semantic colors (muted, sophisticated)
  success: {
    50: 'hsl(152 50% 95%)',
    100: 'hsl(152 48% 88%)',
    200: 'hsl(152 46% 78%)',
    300: 'hsl(152 45% 62%)',
    400: 'hsl(152 45% 52%)',
    500: 'hsl(152 45% 42%)', // Sage green
    600: 'hsl(152 48% 35%)',
    700: 'hsl(152 50% 28%)',
    800: 'hsl(152 50% 22%)',
    900: 'hsl(152 50% 16%)',
  },

  warning: {
    50: 'hsl(38 85% 95%)',
    100: 'hsl(38 80% 88%)',
    200: 'hsl(38 78% 78%)',
    300: 'hsl(38 76% 65%)',
    400: 'hsl(38 75% 55%)',
    500: 'hsl(38 75% 50%)', // Warm amber
    600: 'hsl(38 78% 42%)',
    700: 'hsl(38 80% 35%)',
    800: 'hsl(38 82% 28%)',
    900: 'hsl(38 85% 22%)',
  },

  error: {
    50: 'hsl(0 72% 96%)',
    100: 'hsl(0 70% 90%)',
    200: 'hsl(0 68% 82%)',
    300: 'hsl(0 66% 72%)',
    400: 'hsl(0 65% 62%)',
    500: 'hsl(0 65% 55%)', // Refined red
    600: 'hsl(0 68% 48%)',
    700: 'hsl(0 70% 40%)',
    800: 'hsl(0 72% 32%)',
    900: 'hsl(0 75% 24%)',
  },

  info: {
    50: 'hsl(210 60% 96%)',
    100: 'hsl(210 58% 90%)',
    200: 'hsl(210 56% 82%)',
    300: 'hsl(210 55% 70%)',
    400: 'hsl(210 55% 60%)',
    500: 'hsl(210 55% 50%)', // Calm blue
    600: 'hsl(210 58% 42%)',
    700: 'hsl(210 60% 34%)',
    800: 'hsl(210 62% 26%)',
    900: 'hsl(210 65% 20%)',
  },
} as const

/**
 * Status colors for badges, indicators, etc.
 */
export const statusColors = {
  // Order/Transaction statuses
  pending: colors.warning[500],
  processing: colors.info[500],
  completed: colors.success[500],
  cancelled: colors.gray[500],
  failed: colors.error[500],
  refunded: colors.gray[600],

  // Project/Task statuses
  draft: colors.gray[400],
  active: colors.success[500],
  paused: colors.warning[500],
  archived: colors.gray[500],

  // User/Account statuses
  online: colors.success[500],
  away: colors.warning[500],
  offline: colors.gray[400],
  busy: colors.error[500],

  // Review/Quality statuses
  approved: colors.success[500],
  rejected: colors.error[500],
  needsReview: colors.warning[500],
} as const

/**
 * CSS variable references for use in Tailwind classes
 * These match the variables defined in globals.css
 */
export const cssVars = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  cardForeground: 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  popoverForeground: 'hsl(var(--popover-foreground))',
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  gold: 'hsl(var(--gold))',
  goldLight: 'hsl(var(--gold-light))',
  goldDark: 'hsl(var(--gold-dark))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  error: 'hsl(var(--error))',
  info: 'hsl(var(--info))',
} as const

export type ColorScale = typeof colors
export type StatusColor = keyof typeof statusColors
