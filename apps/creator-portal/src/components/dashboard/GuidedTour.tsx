'use client'

import { Button, Card, CardContent } from '@cgk/ui'
import { useState } from 'react'


interface GuidedTourProps {
  creatorName: string
  onComplete: () => void
  onDismiss: () => void
}

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const tourSteps: TourStep[] = [
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description:
      'This is your home base. View your earnings across all brands, track active projects, and see important updates at a glance.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    id: 'projects',
    title: 'Projects',
    description:
      'Find all your assigned projects here. Upload deliverables, track deadlines, and communicate with your coordinator.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'earnings',
    title: 'Earnings & Payouts',
    description:
      'Track your earnings per brand, view pending amounts, and request withdrawals when your balance is ready.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'messages',
    title: 'Messages',
    description:
      'Stay in touch with your project coordinators. Get updates, ask questions, and share progress.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    title: 'Settings & Profile',
    description:
      'Update your profile, manage payment methods, submit tax forms, and configure notification preferences.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

export function GuidedTour({
  creatorName,
  onComplete,
  onDismiss,
}: GuidedTourProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {/* Header */}
          {currentStep === 0 && (
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold">Welcome, {creatorName}!</h2>
              <p className="mt-2 text-muted-foreground">
                Let&apos;s take a quick tour of your Creator Portal.
              </p>
            </div>
          )}

          {/* Step content */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              {step?.icon}
            </div>
            <h3 className="text-xl font-semibold">{step?.title}</h3>
            <p className="mt-2 text-muted-foreground">{step?.description}</p>
          </div>

          {/* Progress dots */}
          <div className="mt-6 flex justify-center gap-2">
            {tourSteps.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary'
                    : index < currentStep
                      ? 'bg-primary/40'
                      : 'bg-muted'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onDismiss}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLastStep ? 'Get started' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
