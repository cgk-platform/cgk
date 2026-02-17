'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useWizard } from '../context'

/**
 * DNS Record for domain verification
 */
interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT'
  name: string
  value: string
  ttl: number
}

/**
 * Step 3: Domain Configuration
 *
 * Configures the brand's domain settings including:
 * - Platform subdomain (brand.cgk.dev)
 * - Custom domain with verification
 * - SSL certificate status
 */
export default function Step3Page() {
  const { data, updateData, completeStep, goBack } = useWizard()

  const [primaryDomain, setPrimaryDomain] = useState(data.primaryDomain || `${data.slug}.cgk.dev`)
  const [customDomain, setCustomDomain] = useState(data.customDomain || '')
  const [useCustomDomain, setUseCustomDomain] = useState(!!data.customDomain)

  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'checking' | 'verified' | 'failed'
  >('idle')
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Set default primary domain based on slug
  useEffect(() => {
    if (data.slug && !data.primaryDomain) {
      setPrimaryDomain(`${data.slug}.cgk.dev`)
    }
  }, [data.slug, data.primaryDomain])

  // Generate DNS records when custom domain changes
  useEffect(() => {
    if (customDomain && useCustomDomain) {
      const domain = customDomain.toLowerCase().trim()
      const isSubdomain = domain.split('.').length > 2

      const domainParts = domain.split('.')
      const subdomainName = domainParts[0] || domain

      const records: DnsRecord[] = [
        {
          type: isSubdomain ? 'CNAME' : 'A',
          name: isSubdomain ? subdomainName : '@',
          value: isSubdomain ? 'cname.cgk.dev' : '76.76.21.21',
          ttl: 3600,
        },
        {
          type: 'TXT',
          name: `_cgk-verify.${domain.split('.').slice(-2).join('.')}`,
          value: `cgk-domain-verification=${data.slug || 'pending'}`,
          ttl: 3600,
        },
      ]

      setDnsRecords(records)
    } else {
      setDnsRecords([])
    }
  }, [customDomain, useCustomDomain, data.slug])

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [])

  // Verify domain DNS
  const handleVerifyDomain = useCallback(async () => {
    if (!customDomain) return

    setVerificationStatus('checking')
    setError(null)

    try {
      const response = await fetch('/api/platform/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: customDomain.toLowerCase().trim(),
          brandSlug: data.slug,
        }),
      })

      const result = await response.json()

      if (result.verified) {
        setVerificationStatus('verified')
        updateData({
          customDomain: customDomain.toLowerCase().trim(),
          domainVerified: true,
        })
      } else {
        setVerificationStatus('failed')
        setError(result.error || 'DNS records not found. Please check your configuration.')
      }
    } catch (err) {
      setVerificationStatus('failed')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }, [customDomain, data.slug, updateData])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)

    try {
      updateData({
        primaryDomain: primaryDomain.toLowerCase().trim(),
        customDomain: useCustomDomain ? customDomain.toLowerCase().trim() : undefined,
        domainVerified: verificationStatus === 'verified',
      })

      completeStep()
    } finally {
      setIsSubmitting(false)
    }
  }, [primaryDomain, customDomain, useCustomDomain, verificationStatus, updateData, completeStep])

  return (
    <div className="space-y-6">
      {/* Platform Domain */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Platform Domain</Label>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Globe className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-mono text-sm">{primaryDomain}</p>
            <p className="text-xs text-muted-foreground">
              This is your default platform URL with automatic SSL
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-500">SSL</span>
          </div>
        </div>
      </div>

      {/* Custom Domain Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h4 className="font-medium">Use Custom Domain</h4>
          <p className="text-sm text-muted-foreground">
            Connect your own domain (e.g., shop.yourbrand.com)
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={useCustomDomain}
          onClick={() => setUseCustomDomain(!useCustomDomain)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            useCustomDomain ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              useCustomDomain ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Custom Domain Configuration */}
      {useCustomDomain && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          {/* Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="customDomain" className="text-sm font-medium">
              Custom Domain
            </Label>
            <Input
              id="customDomain"
              type="text"
              placeholder="shop.yourbrand.com"
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value)
                setVerificationStatus('idle')
              }}
              className="font-mono text-sm"
            />
          </div>

          {/* DNS Records */}
          {dnsRecords.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">DNS Configuration</h4>
              <p className="text-xs text-muted-foreground">
                Add these records to your domain&apos;s DNS settings:
              </p>

              <div className="space-y-2">
                {dnsRecords.map((record, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="grid flex-1 grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="mb-1 font-medium text-muted-foreground">Type</p>
                          <p className="font-mono">{record.type}</p>
                        </div>
                        <div>
                          <p className="mb-1 font-medium text-muted-foreground">Name</p>
                          <p className="truncate font-mono">{record.name}</p>
                        </div>
                        <div>
                          <p className="mb-1 font-medium text-muted-foreground">Value</p>
                          <p className="truncate font-mono">{record.value}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(record.value, `record-${index}`)}
                        className="h-8 w-8 p-0"
                      >
                        {copied === `record-${index}` ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Verification Status */}
              {verificationStatus === 'verified' && (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Domain Verified</p>
                    <p className="mt-1 text-xs text-emerald-400/80">
                      Your domain is configured correctly. SSL certificate will be issued
                      automatically.
                    </p>
                  </div>
                </div>
              )}

              {verificationStatus === 'failed' && error && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Verification Failed</p>
                    <p className="mt-1 text-xs text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <Button
                onClick={handleVerifyDomain}
                disabled={!customDomain || verificationStatus === 'checking'}
                variant={verificationStatus === 'verified' ? 'outline' : 'default'}
                className="w-full"
              >
                {verificationStatus === 'checking' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking DNS...
                  </>
                ) : verificationStatus === 'verified' ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-verify
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Verify Domain
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                DNS changes can take up to 48 hours to propagate. You can verify later if needed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Domain Summary */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-3 text-sm font-medium">Domain Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Storefront URL</span>
            <span className="font-mono">
              {useCustomDomain && customDomain ? customDomain : primaryDomain}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Admin URL</span>
            <span className="font-mono">admin.{primaryDomain}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API URL</span>
            <span className="font-mono">api.{primaryDomain}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>

        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
