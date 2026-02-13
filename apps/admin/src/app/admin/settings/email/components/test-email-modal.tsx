'use client'

import { Button, Card, CardContent, Input, Label, Spinner } from '@cgk-platform/ui'
import { useState } from 'react'

import type { SenderAddressWithDomain } from '@cgk-platform/communications'

interface TestEmailModalProps {
  address: SenderAddressWithDomain
  onClose: () => void
}

export function TestEmailModal({ address, onClose }: TestEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/settings/email/addresses/${address.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setResult({
          success: false,
          message: data.error || 'Failed to send test email',
        })
      } else {
        setResult({
          success: true,
          message: `Test email sent successfully! Message ID: ${data.messageId}`,
        })
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test email',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h3 className="mb-2 text-lg font-semibold">Send Test Email</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Send a test email from{' '}
            <span className="font-mono">{address.emailAddress}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="you@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your email address to receive the test email
              </p>
            </div>

            {result && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  result.success
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-destructive/50 bg-destructive/10 text-destructive'
                }`}
              >
                {result.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {result?.success ? 'Done' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading || !recipientEmail}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-1" />
                    Sending...
                  </>
                ) : (
                  'Send Test Email'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
