import { getUserById } from '@cgk-platform/auth'
import { promises as fs } from 'fs'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import path from 'path'

import { Sidebar } from '../../components/nav/sidebar'
import { DashboardProviders } from './providers'

export const metadata: Metadata = {
  title: 'openCLAW Command Center',
  description: 'Multi-profile gateway dashboard',
}

async function isCommandCenterEnabled(): Promise<boolean> {
  try {
    const configPath = path.join(process.cwd(), '../..', 'platform.config.ts')
    const content = await fs.readFile(configPath, 'utf-8')
    const featuresMatch = content.match(/features:\s*{([^}]+)}/s)
    if (!featuresMatch) return false
    const featuresBlock = featuresMatch[1]
    const commandCenterMatch = featuresBlock.match(/commandCenter:\s*(true|false)/)
    return commandCenterMatch?.[1] === 'true'
  } catch {
    return false
  }
}

function CommandCenterSetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">
            The Command Center provides a unified dashboard for monitoring and managing all openCLAW
            gateway profiles in real time.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 text-left">
          <h2 className="mb-3 font-semibold">To enable Command Center:</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-mono text-foreground">1.</span>
              <span>
                Open{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  platform.config.ts
                </code>{' '}
                in your project root
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-foreground">2.</span>
              <span>
                Set{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  features.commandCenter: true
                </code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-foreground">3.</span>
              <span>Redeploy your application</span>
            </li>
          </ol>
        </div>
        <p className="text-sm text-muted-foreground">
          For full setup instructions, see the{' '}
          <a
            href="/docs/setup/openclaw-integration"
            className="underline underline-offset-4 hover:text-foreground"
          >
            openCLAW Integration Guide
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const enabled = await isCommandCenterEnabled()

  if (!enabled) {
    return <CommandCenterSetupPage />
  }

  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  let userName = 'Super Admin'
  let userEmail = ''

  if (userId) {
    const user = await getUserById(userId)
    if (user) {
      userName = user.name || user.email.split('@')[0] || 'Super Admin'
      userEmail = user.email
    }
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-background">
        <Sidebar userName={userName} userEmail={userEmail} />
        <main className="lg:pl-64">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </DashboardProviders>
  )
}
