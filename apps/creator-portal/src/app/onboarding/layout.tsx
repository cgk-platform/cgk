import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Creator Onboarding',
    default: 'Creator Onboarding',
  },
  description: 'Complete your creator profile setup',
}

/**
 * Onboarding Layout
 *
 * Simple layout for the onboarding wizard without navigation chrome.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-onboarding-bg font-sans antialiased">
      {children}
    </div>
  )
}
