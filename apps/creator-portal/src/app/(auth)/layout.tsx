import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Portal - Sign In',
  description: 'Sign in to manage your creator account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Creator Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your earnings across brands
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">{children}</div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          New creator?{' '}
          <a href="/apply" className="text-foreground hover:underline">
            Apply to join
          </a>
        </p>
      </div>
    </div>
  )
}
