import { Card, CardContent, CardHeader } from '@cgk/ui'
import Link from 'next/link'

/**
 * Operations overview page
 *
 * Entry point for platform operations with links to sub-sections.
 */
export default function OpsPage() {
  const sections = [
    {
      title: 'Errors',
      description: 'View and manage platform errors and exceptions.',
      href: '/ops/errors',
    },
    {
      title: 'Logs',
      description: 'Browse structured logs across all services.',
      href: '/ops/logs',
    },
    {
      title: 'Health',
      description: 'Monitor system health and component status.',
      href: '/ops/health',
    },
    {
      title: 'Jobs',
      description: 'View background job queues and processing status.',
      href: '/ops/jobs',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-muted-foreground">
          Monitor platform operations and system health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <h2 className="font-semibold">{section.title}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
