'use client'

import { useRouter } from 'next/navigation'

/**
 * Unauthorized Access Page
 *
 * Shown when a user is authenticated but does not have super admin privileges.
 */
export default function UnauthorizedPage() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/platform/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-lg text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            You do not have permission to access this portal.
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The Orchestrator dashboard is restricted to authorized super administrators only.
          </p>
          <p>
            If you believe you should have access, please contact the platform owner.
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
          >
            Sign in with a different account
          </button>

          <p className="text-xs text-muted-foreground">
            This access attempt has been logged.
          </p>
        </div>
      </div>
    </div>
  )
}
