'use client'

import * as React from 'react'

import { cn } from '../utils/cn'
import { useTenant, type TenantInfo } from '../context/tenant-context'
import { TenantLogo, RoleBadge } from './tenant-switcher'

export interface MultiTenantWelcomeModalProps {
  /** User's display name */
  userName?: string
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** Callback when tenant is selected */
  onSelect?: (tenant: TenantInfo) => void
  /** Whether to allow closing without selecting */
  allowDismiss?: boolean
}

/**
 * Multi-Tenant Welcome Modal
 *
 * Shown to users with multiple tenants on first login
 * to help them choose which tenant to start with.
 *
 * @example
 * <MultiTenantWelcomeModal
 *   userName="John"
 *   isOpen={showWelcome}
 *   onClose={() => setShowWelcome(false)}
 *   onSelect={handleSelect}
 * />
 */
export function MultiTenantWelcomeModal({
  userName,
  isOpen,
  onClose,
  onSelect,
  allowDismiss = true,
}: MultiTenantWelcomeModalProps) {
  const { availableTenants, switchTenant, setDefaultTenant, isSwitching } = useTenant()

  const [selectedTenant, setSelectedTenant] = React.useState<TenantInfo | null>(null)
  const [rememberChoice, setRememberChoice] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTenant(null)
      setRememberChoice(false)
    }
  }, [isOpen])

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && allowDismiss) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, allowDismiss, onClose])

  const handleContinue = async () => {
    if (!selectedTenant) return

    setIsSubmitting(true)
    try {
      // Set as default if checked
      if (rememberChoice) {
        await setDefaultTenant(selectedTenant.id)
      }

      // Switch to selected tenant
      await switchTenant(selectedTenant.slug)

      onSelect?.(selectedTenant)
      onClose()

      // Reload to apply new context
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch tenant:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatLastActive = (date: Date | null): string => {
    if (!date) return 'Never accessed'

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Active today'
    if (days === 1) return 'Active yesterday'
    if (days < 7) return `Active ${days} days ago`
    if (days < 30) return `Active ${Math.floor(days / 7)} weeks ago`
    return `Active ${Math.floor(days / 30)} months ago`
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={allowDismiss ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-xl rounded-xl bg-background p-6 shadow-xl',
          'animate-in fade-in-0 zoom-in-95'
        )}
      >
        {/* Close button */}
        {allowDismiss && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'absolute right-4 top-4 rounded-md p-1',
              'text-muted-foreground hover:bg-accent hover:text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <h2
            id="welcome-modal-title"
            className="text-xl font-semibold text-foreground"
          >
            Welcome back{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="mt-2 text-muted-foreground">
            You have access to {availableTenants.length} organizations.
            Which would you like to start with?
          </p>
        </div>

        {/* Tenant grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              onClick={() => setSelectedTenant(tenant)}
              className={cn(
                'flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selectedTenant?.id === tenant.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50'
              )}
            >
              <div className="mb-3 flex w-full items-center gap-3">
                <TenantLogo tenant={tenant} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{tenant.name}</div>
                  <RoleBadge
                    role={tenant.role as 'owner' | 'admin' | 'member' | 'creator'}
                    className="mt-1"
                  >
                    {tenant.role}
                  </RoleBadge>
                </div>
                {selectedTenant?.id === tenant.id && (
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatLastActive(tenant.lastActiveAt)}
              </span>
            </button>
          ))}
        </div>

        {/* Remember choice checkbox */}
        <div className="mb-6 flex items-center gap-2">
          <input
            type="checkbox"
            id="remember-choice"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className={cn(
              'h-4 w-4 rounded border-input',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          />
          <label
            htmlFor="remember-choice"
            className="text-sm text-muted-foreground"
          >
            Remember my choice (set as default)
          </label>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedTenant || isSubmitting || isSwitching}
          className={cn(
            'w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground',
            'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isSubmitting || isSwitching ? (
            <span className="flex items-center justify-center gap-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              Switching...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  )
}

// Icons

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}
