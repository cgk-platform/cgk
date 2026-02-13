import { Card, CardContent } from '@cgk-platform/ui'

export default function ShopifySettingsPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Shopify Connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect and manage your Shopify store integration.
        </p>
        <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Shopify connection settings will be available here.
        </div>
      </CardContent>
    </Card>
  )
}
