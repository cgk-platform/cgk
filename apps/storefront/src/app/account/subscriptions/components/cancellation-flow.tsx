'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription, Button, Card, CardContent, cn, Spinner, Textarea } from '@cgk/ui'

import {
  applySaveOffer,
  cancelSubscription,
  getCancellationReasons,
  getSaveOffers,
  pauseSubscription,
  skipNextOrder,
  updateFrequency,
} from '@/lib/subscriptions/api'
import type { CancellationReason, SaveOffer, Subscription } from '@/lib/subscriptions/types'

interface CancellationFlowProps {
  subscription: Subscription
}

type FlowStep = 'reason' | 'offers' | 'confirm'

/**
 * Multi-step cancellation flow with save offers
 *
 * Steps:
 * 1. Select cancellation reason
 * 2. Show save offers based on reason
 * 3. Confirm cancellation if no offer accepted
 */
export function CancellationFlow({ subscription }: CancellationFlowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Flow state
  const [step, setStep] = useState<FlowStep>('reason')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reason step
  const [reasons, setReasons] = useState<CancellationReason[]>([])
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null)
  const [comment, setComment] = useState('')

  // Offers step
  const [offers, setOffers] = useState<SaveOffer[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [applyingOffer, setApplyingOffer] = useState<string | null>(null)

  // Confirm step
  const [cancelling, setCancelling] = useState(false)

  // Load cancellation reasons
  useEffect(() => {
    async function loadReasons() {
      try {
        const data = await getCancellationReasons()
        setReasons(data)
      } catch {
        setError('Failed to load cancellation options')
      } finally {
        setLoading(false)
      }
    }
    loadReasons()
  }, [])

  // Load save offers when reason is selected
  const handleReasonSelected = useCallback(async () => {
    if (!selectedReason) return

    setLoadingOffers(true)
    setError(null)

    try {
      const data = await getSaveOffers(subscription.id, selectedReason.id)
      setOffers(data)
      setStep('offers')
    } catch {
      // If no offers, go directly to confirm
      setStep('confirm')
    } finally {
      setLoadingOffers(false)
    }
  }, [subscription.id, selectedReason])

  // Apply a save offer
  const handleApplyOffer = useCallback(async (offer: SaveOffer) => {
    setApplyingOffer(offer.id)
    setError(null)

    try {
      let result

      switch (offer.type) {
        case 'discount':
          result = await applySaveOffer(subscription.id, offer.id)
          break
        case 'pause':
          result = await pauseSubscription(subscription.id, {
            reason: 'Accepted save offer - pause subscription',
          })
          break
        case 'skip':
          result = await skipNextOrder(subscription.id)
          break
        case 'frequency':
          // Assume frequency offers include the new frequency in value
          if (offer.value) {
            const [intervalCount, interval] = offer.value.split(' ')
            result = await updateFrequency(subscription.id, {
              intervalCount: parseInt(intervalCount, 10),
              interval,
            })
          }
          break
        default:
          result = await applySaveOffer(subscription.id, offer.id)
      }

      if (result?.success) {
        // Redirect back to subscription detail
        router.push(`/account/subscriptions/${subscription.id}`)
        router.refresh()
      } else {
        setError(result?.error || 'Failed to apply offer')
      }
    } catch {
      setError('Failed to apply offer')
    } finally {
      setApplyingOffer(null)
    }
  }, [subscription.id, router])

  // Confirm cancellation
  const handleCancel = useCallback(async () => {
    if (!selectedReason) return

    setCancelling(true)
    setError(null)

    try {
      const result = await cancelSubscription(
        subscription.id,
        selectedReason.id,
        comment || undefined
      )

      if (result.success) {
        router.push('/account/subscriptions')
        router.refresh()
      } else {
        setError(result.error || 'Failed to cancel subscription')
      }
    } catch {
      setError('Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }, [subscription.id, selectedReason, comment, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['reason', 'offers', 'confirm'] as FlowStep[]).map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['reason'].indexOf(step) >= index
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2',
                  ['reason'].indexOf(step) > index ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Select Reason */}
      {step === 'reason' && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">We're sorry to see you go</h2>
            <p className="text-muted-foreground mb-6">
              Please let us know why you're cancelling so we can improve.
            </p>

            <div className="space-y-3 mb-6">
              {reasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border-2 transition-all',
                    selectedReason?.id === reason.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="font-medium">{reason.label}</span>
                </button>
              ))}
            </div>

            {/* Comment field */}
            {selectedReason?.requiresComment && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Tell us more (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional feedback..."
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => router.back()}
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleReasonSelected}
                disabled={!selectedReason || loadingOffers}
              >
                {loadingOffers ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Save Offers */}
      {step === 'offers' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Before you go...</h2>
              <p className="text-muted-foreground mb-6">
                We'd love to keep you as a customer. Here are some options that might help:
              </p>

              <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      offer.type === 'discount'
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Offer Icon */}
                        <div className="flex items-center gap-2 mb-2">
                          {offer.type === 'discount' && (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                          {offer.type === 'pause' && (
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                          {offer.type === 'skip' && (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4z" />
                              </svg>
                            </div>
                          )}
                          {offer.type === 'frequency' && (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <h3 className="font-semibold">{offer.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {offer.description}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleApplyOffer(offer)}
                        disabled={applyingOffer !== null}
                        variant={offer.type === 'discount' ? 'default' : 'outline'}
                        className={cn(
                          'flex-shrink-0',
                          offer.type === 'discount' && 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        {applyingOffer === offer.id ? (
                          <Spinner size="sm" />
                        ) : (
                          offer.value || 'Accept'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep('reason')}
              disabled={applyingOffer !== null}
            >
              Back
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setStep('confirm')}
              disabled={applyingOffer !== null}
            >
              Continue to Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm Cancellation */}
      {step === 'confirm' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Confirm Cancellation</h2>
              <p className="text-muted-foreground">
                Are you sure you want to cancel your subscription?
                {selectedReason && (
                  <span className="block mt-2 text-sm">
                    Reason: {selectedReason.label}
                  </span>
                )}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-800 mb-2">What happens next:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>- No more automatic orders will be processed</li>
                <li>- You'll lose any subscription discounts</li>
                <li>- You can reactivate anytime from your account</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/account/subscriptions/${subscription.id}`)}
                disabled={cancelling}
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Subscription'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
