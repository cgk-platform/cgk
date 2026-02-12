'use client'

import { cn } from '@cgk/ui'
import type { WizardStep, WizardStepId } from '../../lib/onboarding-wizard/types'

interface StepNavigationProps {
  steps: WizardStep[]
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
}

/**
 * Mobile Step Navigation
 *
 * Horizontal step indicator for mobile devices.
 * Shows current step with compact dot indicators.
 */
export function StepNavigation({
  steps,
  currentStep,
  completedSteps,
}: StepNavigationProps): React.JSX.Element {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)
  const currentStepData = steps[currentIndex]

  return (
    <div className="flex flex-col items-center">
      {/* Dot indicators */}
      <div className="flex items-center gap-2">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = step.id === currentStep
          const isPending = !isCompleted && !isCurrent

          return (
            <div
              key={step.id}
              className={cn(
                'transition-all duration-300',
                isCurrent && 'scale-125'
              )}
            >
              <div
                className={cn(
                  'rounded-full transition-all duration-300',
                  isCompleted && 'h-2.5 w-2.5 bg-wizard-success',
                  isCurrent && 'h-3 w-3 bg-wizard-accent ring-2 ring-wizard-accent/30',
                  isPending && 'h-2 w-2 bg-wizard-border'
                )}
              />
            </div>
          )
        })}
      </div>

      {/* Current step label */}
      <div className="mt-3 text-center">
        <p className="text-xs text-wizard-muted">
          Step {currentIndex + 1} of {steps.length}
        </p>
        {currentStepData && (
          <p className="mt-0.5 font-serif text-lg font-medium text-wizard-text">
            {currentStepData.title}
          </p>
        )}
      </div>
    </div>
  )
}
