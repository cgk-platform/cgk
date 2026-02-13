import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

/**
 * Logs page
 *
 * Browse and search structured logs.
 */
export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">
          Browse structured logs across all services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Log Explorer</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display structured logs with filtering, search, and time range selection.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
