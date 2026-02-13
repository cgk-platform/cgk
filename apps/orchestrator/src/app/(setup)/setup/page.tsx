'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { StepIndicator } from './components/step-indicator'
import { DatabaseStep } from './components/database-step'
import { CacheStep } from './components/cache-step'
import { StorageStep } from './components/storage-step'
import { MigrationsStep } from './components/migrations-step'
import { AdminStep } from './components/admin-step'
import { ConfigStep } from './components/config-step'
import { CompleteStep } from './components/complete-step'

/**
 * Step definitions for the setup wizard
 */
const STEPS = [
  { id: 'database', label: 'Database', component: DatabaseStep },
  { id: 'cache', label: 'Cache', component: CacheStep },
  { id: 'storage', label: 'Storage', component: StorageStep, optional: true },
  { id: 'migrations', label: 'Migrations', component: MigrationsStep },
  { id: 'admin', label: 'Admin', component: AdminStep },
  { id: 'config', label: 'Config', component: ConfigStep },
  { id: 'complete', label: 'Complete', component: CompleteStep },
]

/**
 * Platform Setup Wizard
 *
 * First-run configuration wizard for new CGK platform installations.
 * Guides users through database, cache, migrations, and admin setup.
 */
export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Check current setup status on mount
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/status')
      const data = await response.json()

      if (data.isConfigured) {
        // Already configured, redirect to dashboard
        router.push('/')
        return
      }

      setStepStatus(data.steps || {})

      // Find first incomplete required step
      const firstIncomplete = STEPS.findIndex(
        (step) => !data.steps?.[step.id] && !step.optional
      )

      if (firstIncomplete !== -1) {
        setCurrentStep(firstIncomplete)
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
      // Continue with setup from beginning
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = () => {
    // Mark current step as complete
    const currentStepDef = STEPS[currentStep]
    if (!currentStepDef) return

    setStepStatus((prev) => ({
      ...prev,
      [currentStepDef.id]: true,
    }))

    // Move to next step
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking platform status...</p>
        </div>
      </div>
    )
  }

  const currentStepDefinition = STEPS[currentStep]
  if (!currentStepDefinition) {
    return null
  }
  const CurrentStepComponent = currentStepDefinition.component

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-800/50 rounded-full text-xs text-cyan-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            First-Run Configuration
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Setup</h1>
          <p className="text-zinc-400">
            Configure your CGK platform in a few steps
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            stepStatus={stepStatus}
          />
        </div>

        {/* Current Step Content */}
        <div className="bg-[#0d1117] border border-zinc-800 rounded-xl p-6 shadow-2xl shadow-black/50">
          <CurrentStepComponent
            onComplete={handleStepComplete}
            onBack={handleBack}
            isFirst={currentStep === 0}
            isLast={currentStep === STEPS.length - 1}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>
            Need help?{' '}
            <a
              href="https://docs.cgk.dev/setup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-400"
            >
              Read the setup guide
            </a>{' '}
            or use the CLI:{' '}
            <code className="font-mono text-cyan-400">npx @cgk-platform/cli setup</code>
          </p>
        </div>
      </div>
    </div>
  )
}
