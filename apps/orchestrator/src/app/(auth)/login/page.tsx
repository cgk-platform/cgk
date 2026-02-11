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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Orchestrator</h1>
          <p className="text-muted-foreground mt-2">Super Admin Login</p>
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
