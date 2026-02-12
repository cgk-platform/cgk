'use client'

/**
 * ThemeProvider Component
 *
 * Provides theme context and manages dark mode state for the customer portal.
 * Injects CSS custom properties and handles runtime theme switching.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { PortalThemeConfig, ThemeContextValue } from './types'

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Storage key for dark mode preference
 */
const DARK_MODE_STORAGE_KEY = 'portal-dark-mode'

interface ThemeProviderProps {
  children: ReactNode
  theme: PortalThemeConfig
  initialDarkMode?: boolean
}

/**
 * ThemeProvider component for customer portal
 *
 * Provides theme context to child components and manages dark mode state.
 * The actual CSS injection happens server-side via ThemeStyles component.
 */
export function ThemeProvider({
  children,
  theme,
  initialDarkMode,
}: ThemeProviderProps): React.ReactElement {
  // Initialize dark mode from props, localStorage, or system preference
  const [isDarkMode, setIsDarkModeState] = useState(() => {
    // Server-side render with initial value
    if (typeof window === 'undefined') {
      return initialDarkMode ?? theme.darkModeDefault
    }

    // Check localStorage first
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }

    // Check system preference if dark mode is enabled
    if (theme.darkModeEnabled) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return theme.darkModeDefault
  })

  // Sync dark mode state with document
  useEffect(() => {
    if (!theme.darkModeEnabled) {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.classList.remove('dark')
      return
    }

    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, theme.darkModeEnabled])

  // Listen for system preference changes
  useEffect(() => {
    if (!theme.darkModeEnabled) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
      if (stored === null) {
        setIsDarkModeState(event.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme.darkModeEnabled])

  const setDarkMode = useCallback((enabled: boolean) => {
    if (!theme.darkModeEnabled) return

    setIsDarkModeState(enabled)
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled))
  }, [theme.darkModeEnabled])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode)
  }, [isDarkMode, setDarkMode])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDarkMode: theme.darkModeEnabled ? isDarkMode : false,
      toggleDarkMode,
      setDarkMode,
    }),
    [theme, isDarkMode, toggleDarkMode, setDarkMode]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

/**
 * Hook to check if dark mode is enabled (safe version)
 * Returns false if used outside ThemeProvider
 */
export function useIsDarkMode(): boolean {
  const context = useContext(ThemeContext)
  return context?.isDarkMode ?? false
}
