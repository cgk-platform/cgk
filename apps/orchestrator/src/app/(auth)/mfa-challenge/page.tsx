import { Suspense } from 'react'

import { MfaForm, MfaFormSkeleton } from './mfa-form'

/**
 * MFA Challenge Page
 *
 * Server component shell with Suspense boundary for the client-side form.
 * Requires super admins to enter their TOTP code for sensitive operations.
 */
export default function MfaChallengePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <Suspense fallback={<MfaFormSkeleton />}>
          <MfaForm />
        </Suspense>
      </div>
    </div>
  )
}
