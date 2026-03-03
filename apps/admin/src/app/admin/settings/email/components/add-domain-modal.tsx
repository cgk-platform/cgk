'use client'

import { Button, Card, CardContent, Input, Label, Spinner } from '@cgk-platform/ui'
import { useState } from 'react'

interface AddDomainModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddDomainModal({ open, onClose, onSuccess }: AddDomainModalProps) {
  const [domain, setDomain] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/settings/email/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.toLowerCase().trim(),
          subdomain: subdomain.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      if (data.warning) {
        console.warn(data.warning)
      }

      setDomain('')
      setSubdomain('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Add Email Domain</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your root domain (e.g., example.com)
              </p>
            </div>

            <div>
              <Label htmlFor="subdomain">Subdomain (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  type="text"
                  placeholder="mail"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">.{domain || 'example.com'}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Use a subdomain like "mail" or "notify" for email-specific DNS records
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !domain}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-1" />
                    Adding...
                  </>
                ) : (
                  'Add Domain'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
