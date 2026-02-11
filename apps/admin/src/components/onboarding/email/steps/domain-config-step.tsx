'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@cgk/ui'
import { Input } from '@cgk/ui'
import { Label } from '@cgk/ui'
import { Card, CardContent, CardHeader } from '@cgk/ui'
import { Badge } from '@cgk/ui'

import type { DomainConfigStatus } from '@cgk/communications'
import type { DomainConfigStepProps } from '../types'

/**
 * Step 5b: Domain Configuration
 *
 * Add domains/subdomains and display DNS configuration instructions.
 */
export function DomainConfigStep({
  primaryDomain,
  resendApiKey,
  onDomainsConfigured,
  onBack,
}: DomainConfigStepProps) {
  const [domains, setDomains] = useState<DomainConfigStatus[]>([])
  const [newSubdomain, setNewSubdomain] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  // Load existing domains
  useEffect(() => {
    async function loadDomains() {
      try {
        const response = await fetch('/api/admin/onboarding/email/domains/dns')
        const data = await response.json()
        if (data.domains) {
          setDomains(data.domains)
        }
      } catch {
        // Continue with empty domains
      } finally {
        setIsLoading(false)
      }
    }
    loadDomains()
  }, [])

  const handleAddDomain = useCallback(async (subdomain?: string) => {
    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/domains/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: primaryDomain,
          subdomain: subdomain || null,
          resendApiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      // Refresh domains list
      const listResponse = await fetch('/api/admin/onboarding/email/domains/dns')
      const listData = await listResponse.json()
      if (listData.domains) {
        setDomains(listData.domains)
      }

      setNewSubdomain('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setIsAdding(false)
    }
  }, [primaryDomain, resendApiKey])

  const handleVerify = useCallback(async (domainId: string) => {
    setVerifyingId(domainId)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, resendApiKey }),
      })

      const data = await response.json()

      if (response.status === 429) {
        throw new Error('Rate limited. Please wait a few minutes before trying again.')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Verification check failed')
      }

      // Refresh domains list
      const listResponse = await fetch('/api/admin/onboarding/email/domains/dns')
      const listData = await listResponse.json()
      if (listData.domains) {
        setDomains(listData.domains)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifyingId(null)
    }
  }, [resendApiKey])

  const handleCopyDNS = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const handleContinue = useCallback(() => {
    onDomainsConfigured(domains)
  }, [domains, onDomainsConfigured])

  if (isLoading) {
    return <div className="text-center py-8">Loading domains...</div>
  }

  return (
    <div className="space-y-6">
      {/* Primary domain auto-added */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Primary Domain</p>
            <p className="text-sm text-muted-foreground">{primaryDomain}</p>
          </div>
          {!domains.find(d => !d.subdomain && d.domain === primaryDomain) && (
            <Button
              size="sm"
              onClick={() => handleAddDomain()}
              disabled={isAdding}
            >
              Add Primary Domain
            </Button>
          )}
        </div>
      </div>

      {/* Add subdomain */}
      <div className="space-y-2">
        <Label>Add Subdomain (Recommended)</Label>
        <div className="flex gap-2">
          <div className="flex items-center">
            <Input
              placeholder="mail"
              value={newSubdomain}
              onChange={(e) => setNewSubdomain(e.target.value)}
              className="w-32 rounded-r-none"
              disabled={isAdding}
            />
            <span className="rounded-r-md border border-l-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
              .{primaryDomain}
            </span>
          </div>
          <Button
            onClick={() => handleAddDomain(newSubdomain)}
            disabled={!newSubdomain.trim() || isAdding}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We recommend using a subdomain like &quot;mail&quot; for transactional emails.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Domains list */}
      {domains.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Configured Domains</h4>
          {domains.map((domain) => {
            const fullDomain = domain.subdomain
              ? `${domain.subdomain}.${domain.domain}`
              : domain.domain
            const isExpanded = expandedDomain === domain.id

            return (
              <Card key={domain.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{fullDomain}</span>
                      <Badge
                        variant={
                          domain.verificationStatus === 'verified'
                            ? 'default'
                            : domain.verificationStatus === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {domain.verificationStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.verificationStatus !== 'verified' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(domain.id)}
                          disabled={verifyingId === domain.id || !domain.canVerify}
                        >
                          {verifyingId === domain.id ? 'Checking...' : 'Verify'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                      >
                        {isExpanded ? 'Hide DNS' : 'View DNS'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && domain.dnsRecords && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">DNS Records to Add:</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const records = Object.values(domain.dnsRecords || {})
                              .filter(Boolean)
                              .map((r: { type: string; host: string; value: string }) =>
                                `${r.type}\t${r.host}\t${r.value}`
                              )
                              .join('\n')
                            handleCopyDNS(records)
                          }}
                        >
                          Copy All
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="px-2 py-1 text-left">Type</th>
                              <th className="px-2 py-1 text-left">Host</th>
                              <th className="px-2 py-1 text-left">Value</th>
                              <th className="px-2 py-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(domain.dnsRecords)
                              .filter(Boolean)
                              .map((record: { type: string; host: string; value: string }, idx: number) => (
                                <tr key={idx} className="border-b">
                                  <td className="px-2 py-2 font-mono">{record.type}</td>
                                  <td className="px-2 py-2 font-mono text-xs">{record.host}</td>
                                  <td className="px-2 py-2 font-mono text-xs max-w-xs truncate">
                                    {record.value}
                                  </td>
                                  <td className="px-2 py-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCopyDNS(record.value)}
                                    >
                                      Copy
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add these records to your DNS provider. DNS propagation may take up to 48 hours.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={domains.length === 0}
        >
          Continue
        </Button>
      </div>

      {domains.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Add at least one domain to continue.
        </p>
      )}
    </div>
  )
}

export default DomainConfigStep
