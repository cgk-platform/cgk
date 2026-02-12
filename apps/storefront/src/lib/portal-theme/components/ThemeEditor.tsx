'use client'

/**
 * Theme Editor Component
 *
 * Complete admin interface for portal theme customization.
 * Combines controls panel with live preview in a split layout.
 */

import { cn } from '@cgk/ui'
import { useState, useCallback, useEffect } from 'react'

import { PortalThemeProvider, usePortalTheme } from './PortalThemeProvider'
import { ThemeControls } from './ThemeControls'
import { ThemePreview, ThemePreviewCompact } from './ThemePreview'
import type { CustomerPortalThemeConfig } from '../types'

interface ThemeEditorProps {
  /** Initial theme from database */
  initialTheme: CustomerPortalThemeConfig
  /** Callback when theme is saved */
  onSave: (theme: CustomerPortalThemeConfig) => Promise<void>
  /** Additional CSS classes */
  className?: string
}

/**
 * Theme Editor Component
 *
 * Full admin interface for customizing the customer portal theme.
 * Includes a controls panel and live preview.
 */
export function ThemeEditor({
  initialTheme,
  onSave,
  className,
}: ThemeEditorProps): React.ReactElement {
  return (
    <PortalThemeProvider
      theme={initialTheme}
      enablePreview={true}
      onSave={onSave}
    >
      <ThemeEditorInner className={className} />
    </PortalThemeProvider>
  )
}

/**
 * Inner editor component (requires theme context)
 */
function ThemeEditorInner({
  className,
}: {
  className?: string
}): React.ReactElement {
  const { theme, isPreviewMode, previewState } = usePortalTheme()
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'controls'>('split')
  const [previewScale, setPreviewScale] = useState(0.6)

  // Adjust preview scale based on container width
  const handleResize = useCallback(() => {
    const width = window.innerWidth
    if (width < 1200) {
      setPreviewScale(0.5)
    } else if (width < 1400) {
      setPreviewScale(0.55)
    } else {
      setPreviewScale(0.6)
    }
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] px-4 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
            Portal Theme Editor
          </h2>
          {isPreviewMode && previewState?.isDirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unsaved Changes
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--portal-muted))] p-1">
          <ViewModeButton
            active={viewMode === 'controls'}
            onClick={() => setViewMode('controls')}
            label="Controls Only"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </ViewModeButton>
          <ViewModeButton
            active={viewMode === 'split'}
            onClick={() => setViewMode('split')}
            label="Split View"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </ViewModeButton>
          <ViewModeButton
            active={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
            label="Preview Only"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </ViewModeButton>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Controls panel */}
        {(viewMode === 'split' || viewMode === 'controls') && (
          <div
            className={cn(
              'shrink-0 overflow-y-auto border-r border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
              viewMode === 'split' ? 'w-96' : 'w-full'
            )}
          >
            <ThemeControls />
          </div>
        )}

        {/* Preview panel */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="flex-1 overflow-auto bg-[hsl(var(--portal-muted))] p-6">
            <div className="mx-auto max-w-4xl">
              <ThemePreview scale={previewScale} />

              {/* Preview info */}
              <div className="mt-4 rounded-lg bg-[hsl(var(--portal-card))] p-4">
                <h3 className="mb-2 text-sm font-medium text-[hsl(var(--portal-foreground))]">
                  Theme Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[hsl(var(--portal-muted-foreground))]">Tenant ID:</span>
                    <span className="ml-2 font-mono text-[hsl(var(--portal-foreground))]">
                      {theme.tenantId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--portal-muted-foreground))]">Dark Mode:</span>
                    <span className="ml-2 text-[hsl(var(--portal-foreground))]">
                      {theme.darkModeEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--portal-muted-foreground))]">Sidebar Style:</span>
                    <span className="ml-2 text-[hsl(var(--portal-foreground))]">
                      {theme.sidebar.style}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--portal-muted-foreground))]">Card Style:</span>
                    <span className="ml-2 text-[hsl(var(--portal-foreground))]">
                      {theme.card.style}
                    </span>
                  </div>
                </div>

                {/* Color preview */}
                <div className="mt-4">
                  <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                    Color Palette:
                  </span>
                  <ThemePreviewCompact className="mt-2" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * View mode toggle button
 */
interface ViewModeButtonProps {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}

function ViewModeButton({
  active,
  onClick,
  label,
  children,
}: ViewModeButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md p-2 transition-colors',
        active
          ? 'bg-[hsl(var(--portal-card))] text-[hsl(var(--portal-foreground))] shadow-sm'
          : 'text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))]'
      )}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

/**
 * Inline theme editor for embedded use
 * More compact version for settings pages
 */
interface InlineThemeEditorProps {
  initialTheme: CustomerPortalThemeConfig
  onSave: (theme: CustomerPortalThemeConfig) => Promise<void>
  className?: string
}

export function InlineThemeEditor({
  initialTheme,
  onSave,
  className,
}: InlineThemeEditorProps): React.ReactElement {
  return (
    <PortalThemeProvider
      theme={initialTheme}
      enablePreview={true}
      onSave={onSave}
    >
      <div className={cn('space-y-6', className)}>
        <ThemePreviewCompact />
        <ThemeControls />
      </div>
    </PortalThemeProvider>
  )
}
