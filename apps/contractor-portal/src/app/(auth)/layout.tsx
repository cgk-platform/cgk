import Image from 'next/image'
import Link from 'next/link'

/**
 * Auth layout - centered card layout for login/registration pages
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/cgk-platform-logo.png"
          alt="CGK Platform"
          width={96}
          height={64}
          className="h-16 w-auto"
          priority
        />
        <span className="text-xl font-bold tracking-tight">Contractor Portal</span>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">{children}</div>

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
