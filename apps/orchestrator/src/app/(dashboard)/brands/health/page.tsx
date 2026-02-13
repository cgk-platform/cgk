import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

/**
 * Brands Health Overview page
 *
 * Displays health status across all brands for quick triage.
 */
export default function BrandsHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Health</h1>
        <p className="text-muted-foreground">
          Monitor health status across all platform brands.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Health Overview</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display aggregated health metrics and issues across all brands.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
