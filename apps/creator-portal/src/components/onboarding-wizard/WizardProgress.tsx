'use client'

import { cn } from '@cgk-platform/ui'

import type { WizardStep, WizardStepId } from '../../lib/onboarding-wizard/types'

interface WizardProgressProps {
  steps: WizardStep[]
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
  skippedSteps: WizardStepId[]
  onStepClick: (stepId: WizardStepId) => void
}

/**
 * Wizard Progress Sidebar
 *
 * Vertical journey line showing all steps with their status.
 * Editorial design with elegant connecting lines and subtle animations.
 */
export function WizardProgress({
  steps,
  currentStep,
  completedSteps,
  skippedSteps,
  onStepClick,
}: WizardProgressProps): React.JSX.Element {
  return (
    <nav className="relative" aria-label="Progress">
      {/* Vertical line connecting all steps */}
      <div
        className="absolute left-[19px] top-8 h-[calc(100%-4rem)] w-px bg-wizard-border"
        aria-hidden="true"
      />

      <ol className="relative space-y-6">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = step.id === currentStep
          const isSkipped = skippedSteps.includes(step.id)
          const isPending = !isCompleted && !isCurrent && !isSkipped

          // Can navigate to completed steps or current step
          const canNavigate = isCompleted || isCurrent

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => canNavigate && onStepClick(step.id)}
                disabled={!canNavigate}
                className={cn(
                  'group flex w-full items-start gap-4 rounded-lg p-2 -ml-2 text-left transition-all',
                  canNavigate && 'hover:bg-wizard-hover cursor-pointer',
                  !canNavigate && 'cursor-default'
                )}
              >
                {/* Step indicator */}
                <div className="relative z-10">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                      isCompleted && 'border-wizard-success bg-wizard-success text-white',
                      isCurrent && 'border-wizard-accent bg-white text-wizard-accent ring-4 ring-wizard-accent/20',
                      isSkipped && 'border-wizard-border bg-wizard-bg text-wizard-muted',
                      isPending && 'border-wizard-border bg-white text-wizard-muted'
                    )}
                  >
                    {isCompleted ? (
                      <CheckIcon />
                    ) : isSkipped ? (
                      <SkipIcon />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Animated pulse for current step */}
                  {isCurrent && (
                    <span
                      className="absolute inset-0 animate-ping rounded-full bg-wizard-accent/30"
                      style={{ animationDuration: '2s' }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-serif text-sm font-medium transition-colors',
                        isCompleted && 'text-wizard-success',
                        isCurrent && 'text-wizard-text',
                        isSkipped && 'text-wizard-muted',
                        isPending && 'text-wizard-muted'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.isOptional && (
                      <span className="rounded-full bg-wizard-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wizard-muted">
                        Optional
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-0.5 text-xs transition-colors',
                      isCurrent ? 'text-wizard-muted' : 'text-wizard-muted/70'
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Time estimate for pending steps */}
                  {isPending && (
                    <p className="mt-1 text-[10px] text-wizard-muted/50">
                      ~{step.estimatedMinutes} min
                    </p>
                  )}

                  {/* Status badge */}
                  {isCompleted && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-wizard-success">
                      <CheckIcon className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                  {isSkipped && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-wizard-muted">
                      <SkipIcon className="h-3 w-3" />
                      Skipped
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SkipIcon({ className = 'h-4 w-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  )
}
