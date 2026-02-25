import { Radio } from 'lucide-react'
import { Suspense } from 'react'

import { LoginForm, LoginFormSkeleton } from './login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div className="text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-gold" />
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="mt-2 text-muted-foreground">openCLAW Gateway Dashboard</p>
        </div>

        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <div className="text-center text-sm text-muted-foreground">
          <p>Super admin access only. All access is logged.</p>
        </div>
      </div>
    </div>
  )
}
