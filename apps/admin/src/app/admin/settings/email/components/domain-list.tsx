'use client'

import { Badge, Button, Card, CardContent, Spinner } from '@cgk/ui'
import { useEffect, useState } from 'react'

import type { EmailDomain, SenderAddressWithDomain } from '@cgk/communications'
import { AddDomainModal } from './add-domain-modal'
import { DNSInstructionsPanel } from './dns-instructions-panel'
import { SenderAddressList } from './sender-address-list'

interface DomainListState {
  domains: EmailDomain[]
  loading: boolean
  error: string | null
}

export function DomainList() {
  const [state, setState] = useState<DomainListState>({
    domains: [],
    loading: true,
    error: null,
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<EmailDomain | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/admin/settings/email/domains')
      if (!res.ok) throw new Error('Failed to fetch domains')
      const data = await res.json()
      setState({ domains: data.domains, loading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load domains',
      }))
    }
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  const handleVerify = async (domain: EmailDomain) => {
    setVerifyingId(domain.id)
    try {
      const res = await fetch(`/api/admin/settings/email/domains/${domain.id}/verify`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Verification failed')
      } else {
        await fetchDomains()
        if (data.status === 'verified') {
          alert('Domain verified successfully!')
        } else {
          alert('Verification check complete. Status: ' + data.status)
        }
      }
    } catch (err) {
      alert('Failed to verify domain')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleDelete = async (domain: EmailDomain) => {
    const fullDomain = domain.subdomain
      ? `${domain.subdomain}.${domain.domain}`
      : domain.domain

    if (!confirm(`Are you sure you want to delete "${fullDomain}"? This will also delete all associated sender addresses.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/settings/email/domains/${domain.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete domain')
      }
      await fetchDomains()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete domain')
    }
  }

  const getStatusBadge = (status: EmailDomain['verificationStatus']) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email Domains</h3>
        <Button onClick={() => setShowAddModal(true)}>Add Domain</Button>
      </div>

      {state.domains.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No email domains configured.</p>
            <p className="mt-2 text-sm">
              Add a domain to start sending emails from your own email addresses.
            </p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {state.domains.map((domain) => {
            const fullDomain = domain.subdomain
              ? `${domain.subdomain}.${domain.domain}`
              : domain.domain

            return (
              <Card key={domain.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-medium">
                          {fullDomain}
                        </span>
                        {getStatusBadge(domain.verificationStatus)}
                      </div>
                      {domain.subdomain && (
                        <p className="text-sm text-muted-foreground">
                          Subdomain of {domain.domain}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.verificationStatus !== 'verified' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDomain(domain)}
                          >
                            DNS Setup
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(domain)}
                            disabled={verifyingId === domain.id}
                          >
                            {verifyingId === domain.id ? (
                              <>
                                <Spinner size="sm" className="mr-1" />
                                Verifying...
                              </>
                            ) : (
                              'Verify Domain'
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(domain)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Show sender addresses for this domain */}
                  {domain.verificationStatus === 'verified' && (
                    <div className="mt-4 border-t pt-4">
                      <SenderAddressList domainId={domain.id} domainName={fullDomain} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Domain Modal */}
      <AddDomainModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchDomains}
      />

      {/* DNS Instructions Panel */}
      {selectedDomain && (
        <DNSInstructionsPanel
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onVerify={() => handleVerify(selectedDomain)}
        />
      )}
    </div>
  )
}
