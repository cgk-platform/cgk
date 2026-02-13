import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

/**
 * Settings page
 *
 * Platform configuration and settings.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Platform Settings</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display platform configuration options including security, integrations, and defaults.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
