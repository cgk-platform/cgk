'use client'

import { cn } from '@cgk-platform/ui'
import {
  Building2,
  Globe,
  Palette,
  CreditCard,
  Mail,
  Users,
  Settings2,
  CheckCircle2,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

import type { WizardStep } from './context'

interface StepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
  stepStatus: Record<string, boolean>
}

/**
 * Icons mapped to step IDs
 */
const STEP_ICONS: Record<string, LucideIcon> = {
  'basic-info': Building2,
  shopify: ShoppingBag,
  domain: Globe,
  branding: Palette,
  payments: CreditCard,
  email: Mail,
  team: Users,
  features: Settings2,
  review: CheckCircle2,
}

/**
 * Wizard Step Indicator
 *
 * A horizontal progress indicator showing all 9 wizard steps
 * with status lights and connecting lines.
 */
export function WizardStepIndicator({ steps, currentStep, stepStatus }: StepIndicatorProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="relative min-w-[800px]">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-800" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const Icon = STEP_ICONS[step.id] || Settings2
            const isComplete = stepStatus[step.id]
            const isCurrent = stepNumber === currentStep
            const isPast = stepNumber < currentStep

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-1.5 transition-all duration-300',
                  isCurrent && 'scale-105'
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    // Complete - success
                    isComplete && 'border-emerald-500/50 bg-emerald-950/50',
                    // Current - primary glow
                    isCurrent &&
                      !isComplete &&
                      'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]',
                    // Past but not complete - warning
                    isPast && !isComplete && 'border-amber-500/50 bg-amber-950/50',
                    // Future - dim
                    !isPast && !isCurrent && !isComplete && 'border-zinc-700 bg-zinc-900/50'
                  )}
                >
                  {/* Pulse animation for current */}
                  {isCurrent && !isComplete && (
                    <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10" />
                  )}

                  <Icon
                    className={cn(
                      'relative z-10 h-4 w-4 transition-colors duration-300',
                      isComplete && 'text-emerald-400',
                      isCurrent && !isComplete && 'text-primary',
                      isPast && !isComplete && 'text-amber-400',
                      !isPast && !isCurrent && !isComplete && 'text-zinc-500'
                    )}
                  />

                  {/* Completion checkmark */}
                  {isComplete && (
                    <div className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wider transition-colors duration-300',
                      isComplete && 'text-emerald-400',
                      isCurrent && !isComplete && 'text-primary',
                      isPast && !isComplete && 'text-amber-400',
                      !isPast && !isCurrent && !isComplete && 'text-zinc-500'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[8px] uppercase tracking-wider text-zinc-600">
                      Optional
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
