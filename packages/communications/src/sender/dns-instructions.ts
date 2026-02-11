/**
 * DNS Instructions Generator
 *
 * Generates step-by-step DNS setup instructions for email domain verification.
 * Instructions include exact copy-paste values for common DNS providers.
 *
 * @ai-pattern dns-setup
 */

import type { DNSRecord, DNSRecords, EmailDomain } from '../types.js'

/**
 * DNS instruction step
 */
export interface DNSInstructionStep {
  stepNumber: number
  title: string
  description: string
  records?: DNSRecord[]
  note?: string
}

/**
 * Full DNS instructions for a domain
 */
export interface DNSInstructions {
  domain: string
  subdomain: string | null
  fullDomain: string
  steps: DNSInstructionStep[]
  estimatedTime: string
  verificationNote: string
}

/**
 * Generate DNS instructions for a domain
 */
export function generateDNSInstructions(domain: EmailDomain): DNSInstructions {
  const fullDomain = domain.subdomain
    ? `${domain.subdomain}.${domain.domain}`
    : domain.domain

  const steps: DNSInstructionStep[] = []

  // Step 1: Introduction
  steps.push({
    stepNumber: 1,
    title: 'Access Your DNS Provider',
    description: `Log in to your domain registrar or DNS provider (like Cloudflare, GoDaddy, Namecheap, Route53, etc.) and navigate to the DNS settings for "${domain.domain}".`,
    note: 'DNS changes can take up to 48 hours to propagate, but often complete within 1-2 hours.',
  })

  // Step 2: Add DNS Records
  if (domain.dnsRecords) {
    const records = buildDNSRecordsList(domain.dnsRecords, domain.subdomain)
    if (records.length > 0) {
      steps.push({
        stepNumber: 2,
        title: 'Add DNS Records',
        description: `Add the following DNS records exactly as shown. The Host/Name field should be relative to your domain "${domain.domain}".`,
        records,
        note: 'Some providers require different formatting. See provider-specific notes below.',
      })
    }
  } else {
    steps.push({
      stepNumber: 2,
      title: 'Add DNS Records',
      description: 'DNS records will appear here after domain registration with Resend. Click "Get DNS Records" to fetch them.',
    })
  }

  // Step 3: Wait for propagation
  steps.push({
    stepNumber: 3,
    title: 'Wait for DNS Propagation',
    description: 'After adding the records, wait for them to propagate across DNS servers. This typically takes 15 minutes to 2 hours, but can take up to 48 hours in some cases.',
    note: 'You can use tools like dnschecker.org to verify your records are visible globally.',
  })

  // Step 4: Verify
  steps.push({
    stepNumber: 4,
    title: 'Verify Domain',
    description: 'Click the "Verify Domain" button below to check your DNS configuration. We\'ll validate that all records are correctly set up.',
    note: 'If verification fails, double-check that all records match exactly, including the trailing periods on some values.',
  })

  return {
    domain: domain.domain,
    subdomain: domain.subdomain,
    fullDomain,
    steps,
    estimatedTime: '15 minutes to 48 hours',
    verificationNote: 'Once verified, you can start sending emails from this domain immediately.',
  }
}

/**
 * Build the list of DNS records to add
 */
function buildDNSRecordsList(
  dnsRecords: DNSRecords,
  subdomain: string | null
): DNSRecord[] {
  const records: DNSRecord[] = []
  const hostPrefix = subdomain ?? '@'

  // MX Record for receiving emails (if inbound is enabled)
  if (dnsRecords.mx) {
    records.push({
      type: 'MX',
      host: hostPrefix,
      value: dnsRecords.mx.value,
      priority: dnsRecords.mx.priority ?? 10,
      ttl: dnsRecords.mx.ttl ?? 3600,
    })
  }

  // SPF Record (TXT)
  if (dnsRecords.txt_spf) {
    records.push({
      type: 'TXT',
      host: hostPrefix,
      value: dnsRecords.txt_spf.value,
      ttl: dnsRecords.txt_spf.ttl ?? 3600,
    })
  }

  // DKIM Record (CNAME)
  if (dnsRecords.cname_dkim) {
    records.push({
      type: 'CNAME',
      host: dnsRecords.cname_dkim.host,
      value: dnsRecords.cname_dkim.value,
      ttl: dnsRecords.cname_dkim.ttl ?? 3600,
    })
  }

  // DMARC Record (TXT) - optional but recommended
  if (dnsRecords.txt_dmarc) {
    records.push({
      type: 'TXT',
      host: `_dmarc${subdomain ? `.${subdomain}` : ''}`,
      value: dnsRecords.txt_dmarc.value,
      ttl: dnsRecords.txt_dmarc.ttl ?? 3600,
    })
  }

  return records
}

/**
 * Format a DNS record as a table row string
 */
export function formatDNSRecordRow(record: DNSRecord): string {
  const priority = record.priority !== undefined ? record.priority.toString() : '-'
  const ttl = record.ttl?.toString() ?? '3600'

  return `${record.type.padEnd(6)} | ${record.host.padEnd(30)} | ${record.value.substring(0, 50)}${record.value.length > 50 ? '...' : ''} | ${priority.padEnd(4)} | ${ttl}`
}

/**
 * Format DNS records as a plain text table
 */
export function formatDNSRecordsTable(records: DNSRecord[]): string {
  const header = 'TYPE   | HOST                           | VALUE                                              | PRI  | TTL'
  const divider = '-------|--------------------------------|---------------------------------------------------|------|------'

  const rows = records.map(formatDNSRecordRow)

  return [header, divider, ...rows].join('\n')
}

/**
 * Get provider-specific instructions
 */
export function getProviderInstructions(provider: string): string {
  const instructions: Record<string, string> = {
    cloudflare: `
**Cloudflare:**
- Set "Proxy status" to DNS only (gray cloud) for all email-related records
- The Host field should not include your domain name (use just the subdomain or @ for root)
- TTL can be set to "Auto" which defaults to 300 seconds
`,
    godaddy: `
**GoDaddy:**
- In the Host field, use @ for the root domain or just the subdomain name
- Do not include the full domain name in the Host field
- Leave Points to/Value field exactly as provided
`,
    namecheap: `
**Namecheap:**
- Use @ symbol for the root domain in the Host field
- The Value should be entered exactly as shown, including any quotes for TXT records
- TTL: Use "Automatic" or enter 3600
`,
    route53: `
**AWS Route53:**
- Create a hosted zone if you haven't already
- Use fully qualified domain names ending with a period (e.g., "mail.example.com.")
- For the Host/Name field, append a period at the end
`,
    google: `
**Google Domains / Cloud DNS:**
- The Host name should not include your domain (just the subdomain or @ for root)
- TTL can be set to 1 hour (3600 seconds)
- MX records require both priority and mail server values
`,
  }

  return instructions[provider.toLowerCase()] ?? `
**General Instructions:**
- The Host/Name field typically should not include your domain name
- Use @ to represent the root domain
- Enter TXT record values exactly as shown, including any quotes
- Standard TTL is 3600 seconds (1 hour)
`
}

/**
 * Get common registrar names
 */
export function getCommonRegistrars(): Array<{ id: string; name: string }> {
  return [
    { id: 'cloudflare', name: 'Cloudflare' },
    { id: 'godaddy', name: 'GoDaddy' },
    { id: 'namecheap', name: 'Namecheap' },
    { id: 'route53', name: 'AWS Route53' },
    { id: 'google', name: 'Google Domains' },
    { id: 'vercel', name: 'Vercel' },
    { id: 'netlify', name: 'Netlify' },
    { id: 'hover', name: 'Hover' },
    { id: 'porkbun', name: 'Porkbun' },
    { id: 'other', name: 'Other' },
  ]
}
