import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OnboardingForm } from '../../../../components/onboarding/OnboardingForm'

export const metadata: Metadata = {
  title: 'Join Our Creator Program',
  description: 'Apply to become a creator and start earning with our brand',
}

function OnboardingFormLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    </div>
  )
}

/**
 * Creator Application Page
 *
 * Public-facing landing page for the creator application form.
 * Features a 2-column layout on desktop with marketing content on the left
 * and the application form on the right.
 */
export default function JoinPage(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Marketing Content - Left Column */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <h1 className="text-4xl font-bold tracking-tight">
              Join Our Creator
              <br />
              <span className="text-primary">Community</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Partner with us to create amazing content, earn commissions,
              and grow your personal brand.
            </p>

            {/* Benefits List */}
            <div className="mt-8 space-y-4">
              <BenefitItem
                icon={<DollarIcon />}
                title="Earn Commissions"
                description="Get paid for every sale you drive through your unique code"
              />
              <BenefitItem
                icon={<GiftIcon />}
                title="Free Products"
                description="Receive sample products to feature in your content"
              />
              <BenefitItem
                icon={<TrendingIcon />}
                title="Grow Your Brand"
                description="Access exclusive resources and collaborations"
              />
              <BenefitItem
                icon={<HeartIcon />}
                title="Dedicated Support"
                description="Work with our team to create the best content"
              />
            </div>

            {/* Testimonial */}
            <div className="mt-10 rounded-lg border bg-card p-6">
              <blockquote className="text-muted-foreground">
                &ldquo;Joining this creator program was one of the best
                decisions for my content career. The support and products
                are amazing!&rdquo;
              </blockquote>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <p className="font-medium">Sarah J.</p>
                  <p className="text-sm text-muted-foreground">
                    Creator since 2024
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form - Right Column */}
        <div>
          {/* Mobile Header */}
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-bold">Join Our Creator Community</h1>
            <p className="mt-2 text-muted-foreground">
              Apply now to start earning as a content creator
            </p>
          </div>

          {/* The actual form component - tenantSlug would come from subdomain/context */}
          <Suspense fallback={<OnboardingFormLoading />}>
            <OnboardingForm tenantSlug="default" />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Helper Components

interface BenefitItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

function BenefitItem({ icon, title, description }: BenefitItemProps): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// Icons

function DollarIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
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
  )
}

function GiftIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  )
}

function TrendingIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function HeartIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}
