import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

/**
 * Analytics page
 *
 * Platform-wide analytics and reporting.
 */
export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Platform-wide analytics and performance metrics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Platform Analytics</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display platform-wide analytics, GMV trends, and brand performance comparisons.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
