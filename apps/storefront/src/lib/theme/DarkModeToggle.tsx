'use client'

/**
 * DarkModeToggle Component
 *
 * Toggle button for switching between light and dark modes.
 * Only rendered when dark mode is enabled for the tenant.
 */

import { useTheme } from './ThemeProvider'

interface DarkModeToggleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const SIZES = {
  sm: { button: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { button: 'h-9 w-9', icon: 'h-5 w-5' },
  lg: { button: 'h-10 w-10', icon: 'h-6 w-6' },
}

/**
 * Sun icon for light mode
 */
function SunIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

/**
 * Moon icon for dark mode
 */
function MoonIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

/**
 * Dark mode toggle button
 *
 * Shows sun icon in dark mode, moon icon in light mode.
 * Hidden when tenant hasn't enabled dark mode.
 */
export function DarkModeToggle({
  className = '',
  size = 'md',
  showLabel = false,
}: DarkModeToggleProps): React.ReactElement | null {
  const { theme, isDarkMode, toggleDarkMode } = useTheme()

  // Don't render if dark mode is not enabled
  if (!theme.darkModeEnabled) {
    return null
  }

  const sizeClasses = SIZES[size]
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className={`
        inline-flex items-center justify-center
        rounded-full
        transition-colors duration-200
        hover:bg-[hsl(var(--portal-muted))]
        focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] focus:ring-offset-2
        ${sizeClasses.button}
        ${className}
      `.trim()}
      aria-label={label}
      title={label}
    >
      {isDarkMode ? (
        <SunIcon className={sizeClasses.icon} />
      ) : (
        <MoonIcon className={sizeClasses.icon} />
      )}
      {showLabel && (
        <span className="ml-2 text-sm">
          {isDarkMode ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}

/**
 * Dark mode toggle with full label
 *
 * Alternative version with visible text label.
 */
export function DarkModeToggleWithLabel({
  className = '',
}: {
  className?: string
}): React.ReactElement | null {
  const { theme, isDarkMode, toggleDarkMode } = useTheme()

  if (!theme.darkModeEnabled) {
    return null
  }

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className={`
        inline-flex items-center gap-2
        px-3 py-2
        text-sm font-medium
        rounded-lg
        transition-colors duration-200
        hover:bg-[hsl(var(--portal-muted))]
        focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]
        ${className}
      `.trim()}
    >
      {isDarkMode ? (
        <>
          <SunIcon className="h-4 w-4" />
          <span>Light mode</span>
        </>
      ) : (
        <>
          <MoonIcon className="h-4 w-4" />
          <span>Dark mode</span>
        </>
      )}
    </button>
  )
}
