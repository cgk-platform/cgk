import { Suspense } from 'react'

import { TemplateAnalyticsContent, TemplateAnalyticsSkeleton } from './analytics-client'

export const metadata = {
  title: 'Template Analytics | Admin',
  description: 'View email template performance metrics',
}

export default function TemplateAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Analytics</h1>
        <p className="text-sm text-muted-foreground">
          View performance metrics for your email templates
        </p>
      </div>

      <Suspense fallback={<TemplateAnalyticsSkeleton />}>
        <TemplateAnalyticsContent />
      </Suspense>
    </div>
  )
}
