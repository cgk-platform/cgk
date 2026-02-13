import { Card, CardContent } from '@cgk-platform/ui'

export default function GeneralSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">General Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your brand name, logo, colors, and other general configuration.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brand settings configuration will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
