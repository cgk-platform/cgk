import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-2 text-center text-xl font-semibold">Reset your password</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link
      </p>
      <ForgotPasswordForm />
    </div>
  )
}
