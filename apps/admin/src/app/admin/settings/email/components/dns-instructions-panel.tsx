'use client'

import { Button, Card, CardContent, Select, SelectOption, Spinner } from '@cgk/ui'
import { useEffect, useState } from 'react'

import type { EmailDomain } from '@cgk/communications'

interface DNSInstructionsPanelProps {
  domain: EmailDomain
  onClose: () => void
  onVerify: () => void
}

interface DNSRecord {
  type: string
  host: string
  value: string
  priority?: number
  ttl?: number
}

interface DNSInstructions {
  domain: string
  subdomain: string | null
  fullDomain: string
  steps: Array<{
    stepNumber: number
    title: string
    description: string
    records?: DNSRecord[]
    note?: string
  }>
  estimatedTime: string
  verificationNote: string
}

interface Registrar {
  id: string
  name: string
}

export function DNSInstructionsPanel({
  domain,
  onClose,
  onVerify,
}: DNSInstructionsPanelProps) {
  const [instructions, setInstructions] = useState<DNSInstructions | null>(null)
  const [registrars, setRegistrars] = useState<Registrar[]>([])
  const [selectedRegistrar, setSelectedRegistrar] = useState<string>('')
  const [providerInstructions, setProviderInstructions] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstructions = async (provider?: string) => {
    try {
      setLoading(true)
      const url = new URL(`/api/admin/settings/email/domains/${domain.id}/dns`, window.location.origin)
      if (provider) {
        url.searchParams.set('provider', provider)
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch DNS instructions')

      const data = await res.json()
      setInstructions(data.instructions)
      setRegistrars(data.registrars)
      setProviderInstructions(data.providerInstructions || null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstructions()
  }, [domain.id])

  const handleRegistrarChange = (registrarId: string) => {
    setSelectedRegistrar(registrarId)
    if (registrarId) {
      fetchInstructions(registrarId)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-12">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
            <Button className="mt-4" onClick={onClose}>
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!instructions) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-lg font-semibold">DNS Setup Instructions</h3>
            <p className="text-sm text-muted-foreground">
              Configure DNS for {instructions.fullDomain}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <CardContent className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Registrar selector */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Select your DNS provider (optional)
              </label>
              <Select
                value={selectedRegistrar}
                onChange={(e) => handleRegistrarChange(e.target.value)}
              >
                <SelectOption value="">Select a provider for specific instructions</SelectOption>
                {registrars.map((r) => (
                  <SelectOption key={r.id} value={r.id}>
                    {r.name}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {/* Provider-specific instructions */}
            {providerInstructions && (
              <div className="rounded-md bg-blue-50 p-4 text-sm">
                <pre className="whitespace-pre-wrap font-sans text-blue-900">
                  {providerInstructions}
                </pre>
              </div>
            )}

            {/* Steps */}
            {instructions.steps.map((step) => (
              <div key={step.stepNumber} className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">
                  Step {step.stepNumber}: {step.title}
                </h4>
                <p className="mb-3 text-sm text-muted-foreground">{step.description}</p>

                {step.records && step.records.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Type</th>
                          <th className="px-3 py-2 text-left font-medium">Host/Name</th>
                          <th className="px-3 py-2 text-left font-medium">Value</th>
                          <th className="px-3 py-2 text-left font-medium">Priority</th>
                          <th className="px-3 py-2 text-left font-medium">TTL</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {step.records.map((record, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono text-xs">{record.type}</td>
                            <td className="px-3 py-2 font-mono text-xs">{record.host}</td>
                            <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs">
                              {record.value}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {record.priority ?? '-'}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {record.ttl ?? 3600}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(record.value)}
                              >
                                Copy
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {step.note && (
                  <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    {step.note}
                  </p>
                )}
              </div>
            ))}

            {/* Estimated time */}
            <div className="rounded-md bg-muted/50 p-4 text-sm">
              <p>
                <strong>Estimated time:</strong> {instructions.estimatedTime}
              </p>
              <p className="mt-1 text-muted-foreground">
                {instructions.verificationNote}
              </p>
            </div>
          </div>
        </CardContent>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onVerify}>Verify Domain</Button>
        </div>
      </Card>
    </div>
  )
}
