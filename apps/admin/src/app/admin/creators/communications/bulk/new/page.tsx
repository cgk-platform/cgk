import { BulkSendComposer } from './bulk-send-composer'

export default function NewBulkSendPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Bulk Message</h1>
        <p className="text-sm text-muted-foreground">
          Send a message to multiple creators at once
        </p>
      </div>

      <BulkSendComposer />
    </div>
  )
}
