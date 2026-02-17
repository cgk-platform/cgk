import { Briefcase } from 'lucide-react'
import Link from 'next/link'

/**
 * Auth layout - centered card layout for login/registration pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Briefcase className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight">Contractor Portal</span>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Need help?{' '}
          <Link href="/help" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
