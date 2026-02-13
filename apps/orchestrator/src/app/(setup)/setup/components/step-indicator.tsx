'use client'

import { cn } from '@cgk-platform/ui'
import {
  Database,
  HardDrive,
  Cloud,
  GitBranch,
  UserCog,
  Settings,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

interface Step {
  id: string
  label: string
  optional?: boolean
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  stepStatus: Record<string, boolean>
}

const STEP_ICONS: Record<string, LucideIcon> = {
  database: Database,
  cache: HardDrive,
  storage: Cloud,
  migrations: GitBranch,
  admin: UserCog,
  config: Settings,
  complete: CheckCircle2,
}

/**
 * Step Indicator Component
 *
 * Industrial control panel style progress indicator
 * with glowing status lights and connecting lines.
 */
export function StepIndicator({ steps, currentStep, stepStatus }: StepIndicatorProps) {
  return (
    <div className="relative">
      {/* Horizontal line connecting all steps */}
      <div className="absolute top-6 left-0 right-0 h-px bg-zinc-800" />

      {/* Progress line */}
      <div
        className="absolute top-6 left-0 h-px bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
        style={{
          width: `${(currentStep / (steps.length - 1)) * 100}%`,
        }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.id] || Settings
          const isComplete = stepStatus[step.id]
          const isCurrent = index === currentStep
          const isPast = index < currentStep

          return (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center gap-2 transition-all duration-300',
                isCurrent && 'scale-110'
              )}
            >
              {/* Status light */}
              <div
                className={cn(
                  'relative w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300',
                  // Complete - green glow
                  isComplete && 'bg-emerald-950/50 border-emerald-500/50',
                  // Current - cyan glow
                  isCurrent && !isComplete && 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]',
                  // Past but not complete - amber
                  isPast && !isComplete && 'bg-amber-950/50 border-amber-500/50',
                  // Future - dim
                  !isPast && !isCurrent && !isComplete && 'bg-zinc-900/50 border-zinc-700'
                )}
              >
                {/* Glow ring for current step */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-lg animate-pulse bg-cyan-400/10" />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 relative z-10 transition-colors duration-300',
                    isComplete && 'text-emerald-400',
                    isCurrent && !isComplete && 'text-cyan-400',
                    isPast && !isComplete && 'text-amber-400',
                    !isPast && !isCurrent && !isComplete && 'text-zinc-500'
                  )}
                />

                {/* Completion checkmark overlay */}
                {isComplete && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'text-xs font-medium transition-colors duration-300',
                    isComplete && 'text-emerald-400',
                    isCurrent && !isComplete && 'text-cyan-400',
                    isPast && !isComplete && 'text-amber-400',
                    !isPast && !isCurrent && !isComplete && 'text-zinc-500'
                  )}
                >
                  {step.label}
                </span>
                {step.optional && (
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    Optional
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
