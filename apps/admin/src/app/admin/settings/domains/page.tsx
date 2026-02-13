import { Card, CardContent } from '@cgk-platform/ui'

export default function DomainsSettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Domain Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure custom domains for your admin portal and storefront.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Domain configuration will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
