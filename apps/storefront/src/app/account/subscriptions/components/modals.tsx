'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { Button, cn, Spinner } from '@cgk/ui'

// ---------------------------------------------------------------------------
// Base Modal Component
// ---------------------------------------------------------------------------

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, children, className }: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full max-w-md bg-background rounded-xl shadow-2xl',
            'animate-in zoom-in-95 fade-in duration-200',
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 pb-0">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function ModalTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-xl font-semibold', className)}>
      {children}
    </h2>
  )
}

export function ModalDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-2', className)}>
      {children}
    </p>
  )
}

export function ModalContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 pt-0', className)}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm Modal
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'default' | 'secondary' | 'destructive'
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  isPending?: boolean
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const loading = isPending || isLoading

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader onClose={() => onOpenChange(false)}>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>

      <ModalFooter className="pt-6">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : null}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Action Modal (with content)
// ---------------------------------------------------------------------------

interface ActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel: string
  confirmVariant?: 'default' | 'secondary' | 'destructive'
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  isPending?: boolean
}

export function ActionModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = 'default',
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
}: ActionModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const loading = isPending || isLoading

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader onClose={() => onOpenChange(false)}>
        <ModalTitle>{title}</ModalTitle>
        {description && <ModalDescription>{description}</ModalDescription>}
      </ModalHeader>

      {children && (
        <ModalContent>
          {children}
        </ModalContent>
      )}

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : null}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Selection Modal
// ---------------------------------------------------------------------------

interface SelectionOption {
  id: string
  label: string
  description?: string
  disabled?: boolean
}

interface SelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  options: SelectionOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  isPending?: boolean
}

export function SelectionModal({
  open,
  onOpenChange,
  title,
  description,
  options,
  selectedId,
  onSelect,
  confirmLabel,
  onConfirm,
  isPending = false,
}: SelectionModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const loading = isPending || isLoading

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader onClose={() => onOpenChange(false)}>
        <ModalTitle>{title}</ModalTitle>
        {description && <ModalDescription>{description}</ModalDescription>}
      </ModalHeader>

      <ModalContent>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => !option.disabled && onSelect(option.id)}
              disabled={option.disabled}
              className={cn(
                'w-full text-left p-4 rounded-lg border-2 transition-colors',
                selectedId === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.label}</span>
                {selectedId === option.id && (
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              )}
            </button>
          ))}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || !selectedId}
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : null}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
