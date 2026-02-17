'use client'

import { cn } from '@cgk-platform/ui'
import { Building2, X } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { WizardProvider, useWizard } from './context'
import { WizardStepIndicator } from './step-indicator'

/**
 * Loading fallback for wizard content
 */
function WizardLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

/**
 * Inner wizard layout with context access
 */
function WizardLayoutInner({ children }: { children: React.ReactNode }) {
  const { currentStep, steps, stepStatus, currentStepDef } = useWizard()

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Brand Onboarding</h1>
              <p className="text-xs text-muted-foreground">
                Step {currentStep} of {steps.length}
              </p>
            </div>
          </div>

          <Link
            href="/brands"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Exit wizard</span>
          </Link>
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b bg-card/50 py-6">
        <div className="mx-auto max-w-5xl px-4">
          <WizardStepIndicator
            steps={steps}
            currentStep={currentStep}
            stepStatus={stepStatus}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Step header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Step {currentStep}
            </span>
            {currentStepDef.optional && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                Optional
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{currentStepDef.label}</h2>
          <p className="mt-1 text-muted-foreground">{currentStepDef.description}</p>
        </div>

        {/* Step content */}
        <div
          className={cn(
            'rounded-xl border bg-card p-6 shadow-lg',
            'transition-all duration-300'
          )}
        >
          <Suspense fallback={<WizardLoading />}>{children}</Suspense>
        </div>
      </main>

      {/* Footer help text */}
      <footer className="border-t py-4">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
          <p>
            Need help?{' '}
            <a
              href="https://docs.cgk.dev/onboarding"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Read the onboarding guide
            </a>{' '}
            or contact support.
          </p>
        </div>
      </footer>
    </div>
  )
}

/**
 * Wizard Layout
 *
 * Wraps all wizard steps with:
 * - Step indicator showing all 9 steps
 * - Wizard context provider for state management
 * - Consistent header and navigation
 */
export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<WizardLoading />}>
      <WizardProvider>
        <WizardLayoutInner>{children}</WizardLayoutInner>
      </WizardProvider>
    </Suspense>
  )
}
