'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, Button, cn, Spinner } from '@cgk-platform/ui'
import {
  getPaymentMethods,
  requestPaymentUpdateLink,
  updatePaymentMethod,
} from '@/lib/subscriptions/api'
import { formatCardBrand, formatCardExpiry } from '@/lib/subscriptions/format'
import type { PaymentMethod } from '@/lib/subscriptions/types'
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle, ModalDescription } from './modals'

interface PaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptionId: string
  currentPaymentMethodId?: string
}

/**
 * Payment method selection/update modal
 *
 * Allows customers to:
 * 1. Select from existing payment methods
 * 2. Request a link to add a new payment method
 */
export function PaymentMethodModal({
  open,
  onOpenChange,
  subscriptionId,
  currentPaymentMethodId,
}: PaymentMethodModalProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(currentPaymentMethodId || null)
  const [saving, setSaving] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load payment methods
  useEffect(() => {
    if (!open) return

    async function loadPaymentMethods() {
      setLoading(true)
      setError(null)
      try {
        const methods = await getPaymentMethods()
        setPaymentMethods(methods)
        // Set default selection
        if (!selectedId && currentPaymentMethodId) {
          setSelectedId(currentPaymentMethodId)
        }
      } catch {
        setError('Failed to load payment methods')
      } finally {
        setLoading(false)
      }
    }

    loadPaymentMethods()
  }, [open, currentPaymentMethodId, selectedId])

  const handleUpdatePaymentMethod = useCallback(async () => {
    if (!selectedId || selectedId === currentPaymentMethodId) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await updatePaymentMethod(subscriptionId, selectedId)
      if (result.success) {
        onOpenChange(false)
        startTransition(() => {
          router.refresh()
        })
      } else {
        setError(result.error || 'Failed to update payment method')
      }
    } catch {
      setError('Failed to update payment method')
    } finally {
      setSaving(false)
    }
  }, [subscriptionId, selectedId, currentPaymentMethodId, onOpenChange, router])

  const handleRequestUpdateLink = useCallback(async () => {
    setSendingLink(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await requestPaymentUpdateLink(subscriptionId)
      if (result.success) {
        setSuccessMessage(result.message || 'Check your email for a secure link to update your payment method.')
      } else {
        setError('Failed to send update link. Please try again.')
      }
    } catch {
      setError('Failed to send update link. Please try again.')
    } finally {
      setSendingLink(false)
    }
  }, [subscriptionId])

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader onClose={() => onOpenChange(false)}>
        <ModalTitle>Update Payment Method</ModalTitle>
        <ModalDescription>
          {paymentMethods.length > 0
            ? 'Select an existing payment method or add a new one.'
            : 'Add a new payment method to continue.'}
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="default" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            {successMessage && (
              <Alert variant="success">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Add New Payment Method */}
            <Button
              variant="outline"
              className="w-full justify-center h-auto py-4"
              onClick={handleRequestUpdateLink}
              disabled={sendingLink || saving}
            >
              {sendingLink ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Sending Link...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Payment Method
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              We'll email you a secure link to add or update your cards
            </p>

            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-xs text-muted-foreground uppercase">
                      Or Select Existing
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedId(method.id)}
                      disabled={saving || sendingLink}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border-2 transition-colors',
                        selectedId === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50',
                        (saving || sendingLink) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Card Icon */}
                          <div className="w-10 h-7 rounded bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {method.card ? formatCardBrand(method.card.brand).slice(0, 4) : method.type}
                            </span>
                          </div>

                          {/* Card Details */}
                          <div>
                            {method.card ? (
                              <>
                                <p className="font-medium text-sm">
                                  {formatCardBrand(method.card.brand)} ****{method.card.lastDigits}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Expires {formatCardExpiry(method.card.expiryMonth, method.card.expiryYear)}
                                </p>
                              </>
                            ) : (
                              <p className="font-medium text-sm capitalize">{method.type}</p>
                            )}
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedId === method.id && (
                          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Default Badge */}
                      {method.isDefault && (
                        <span className="inline-block mt-2 text-xs text-muted-foreground">
                          Default payment method
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={saving || sendingLink}
        >
          Cancel
        </Button>
        {paymentMethods.length > 0 && selectedId !== currentPaymentMethodId && (
          <Button
            onClick={handleUpdatePaymentMethod}
            disabled={saving || sendingLink || !selectedId}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Use Selected'
            )}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
