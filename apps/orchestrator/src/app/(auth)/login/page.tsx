import Image from 'next/image'
import { Suspense } from 'react'

import { LoginForm, LoginFormSkeleton } from './login-form'

/**
 * Super Admin Login Page
 *
 * Server component shell with Suspense boundary for the client-side form.
 * Password-based authentication for super admins.
 * After successful login, redirects to MFA challenge if enabled.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/cgk-platform-logo.png"
              alt="CGK Platform"
              width={96}
              height={64}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold">Orchestrator</h1>
          <p className="mt-2 text-muted-foreground">Super Admin Login</p>
        </div>

        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <div className="text-center text-sm text-muted-foreground">
          <p>This portal is for authorized super administrators only.</p>
          <p className="mt-1">All access is logged and monitored.</p>
        </div>
      </div>
    </div>
  )
}
