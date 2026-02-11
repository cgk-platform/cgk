import { Spinner } from '@cgk/ui'
import { Suspense } from 'react'


import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-2 text-center text-xl font-semibold">Create new password</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Enter a new password for your account
      </p>
      <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
