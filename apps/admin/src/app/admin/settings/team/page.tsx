import { Card, CardContent } from '@cgk/ui'

export default function TeamSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Team Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite team members and manage roles and permissions.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Team management will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
