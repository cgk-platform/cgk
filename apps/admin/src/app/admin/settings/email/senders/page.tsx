'use client'

import { Badge, Button, Card, CardContent, Spinner } from '@cgk-platform/ui'
import { useEffect, useState } from 'react'

import type { SenderAddressWithDomain, SenderPurpose } from '@cgk-platform/communications'

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

export default function SendersPage() {
  const [state, setState] = useState<ListState>({
    addresses: [],
    loading: true,
    error: null,
  })

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/admin/settings/email/addresses')
      if (!res.ok) throw new Error('Failed to fetch addresses')
      const data = await res.json()
      setState({ addresses: data.addresses, loading: false, error: null })
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
  }, [])

  const getStatusBadge = (status: SenderAddressWithDomain['verificationStatus']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (state.error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {state.error}
        </CardContent>
      </Card>
    )
  }

  // Group addresses by domain
  const grouped: Record<string, SenderAddressWithDomain[]> = {}
  for (const addr of state.addresses) {
    const domainKey = addr.subdomain
      ? `${addr.subdomain}.${addr.domain}`
      : addr.domain
    if (!grouped[domainKey]) {
      grouped[domainKey] = []
    }
    grouped[domainKey].push(addr)
  }

  const domains = Object.keys(grouped)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">All Sender Addresses</h3>
          <p className="text-sm text-muted-foreground">
            View and manage all configured sender addresses across domains
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/admin/settings/email/domains')}
        >
          Manage Domains
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No sender addresses configured.</p>
            <p className="mt-2 text-sm">
              Add a verified domain first, then create sender addresses.
            </p>
            <Button
              className="mt-4"
              onClick={() => (window.location.href = '/admin/settings/email/domains')}
            >
              Add Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {domains.map((domainKey) => {
            const addresses = grouped[domainKey]
            if (!addresses || addresses.length === 0) return null
            const firstAddr = addresses[0]
            if (!firstAddr) return null

            return (
              <Card key={domainKey}>
                <div className="flex items-center justify-between border-b p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{domainKey}</span>
                    {getStatusBadge(firstAddr.verificationStatus)}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{addr.emailAddress}</span>
                            {addr.isDefault && (
                              <Badge className="bg-primary/10 text-primary text-xs">
                                Default
                              </Badge>
                            )}
                            <Badge className={purposeColors[addr.purpose]}>
                              {purposeLabels[addr.purpose]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {addr.displayName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
