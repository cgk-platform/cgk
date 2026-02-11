import { Card, CardContent } from '@cgk/ui'

export default function IntegrationsSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage third-party service integrations and API connections.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Integration settings will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
