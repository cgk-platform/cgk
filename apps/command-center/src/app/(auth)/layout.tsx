import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - Command Center',
  description: 'Super Admin Authentication',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
