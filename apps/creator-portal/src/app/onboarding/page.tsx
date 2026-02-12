import type { Metadata } from 'next'
import { OnboardingWizard } from '../../components/onboarding-wizard/OnboardingWizard'

export const metadata: Metadata = {
  title: 'Complete Your Profile | Creator Portal',
  description: 'Set up your creator account to start earning',
}

/**
 * Creator Onboarding Page
 *
 * Multi-step wizard for approved creators to complete their account setup.
 * Includes profile, social accounts, payment, tax, agreements, and welcome call.
 */
export default function OnboardingPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-onboarding-bg">
      <OnboardingWizard />
    </main>
  )
}
