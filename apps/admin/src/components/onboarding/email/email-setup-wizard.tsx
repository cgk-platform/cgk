'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { Button } from '@cgk-platform/ui'

import type {
  DomainConfigStatus,
  EmailOnboardingSubStep,
  SenderAddressWithDomain,
} from '@cgk-platform/communications'

import { ResendAccountStep } from './steps/resend-account-step'
import { DomainConfigStep } from './steps/domain-config-step'
import { SenderAddressStep } from './steps/sender-address-step'
import { InboundEmailStep } from './steps/inbound-email-step'
import { NotificationRoutingStep } from './steps/notification-routing-step'
import { EMAIL_SETUP_STEPS, type EmailSetupWizardProps } from './types'

/**
 * Email Setup Wizard Container
 *
 * Step 5 of tenant onboarding - guides through Resend email configuration.
 */
export function EmailSetupWizard({
  tenantId: _tenantId,
  primaryDomain,
  brandName,
  onComplete,
  onSkip,
}: EmailSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<EmailOnboardingSubStep>('resend_account')
  const [resendApiKey, setResendApiKey] = useState<string | null>(null)
  const [domains, setDomains] = useState<DomainConfigStatus[]>([])
  const [senderAddresses, setSenderAddresses] = useState<SenderAddressWithDomain[]>([])
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = EMAIL_SETUP_STEPS.findIndex((s) => s.id === currentStep)
  const currentStepConfig = EMAIL_SETUP_STEPS[currentStepIndex]

  const handleApiKeyVerified = useCallback((apiKey: string) => {
    setResendApiKey(apiKey)
    setCurrentStep('domain_config')
  }, [])

  const handleDomainsConfigured = useCallback((configuredDomains: DomainConfigStatus[]) => {
    setDomains(configuredDomains)
    setCurrentStep('sender_addresses')
  }, [])

  const handleAddressesCreated = useCallback((addresses: SenderAddressWithDomain[]) => {
    setSenderAddresses(addresses)
    setCurrentStep('inbound_setup')
  }, [])

  const handleInboundComplete = useCallback(() => {
    setCurrentStep('notification_routing')
  }, [])

  const handleInboundSkip = useCallback(() => {
    setCurrentStep('notification_routing')
  }, [])

  const handleRoutingComplete = useCallback(async () => {
    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete email setup')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup')
    } finally {
      setIsCompleting(false)
    }
  }, [onComplete])

  const handleSkip = useCallback(async () => {
    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to skip email setup')
      }

      onSkip()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip setup')
    } finally {
      setIsCompleting(false)
    }
  }, [onSkip])

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(EMAIL_SETUP_STEPS[prevIndex]!.id)
    }
  }, [currentStepIndex])

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {EMAIL_SETUP_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  index < currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStepIndex
                      ? 'border-2 border-primary text-primary'
                      : 'border-2 border-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < EMAIL_SETUP_STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-8 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isCompleting}
        >
          Skip Email Setup
        </Button>
      </div>

      {/* Current step title */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            Step {currentStepIndex + 1}: {currentStepConfig?.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentStepConfig?.description}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step content */}
          {currentStep === 'resend_account' && (
            <ResendAccountStep onApiKeyVerified={handleApiKeyVerified} />
          )}

          {currentStep === 'domain_config' && resendApiKey && (
            <DomainConfigStep
              primaryDomain={primaryDomain}
              resendApiKey={resendApiKey}
              onDomainsConfigured={handleDomainsConfigured}
              onBack={goBack}
            />
          )}

          {currentStep === 'sender_addresses' && resendApiKey && (
            <SenderAddressStep
              brandName={brandName}
              resendApiKey={resendApiKey}
              verifiedDomains={domains}
              onAddressesCreated={handleAddressesCreated}
              onBack={goBack}
            />
          )}

          {currentStep === 'inbound_setup' && (
            <InboundEmailStep
              senderAddresses={senderAddresses}
              onComplete={handleInboundComplete}
              onSkip={handleInboundSkip}
              onBack={goBack}
            />
          )}

          {currentStep === 'notification_routing' && (
            <NotificationRoutingStep
              senderAddresses={senderAddresses}
              onComplete={handleRoutingComplete}
              onBack={goBack}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EmailSetupWizard
