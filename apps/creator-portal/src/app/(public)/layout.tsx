import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Program',
  description: 'Join our creator program and start earning',
}

/**
 * Public Layout
 *
 * Layout for public-facing pages that don't require authentication.
 * Includes minimal branding and clean design.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Minimal header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center px-4">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span>Creator Program</span>
          </a>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Questions? Contact us at support@example.com</p>
        </div>
      </footer>
    </div>
  )
}
