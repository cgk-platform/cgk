'use client'

import { Card, CardContent, CardHeader } from '@cgk/ui'

export function SupportContact(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold">Need more help?</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">Email Support</p>
            <a
              href="mailto:creators@cgk.dev"
              className="text-sm text-primary hover:underline"
            >
              creators@cgk.dev
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              We typically respond within 24 hours
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">Message Your Coordinator</p>
            <p className="text-xs text-muted-foreground">
              For project-specific questions, use the Messages feature to contact
              your assigned coordinator directly.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> For urgent payment issues or account access
            problems, please include &quot;URGENT&quot; in your email subject line for
            faster response.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
