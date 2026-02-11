'use client'

import { Alert, AlertDescription, Button, cn, Label, Textarea } from '@cgk/ui'
import { AlertTriangle, Eye, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
}

interface ImpersonateDialogProps {
  userId: string
  userName: string | null
  userEmail: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (token: string, tenant: Tenant) => void
}

/**
 * Dialog for initiating user impersonation
 *
 * Requires a mandatory reason and tenant selection.
 * Displays security warnings and consent acknowledgment.
 */
export function ImpersonateDialog({
  userId,
  userName,
  userEmail,
  isOpen,
  onClose,
  onSuccess,
}: ImpersonateDialogProps): React.JSX.Element | null {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's accessible tenants
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true)
    try {
      const response = await fetch(`/api/platform/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.user?.memberships) {
          const userTenants: Tenant[] = data.user.memberships.map(
            (m: { tenantId: string; tenantName: string; tenantSlug: string }) => ({
              id: m.tenantId,
              name: m.tenantName,
              slug: m.tenantSlug,
            })
          )
          setTenants(userTenants)
          if (userTenants.length === 1 && userTenants[0]) {
            setSelectedTenantId(userTenants[0].id)
          }
        }
      }
    } catch {
      console.error('Failed to fetch user tenants')
    } finally {
      setLoadingTenants(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      fetchTenants()
      setReason('')
      setAcknowledged(false)
      setError(null)
    }
  }, [isOpen, fetchTenants])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTenantId) {
      setError('Please select a tenant to access')
      return
    }

    if (!reason.trim()) {
      setError('A reason is required for impersonation')
      return
    }

    if (!acknowledged) {
      setError('Please acknowledge the security notice')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          reason: reason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start impersonation')
      }

      const selectedTenant = tenants.find((t) => t.id === selectedTenantId)
      if (selectedTenant) {
        onSuccess(data.token, selectedTenant)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
            <Eye className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Impersonate User</h2>
            <p className="text-sm text-muted-foreground">
              {userName || userEmail}
            </p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            {/* Security Warning */}
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> All actions performed during
                impersonation are logged and audited. The user will be notified
                via email. Session expires in 1 hour.
              </AlertDescription>
            </Alert>

            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label htmlFor="tenant">Access Tenant</Label>
              {loadingTenants ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tenants...
                </div>
              ) : tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  User has no tenant memberships
                </p>
              ) : (
                <select
                  id="tenant"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                  disabled={loading}
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Impersonation *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need to impersonate this user..."
                rows={3}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                This reason will be logged and visible in the audit trail.
              </p>
            </div>

            {/* Acknowledgment */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acknowledge"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="acknowledge" className="text-sm text-muted-foreground">
                I understand that all actions during impersonation are logged,
                the user will be notified, and this session will expire after 1 hour.
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedTenantId || !reason.trim() || !acknowledged}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Start Impersonation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
