import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage(): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-6 text-center text-xl font-semibold">Sign in to your account</h2>
      <LoginForm />
    </div>
  )
}
