'use client'

/**
 * Portal Theme Provider
 *
 * Provides portal-specific theme context and CSS injection.
 * Extends the base theme provider with portal layout configuration.
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

import type { CustomerPortalThemeConfig, ThemePreviewState } from '../types'
import { generatePortalThemeCss } from '../generator'
import { createPortalTheme } from '../defaults'

/**
 * Portal theme context value
 */
interface PortalThemeContextValue {
  /** Current active theme */
  theme: CustomerPortalThemeConfig
  /** Whether dark mode is active */
  isDarkMode: boolean
  /** Toggle dark mode */
  toggleDarkMode: () => void
  /** Set dark mode explicitly */
  setDarkMode: (enabled: boolean) => void
  /** Whether preview mode is active */
  isPreviewMode: boolean
  /** Preview state for admin */
  previewState: ThemePreviewState | null
  /** Update preview theme */
  updatePreview: (updates: Partial<CustomerPortalThemeConfig>) => void
  /** Apply preview as permanent theme */
  applyPreview: () => Promise<void>
  /** Cancel preview and revert */
  cancelPreview: () => void
  /** Start preview mode */
  startPreview: () => void
}

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null)

/**
 * Storage key for dark mode preference
 */
const DARK_MODE_STORAGE_KEY = 'portal-dark-mode'

interface PortalThemeProviderProps {
  children: ReactNode
  /** Initial theme from server */
  theme: CustomerPortalThemeConfig
  /** Initial dark mode state */
  initialDarkMode?: boolean
  /** Enable preview mode for admin */
  enablePreview?: boolean
  /** Callback when theme is saved */
  onSave?: (theme: CustomerPortalThemeConfig) => Promise<void>
}

/**
 * Portal Theme Provider Component
 *
 * Wraps portal pages to provide theme context and CSS injection.
 * Supports live preview for admin theme customization.
 */
export function PortalThemeProvider({
  children,
  theme: initialTheme,
  initialDarkMode,
  enablePreview = false,
  onSave,
}: PortalThemeProviderProps): React.ReactElement {
  const [theme, setTheme] = useState<CustomerPortalThemeConfig>(initialTheme)
  const [previewState, setPreviewState] = useState<ThemePreviewState | null>(null)

  // Dark mode state
  const [isDarkMode, setIsDarkModeState] = useState(() => {
    if (typeof window === 'undefined') {
      return initialDarkMode ?? initialTheme.darkModeDefault
    }

    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }

    if (initialTheme.darkModeEnabled) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return initialTheme.darkModeDefault
  })

  // Active theme (preview or actual)
  const activeTheme = previewState?.isActive ? previewState.theme : theme

  // Sync dark mode with document
  useEffect(() => {
    if (!activeTheme.darkModeEnabled) {
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
  }, [isDarkMode, activeTheme.darkModeEnabled])

  // Listen for system preference changes
  useEffect(() => {
    if (!activeTheme.darkModeEnabled) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
      if (stored === null) {
        setIsDarkModeState(event.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [activeTheme.darkModeEnabled])

  // Dark mode toggle
  const setDarkMode = useCallback((enabled: boolean) => {
    if (!activeTheme.darkModeEnabled) return
    setIsDarkModeState(enabled)
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled))
  }, [activeTheme.darkModeEnabled])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode)
  }, [isDarkMode, setDarkMode])

  // Preview mode controls
  const startPreview = useCallback(() => {
    if (!enablePreview) return
    setPreviewState({
      theme: { ...theme },
      isActive: true,
      isDirty: false,
      originalTheme: theme,
    })
  }, [enablePreview, theme])

  const updatePreview = useCallback((updates: Partial<CustomerPortalThemeConfig>) => {
    if (!previewState?.isActive) return

    setPreviewState((prev) => {
      if (!prev) return null
      const newTheme = createPortalTheme(prev.theme.tenantId, {
        ...prev.theme,
        ...updates,
      })
      return {
        ...prev,
        theme: newTheme,
        isDirty: true,
      }
    })
  }, [previewState?.isActive])

  const applyPreview = useCallback(async () => {
    if (!previewState?.isActive || !previewState.isDirty) return

    if (onSave) {
      await onSave(previewState.theme)
    }

    setTheme(previewState.theme)
    setPreviewState(null)
  }, [previewState, onSave])

  const cancelPreview = useCallback(() => {
    if (!previewState?.isActive) return
    setPreviewState(null)
  }, [previewState?.isActive])

  // Generate and inject CSS
  useEffect(() => {
    const styleId = 'portal-theme-styles'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = generatePortalThemeCss(activeTheme)

    return () => {
      // Don't remove on cleanup - let it persist
    }
  }, [activeTheme])

  const contextValue = useMemo<PortalThemeContextValue>(
    () => ({
      theme: activeTheme,
      isDarkMode: activeTheme.darkModeEnabled ? isDarkMode : false,
      toggleDarkMode,
      setDarkMode,
      isPreviewMode: previewState?.isActive ?? false,
      previewState,
      updatePreview,
      applyPreview,
      cancelPreview,
      startPreview,
    }),
    [
      activeTheme,
      isDarkMode,
      toggleDarkMode,
      setDarkMode,
      previewState,
      updatePreview,
      applyPreview,
      cancelPreview,
      startPreview,
    ]
  )

  return (
    <PortalThemeContext.Provider value={contextValue}>
      {children}
    </PortalThemeContext.Provider>
  )
}

/**
 * Hook to access portal theme context
 * @throws Error if used outside PortalThemeProvider
 */
export function usePortalTheme(): PortalThemeContextValue {
  const context = useContext(PortalThemeContext)
  if (!context) {
    throw new Error('usePortalTheme must be used within a PortalThemeProvider')
  }
  return context
}

/**
 * Hook to check if dark mode is active (safe version)
 * Returns false if used outside provider
 */
export function usePortalDarkMode(): boolean {
  const context = useContext(PortalThemeContext)
  return context?.isDarkMode ?? false
}

/**
 * Hook to access only the theme config (no functions)
 */
export function usePortalThemeConfig(): CustomerPortalThemeConfig {
  const { theme } = usePortalTheme()
  return theme
}
