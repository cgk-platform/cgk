'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { Button, cn } from '@cgk/ui'

import type { WizardData } from '@/lib/ab-tests/types'
import { useCreateABTest } from '@/lib/ab-tests/hooks'

import { Step1Basics } from './Step1Basics'
import { Step2Variants } from './Step2Variants'
import { Step3Targeting } from './Step3Targeting'
import { Step4Schedule } from './Step4Schedule'
import { Step5Review } from './Step5Review'

const steps = [
  { number: 1, title: 'Basics', description: 'Name, type, and hypothesis' },
  { number: 2, title: 'Variants', description: 'Configure test variants' },
  { number: 3, title: 'Targeting', description: 'Audience targeting rules' },
  { number: 4, title: 'Schedule', description: 'Timing and guardrails' },
  { number: 5, title: 'Review', description: 'Confirm and launch' },
]

export function CreateWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>({})
  const { createTest, isLoading, error } = useCreateABTest()

  const updateData = useCallback((stepData: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...stepData }))
  }, [])

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleNext = () => {
    if (step < 5) setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    const test = await createTest(data)
    if (test) {
      router.push(`/admin/ab-tests/${test.id}`)
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!(
          data.step1?.name &&
          data.step1?.testType &&
          data.step1?.goalEvent &&
          data.step1?.baseUrl
        )
      case 2:
        return !!(data.step2?.variants && data.step2.variants.length >= 2)
      case 3:
        return true // Targeting is optional
      case 4:
        return !!(data.step4?.startOption && data.step4?.timezone)
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress Indicator */}
      <WizardProgress steps={steps} currentStep={step} />

      {/* Step Content */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 && <Step1Basics data={data} updateData={updateData} />}
        {step === 2 && <Step2Variants data={data} updateData={updateData} />}
        {step === 3 && <Step3Targeting data={data} updateData={updateData} />}
        {step === 4 && <Step4Schedule data={data} updateData={updateData} />}
        {step === 5 && <Step5Review data={data} />}

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error.message}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 1}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/ab-tests')}
          >
            Cancel
          </Button>

          {step < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !canProceed()}>
              {isLoading ? 'Creating...' : 'Create Test'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface WizardProgressProps {
  steps: { number: number; title: string; description: string }[]
  currentStep: number
}

function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = currentStep > step.number
          const isCurrent = currentStep === step.number

          return (
            <li key={step.number} className="relative flex flex-1 flex-col items-center">
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 right-1/2 top-4 -translate-y-1/2 h-0.5',
                    isComplete ? 'bg-cyan-600' : 'bg-slate-200'
                  )}
                  style={{ left: '-50%', right: '50%' }}
                />
              )}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-1/2 right-0 top-4 -translate-y-1/2 h-0.5',
                    currentStep > step.number ? 'bg-cyan-600' : 'bg-slate-200'
                  )}
                  style={{ left: '50%', right: '-50%' }}
                />
              )}

              {/* Step Circle */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  'transition-all duration-200',
                  isComplete
                    ? 'bg-cyan-600 text-white'
                    : isCurrent
                      ? 'border-2 border-cyan-600 bg-white text-cyan-600'
                      : 'border-2 border-slate-300 bg-white text-slate-400'
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Info */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isCurrent ? 'text-cyan-600' : 'text-slate-500'
                  )}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                  {step.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
