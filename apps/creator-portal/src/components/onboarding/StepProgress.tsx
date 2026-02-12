'use client'

import { cn } from '@cgk/ui'
import { FORM_STEPS } from '../../lib/onboarding/types'

interface StepProgressProps {
  currentStep: number
  completedSteps: number[]
}

/**
 * Step Progress Indicator
 *
 * Editorial-style progress bar with step indicators showing
 * completed, current, and upcoming steps with smooth animations.
 */
export function StepProgress({
  currentStep,
  completedSteps,
}: StepProgressProps): React.JSX.Element {
  const progressPercent = ((currentStep - 1) / (FORM_STEPS.length - 1)) * 100

  return (
    <div className="mb-8">
      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />

        {/* Animated progress fill */}
        <div
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Step indicators */}
        <div className="relative flex justify-between">
          {FORM_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = step.id === currentStep
            const isUpcoming = step.id > currentStep

            return (
              <div
                key={step.id}
                className="flex flex-col items-center"
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-background text-primary scale-110',
                    isUpcoming && 'border-muted-foreground/30 bg-background text-muted-foreground/50'
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  )}
                </div>

                {/* Step label - hidden on mobile */}
                <div className="mt-2 hidden text-center sm:block">
                  <p
                    className={cn(
                      'text-xs font-medium transition-colors duration-300',
                      isCurrent && 'text-foreground',
                      isCompleted && 'text-muted-foreground',
                      isUpcoming && 'text-muted-foreground/50'
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] transition-colors duration-300',
                      isCurrent && 'text-muted-foreground',
                      isCompleted && 'text-muted-foreground/70',
                      isUpcoming && 'text-muted-foreground/30'
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile step indicator */}
      <div className="mt-4 text-center sm:hidden">
        <p className="text-sm font-medium">
          Step {currentStep} of {FORM_STEPS.length}:{' '}
          <span className="text-primary">
            {FORM_STEPS[currentStep - 1]?.title}
          </span>
        </p>
      </div>
    </div>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
