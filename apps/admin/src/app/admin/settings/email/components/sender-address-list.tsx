'use client'

import { Badge, Button, Spinner } from '@cgk/ui'
import { useEffect, useState } from 'react'

import type { SenderAddressWithDomain, SenderPurpose } from '@cgk/communications'
import { AddSenderAddressModal } from './add-sender-address-modal'
import { TestEmailModal } from './test-email-modal'

interface SenderAddressListProps {
  domainId: string
  domainName: string
}

interface ListState {
  addresses: SenderAddressWithDomain[]
  loading: boolean
  error: string | null
}

const purposeLabels: Record<SenderPurpose, string> = {
  transactional: 'Transactional',
  creator: 'Creator',
  support: 'Support',
  treasury: 'Treasury',
  system: 'System',
}

const purposeColors: Record<SenderPurpose, string> = {
  transactional: 'bg-blue-100 text-blue-800',
  creator: 'bg-purple-100 text-purple-800',
  support: 'bg-green-100 text-green-800',
  treasury: 'bg-orange-100 text-orange-800',
  system: 'bg-gray-100 text-gray-800',
}

export function SenderAddressList({ domainId, domainName }: SenderAddressListProps) {
  const [state, setState] = useState<ListState>({
    addresses: [],
    loading: true,
    error: null,
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [testingAddress, setTestingAddress] = useState<SenderAddressWithDomain | null>(null)

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/admin/settings/email/addresses')
      if (!res.ok) throw new Error('Failed to fetch addresses')
      const data = await res.json()
      // Filter to only addresses for this domain
      const filtered = data.addresses.filter(
        (a: SenderAddressWithDomain) => a.domainId === domainId
      )
      setState({ addresses: filtered, loading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load addresses',
      }))
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [domainId])

  const handleSetDefault = async (address: SenderAddressWithDomain) => {
    try {
      const res = await fetch(`/api/admin/settings/email/addresses/${address.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set default')
      }

      await fetchAddresses()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set default')
    }
  }

  const handleDelete = async (address: SenderAddressWithDomain) => {
    if (!confirm(`Are you sure you want to delete "${address.emailAddress}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/settings/email/addresses/${address.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete address')
      }

      await fetchAddresses()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete address')
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (state.error) {
    return <p className="text-sm text-destructive">{state.error}</p>
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Sender Addresses</h4>
        <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
          Add Address
        </Button>
      </div>

      {state.addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sender addresses configured for this domain.
        </p>
      ) : (
        <div className="space-y-2">
          {state.addresses.map((address) => (
            <div
              key={address.id}
              className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{address.emailAddress}</span>
                  {address.isDefault && (
                    <Badge className="bg-primary/10 text-primary text-xs">Default</Badge>
                  )}
                  <Badge className={purposeColors[address.purpose]}>
                    {purposeLabels[address.purpose]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{address.displayName}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTestingAddress(address)}
                >
                  Test
                </Button>
                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(address)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(address)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Sender Address Modal */}
      <AddSenderAddressModal
        open={showAddModal}
        domainId={domainId}
        domainName={domainName}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchAddresses}
      />

      {/* Test Email Modal */}
      {testingAddress && (
        <TestEmailModal
          address={testingAddress}
          onClose={() => setTestingAddress(null)}
        />
      )}
    </div>
  )
}
