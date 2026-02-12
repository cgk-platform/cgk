'use client'

import { useEffect, useState } from 'react'
import type { OnboardingWizardData } from '../../../lib/onboarding-wizard/types'

interface CompleteStepProps {
  data: OnboardingWizardData
  onComplete: () => void
}

interface ConfettiPiece {
  id: number
  x: number
  delay: number
  duration: number
  color: string
}

/**
 * Complete Step
 *
 * Celebration screen with next actions after completing onboarding.
 */
export function CompleteStep({
  data,
  onComplete,
}: CompleteStepProps): React.JSX.Element {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([])

  // Trigger confetti animation on mount
  useEffect(() => {
    setShowConfetti(true)

    // Generate confetti pieces
    const colors = ['#0d9488', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981']
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)] || '#0d9488',
    }))
    setConfettiPieces(pieces)

    // Cleanup after animation
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  const nextActions = [
    {
      icon: <DashboardIcon />,
      title: 'Explore Your Dashboard',
      description: 'View your earnings, projects, and performance metrics',
      href: '/dashboard',
    },
    {
      icon: <BrandsIcon />,
      title: 'Browse Brand Opportunities',
      description: 'Discover brands looking for creators like you',
      href: '/brands',
    },
    {
      icon: <ResourcesIcon />,
      title: 'Creator Resources',
      description: 'Tips, templates, and guides for successful content',
      href: '/resources',
    },
  ]

  return (
    <div className="relative space-y-8 text-center">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute animate-confetti-fall"
              style={{
                left: `${piece.x}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            >
              <div
                className="h-3 w-2 rotate-12"
                style={{ backgroundColor: piece.color }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Success badge */}
      <div className="relative mx-auto w-fit">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-wizard-accent to-wizard-accent-hover shadow-lg">
          <CheckIcon className="h-12 w-12 text-white" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-wizard-success text-white shadow-md">
          <StarIcon className="h-5 w-5" />
        </div>
      </div>

      {/* Congratulations message */}
      <div>
        <h2 className="font-serif text-3xl font-medium text-wizard-text">
          You&apos;re All Set!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-wizard-muted">
          Welcome to the creator program. Your profile is complete and you&apos;re
          ready to start collaborating with amazing brands.
        </p>
      </div>

      {/* Summary stats */}
      <div className="mx-auto flex max-w-sm justify-center gap-8 rounded-xl bg-wizard-hover p-6">
        <div className="text-center">
          <p className="font-serif text-2xl font-medium text-wizard-accent">
            {data.social.connections.length}
          </p>
          <p className="mt-1 text-xs text-wizard-muted">Social accounts</p>
        </div>
        <div className="h-12 w-px bg-wizard-border" />
        <div className="text-center">
          <p className="font-serif text-2xl font-medium text-wizard-accent">
            {data.payment.method ? '1' : '0'}
          </p>
          <p className="mt-1 text-xs text-wizard-muted">Payment method</p>
        </div>
        <div className="h-12 w-px bg-wizard-border" />
        <div className="text-center">
          <p className="font-serif text-2xl font-medium text-wizard-success">
            <CheckSmallIcon />
          </p>
          <p className="mt-1 text-xs text-wizard-muted">Tax forms</p>
        </div>
      </div>

      {/* Next actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-wizard-text">What&apos;s Next?</h3>
        <div className="mx-auto max-w-md space-y-2">
          {nextActions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-lg border border-wizard-border bg-white p-4 text-left transition-all hover:border-wizard-accent/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wizard-hover text-wizard-muted transition-colors group-hover:bg-wizard-accent/10 group-hover:text-wizard-accent">
                {action.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-wizard-text group-hover:text-wizard-accent">
                  {action.title}
                </p>
                <p className="text-sm text-wizard-muted">{action.description}</p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-wizard-muted transition-transform group-hover:translate-x-1 group-hover:text-wizard-accent" />
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-lg bg-wizard-accent px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-wizard-accent-hover hover:shadow-xl active:scale-[0.98]"
        >
          Go to Dashboard
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Inline styles for confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CheckSmallIcon(): React.JSX.Element {
  return (
    <svg className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function DashboardIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function BrandsIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function ResourcesIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
