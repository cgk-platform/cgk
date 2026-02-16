import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Application Submitted | Creator Portal',
  description: 'Your creator application has been submitted successfully',
}

/**
 * Application Success Page
 *
 * Confirmation page shown after successfully submitting a creator application.
 */
export default function ApplicationSuccessPage(): React.JSX.Element {
  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Application Submitted!
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Thank you for applying to join our creator program.
        </p>

        {/* What happens next */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
          <h2 className="font-semibold text-gray-900">What happens next?</h2>
          <ol className="mt-4 space-y-4 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">Application Review</p>
                <p className="mt-0.5">
                  Our team will review your application within 48 hours.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">Email Notification</p>
                <p className="mt-0.5">
                  If approved, you&apos;ll receive an email with your portal login credentials.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">Complete Onboarding</p>
                <p className="mt-0.5">
                  Set up your payment info and schedule your first project call.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Contact info */}
        <p className="mt-6 text-sm text-gray-500">
          Questions? Contact us at{' '}
          <a
            href="mailto:creators@example.com"
            className="font-medium text-primary hover:underline"
          >
            creators@example.com
          </a>
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
