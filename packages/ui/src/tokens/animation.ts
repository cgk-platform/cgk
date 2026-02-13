/**
 * Design System Animation Tokens
 *
 * CSS-only animation system for polished, performant motion
 * No JavaScript animation libraries - all CSS keyframes and transitions
 */

/**
 * Duration tokens
 * Based on perceived motion principles:
 * - Fast: micro-interactions (hover, focus)
 * - Normal: standard transitions
 * - Slow: page transitions, modals
 */
export const duration = {
  instant: '0ms',
  fastest: '50ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '700ms',
} as const

/**
 * Easing functions
 * Custom cubic-bezier curves for natural motion
 */
export const easing = {
  /** Linear - use sparingly, feels mechanical */
  linear: 'linear',

  /** Standard easing - default for most transitions */
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Ease in - elements leaving/shrinking */
  in: 'cubic-bezier(0.4, 0, 1, 1)',

  /** Ease out - elements entering/growing (RECOMMENDED) */
  out: 'cubic-bezier(0, 0, 0.2, 1)',

  /** Ease in-out - elements moving/transforming */
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Smooth deceleration - premium feel for entries */
  smoothOut: 'cubic-bezier(0.16, 1, 0.3, 1)',

  /** Bounce - playful emphasis */
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /** Spring - natural feeling returns */
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const

/**
 * CSS keyframe definitions
 * Import these in globals.css
 */
export const keyframes = {
  /** Fade in from transparent */
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },

  /** Fade out to transparent */
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },

  /** Fade and slide up (recommended for entries) */
  fadeUp: {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  /** Fade and slide down */
  fadeDown: {
    from: { opacity: '0', transform: 'translateY(-8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  /** Fade and slide left */
  fadeLeft: {
    from: { opacity: '0', transform: 'translateX(8px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },

  /** Fade and slide right */
  fadeRight: {
    from: { opacity: '0', transform: 'translateX(-8px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },

  /** Scale in from slightly smaller */
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },

  /** Scale out to slightly smaller */
  scaleOut: {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },

  /** Subtle pulse for loading states */
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },

  /** Skeleton shimmer effect */
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },

  /** Spinner rotation */
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  /** Toast slide in from right */
  slideInRight: {
    from: { transform: 'translateX(calc(100% + 24px))' },
    to: { transform: 'translateX(0)' },
  },

  /** Toast slide out to right */
  slideOutRight: {
    from: { transform: 'translateX(0)' },
    to: { transform: 'translateX(calc(100% + 24px))' },
  },

  /** Accordion expand */
  accordionDown: {
    from: { height: '0', opacity: '0' },
    to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
  },

  /** Accordion collapse */
  accordionUp: {
    from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
    to: { height: '0', opacity: '0' },
  },

  /** Dialog overlay fade */
  overlayShow: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },

  /** Dialog content entrance */
  contentShow: {
    from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
    to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
  },

  /** Dropdown menu entrance */
  dropdownShow: {
    from: { opacity: '0', transform: 'translateY(-4px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  /** Tooltip entrance */
  tooltipShow: {
    from: { opacity: '0', transform: 'scale(0.96)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
} as const

/**
 * Pre-composed animation utilities
 * Use these in className: `animate-fade-up`
 */
export const animations = {
  /** Entrance animations */
  fadeIn: `fadeIn ${duration.normal} ${easing.smoothOut}`,
  fadeUp: `fadeUp ${duration.normal} ${easing.smoothOut}`,
  fadeDown: `fadeDown ${duration.normal} ${easing.smoothOut}`,
  fadeLeft: `fadeLeft ${duration.normal} ${easing.smoothOut}`,
  fadeRight: `fadeRight ${duration.normal} ${easing.smoothOut}`,
  scaleIn: `scaleIn ${duration.normal} ${easing.smoothOut}`,

  /** Exit animations */
  fadeOut: `fadeOut ${duration.fast} ${easing.in}`,
  scaleOut: `scaleOut ${duration.fast} ${easing.in}`,

  /** Loading animations */
  pulse: `pulse 2s ${easing.inOut} infinite`,
  shimmer: `shimmer 1.5s infinite`,
  spin: `spin 1s ${easing.linear} infinite`,

  /** Component-specific */
  slideInRight: `slideInRight ${duration.slow} ${easing.smoothOut}`,
  slideOutRight: `slideOutRight ${duration.normal} ${easing.in}`,
  accordionDown: `accordionDown ${duration.normal} ${easing.out}`,
  accordionUp: `accordionUp ${duration.normal} ${easing.out}`,
  overlayShow: `overlayShow ${duration.normal} ${easing.out}`,
  contentShow: `contentShow ${duration.normal} ${easing.smoothOut}`,
  dropdownShow: `dropdownShow ${duration.fast} ${easing.out}`,
  tooltipShow: `tooltipShow ${duration.fast} ${easing.out}`,
} as const

/**
 * Transition utilities for interactive states
 */
export const transitions = {
  /** Default transition for all interactive elements */
  default: `all ${duration.fast} ${easing.default}`,

  /** Color transitions (background, text, border) */
  colors: `color ${duration.fast} ${easing.default}, background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}`,

  /** Transform transitions (scale, translate, rotate) */
  transform: `transform ${duration.normal} ${easing.out}`,

  /** Opacity transitions */
  opacity: `opacity ${duration.normal} ${easing.default}`,

  /** Shadow transitions */
  shadow: `box-shadow ${duration.normal} ${easing.default}`,

  /** Combined for buttons/cards */
  interactive: `color ${duration.fast} ${easing.default}, background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}, box-shadow ${duration.normal} ${easing.default}, transform ${duration.normal} ${easing.out}`,

  /** None - disable transitions */
  none: 'none',
} as const

/**
 * Stagger delays for list animations
 * Apply incrementing delays to children: style={{ animationDelay: staggerDelay[index] }}
 */
export const staggerDelay = [
  '0ms',
  '50ms',
  '100ms',
  '150ms',
  '200ms',
  '250ms',
  '300ms',
  '350ms',
  '400ms',
  '450ms',
  '500ms',
] as const

/**
 * Generate CSS keyframes string for injection into stylesheets
 */
export function generateKeyframesCSS(): string {
  return Object.entries(keyframes)
    .map(([name, frames]) => {
      const frameRules = Object.entries(frames)
        .map(([key, props]) => {
          const cssProps = Object.entries(props as Record<string, string>)
            .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
            .join('; ')
          return `  ${key} { ${cssProps} }`
        })
        .join('\n')
      return `@keyframes ${name} {\n${frameRules}\n}`
    })
    .join('\n\n')
}

export type Duration = keyof typeof duration
export type Easing = keyof typeof easing
export type Animation = keyof typeof animations
export type Transition = keyof typeof transitions
